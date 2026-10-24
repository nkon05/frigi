import { NextResponse } from "next/server";
import { generateJSON, LLMError, llmErrorStatus } from "@/lib/llm";
import { CATEGORIES, type Category, type ParsedItem } from "@/lib/pantry";

export const maxDuration = 60;

const PROMPT = `You are reading a photo of a grocery receipt. Extract every FOOD or DRINK item.

Rules:
- Expand receipt abbreviations into clean, human-readable product names (e.g. "ORG BLBRY 6OZ" -> "Organic Blueberries", "GV 2% MLK GAL" -> "2% Milk").
- Ignore non-food lines: tax, bags, totals, subtotals, coupons, discounts, loyalty savings, payment info, store name/address, and household or non-food products.
- If the same item appears on multiple lines, list each line separately.
- rawName is the line exactly as printed on the receipt.
- price is the line price as a number (no currency symbol), or null if unreadable.
- shelfLifeDays is a whole number of days the item stays good from purchase, ASSUMING PROPER STORAGE (fridge for perishables, freezer for frozen goods, pantry for shelf-stable).
- storageTip is ONE short sentence on how to keep it fresh longest (e.g. "Keep unwashed in the fridge until ready to eat.").

If the image is not a receipt or has no food items, return an empty array.`;

const SCHEMA = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: {
      rawName: { type: "STRING" },
      name: { type: "STRING" },
      category: { type: "STRING", enum: [...CATEGORIES] },
      price: { type: "NUMBER", nullable: true },
      shelfLifeDays: { type: "INTEGER" },
      storageTip: { type: "STRING" },
    },
    required: ["rawName", "name", "category", "price", "shelfLifeDays", "storageTip"],
    propertyOrdering: ["rawName", "name", "category", "price", "shelfLifeDays", "storageTip"],
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
      prompt: PROMPT,
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
    .map((d) => ({
      rawName: String(d.rawName ?? d.name),
      name: String(d.name).trim(),
      category: (CATEGORIES as readonly string[]).includes(d.category) ? (d.category as Category) : "other",
      price: typeof d.price === "number" ? d.price : Number.isFinite(parseFloat(d.price)) ? parseFloat(d.price) : null,
      shelfLifeDays: Math.max(1, Math.round(Number(d.shelfLifeDays) || 7)),
      storageTip: String(d.storageTip ?? ""),
    }));
}
