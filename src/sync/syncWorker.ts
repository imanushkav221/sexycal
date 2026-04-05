import NetInfo from "@react-native-community/netinfo";
import { supabase } from "@/lib/supabase";
import { captureError } from "@/lib/sentry";
import { getDb } from "@/db/migrate";
import { upsertFoodFromRemote } from "@/db/foods";
import { upsertMealFromRemote } from "@/db/meals";
import { upsertMealItemFromRemote } from "@/db/mealItems";
import { upsertWeightLogFromRemote } from "@/db/weightLogs";
import { upsertProfileFromRemote } from "@/db/profiles";
import type { Food } from "@/db/foods";
import type { Meal } from "@/db/meals";
import type { MealItem } from "@/db/mealItems";
import type { WeightLog } from "@/db/weightLogs";
import type { Profile } from "@/db/profiles";

const MAX_ATTEMPTS = 5;
const BATCH_SIZE = 20;

export type SyncStatus = "idle" | "syncing" | "error" | "offline";

type SyncStatusListener = (status: SyncStatus) => void;

let syncStatus: SyncStatus = "idle";
const listeners: SyncStatusListener[] = [];

function setSyncStatus(status: SyncStatus) {
  syncStatus = status;
  listeners.forEach((l) => l(status));
}

export function getSyncStatus(): SyncStatus {
  return syncStatus;
}

export function addSyncStatusListener(listener: SyncStatusListener): () => void {
  listeners.push(listener);
  return () => {
    const idx = listeners.indexOf(listener);
    if (idx > -1) listeners.splice(idx, 1);
  };
}

export async function runSync(): Promise<void> {
  const netState = await NetInfo.fetch();
  if (!netState.isConnected) {
    setSyncStatus("offline");
    return;
  }

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    setSyncStatus("idle");
    return;
  }

  setSyncStatus("syncing");

  try {
    await flushOutbox();
  } catch (err) {
    console.warn("[SyncWorker] Outbox flush error:", err);
  }

  try {
    await pullRemoteChanges(sessionData.session.user.id);
  } catch (err) {
    console.warn("[SyncWorker] Pull error:", err);
  }

  setSyncStatus("idle");
}

async function flushOutbox(): Promise<void> {
  const db = await getDb();

  // Also reset stuck 'processing' items and reset failed items so they retry
  await db.runAsync(`UPDATE outbox SET status = 'pending', attempts = 0 WHERE status IN ('processing', 'failed')`);

  // Process in dependency order: foods first, then meals, then meal_items last
  const pendingItems = await db.getAllAsync<{
    id: number;
    entity_type: string;
    entity_id: string;
    operation: string;
    payload: string;
    attempts: number;
  }>(
    `SELECT * FROM outbox WHERE status = 'pending' AND attempts < ?
     ORDER BY
       CASE entity_type
         WHEN 'food' THEN 1
         WHEN 'meal' THEN 2
         WHEN 'meal_item' THEN 3
         WHEN 'weight_log' THEN 4
         ELSE 5
       END,
       created_at ASC
     LIMIT ?`,
    [MAX_ATTEMPTS, BATCH_SIZE]
  );


  for (const item of pendingItems) {
    await db.runAsync(
      `UPDATE outbox SET status = 'processing', attempts = attempts + 1 WHERE id = ?`,
      [item.id]
    );

    try {
      const payload = JSON.parse(item.payload);
      await syncEntityToSupabase(item.entity_type, item.operation, payload);

      await db.runAsync(
        `UPDATE outbox SET status = 'done' WHERE id = ?`,
        [item.id]
      );

      // Mark entity as synced
      const table = entityTypeToTable(item.entity_type);
      if (table) {
        await db.runAsync(
          `UPDATE ${table} SET synced_at = ? WHERE id = ?`,
          [new Date().toISOString(), item.entity_id]
        );
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      captureError(err, { tags: { module: "sync" }, extra: { entityType: item.entity_type, entityId: item.entity_id } });
      await db.runAsync(
        `UPDATE outbox SET status = 'pending', last_error = ? WHERE id = ?`,
        [errorMessage, item.id]
      );
    }
  }

  // Clean up done items older than 7 days
  await db.runAsync(
    `DELETE FROM outbox WHERE status = 'done' AND created_at < datetime('now', '-7 days')`
  );

  // Mark permanently failed items
  await db.runAsync(
    `UPDATE outbox SET status = 'failed' WHERE status = 'pending' AND attempts >= ?`,
    [MAX_ATTEMPTS]
  );
}

async function syncEntityToSupabase(
  entityType: string,
  operation: string,
  payload: Record<string, unknown>
): Promise<void> {
  const table = entityTypeToSupabaseTable(entityType);
  if (!table) return;

  if (operation === "INSERT" || operation === "UPDATE") {
    // Strip local-only fields that don't exist in Supabase schema
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { synced_at, category, ...cleanPayload } = payload as Record<string, unknown>;
    const { error } = await supabase.from(table).upsert(cleanPayload);
    if (error) {
      console.error(`[SyncWorker] Upsert error on ${table}:`, error.message, JSON.stringify(cleanPayload));
      throw new Error(error.message);
    }
  } else if (operation === "DELETE") {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq("id", payload["id"]);
    if (error) throw new Error(error.message);
  }
}

async function pullRemoteChanges(userId: string): Promise<void> {
  const db = await getDb();

  // Get last sync time
  const lastSyncRow = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM sync_meta WHERE key = 'last_pull_at';"
  );
  const lastPullAt = lastSyncRow?.value ?? "1970-01-01T00:00:00.000Z";

  // Pull foods
  const { data: remoteFoods, error: foodsError } = await supabase
    .from("foods")
    .select("*")
    .or(`user_id.eq.${userId},user_id.is.null`)
    .gt("updated_at", lastPullAt);

  if (foodsError) throw new Error(foodsError.message);
  for (const food of remoteFoods ?? []) {
    await upsertFoodFromRemote(food as Food);
  }

  // Pull meals
  const { data: remoteMeals, error: mealsError } = await supabase
    .from("meals")
    .select("*")
    .eq("user_id", userId)
    .gt("updated_at", lastPullAt);

  if (mealsError) throw new Error(mealsError.message);
  for (const meal of remoteMeals ?? []) {
    await upsertMealFromRemote(meal as Meal);
  }

  // Pull meal items (wrap each in try-catch to handle FK issues)
  if (remoteMeals && remoteMeals.length > 0) {
    const mealIds = remoteMeals.map((m) => (m as Meal).id);
    const { data: remoteItems, error: itemsError } = await supabase
      .from("meal_items")
      .select("*")
      .in("meal_id", mealIds);

    if (itemsError) throw new Error(itemsError.message);
    for (const item of remoteItems ?? []) {
      try {
        await upsertMealItemFromRemote(item as MealItem);
      } catch (e) {
        console.warn("[SyncWorker] Skipping meal_item pull:", (item as MealItem).id, e);
      }
    }
  }

  // Pull weight logs
  const { data: remoteWeightLogs, error: weightLogsError } = await supabase
    .from("weight_logs")
    .select("*")
    .eq("user_id", userId)
    .gt("updated_at", lastPullAt);

  if (weightLogsError) throw new Error(weightLogsError.message);
  for (const log of remoteWeightLogs ?? []) {
    await upsertWeightLogFromRemote(log as WeightLog);
  }

  // Pull profile (Supabase profiles table uses `id` as auth user ID, not `user_id`)
  const { data: remoteProfile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (!profileError && remoteProfile) {
    // Map Supabase schema (id = user_id) to local schema
    const mapped = { ...remoteProfile, user_id: remoteProfile.id } as unknown as Profile;
    await upsertProfileFromRemote(mapped);
  }

  // Update last pull timestamp
  await db.runAsync(
    "INSERT OR REPLACE INTO sync_meta (key, value) VALUES ('last_pull_at', ?);",
    [new Date().toISOString()]
  );
}

function entityTypeToTable(entityType: string): string | null {
  switch (entityType) {
    case "food":
      return "foods";
    case "meal":
      return "meals";
    case "meal_item":
      return "meal_items";
    case "weight_log":
      return "weight_logs";
    default:
      return null;
  }
}

function entityTypeToSupabaseTable(entityType: string): string | null {
  return entityTypeToTable(entityType);
}

// Auto-sync on network reconnect
NetInfo.addEventListener((state) => {
  if (state.isConnected && syncStatus === "offline") {
    runSync().catch(console.error);
  }
});
