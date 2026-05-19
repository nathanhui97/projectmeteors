/**
 * Gundam Card Game scraper.
 *
 * Pure HTTP — no headless browser. The list page accepts GET-based filtering
 * (`?search=true&package={packageId}`) which returns server-rendered HTML
 * containing every card for that set in one response (client-side pagination
 * is CSS-only). Detail pages are also server-rendered.
 *
 * Output:
 *   - scripts/cards.json     master list of card metadata
 *   - scripts/card-images/   one .webp per card, named {card_id}.webp
 *
 * Resumable: re-running skips cards already in cards.json and images already
 * on disk.
 *
 * Usage:
 *   npx tsx scripts/scrape-cards.ts                # all sets
 *   npx tsx scripts/scrape-cards.ts --set GD01     # one set only (smoke test)
 *   npx tsx scripts/scrape-cards.ts --list-only    # phase 1 only
 */

import { load as loadHtml } from "cheerio";
import { writeFile, readFile, mkdir, stat } from "node:fs/promises";
import path from "node:path";

const SITE = "https://www.gundam-gcg.com";
const LIST_URL = (packageId: string) =>
  `${SITE}/en/cards/?search=true&package=${packageId}`;
const DETAIL_URL = (id: string) =>
  `${SITE}/en/cards/detail.php?detailSearch=${id}`;
const IMAGE_URL_BASE = `${SITE}/en/images/cards/card/`;

const SCRIPTS_DIR = path.join(process.cwd(), "scripts");
const IMAGES_DIR = path.join(SCRIPTS_DIR, "card-images");
const OUT_JSON = path.join(SCRIPTS_DIR, "cards.json");

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const SETS: { code: string; name: string; packageId: string }[] = [
  { code: "GD01", name: "Newtype Rising", packageId: "616101" },
  { code: "GD02", name: "Dual Impact", packageId: "616102" },
  { code: "GD03", name: "Steel Requiem", packageId: "616103" },
  { code: "GD04", name: "Phantom Aria", packageId: "616104" },
  { code: "ST01", name: "Heroic Beginnings", packageId: "616001" },
  { code: "ST02", name: "Wings of Advance", packageId: "616002" },
  { code: "ST03", name: "Zeon's Rush", packageId: "616003" },
  { code: "ST04", name: "SEED Strike", packageId: "616004" },
  { code: "ST05", name: "Iron Bloom", packageId: "616005" },
  { code: "ST06", name: "Clan Unity", packageId: "616006" },
  { code: "ST07", name: "Celestial Drive", packageId: "616007" },
  { code: "ST08", name: "Flash of Radiance", packageId: "616008" },
  { code: "ST09", name: "Destiny Ignition", packageId: "616009" },
];

type CardListEntry = {
  id: string;
  name: string;
  imageUrl: string;
  setCode: string;
};

type Card = CardListEntry & {
  baseId: string;
  variantSuffix: string | null;
  cardNumber: string;
  cardType: string | null;
  color: string | null;
  cost: number | null;
  level: number | null;
  ap: number | null;
  hp: number | null;
  effect: string | null;
  zone: string | null;
  trait: string | null;
  link: string | null;
  sourceTitle: string | null;
  rarity: string | null;
  imagePath: string;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fileExists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function getHtml(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`GET ${url} -> HTTP ${res.status}`);
  return res.text();
}

async function fetchListForSet(set: (typeof SETS)[number]): Promise<CardListEntry[]> {
  console.log(`\n[LIST] ${set.code} (${set.name})`);
  const html = await getHtml(LIST_URL(set.packageId));
  const $ = loadHtml(html);
  const entries: CardListEntry[] = [];
  $("li.cardItem").each((_, li) => {
    const a = $(li).find("a.cardStr").first();
    const img = $(li).find("img").first();
    const dataSrc = a.attr("data-src") || "";
    const m = /detailSearch=([^&]+)/.exec(dataSrc);
    if (!m) return;
    const id = m[1];
    const name = img.attr("alt") || "";
    const imgSrc = img.attr("data-src") || img.attr("src") || "";
    // List page is at /en/cards/ ; `../images/...` resolves to /en/images/...
    const imageUrl = imgSrc.replace(/^\.\.\//, "https://www.gundam-gcg.com/en/");
    entries.push({ id, name, imageUrl, setCode: set.code });
  });
  console.log(`  ${entries.length} entries`);
  return entries;
}

async function fetchDetail(id: string): Promise<Partial<Card>> {
  const html = await getHtml(DETAIL_URL(id));
  const $ = loadHtml(html);

  const dataMap: Record<string, string> = {};
  $(".cardDataCol dl.dataBox").each((_, el) => {
    const label = $(el).find("dt.dataTit").text().trim().replace(/\.$/, "");
    const value = $(el).find("dd.dataTxt").text().trim();
    if (label) dataMap[label] = value;
  });

  const effectHtml = $(".cardDataRow.overview .dataTxt").first().html() || "";
  const effect = effectHtml
    ? effectHtml
        .replace(/<br\s*\/?\s*>/gi, "\n")
        .replace(/<[^>]+>/g, "")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .replace(/&nbsp;/g, " ")
        .replace(/&#x27;|&#039;/g, "'")
        .replace(/&quot;/g, '"')
        .trim()
    : null;

  return {
    cardType: dataMap["TYPE"] || null,
    color: dataMap["COLOR"] || null,
    cost: dataMap["COST"] ? Number(dataMap["COST"]) : null,
    level: dataMap["Lv"] ? Number(dataMap["Lv"]) : null,
    ap: dataMap["AP"] ? Number(dataMap["AP"]) : null,
    hp: dataMap["HP"] ? Number(dataMap["HP"]) : null,
    zone: dataMap["Zone"] || null,
    trait: dataMap["Trait"] || null,
    link: dataMap["Link"] || null,
    sourceTitle: dataMap["Source Title"] || null,
    rarity: $(".rarity").first().text().trim() || null,
    effect,
  };
}

async function downloadImage(card: CardListEntry): Promise<string> {
  const filename = `${card.id}.webp`;
  const localPath = path.join(IMAGES_DIR, filename);
  const rel = path.posix.join("card-images", filename);
  if (await fileExists(localPath)) return rel;

  const url = `${IMAGE_URL_BASE}${card.id}.webp`;
  const res = await fetch(url, { headers: { "User-Agent": UA, Referer: `${SITE}/en/cards/` } });
  if (!res.ok) throw new Error(`image ${card.id} -> HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(localPath, buf);
  return rel;
}

function parseId(id: string): { baseId: string; cardNumber: string; variantSuffix: string | null } {
  const m = /^([A-Z]+\d+)-(\d+)(.*)$/.exec(id);
  if (!m) return { baseId: id, cardNumber: id, variantSuffix: null };
  const baseNum = m[2];
  const suffix = m[3] || null;
  return {
    baseId: `${m[1]}-${baseNum}`,
    cardNumber: baseNum,
    variantSuffix: suffix && suffix.length > 0 ? suffix : null,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const setArg = args.indexOf("--set") >= 0 ? args[args.indexOf("--set") + 1] : null;
  const listOnly = args.includes("--list-only");

  const selectedSets = setArg ? SETS.filter((s) => s.code === setArg) : SETS;
  if (selectedSets.length === 0) {
    console.error(`unknown set: ${setArg}`);
    process.exit(1);
  }

  await mkdir(IMAGES_DIR, { recursive: true });

  // Phase 1 — list
  console.log(`Phase 1: collecting card lists for ${selectedSets.length} set(s)`);
  const allEntries: CardListEntry[] = [];
  for (const set of selectedSets) {
    const entries = await fetchListForSet(set);
    allEntries.push(...entries);
    await sleep(200);
  }
  const byId = new Map<string, CardListEntry>();
  for (const e of allEntries) if (!byId.has(e.id)) byId.set(e.id, e);
  const uniqueEntries = [...byId.values()];
  console.log(`\nUnique cards across all sets: ${uniqueEntries.length}`);

  if (listOnly) {
    await writeFile(OUT_JSON, JSON.stringify(uniqueEntries, null, 2));
    console.log(`Saved list-only output to ${OUT_JSON}`);
    return;
  }

  // Phase 2 — detail + image
  console.log(`\nPhase 2: detail pages + image downloads`);
  let existing: Card[] = [];
  if (await fileExists(OUT_JSON)) {
    try {
      const raw = JSON.parse(await readFile(OUT_JSON, "utf8"));
      if (Array.isArray(raw)) existing = raw as Card[];
    } catch {
      // ignore
    }
  }
  const existingById = new Map(existing.map((c) => [c.id, c]));
  const cards: Card[] = [];

  let i = 0;
  let failures = 0;
  for (const entry of uniqueEntries) {
    i++;
    const tag = `[${i}/${uniqueEntries.length}] ${entry.id}`;
    if (existingById.has(entry.id)) {
      const cached = existingById.get(entry.id)!;
      // also make sure image is on disk (might have been deleted)
      const imgPath = path.join(SCRIPTS_DIR, cached.imagePath);
      if (!(await fileExists(imgPath))) {
        try {
          await downloadImage(entry);
          console.log(`${tag} (cached, re-downloaded image)`);
        } catch (err) {
          console.error(`${tag} cached but image fetch failed: ${(err as Error).message}`);
        }
      }
      cards.push(cached);
      continue;
    }
    try {
      const detail = await fetchDetail(entry.id);
      const imagePath = await downloadImage(entry);
      const ids = parseId(entry.id);
      const card: Card = {
        ...entry,
        ...ids,
        cardType: detail.cardType ?? null,
        color: detail.color ?? null,
        cost: detail.cost ?? null,
        level: detail.level ?? null,
        ap: detail.ap ?? null,
        hp: detail.hp ?? null,
        effect: detail.effect ?? null,
        zone: detail.zone ?? null,
        trait: detail.trait ?? null,
        link: detail.link ?? null,
        sourceTitle: detail.sourceTitle ?? null,
        rarity: detail.rarity ?? null,
        imagePath,
      };
      cards.push(card);
      if (i <= 5 || i % 25 === 0) {
        console.log(`${tag} ${card.cardType ?? "?"} / ${card.color ?? "?"} / ${entry.name}`);
      }
    } catch (err) {
      failures++;
      console.error(`${tag} FAILED: ${(err as Error).message}`);
    }
    if (i % 25 === 0) {
      await writeFile(OUT_JSON, JSON.stringify(cards, null, 2));
    }
    await sleep(150);
  }

  await writeFile(OUT_JSON, JSON.stringify(cards, null, 2));
  console.log(`\nDone. ${cards.length} cards, ${failures} failures.`);
  console.log(`  JSON: ${OUT_JSON}`);
  console.log(`  Images: ${IMAGES_DIR}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
