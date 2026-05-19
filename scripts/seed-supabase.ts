/**
 * Seed Supabase with scraped cards + images.
 *
 * Requires the schema from supabase/migrations/0001_init_decks.sql to be applied first.
 *
 * Reads:
 *   - scripts/cards.json      (produced by scrape-cards.ts)
 *   - scripts/card-images/    (one .webp per card)
 *
 * Writes:
 *   - Storage bucket "card-images" — one object per card image
 *   - Table public.cards       — one row per card (upsert by id)
 *
 * Env vars required (NOT committed; pass on the command line or via a temporary .env):
 *   - SUPABASE_URL                  (same as NEXT_PUBLIC_SUPABASE_URL)
 *   - SUPABASE_SERVICE_ROLE_KEY     (admin/service key — get from Supabase dashboard →
 *                                    Project Settings → API → service_role key)
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/seed-supabase.ts
 *
 * On Windows PowerShell:
 *   $env:SUPABASE_URL="..."; $env:SUPABASE_SERVICE_ROLE_KEY="..."; npx tsx scripts/seed-supabase.ts
 *
 * Idempotent: re-running uploads only missing images and upserts all rows.
 */

import { createClient } from "@supabase/supabase-js";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars are required.",
  );
  console.error("Find SUPABASE_SERVICE_ROLE_KEY in Supabase dashboard → Project Settings → API.");
  process.exit(1);
}

const BUCKET = "card-images";
const SCRIPTS_DIR = path.join(process.cwd(), "scripts");
const IMAGES_DIR = path.join(SCRIPTS_DIR, "card-images");
const CARDS_JSON = path.join(SCRIPTS_DIR, "cards.json");

type Card = {
  id: string;
  name: string;
  setCode: string;
  baseId: string;
  cardNumber: string;
  variantSuffix: string | null;
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

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function uploadImages(cards: Card[]) {
  console.log(`\nUploading ${cards.length} images to bucket "${BUCKET}"...`);

  // List existing objects so we can skip them
  const existing = new Set<string>();
  let offset = 0;
  while (true) {
    const { data, error } = await supabase.storage.from(BUCKET).list(undefined, {
      limit: 1000,
      offset,
    });
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const o of data) existing.add(o.name);
    offset += data.length;
    if (data.length < 1000) break;
  }
  console.log(`  ${existing.size} images already in storage; will upload the rest.`);

  let uploaded = 0;
  let skipped = 0;
  let failures = 0;
  let i = 0;
  for (const card of cards) {
    i++;
    const filename = `${card.id}.webp`;
    const localPath = path.join(IMAGES_DIR, filename);

    try {
      await stat(localPath);
    } catch {
      console.error(`  [${i}/${cards.length}] ${card.id} — local image missing, skipping`);
      failures++;
      continue;
    }

    if (existing.has(filename)) {
      skipped++;
      continue;
    }

    const buf = await readFile(localPath);
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(filename, buf, { contentType: "image/webp", upsert: false });
    if (error) {
      console.error(`  [${i}/${cards.length}] ${card.id} upload failed: ${error.message}`);
      failures++;
    } else {
      uploaded++;
      if (uploaded % 50 === 0) console.log(`  [${i}/${cards.length}] uploaded ${card.id}`);
    }
  }
  console.log(`  Upload summary: +${uploaded} new, ${skipped} skipped, ${failures} failed`);
}

function publicImageUrl(cardId: string): string {
  return supabase.storage.from(BUCKET).getPublicUrl(`${cardId}.webp`).data.publicUrl;
}

async function upsertCards(cards: Card[]) {
  console.log(`\nUpserting ${cards.length} card rows...`);

  // batch in chunks to keep payload size reasonable
  const CHUNK = 200;
  let inserted = 0;
  for (let i = 0; i < cards.length; i += CHUNK) {
    const slice = cards.slice(i, i + CHUNK);
    const rows = slice.map((c) => ({
      id: c.id,
      base_id: c.baseId,
      set_code: c.setCode,
      card_number: c.cardNumber,
      variant_suffix: c.variantSuffix,
      name: c.name,
      card_type: c.cardType,
      color: c.color === "-" ? null : c.color,
      cost: c.cost,
      level: c.level,
      ap: c.ap,
      hp: c.hp,
      effect: c.effect,
      zone: c.zone,
      trait: c.trait,
      link: c.link,
      source_title: c.sourceTitle,
      rarity: c.rarity,
      image_path: publicImageUrl(c.id),
    }));
    const { error } = await supabase.from("cards").upsert(rows, { onConflict: "id" });
    if (error) {
      console.error(`  chunk ${i}: upsert failed: ${error.message}`);
    } else {
      inserted += rows.length;
      console.log(`  upserted ${inserted}/${cards.length}`);
    }
  }
}

async function main() {
  console.log(`Reading ${CARDS_JSON}`);
  const cards: Card[] = JSON.parse(await readFile(CARDS_JSON, "utf8"));
  console.log(`  ${cards.length} cards`);

  // sanity check that local images exist
  const files = new Set(await readdir(IMAGES_DIR));
  const missing = cards.filter((c) => !files.has(`${c.id}.webp`));
  if (missing.length > 0) {
    console.warn(`Warning: ${missing.length} cards have no local image — they will be skipped.`);
  }

  await uploadImages(cards);
  await upsertCards(cards);

  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
