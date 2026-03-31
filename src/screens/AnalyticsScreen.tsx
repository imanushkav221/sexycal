import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { LineChart } from "react-native-chart-kit";
import { useAuth } from "@/hooks/useAuth";
import { getDailyCaloriesForRange } from "@/db/mealItems";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CALORIE_GOAL = 2000;

function getLastNDates(n: number): string[] {
  const dates: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
}

function formatDayLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 3);
}

export default function AnalyticsScreen() {
  const { user } = useAuth();
  const [chartData, setChartData] = useState<number[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [weeklyAvg, setWeeklyAvg] = useState(0);
  const [daysOverGoal, setDaysOverGoal] = useState(0);
  const [maxDay, setMaxDay] = useState(0);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const last7 = getLastNDates(7);
      const start = last7[0];
      const end = last7[last7.length - 1];

      const dailyData = await getDailyCaloriesForRange(user.id, start, end);

      // Map to fill missing days with 0
      const dataMap = new Map(dailyData.map((d) => [d.date, d.total_calories]));
      const values = last7.map((d) => Math.round(dataMap.get(d) ?? 0));
      const dayLabels = last7.map(formatDayLabel);

      setChartData(values);
      setLabels(dayLabels);

      const total = values.reduce((a, b) => a + b, 0);
      setWeeklyAvg(Math.round(total / 7));
      setDaysOverGoal(values.filter((v) => v > CALORIE_GOAL).length);
      setMaxDay(Math.max(...values));
    } catch (err) {
      console.error("[Analytics] Load error:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator style={styles.loader} size="large" color="#2563EB" />
      </SafeAreaView>
    );
  }

  const hasData = chartData.some((v) => v > 0);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Analytics</Text>
        <Text style={styles.subtitle}>Last 7 Days</Text>

        {/* Chart */}
        <View style={styles.chartCard}>
          {hasData ? (
            <LineChart
              data={{
                labels,
                datasets: [
                  {
                    data: chartData.length > 0 ? chartData : [0],
                    color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
                    strokeWidth: 2,
                  },
                  {
                    data: Array(7).fill(CALORIE_GOAL),
                    color: (opacity = 1) => `rgba(239, 68, 68, ${opacity * 0.5})`,
                    strokeWidth: 1,
                    withDots: false,
                  },
                ],
                legend: ["Calories", "Goal"],
              }}
              width={SCREEN_WIDTH - 48}
              height={200}
              chartConfig={{
                backgroundColor: "#FFFFFF",
                backgroundGradientFrom: "#FFFFFF",
                backgroundGradientTo: "#FFFFFF",
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                style: { borderRadius: 12 },
                propsForDots: {
                  r: "4",
                  strokeWidth: "2",
                  stroke: "#2563EB",
                },
              }}
              bezier
              style={styles.chart}
            />
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>📊</Text>
              <Text style={styles.noDataLabel}>No data yet</Text>
              <Text style={styles.noDataSub}>
                Start logging meals to see your trends
              </Text>
            </View>
          )}
        </View>

        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.statCardBlue]}>
            <Text style={styles.statValue}>{weeklyAvg}</Text>
            <Text style={styles.statLabel}>Daily Avg (kcal)</Text>
          </View>
          <View style={[styles.statCard, styles.statCardGreen]}>
            <Text style={styles.statValue}>{CALORIE_GOAL}</Text>
            <Text style={styles.statLabel}>Daily Goal</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, daysOverGoal > 0 ? styles.statCardRed : styles.statCardGreen]}>
            <Text style={styles.statValue}>{daysOverGoal}</Text>
            <Text style={styles.statLabel}>Days Over Goal</Text>
          </View>
          <View style={[styles.statCard, styles.statCardPurple]}>
            <Text style={styles.statValue}>{maxDay}</Text>
            <Text style={styles.statLabel}>Peak Day (kcal)</Text>
          </View>
        </View>

        {/* Daily breakdown */}
        <View style={styles.breakdownCard}>
          <Text style={styles.breakdownTitle}>Daily Breakdown</Text>
          {labels.map((label, i) => {
            const value = chartData[i] ?? 0;
            const pct = Math.min((value / CALORIE_GOAL) * 100, 100);
            const isOver = value > CALORIE_GOAL;
            return (
              <View key={label} style={styles.breakdownRow}>
                <Text style={styles.breakdownDay}>{label}</Text>
                <View style={styles.breakdownBarBg}>
                  <View
                    style={[
                      styles.breakdownBarFill,
                      {
                        width: `${pct}%`,
                        backgroundColor: isOver ? "#EF4444" : "#2563EB",
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.breakdownValue, isOver && styles.breakdownOver]}>
                  {value}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F3F4F6" },
  loader: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 32 },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 16,
  },
  chartCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    alignItems: "center",
  },
  chart: { borderRadius: 12 },
  noDataContainer: {
    alignItems: "center",
    paddingVertical: 32,
  },
  noDataText: { fontSize: 48, marginBottom: 8 },
  noDataLabel: { fontSize: 16, fontWeight: "600", color: "#374151", marginBottom: 4 },
  noDataSub: { fontSize: 13, color: "#9CA3AF", textAlign: "center" },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  statCardBlue: { backgroundColor: "#EFF6FF" },
  statCardGreen: { backgroundColor: "#F0FDF4" },
  statCardRed: { backgroundColor: "#FEF2F2" },
  statCardPurple: { backgroundColor: "#F5F3FF" },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },
  statLabel: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
    textAlign: "center",
  },
  breakdownCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  breakdownTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 14,
  },
  breakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  breakdownDay: {
    width: 36,
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  breakdownBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    marginHorizontal: 8,
    overflow: "hidden",
  },
  breakdownBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  breakdownValue: {
    width: 40,
    fontSize: 12,
    color: "#374151",
    textAlign: "right",
    fontWeight: "500",
  },
  breakdownOver: {
    color: "#EF4444",
  },
});
