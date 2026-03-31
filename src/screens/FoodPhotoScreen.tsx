import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { File, Paths } from "expo-file-system/next";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/AppNavigator";
import { suggestMealType } from "@/utils/mealTime";

type NavProp = NativeStackNavigationProp<RootStackParamList>;

interface RecognizedFood {
  name: string;
  calories_kcal: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  serving_size_g: number;
  confidence: string;
}

export default function FoodPhotoScreen() {
  const navigation = useNavigation<NavProp>();
  const [permission, requestPermission] = useCameraPermissions();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<RecognizedFood[]>([]);
  const [showCamera, setShowCamera] = useState(true);
  const cameraRef = useRef<CameraView>(null);

  const takePhoto = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: false,
      });
      if (photo?.uri) {
        setPhotoUri(photo.uri);
        setShowCamera(false);
        analyzePhoto(photo.uri);
      }
    } catch (err) {
      console.error("[FoodPhoto] Camera error:", err);
      Alert.alert("Error", "Failed to take photo.");
    }
  };

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      base64: false,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
      setShowCamera(false);
      analyzePhoto(result.assets[0].uri);
    }
  };

  const analyzePhoto = async (uri: string) => {
    setAnalyzing(true);
    setResults([]);
    try {
      // Read image as base64 using new expo-file-system API
      const file = new File(uri);
      const base64 = await file.base64();

      // Call our Supabase edge function for food recognition
      const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

      const resp = await fetch(`${SUPABASE_URL}/functions/v1/food-recognize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({ image_base64: base64 }),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`API error: ${resp.status} - ${errText}`);
      }

      const data = await resp.json();
      console.log("[FoodPhoto] API response:", JSON.stringify(data));
      if (data.foods && data.foods.length > 0) {
        setResults(data.foods);
      } else {
        Alert.alert(
          "No Food Detected",
          "We couldn't identify any food in this image. Try taking a clearer photo."
        );
      }
    } catch (err) {
      console.error("[FoodPhoto] Analysis error:", err);
      Alert.alert(
        "Analysis Failed",
        "Could not analyze the photo. Make sure you have internet connection and try again."
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSelectFood = (food: RecognizedFood) => {
    navigation.navigate("LogMeal", {
      foodName: food.name,
      servingSizeG: food.serving_size_g,
      calories: food.calories_kcal,
      protein: food.protein_g,
      fat: food.fat_g,
      carbs: food.carbs_g,
      mealType: suggestMealType(),
    });
  };

  const retake = () => {
    setPhotoUri(null);
    setResults([]);
    setShowCamera(true);
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator size="large" color="#2563EB" style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionText}>
            We need camera access to take photos of your food for recognition.
          </Text>
          <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
            <Text style={styles.permissionBtnText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.galleryBtn} onPress={pickFromGallery}>
            <Text style={styles.galleryBtnText}>Pick from Gallery Instead</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      {showCamera ? (
        <View style={styles.cameraContainer}>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing="back"
          >
            <View style={styles.cameraOverlay}>
              <View style={styles.crosshair} />
              <Text style={styles.cameraHint}>
                Point at your food and tap capture
              </Text>
            </View>
          </CameraView>
          <View style={styles.cameraControls}>
            <TouchableOpacity style={styles.galleryBtn} onPress={pickFromGallery}>
              <Text style={styles.galleryBtnText}>Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.captureBtn} onPress={takePhoto}>
              <View style={styles.captureBtnInner} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.galleryBtn}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.galleryBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Photo Preview */}
          {photoUri && (
            <Image source={{ uri: photoUri }} style={styles.preview} />
          )}

          {/* Analyzing state */}
          {analyzing && (
            <View style={styles.analyzingCard}>
              <ActivityIndicator size="large" color="#2563EB" />
              <Text style={styles.analyzingText}>
                Analyzing your food...
              </Text>
              <Text style={styles.analyzingSubtext}>
                AI is identifying items and estimating nutrition
              </Text>
            </View>
          )}

          {/* Results */}
          {results.length > 0 && (
            <>
              <Text style={styles.resultsTitle}>
                Detected Foods ({results.length})
              </Text>
              {results.map((food, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.resultCard}
                  onPress={() => handleSelectFood(food)}
                >
                  <View style={styles.resultHeader}>
                    <Text style={styles.resultName}>{food.name}</Text>
                    <Text style={styles.resultConfidence}>
                      {food.confidence}
                    </Text>
                  </View>
                  <View style={styles.resultMacros}>
                    <Text style={styles.resultMacro}>
                      {food.calories_kcal} kcal
                    </Text>
                    <Text style={styles.resultMacroDot}>·</Text>
                    <Text style={styles.resultMacro}>P: {food.protein_g}g</Text>
                    <Text style={styles.resultMacroDot}>·</Text>
                    <Text style={styles.resultMacro}>F: {food.fat_g}g</Text>
                    <Text style={styles.resultMacroDot}>·</Text>
                    <Text style={styles.resultMacro}>C: {food.carbs_g}g</Text>
                  </View>
                  <Text style={styles.resultServing}>
                    Per {food.serving_size_g}g serving — Tap to log
                  </Text>
                </TouchableOpacity>
              ))}
            </>
          )}

          {/* Retake button */}
          {!analyzing && (
            <View style={styles.retakeRow}>
              <TouchableOpacity style={styles.retakeBtn} onPress={retake}>
                <Text style={styles.retakeBtnText}>Retake Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#000" },
  cameraContainer: { flex: 1 },
  camera: { flex: 1 },
  cameraOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  crosshair: {
    width: 200,
    height: 200,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.5)",
    borderRadius: 16,
  },
  cameraHint: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    marginTop: 16,
    textAlign: "center",
  },
  cameraControls: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 30,
    backgroundColor: "rgba(0,0,0,0.8)",
  },
  captureBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  captureBtnInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#FFFFFF",
  },
  galleryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  galleryBtnText: {
    color: "#93C5FD",
    fontSize: 14,
    fontWeight: "600",
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
    backgroundColor: "#F3F4F6",
    minHeight: "100%",
  },
  preview: {
    width: "100%",
    height: 250,
    borderRadius: 16,
    marginBottom: 16,
  },
  analyzingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    marginBottom: 16,
  },
  analyzingText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginTop: 16,
  },
  analyzingSubtext: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 4,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  resultCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  resultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  resultName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
  },
  resultConfidence: {
    fontSize: 12,
    fontWeight: "500",
    color: "#10B981",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: "hidden",
  },
  resultMacros: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  resultMacro: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "500",
  },
  resultMacroDot: {
    fontSize: 13,
    color: "#9CA3AF",
    marginHorizontal: 6,
  },
  resultServing: {
    fontSize: 12,
    color: "#2563EB",
    fontWeight: "500",
  },
  retakeRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  retakeBtn: {
    flex: 1,
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  retakeBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cancelBtnText: {
    color: "#6B7280",
    fontSize: 15,
    fontWeight: "500",
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    backgroundColor: "#F3F4F6",
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  permissionText: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  permissionBtn: {
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginBottom: 12,
  },
  permissionBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
