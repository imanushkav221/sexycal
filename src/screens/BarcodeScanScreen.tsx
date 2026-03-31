import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { fetchProductByBarcode } from "@/integrations/openFoodFacts";
import { getFoodByBarcode, createFood } from "@/db/foods";
import { useAuth } from "@/hooks/useAuth";
import type { RootStackParamList } from "@/navigation/AppNavigator";

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export default function BarcodeScanScreen() {
  const navigation = useNavigation<NavProp>();
  const { user } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const lastScannedRef = useRef<string | null>(null);

  const handleBarCodeScanned = useCallback(
    async ({ data: barcode }: { type: string; data: string }) => {
      if (scanning || loading || lastScannedRef.current === barcode) return;
      lastScannedRef.current = barcode;
      setLoading(true);

      try {
        // Check local DB first
        let localFood = await getFoodByBarcode(barcode);

        if (localFood) {
          navigation.replace("LogMeal", {
            foodId: localFood.id,
            foodName: localFood.name,
            foodBrand: localFood.brand,
            servingSizeG: localFood.serving_size_g,
            calories: localFood.calories_kcal,
            protein: localFood.protein_g,
            fat: localFood.fat_g,
            carbs: localFood.carbs_g,
          });
          return;
        }

        // Fetch from Open Food Facts
        const product = await fetchProductByBarcode(barcode);

        if (!product) {
          Alert.alert(
            "Product Not Found",
            "This product was not found in the database. Would you like to add it manually?",
            [
              { text: "Cancel", onPress: () => { lastScannedRef.current = null; } },
              {
                text: "Add Manually",
                onPress: () =>
                  navigation.replace("AddFood", {
                    prefill: { barcode },
                  }),
              },
            ]
          );
          return;
        }

        // Save to local DB
        const savedFood = await createFood(
          {
            name: product.name,
            brand: product.brand,
            barcode: product.barcode,
            serving_size_g: product.serving_size_g,
            calories_kcal: product.macros.calories_kcal,
            protein_g: product.macros.protein_g,
            fat_g: product.macros.fat_g,
            carbs_g: product.macros.carbs_g,
            source: product.source,
            category: "Brand",
            user_id: user?.id ?? null,
          },
          user?.id
        );

        navigation.replace("LogMeal", {
          foodId: savedFood.id,
          foodName: savedFood.name,
          foodBrand: savedFood.brand,
          servingSizeG: savedFood.serving_size_g,
          calories: savedFood.calories_kcal,
          protein: savedFood.protein_g,
          fat: savedFood.fat_g,
          carbs: savedFood.carbs_g,
        });
      } catch (err) {
        console.error("[BarcodeScan] Error:", err);
        Alert.alert("Error", "Failed to look up this product. Please try again.", [
          { text: "OK", onPress: () => { lastScannedRef.current = null; } },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [scanning, loading, navigation, user]
  );

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permissionText}>
          Camera permission is required to scan barcodes.
        </Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={styles.permissionBtnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        barcodeScannerSettings={{
          barcodeTypes: [
            "ean13",
            "ean8",
            "upc_a",
            "upc_e",
            "code128",
            "code39",
            "qr",
          ],
        }}
        onBarcodeScanned={loading ? undefined : handleBarCodeScanned}
      />
      {/* Overlay rendered outside CameraView using absolute positioning */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
        <View style={styles.overlay} pointerEvents="box-none">
          <View style={styles.overlayTop} />
          <View style={styles.overlayMiddle}>
            <View style={styles.overlaySide} />
            <View style={styles.scanBox}>
              {loading ? (
                <ActivityIndicator size="large" color="#FFFFFF" />
              ) : (
                <>
                  <View style={[styles.corner, styles.cornerTL]} />
                  <View style={[styles.corner, styles.cornerTR]} />
                  <View style={[styles.corner, styles.cornerBL]} />
                  <View style={[styles.corner, styles.cornerBR]} />
                </>
              )}
            </View>
            <View style={styles.overlaySide} />
          </View>
          <View style={styles.overlayBottom}>
            <Text style={styles.instructionText}>
              {loading ? "Looking up product..." : "Point camera at barcode"}
            </Text>
            <TouchableOpacity
              style={styles.searchBtn}
              onPress={() => navigation.navigate("FoodSearch", {})}
            >
              <Text style={styles.searchBtnText}>Search Instead</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const SCAN_BOX_SIZE = 250;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#F3F4F6",
  },
  camera: { flex: 1 },
  overlay: { flex: 1 },
  overlayTop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  overlayMiddle: {
    flexDirection: "row",
    height: SCAN_BOX_SIZE,
  },
  overlaySide: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  scanBox: {
    width: SCAN_BOX_SIZE,
    height: SCAN_BOX_SIZE,
    justifyContent: "center",
    alignItems: "center",
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 24,
    gap: 16,
  },
  corner: {
    position: "absolute",
    width: 24,
    height: 24,
    borderColor: "#FFFFFF",
    borderWidth: 3,
  },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  instructionText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
  },
  searchBtn: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
  },
  searchBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
  },
  permissionText: {
    fontSize: 16,
    color: "#374151",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 24,
  },
  permissionBtn: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  permissionBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
});
