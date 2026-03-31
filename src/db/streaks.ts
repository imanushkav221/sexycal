import { getDb } from "./migrate";

export async function getLoggingStreak(userId: string): Promise<number> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ date: string }>(
    "SELECT DISTINCT date FROM meals WHERE user_id = ? ORDER BY date DESC",
    [userId]
  );

  if (rows.length === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streak = 0;
  let checkDate = new Date(today);

  // If user hasn't logged today, start checking from yesterday
  const firstDate = new Date(rows[0].date + "T00:00:00");
  if (firstDate < today) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  const dateSet = new Set(rows.map((r) => r.date));

  for (let i = 0; i < 365; i++) {
    const dateStr = checkDate.toISOString().split("T")[0];
    if (dateSet.has(dateStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}
