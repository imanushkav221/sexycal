import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp, RouteProp } from "@react-navigation/native-stack";
import { searchFoods, createFood } from "@/db/foods";
import { searchProducts } from "@/integrations/openFoodFacts";
import { searchUSDAFoods } from "@/integrations/usdaProxy";
import { useAuth } from "@/hooks/useAuth";
import FoodItem from "@/components/FoodItem";
import type { RootStackParamList } from "@/navigation/AppNavigator";
import type { Food } from "@/db/foods";

type NavProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, "FoodSearch">;

interface SearchResult {
  id: string;
  name: string;
  brand: string | null;
  serving_size_g: number;
  calories_kcal: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  source: string;
  barcode?: string;
  category?: string;
  user_id?: string | null;
}

const FILTER_CATEGORIES = [
  "All",
  "Indian",
  "Dal",
  "Rice",
  "Bread",
  "Curry",
  "Breakfast",
  "Snack",
  "Sweet",
  "Brand",
] as const;

type FilterCategory = (typeof FILTER_CATEGORIES)[number];

function isIndianSeeded(item: SearchResult): boolean {
  return item.source === "indian_seed" || item.user_id === "system";
}

export default function FoodSearchScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteProps>();
  const { user } = useAuth();

  const { mealId, date, mealType } = route.params ?? {};

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchedOnline, setSearchedOnline] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterCategory>("All");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const performSearch = useCallback(
    async (q: string, filter: FilterCategory = activeFilter) => {
      if (q.trim().length < 2) {
        setResults([]);
        return;
      }

      setLoading(true);
      setSearchedOnline(false);

      try {
        // Determine DB category filter
        // "Indian" means show all system-seeded foods matching the query
        // Any other specific category filters by that category string
        const dbCategory =
          filter === "All" || filter === "Indian" ? undefined : filter;

        // 1. Search local SQLite (includes system-seeded Indian foods)
        const localFoods = await searchFoods(q, 20, dbCategory);

        let localResults: SearchResult[] = localFoods.map((f) => ({
          id: f.id,
          name: f.name,
          brand: f.brand,
          serving_size_g: f.serving_size_g,
          calories_kcal: f.calories_kcal,
          protein_g: f.protein_g,
          fat_g: f.fat_g,
          carbs_g: f.carbs_g,
          source: f.source,
          barcode: f.barcode ?? undefined,
          category: f.category,
          user_id: f.user_id,
        }));

        // If "Indian" filter is active, only show seeded Indian foods
        if (filter === "Indian") {
          localResults = localResults.filter((r) => isIndianSeeded(r));
        }

        // Split local results: seeded (Indian/system) vs user's previously saved
        const seededLocal = localResults.filter(
          (r) => r.user_id === "system" || r.user_id === "generic" || r.source === "indian_seed"
        );
        const userSavedLocal = localResults.filter(
          (r) => r.user_id !== "system" && r.user_id !== "generic" && r.source !== "indian_seed"
        );

        // Show user's history immediately while online results load
        setResults(userSavedLocal);

        // Only fetch online results when no specific category filter is active
        if (filter === "All") {
          const [offResults, usdaResults] = await Promise.allSettled([
            searchProducts(q, 1, 10),
            searchUSDAFoods(q, 10),
          ]);

          const onlineFoods: SearchResult[] = [];

          if (offResults.status === "fulfilled") {
            offResults.value.forEach((p) => {
              const alreadyLocal = localResults.some(
                (lr) => lr.barcode && lr.barcode === p.barcode
              );
              if (!alreadyLocal) {
                onlineFoods.push({
                  id: `off_${p.barcode}`,
                  name: p.name,
                  brand: p.brand,
                  serving_size_g: p.serving_size_g,
                  calories_kcal: p.macros.calories_kcal,
                  protein_g: p.macros.protein_g,
                  fat_g: p.macros.fat_g,
                  carbs_g: p.macros.carbs_g,
                  source: "openfoodfacts",
                  barcode: p.barcode,
                });
              }
            });
          }

          // Split USDA results: raw/generic (no brand) vs branded
          const usdaRaw: SearchResult[] = [];
          const usdaBranded: SearchResult[] = [];
          if (usdaResults.status === "fulfilled") {
            usdaResults.value.forEach((u) => {
              const item: SearchResult = {
                id: `usda_${u.id}`,
                name: u.name,
                brand: u.brand,
                serving_size_g: u.serving_size_g,
                calories_kcal: u.macros.calories_kcal,
                protein_g: u.macros.protein_g,
                fat_g: u.macros.fat_g,
                carbs_g: u.macros.carbs_g,
                source: "usda",
              };
              if (u.brand) usdaBranded.push(item);
              else usdaRaw.push(item);
            });
          }

          // If user is searching a brand name (no raw results found), show branded first
          const isBrandSearch = usdaRaw.length === 0 && usdaBranded.length > 0;

          // Order:
          // Normal search:  history → raw USDA → Indian seeds → OFF → branded USDA
          // Brand search:   history → branded USDA → OFF → Indian seeds
          const ordered = isBrandSearch
            ? [...userSavedLocal, ...usdaBranded, ...onlineFoods, ...seededLocal]
            : [...userSavedLocal, ...usdaRaw, ...seededLocal, ...onlineFoods, ...usdaBranded];

          setResults(ordered);
        }

        setSearchedOnline(true);
      } catch (err) {
        console.error("[FoodSearch] Error:", err);
      } finally {
        setLoading(false);
      }
    },
    [activeFilter]
  );

  const handleQueryChange = useCallback(
    (text: string) => {
      setQuery(text);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => performSearch(text, activeFilter), 400);
    },
    [performSearch, activeFilter]
  );

  const handleFilterChange = useCallback(
    (filter: FilterCategory) => {
      setActiveFilter(filter);
      if (query.trim().length >= 2) {
        performSearch(query, filter);
      }
    },
    [query, performSearch]
  );

  const handleSelectFood = useCallback(
    async (food: SearchResult) => {
      let foodId = food.id;

      // If it's an online result, save to local DB first
      if (food.id.startsWith("off_") || food.id.startsWith("usda_")) {
        try {
          const saved = await createFood(
            {
              name: food.name,
              brand: food.brand,
              barcode: food.barcode ?? null,
              serving_size_g: food.serving_size_g,
              calories_kcal: food.calories_kcal,
              protein_g: food.protein_g,
              fat_g: food.fat_g,
              carbs_g: food.carbs_g,
              source: food.source,
              user_id: user?.id ?? null,
              category: food.category ?? "",
            },
            user?.id
          );
          foodId = saved.id;
        } catch (err) {
          console.error("[FoodSearch] Failed to save food:", err);
        }
      }

      navigation.navigate("LogMeal", {
        foodId,
        foodName: food.name,
        foodBrand: food.brand,
        servingSizeG: food.serving_size_g,
        calories: food.calories_kcal,
        protein: food.protein_g,
        fat: food.fat_g,
        carbs: food.carbs_g,
        date,
        mealType,
      });
    },
    [navigation, date, mealType, user]
  );

  const renderItem = useCallback(
    ({ item }: { item: SearchResult }) => {
      const showIndianBadge = isIndianSeeded(item);
      const badgeLabel =
        showIndianBadge && item.category ? item.category : null;

      return (
        <View>
          <FoodItem
            name={item.name}
            brand={item.brand}
            calories={item.calories_kcal}
            protein={item.protein_g}
            fat={item.fat_g}
            carbs={item.carbs_g}
            servingSize={item.serving_size_g}
            source={item.source}
            onPress={() => handleSelectFood(item)}
          />
          {showIndianBadge && badgeLabel ? (
            <View style={styles.badgeRow}>
              <Text style={styles.indianBadge}>🇮🇳 {badgeLabel}</Text>
            </View>
          ) : null}
        </View>
      );
    },
    [handleSelectFood]
  );

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Search Bar */}
        <View style={styles.searchBar}>
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={handleQueryChange}
            placeholder="Search foods..."
            placeholderTextColor="#9CA3AF"
            autoFocus
            returnKeyType="search"
            onSubmitEditing={() => performSearch(query, activeFilter)}
          />
          {loading ? (
            <ActivityIndicator size="small" color="#2563EB" style={styles.searchIcon} />
          ) : (
            <Text style={styles.searchIcon}>🔍</Text>
          )}
        </View>

        {/* Category Filter Bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterContent}
          keyboardShouldPersistTaps="handled"
        >
          {FILTER_CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.filterChip,
                activeFilter === cat && styles.filterChipActive,
              ]}
              onPress={() => handleFilterChange(cat)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  activeFilter === cat && styles.filterChipTextActive,
                ]}
              >
                {cat === "Indian" ? "🇮🇳 Indian" : cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Results */}
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={
            query.length >= 2 && !loading ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {searchedOnline
                    ? "No foods found. Try a different search or add it manually."
                    : "Searching..."}
                </Text>
                <TouchableOpacity
                  style={styles.addManuallyBtn}
                  onPress={() => navigation.navigate("AddFood", {})}
                >
                  <Text style={styles.addManuallyText}>+ Add Food Manually</Text>
                </TouchableOpacity>
              </View>
            ) : query.length < 2 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  Type at least 2 characters to search
                </Text>
              </View>
            ) : null
          }
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
        />

        {/* Add manually link */}
        <View style={styles.footer}>
          <TouchableOpacity onPress={() => navigation.navigate("AddFood", {})}>
            <Text style={styles.footerLink}>Add food manually</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate("FoodPhoto")}>
            <Text style={styles.footerLink}>📸 Scan food</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F3F4F6" },
  flex: { flex: 1 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    margin: 12,
    marginBottom: 6,
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: "#111827",
  },
  searchIcon: {
    marginLeft: 8,
    fontSize: 18,
  },
  filterScroll: {
    maxHeight: 44,
    marginBottom: 4,
  },
  filterContent: {
    paddingHorizontal: 12,
    alignItems: "center",
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  filterChipActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  filterChipText: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "500",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  list: {
    paddingHorizontal: 12,
    paddingBottom: 16,
  },
  badgeRow: {
    paddingHorizontal: 14,
    paddingBottom: 6,
    marginTop: -4,
  },
  indianBadge: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "500",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    color: "#6B7280",
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 24,
  },
  addManuallyBtn: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  addManuallyText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  footerLink: {
    color: "#2563EB",
    fontSize: 14,
    fontWeight: "500",
  },
});
