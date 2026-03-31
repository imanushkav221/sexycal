import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "@/hooks/useAuth";
import { logWeight, getWeightLogs, getLatestWeight } from "@/db/weightLogs";
import type { WeightLog } from "@/db/weightLogs";

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

export default function WeightLogScreen() {
  const { user } = useAuth();
  const [weight, setWeight] = useState("");
  const [logs, setLogs] = useState<WeightLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getWeightLogs(user.id, 90);
      setLogs(data);

      // Pre-fill with latest weight
      const latest = await getLatestWeight(user.id);
      if (latest && !weight) {
        setWeight(String(latest.weight_kg));
      }
    } catch (err) {
      console.error("[WeightLog] Load error:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleLog = async () => {
    const w = parseFloat(weight);
    if (!weight || isNaN(w) || w < 20 || w > 500) {
      Alert.alert("Invalid", "Please enter a valid weight (20-500 kg).");
      return;
    }
    if (!user) return;

    setSaving(true);
    try {
      await logWeight(user.id, w, getTodayDate());
      Alert.alert("Logged!", `Weight ${w} kg saved for today.`);
      await loadData();
    } catch (err) {
      console.error("[WeightLog] Save error:", err);
      Alert.alert("Error", "Failed to save weight.");
    } finally {
      setSaving(false);
    }
  };

  // Calculate trend
  const firstWeight = logs.length > 0 ? logs[0].weight_kg : null;
  const lastWeight = logs.length > 0 ? logs[logs.length - 1].weight_kg : null;
  const change =
    firstWeight !== null && lastWeight !== null
      ? lastWeight - firstWeight
      : null;

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator style={{ flex: 1 }} size="large" color="#2563EB" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Weight Tracker</Text>

        {/* Log today's weight */}
        <View style={styles.logCard}>
          <Text style={styles.logTitle}>Log Today's Weight</Text>
          <View style={styles.logRow}>
            <TextInput
              style={styles.logInput}
              value={weight}
              onChangeText={setWeight}
              placeholder="e.g. 70.5"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
            />
            <Text style={styles.logUnit}>kg</Text>
            <TouchableOpacity
              style={[styles.logBtn, saving && styles.btnDisabled]}
              onPress={handleLog}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.logBtnText}>Log</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Trend summary */}
        {change !== null && logs.length >= 2 && (
          <View style={styles.trendCard}>
            <Text style={styles.trendTitle}>Trend (last {logs.length} entries)</Text>
            <View style={styles.trendRow}>
              <View style={styles.trendBlock}>
                <Text style={styles.trendValue}>{firstWeight?.toFixed(1)}</Text>
                <Text style={styles.trendLabel}>First</Text>
              </View>
              <Text style={styles.trendArrow}>
                {change < 0 ? "📉" : change > 0 ? "📈" : "➡️"}
              </Text>
              <View style={styles.trendBlock}>
                <Text style={styles.trendValue}>{lastWeight?.toFixed(1)}</Text>
                <Text style={styles.trendLabel}>Latest</Text>
              </View>
              <View style={styles.trendBlock}>
                <Text
                  style={[
                    styles.trendValue,
                    {
                      color:
                        change < 0 ? "#10B981" : change > 0 ? "#EF4444" : "#6B7280",
                    },
                  ]}
                >
                  {change > 0 ? "+" : ""}
                  {change.toFixed(1)}
                </Text>
                <Text style={styles.trendLabel}>Change (kg)</Text>
              </View>
            </View>
          </View>
        )}

        {/* Weight history */}
        <Text style={styles.sectionTitle}>History</Text>
        {logs.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              No weight logs yet. Start by logging today's weight above!
            </Text>
          </View>
        ) : (
          [...logs].reverse().map((log) => (
            <View key={log.id} style={styles.historyRow}>
              <Text style={styles.historyDate}>
                {new Date(log.logged_date + "T00:00:00").toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  weekday: "short",
                })}
              </Text>
              <Text style={styles.historyWeight}>{log.weight_kg.toFixed(1)} kg</Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F3F4F6" },
  scroll: { padding: 16, paddingBottom: 40 },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },
  logCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  logTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
  },
  logRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logInput: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#111827",
  },
  logUnit: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
  },
  logBtn: {
    backgroundColor: "#2563EB",
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  btnDisabled: { opacity: 0.6 },
  logBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  trendCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  trendTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  trendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  trendBlock: {
    alignItems: "center",
  },
  trendArrow: {
    fontSize: 24,
  },
  trendValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  trendLabel: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 6,
  },
  historyDate: {
    fontSize: 14,
    color: "#374151",
  },
  historyWeight: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
});
