// One-off: converts the USDA FSIS FoodKeeper export (data/foodkeeper.json) into
// data/foodkeeper-lite.json, which the app uses at runtime. Re-run only if the source changes:
//   node scripts/build-foodkeeper.mjs
//
// Source format: { sheets: [{ name, data: [[{Col: value}, {Col: value}, ...], ...] }] }
// i.e. each row is an array of single-key objects. We use the "Product" sheet.
//
// Choices:
// - Shelf life is counted from the purchase date, so for each storage place we prefer the
//   DOP_* ("from date of purchase") columns and fall back to the plain columns. The two
//   almost never overlap. *_After_Opening and *_After_Thawing are ignored (receipt items are unopened).
// - Ranges use the MIDPOINT of min-max, rounded down (slightly conservative), e.g. 3-5 days -> 4.
//   If only one bound is given, that bound is used.
// - Units: Days = 1, Weeks = 7, Months = 30, Year(s) = 365 days. Hours and the non-numeric metrics
//   ("Package use-by date", "Not Recommended", "Indefinitely", "When Ripe") become null,
//   so the app falls back to the AI estimate.
// - Products with no numeric value for any storage place are dropped.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = JSON.parse(readFileSync(join(root, "data/foodkeeper.json"), "utf8"));

const sheet = source.sheets.find((s) => s.name === "Product");
if (!sheet) throw new Error("No 'Product' sheet found");
const rows = sheet.data.map((row) => Object.assign({}, ...row));

const UNIT_DAYS = { days: 1, weeks: 7, months: 30, year: 365, years: 365 };

function toDays(min, max, metric) {
  const unit = UNIT_DAYS[String(metric ?? "").trim().toLowerCase()];
  if (!unit) return null;
  const nums = [min, max].filter((n) => typeof n === "number" && n > 0);
  if (!nums.length) return null;
  const mid = nums.length === 2 ? (nums[0] + nums[1]) / 2 : nums[0];
  return Math.max(1, Math.floor(mid * unit));
}

// Prefer "from date of purchase" (DOP_) columns, then the plain ones
function storageDays(r, prefix) {
  return (
    toDays(r[`DOP_${prefix}_Min`], r[`DOP_${prefix}_Max`], r[`DOP_${prefix}_Metric`]) ??
    toDays(r[`${prefix}_Min`], r[`${prefix}_Max`], r[`${prefix}_Metric`])
  );
}

const clean = (s) => (typeof s === "string" && s.trim() ? s.trim().replace(/\s+/g, " ") : null);

function tip(r, prefix, tipsCol) {
  return clean(r[`DOP_${prefix}_${tipsCol}`]) ?? clean(r[`${prefix}_${tipsCol}`]);
}

const products = [];
for (const r of rows) {
  const pantry = storageDays(r, "Pantry");
  const refrigerator = storageDays(r, "Refrigerate");
  const freezer = storageDays(r, "Freeze");
  if (pantry == null && refrigerator == null && freezer == null) continue;

  const name = clean(r.Name);
  const subtitle = clean(r.Name_subtitle);
  const tips = Object.fromEntries(
    [
      ["pantry", tip(r, "Pantry", "tips")],
      ["refrigerator", tip(r, "Refrigerate", "tips")],
      ["freezer", tip(r, "Freeze", "Tips")],
    ].filter(([, t]) => t)
  );

  products.push({
    id: Math.round(r.ID),
    name: subtitle ? `${name} (${subtitle})` : name,
    keywords: clean(r.Keywords),
    pantry,
    refrigerator,
    freezer,
    ...(Object.keys(tips).length ? { tips } : {}),
  });
}

products.sort((a, b) => a.id - b.id);
writeFileSync(join(root, "data/foodkeeper-lite.json"), JSON.stringify(products) + "\n");

const count = (k) => products.filter((p) => p[k] != null).length;
console.log(
  `Wrote ${products.length} of ${rows.length} products ` +
    `(pantry ${count("pantry")}, refrigerator ${count("refrigerator")}, freezer ${count("freezer")})`
);
