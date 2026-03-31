import { mapOffNutriments } from "@/utils/nutrients";
import type { Macros } from "@/utils/nutrients";

const OFF_WORLD_BASE_URL = "https://world.openfoodfacts.org/api/v0";
const OFF_INDIA_BASE_URL = "https://in.openfoodfacts.org/api/v0";

// Simple heuristic: query is likely Indian if it contains common Indic food terms
const INDIAN_FOOD_KEYWORDS = [
  "dal", "daal", "roti", "chapati", "paneer", "biryani", "curry", "masala",
  "sabzi", "sabji", "paratha", "idli", "dosa", "upma", "poha", "khichdi",
  "samosa", "pakora", "chana", "rajma", "aloo", "gobi", "palak", "bhindi",
  "halwa", "kheer", "gulab", "ladoo", "barfi", "haldirams", "haldiram",
  "amul", "parle", "britannia", "maggi", "sunfeast", "mtr", "mdh", "iTC",
  "naan", "puri", "bhatura", "lassi", "chai", "chaas", "buttermilk",
  "ghee", "besan", "atta", "maida",
];

function looksIndian(query: string): boolean {
  const lower = query.toLowerCase();
  return INDIAN_FOOD_KEYWORDS.some((kw) => lower.includes(kw));
}

export interface OFFProduct {
  code: string;
  product_name: string;
  brands?: string;
  serving_size?: string;
  nutriments: Record<string, unknown>;
  image_url?: string;
}

export interface OFFSearchResult {
  count: number;
  products: OFFProduct[];
}

export interface FoodData {
  barcode: string;
  name: string;
  brand: string | null;
  serving_size_g: number;
  macros: Macros;
  source: "openfoodfacts";
}

function parseServingSize(servingSize?: string): number {
  if (!servingSize) return 100;
  const match = servingSize.match(/(\d+(?:\.\d+)?)\s*g/i);
  if (match) return parseFloat(match[1]);
  const numMatch = servingSize.match(/(\d+(?:\.\d+)?)/);
  if (numMatch) return parseFloat(numMatch[1]);
  return 100;
}

function mapProduct(product: OFFProduct): FoodData {
  const macros = mapOffNutriments(product.nutriments as Record<string, unknown>);
  const servingSize = parseServingSize(product.serving_size);
  return {
    barcode: product.code,
    name: product.product_name,
    brand: product.brands || null,
    serving_size_g: servingSize,
    macros,
    source: "openfoodfacts" as const,
  };
}

async function fetchOFFSearch(
  baseUrl: string,
  query: string,
  page: number,
  pageSize: number,
  extraParams?: Record<string, string>
): Promise<FoodData[]> {
  const params = new URLSearchParams({
    search_terms: query,
    search_simple: "1",
    action: "process",
    json: "1",
    page: String(page),
    page_size: String(pageSize),
    fields: "code,product_name,brands,serving_size,nutriments",
    ...extraParams,
  });

  const response = await fetch(
    `${baseUrl.replace("/api/v0", "")}/cgi/search.pl?${params.toString()}`,
    {
      headers: { "User-Agent": "CalorieMVP/1.0 (contact@example.com)" },
    }
  );

  if (!response.ok) return [];

  const data = (await response.json()) as OFFSearchResult;

  return (data.products ?? [])
    .filter((p) => p.product_name)
    .map(mapProduct);
}

export async function fetchProductByBarcode(
  barcode: string
): Promise<FoodData | null> {
  // Try world instance first, then Indian instance as fallback
  const urls = [OFF_WORLD_BASE_URL, OFF_INDIA_BASE_URL];

  for (const baseUrl of urls) {
    try {
      const response = await fetch(`${baseUrl}/product/${barcode}.json`, {
        headers: { "User-Agent": "CalorieMVP/1.0 (contact@example.com)" },
      });

      if (!response.ok) continue;

      const data = (await response.json()) as {
        status: number;
        product?: OFFProduct;
      };

      if (data.status !== 1 || !data.product) continue;

      const product = data.product;
      const macros = mapOffNutriments(product.nutriments as Record<string, unknown>);
      const servingSize = parseServingSize(product.serving_size);

      return {
        barcode,
        name: product.product_name || "Unknown Product",
        brand: product.brands || null,
        serving_size_g: servingSize,
        macros,
        source: "openfoodfacts",
      };
    } catch (error) {
      console.error(`[OpenFoodFacts] Error fetching barcode from ${baseUrl}:`, error);
    }
  }

  return null;
}

export async function searchProducts(
  query: string,
  page = 1,
  pageSize = 20
): Promise<FoodData[]> {
  const isIndian = looksIndian(query);

  try {
    // Always search world instance; additionally search Indian instance when relevant
    const searchPromises: Promise<FoodData[]>[] = [
      fetchOFFSearch(
        OFF_WORLD_BASE_URL,
        query,
        page,
        pageSize,
        isIndian ? { cc: "in" } : undefined
      ),
    ];

    if (isIndian) {
      // Also search the dedicated Indian OFF instance
      searchPromises.push(
        fetchOFFSearch(OFF_INDIA_BASE_URL, query, page, pageSize)
      );
    }

    const settled = await Promise.allSettled(searchPromises);

    const worldResults =
      settled[0].status === "fulfilled" ? settled[0].value : [];
    const indiaResults =
      settled[1]?.status === "fulfilled" ? settled[1].value : [];

    // Merge and deduplicate by barcode
    const seen = new Set<string>();
    const merged: FoodData[] = [];

    for (const item of [...worldResults, ...indiaResults]) {
      if (!seen.has(item.barcode)) {
        seen.add(item.barcode);
        merged.push(item);
      }
    }

    return merged.slice(0, pageSize);
  } catch (error) {
    console.error("[OpenFoodFacts] Error searching products:", error);
    return [];
  }
}
