import { getDb } from "./migrate";
import { generateId } from "@/utils/uuid";

export interface WeightLog {
  id: string;
  user_id: string;
  weight_kg: number;
  logged_date: string; // 'YYYY-MM-DD'
  notes: string | null;
  created_at: string;
  updated_at: string;
  synced_at: string | null;
}

export async function logWeight(
  userId: string,
  weightKg: number,
  date: string,
  notes?: string
): Promise<WeightLog> {
  const db = await getDb();
  const id = generateId();
  const now = new Date().toISOString();

  // Delete existing log for same date (upsert by date)
  await db.runAsync(
    "DELETE FROM weight_logs WHERE user_id = ? AND logged_date = ?",
    [userId, date]
  );

  const log: WeightLog = {
    id, user_id: userId, weight_kg: weightKg,
    logged_date: date, notes: notes ?? null,
    created_at: now, updated_at: now, synced_at: null,
  };

  await db.runAsync(
    `INSERT INTO weight_logs (id, user_id, weight_kg, logged_date, notes, created_at, updated_at, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, NULL)`,
    [log.id, log.user_id, log.weight_kg, log.logged_date, log.notes, log.created_at, log.updated_at]
  );

  // Queue for outbox sync
  await db.runAsync(
    `INSERT INTO outbox (entity_type, entity_id, operation, payload, status)
     VALUES ('weight_log', ?, 'INSERT', ?, 'pending')`,
    [id, JSON.stringify(log)]
  );

  return log;
}

export async function getWeightLogs(
  userId: string,
  limitDays = 30
): Promise<WeightLog[]> {
  const db = await getDb();
  return db.getAllAsync<WeightLog>(
    `SELECT * FROM weight_logs WHERE user_id = ?
     AND logged_date >= date('now', ?)
     ORDER BY logged_date ASC`,
    [userId, `-${limitDays} days`]
  );
}

export async function getLatestWeight(userId: string): Promise<WeightLog | null> {
  const db = await getDb();
  return db.getFirstAsync<WeightLog>(
    "SELECT * FROM weight_logs WHERE user_id = ? ORDER BY logged_date DESC LIMIT 1",
    [userId]
  );
}

export async function upsertWeightLogFromRemote(data: WeightLog): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO weight_logs (id, user_id, weight_kg, logged_date, notes, created_at, updated_at, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.id, data.user_id, data.weight_kg, data.logged_date, data.notes,
     data.created_at, data.updated_at, data.synced_at]
  );
}
