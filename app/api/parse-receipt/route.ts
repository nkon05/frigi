import { NextResponse } from "next/server";
import { findFoodKeeper, FOODKEEPER_LIST, STORAGES, type Storage } from "@/lib/foodkeeper";
import { generateJSON, LLMError, llmErrorStatus } from "@/lib/llm";
import { CATEGORIES, type Category, type Location, type ParsedItem } from "@/lib/pantry";

export const maxDuration = 60;

const PROMPT = `You are reading a photo of a grocery receipt. Extract every FOOD or DRINK item.

Rules:
- Expand receipt abbreviations into clean, human-readable product names (e.g. "ORG BLBRY 6OZ" -> "Organic Blueberries", "GV 2% MLK GAL" -> "2% Milk").
- Ignore non-food lines: tax, bags, totals, subtotals, coupons, discounts, loyalty savings, payment info, store name/address, and household or non-food products.
- If the same item appears on multiple lines, list each line separately.
- rawName is the line exactly as printed on the receipt.
- price is the line price as a number (no currency symbol), or null if unreadable.
- storage is where this item is normally kept at home: "pantry", "refrigerator" or "freezer" (e.g. milk = refrigerator, canned beans = pantry, ice cream = freezer, bananas = pantry).
- foodkeeperId is the id of the best matching product in the USDA FoodKeeper list below, or null if nothing is a good match. Match the actual product and form (e.g. fresh milk is not canned evaporated milk; chicken thighs = "Chicken parts (legs or thighs)"). Prefer null over a poor match.
- shelfLifeDays is your own estimate: a whole number of days the item stays good from purchase, ASSUMING PROPER STORAGE in the chosen storage place.
- freezable is true only if freezing this item at home is safe and keeps it usable. It must be false for foods that freeze badly, such as lettuce and salad greens, cucumbers, radishes, celery, soft cheeses (brie, ricotta, cottage cheese, cream cheese), whole eggs in the shell, mayonnaise and watermelon.
- frozenShelfLifeDays is a CONSERVATIVE estimate of how many days the item stays good if frozen today, or null if it is not freezable.
- storageTip is ONE short sentence on how to keep it fresh longest (e.g. "Keep unwashed in the fridge until ready to eat.").

If the image is not a receipt or has no food items, return an empty array.

USDA FoodKeeper products (id|name):
${FOODKEEPER_LIST}`;

const SCHEMA = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: {
      rawName: { type: "STRING" },
      name: { type: "STRING" },
      category: { type: "STRING", enum: [...CATEGORIES] },
      price: { type: "NUMBER", nullable: true },
      storage: { type: "STRING", enum: [...STORAGES] },
      foodkeeperId: { type: "INTEGER", nullable: true },
      shelfLifeDays: { type: "INTEGER" },
      freezable: { type: "BOOLEAN" },
      frozenShelfLifeDays: { type: "INTEGER", nullable: true },
      storageTip: { type: "STRING" },
    },
    required: ["rawName", "name", "category", "price", "storage", "foodkeeperId", "shelfLifeDays", "freezable", "frozenShelfLifeDays", "storageTip"],
    propertyOrdering: ["rawName", "name", "category", "price", "storage", "foodkeeperId", "shelfLifeDays", "freezable", "frozenShelfLifeDays", "storageTip"],
  },
};

const MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

export async function POST(req: Request) {
  let image: string, mediaType: string;
  try {
    const body = await req.json();
    image = String(body.image || "").replace(/^data:[^;]+;base64,/, "");
    mediaType = MEDIA_TYPES.includes(body.mediaType) ? body.mediaType : "image/jpeg";
    if (!image) throw new Error();
  } catch {
    return NextResponse.json({ error: "Send JSON: { image: <base64> }" }, { status: 400 });
  }

  try {
    const data = await generateJSON<unknown>({
      system: PROMPT, // large and identical on every request, so it goes in the cacheable system instruction
      prompt: "Extract the food items from this receipt.",
      schema: SCHEMA,
      image: { data: image, mimeType: mediaType },
    });
    const items = cleanItems(data);
    if (!items) {
      return NextResponse.json({ error: "Couldn't understand the receipt. Try a clearer photo." }, { status: 422 });
    }
    return NextResponse.json({ items });
  } catch (err) {
    if (err instanceof LLMError) {
      return NextResponse.json({ error: err.message }, { status: llmErrorStatus(err.code) });
    }
    console.error(err);
    return NextResponse.json({ error: "Something went wrong reading the receipt." }, { status: 500 });
  }
}

function cleanItems(data: unknown): ParsedItem[] | null {
  if (!Array.isArray(data)) return null;
  return data
    .filter((d) => d && typeof d.name === "string" && d.name.trim())
    .map((d) => {
      const category = (CATEGORIES as readonly string[]).includes(d.category) ? (d.category as Category) : "other";
      const aiDays = Math.max(1, Math.round(Number(d.shelfLifeDays) || 7));
      const place = storagePlace(d.storage, category);
      const shelfLife = usdaShelfLife(d.foodkeeperId, place);
      const frozenDays = Math.round(Number(d.frozenShelfLifeDays));
      return {
        rawName: String(d.rawName ?? d.name),
        name: String(d.name).trim(),
        category,
        price: typeof d.price === "number" ? d.price : Number.isFinite(parseFloat(d.price)) ? parseFloat(d.price) : null,
        location: LOCATION[place],
        shelfLifeDays: shelfLife.days ?? aiDays,
        shelfLifeSource: shelfLife.days != null ? "usda" : "ai",
        freezerShelfLifeDays: shelfLife.freezerDays,
        freezable: d.freezable === true,
        frozenShelfLifeDays: d.freezable === true && frozenDays > 0 ? frozenDays : null,
        storageTip: String(d.storageTip ?? ""),
      };
    });
}

const LOCATION: Record<Storage, Location> = { pantry: "pantry", refrigerator: "fridge", freezer: "freezer" };

// The model's storage choice, or a sensible default from the category
function storagePlace(storage: unknown, category: Category): Storage {
  if ((STORAGES as readonly string[]).includes(storage as string)) return storage as Storage;
  return category === "frozen" ? "freezer" : category === "pantry" || category === "bakery" ? "pantry" : "refrigerator";
}

// FoodKeeper days for the item's storage place, if the model's id is real and has a value there.
// Any problem means { days: null } and the caller keeps the AI estimate.
function usdaShelfLife(foodkeeperId: unknown, place: Storage): { days: number | null; freezerDays: number | null } {
  try {
    const product = findFoodKeeper(foodkeeperId);
    if (!product) return { days: null, freezerDays: null };
    return { days: product[place], freezerDays: product.freezer };
  } catch (err) {
    console.error("FoodKeeper lookup failed:", err);
    return { days: null, freezerDays: null };
  }
}
