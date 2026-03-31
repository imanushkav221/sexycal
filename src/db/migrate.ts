import * as SQLite from "expo-sqlite";
import { INDIAN_FOODS_SEED } from "./seedIndianFoods";
import { generateId } from "@/utils/uuid";

let db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync("calorie_mvp.db");
  await runMigrations(db);
  return db;
}

async function runMigrations(database: SQLite.SQLiteDatabase): Promise<void> {
  // Enable WAL mode for better performance
  await database.execAsync("PRAGMA journal_mode = WAL;");
  await database.execAsync("PRAGMA foreign_keys = ON;");

  // Create version table
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS sync_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  const versionRow = await database.getFirstAsync<{ value: string }>(
    "SELECT value FROM sync_meta WHERE key = 'schema_version';"
  );
  const currentVersion = versionRow ? parseInt(versionRow.value, 10) : 0;

  if (currentVersion < 1) {
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS foods (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        brand TEXT,
        barcode TEXT,
        serving_size_g REAL NOT NULL DEFAULT 100,
        calories_kcal REAL NOT NULL DEFAULT 0,
        protein_g REAL NOT NULL DEFAULT 0,
        fat_g REAL NOT NULL DEFAULT 0,
        carbs_g REAL NOT NULL DEFAULT 0,
        source TEXT NOT NULL DEFAULT 'manual',
        user_id TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        synced_at TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_foods_name ON foods(name COLLATE NOCASE);
      CREATE INDEX IF NOT EXISTS idx_foods_barcode ON foods(barcode);
      CREATE INDEX IF NOT EXISTS idx_foods_user_id ON foods(user_id);

      CREATE TABLE IF NOT EXISTS meals (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        date TEXT NOT NULL,
        meal_type TEXT NOT NULL CHECK(meal_type IN ('breakfast','lunch','dinner','snack')),
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        synced_at TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_meals_user_date ON meals(user_id, date);

      CREATE TABLE IF NOT EXISTS meal_items (
        id TEXT PRIMARY KEY,
        meal_id TEXT NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
        food_id TEXT NOT NULL REFERENCES foods(id) ON DELETE RESTRICT,
        quantity_g REAL NOT NULL DEFAULT 100,
        calories_kcal REAL NOT NULL DEFAULT 0,
        protein_g REAL NOT NULL DEFAULT 0,
        fat_g REAL NOT NULL DEFAULT 0,
        carbs_g REAL NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        synced_at TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_meal_items_meal_id ON meal_items(meal_id);

      CREATE TABLE IF NOT EXISTS outbox (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        operation TEXT NOT NULL CHECK(operation IN ('INSERT','UPDATE','DELETE')),
        payload TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        attempts INTEGER NOT NULL DEFAULT 0,
        last_error TEXT,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','done','failed'))
      );

      CREATE INDEX IF NOT EXISTS idx_outbox_status ON outbox(status, created_at);
    `);

    await database.runAsync(
      "INSERT OR REPLACE INTO sync_meta (key, value) VALUES ('schema_version', '1');"
    );
  }

  if (currentVersion < 2) {
    // Add category column to foods table (idempotent)
    await database.execAsync(`
      ALTER TABLE foods ADD COLUMN category TEXT NOT NULL DEFAULT '';
    `).catch(() => {
      // Column may already exist if migration is re-run; silently ignore
    });

    // Seed Indian foods if not already seeded
    const seedCount = await database.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM foods WHERE source = 'indian_seed';"
    );

    if (!seedCount || seedCount.count === 0) {
      const now = new Date().toISOString();

      // Insert in batches of 50 to avoid hitting SQLite variable limits
      const batchSize = 50;
      for (let i = 0; i < INDIAN_FOODS_SEED.length; i += batchSize) {
        const batch = INDIAN_FOODS_SEED.slice(i, i + batchSize);
        for (const food of batch) {
          const id = generateId();
          await database.runAsync(
            `INSERT INTO foods
               (id, name, brand, barcode, serving_size_g, calories_kcal, protein_g, fat_g, carbs_g,
                source, user_id, category, created_at, updated_at, synced_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'indian_seed', 'system', ?, ?, ?, NULL)`,
            [
              id,
              food.name,
              food.brand ?? null,
              null,
              food.serving_size_g,
              food.calories_kcal,
              food.protein_g,
              food.fat_g,
              food.carbs_g,
              food.category,
              now,
              now,
            ]
          );
        }
      }
    }

    await database.runAsync(
      "INSERT OR REPLACE INTO sync_meta (key, value) VALUES ('schema_version', '2');"
    );
  }

  if (currentVersion < 3) {
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE,
        display_name TEXT,
        age INTEGER,
        gender TEXT CHECK(gender IN ('male','female','other')),
        height_cm REAL,
        weight_kg REAL,
        activity_level TEXT CHECK(activity_level IN ('sedentary','light','moderate','active','very_active')),
        fitness_goal TEXT CHECK(fitness_goal IN ('lose','maintain','gain')),
        calorie_goal INTEGER NOT NULL DEFAULT 2000,
        protein_goal_g REAL,
        fat_goal_g REAL,
        carbs_goal_g REAL,
        onboarding_complete INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        synced_at TEXT
      );

      CREATE TABLE IF NOT EXISTS weight_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        weight_kg REAL NOT NULL,
        logged_date TEXT NOT NULL,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        synced_at TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
      CREATE INDEX IF NOT EXISTS idx_weight_logs_user_date ON weight_logs(user_id, logged_date);
    `);

    await database.runAsync(
      "INSERT OR REPLACE INTO sync_meta (key, value) VALUES ('schema_version', '3');"
    );
  }

  if (currentVersion < 4) {
    await database.execAsync(`
      ALTER TABLE profiles ADD COLUMN goal_weight_kg REAL;
    `).catch(() => {
      // Column may already exist; silently ignore
    });

    await database.runAsync(
      "INSERT OR REPLACE INTO sync_meta (key, value) VALUES ('schema_version', '4');"
    );
  }
}

export async function closeDb(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
  }
}
