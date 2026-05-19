import type { Card, DeckWithCards } from "@/lib/types";

export type ParsedEntry = { card_id: string; copies: number };

export type SkippedLine = {
  lineNumber: number;
  text: string;
  reason: string;
};

export type ParseResult = {
  entries: ParsedEntry[];
  skipped: SkippedLine[];
};

/**
 * Parse a pasted decklist into entries the deck builder can load.
 *
 * Format:
 *   // Main Deck            ← section header, just informational
 *   4x ST05-004              ← quantity, "x", space, card ID
 *   GD01-118                 ← bare ID, defaults to 1 copy
 *
 * Tolerant of: case ("X" or "x"), extra whitespace, blank lines.
 * Treats any "// ..." line as a comment. Recognises "// Resource Deck"
 * specifically so cards in that section can be reported as skipped (our
 * deck builder doesn't model the resource deck).
 *
 * Lookup behaviour: a bare ID like "GD01-118" matches the row whose id
 * is exactly "GD01-118" (the standard print). To pick an alternate art,
 * paste the explicit variant id, e.g. "GD01-118_p1".
 *
 * Duplicate lines for the same card sum together (so "2x X" + "3x X" = 5x).
 */
export function parseDecklist(rawText: string, catalog: Card[]): ParseResult {
  const byId = new Map<string, Card>();
  for (const c of catalog) byId.set(c.id, c);

  const entries = new Map<string, number>();
  const skipped: SkippedLine[] = [];

  let section: "main" | "resource" | "other" = "main";
  const lines = rawText.split(/\r?\n/);

  lines.forEach((rawLine, idx) => {
    const lineNumber = idx + 1;
    const line = rawLine.trim();
    if (!line) return;

    // Comments / section headers
    if (line.startsWith("//")) {
      const header = line.slice(2).trim().toLowerCase();
      if (header.includes("resource")) section = "resource";
      else if (header.includes("main")) section = "main";
      else section = "other";
      return;
    }

    // Quantity prefix: "4x ID" / "4X ID" / "4 x ID" — or bare "ID" (defaults to 1)
    const m = /^(?:(\d+)\s*[xX]\s+)?(\S.*)$/.exec(line);
    if (!m) {
      skipped.push({ lineNumber, text: rawLine, reason: "couldn't parse line" });
      return;
    }
    const copies = m[1] ? Number(m[1]) : 1;
    const idRaw = m[2].trim();
    // Strip optional trailing `# anything` comment so export comments roundtrip cleanly
    const id = idRaw.replace(/\s*#.*$/, "").trim();

    if (copies <= 0 || !Number.isFinite(copies)) {
      skipped.push({ lineNumber, text: rawLine, reason: `invalid quantity "${m[1]}"` });
      return;
    }

    if (section === "resource") {
      skipped.push({
        lineNumber,
        text: rawLine,
        reason: "under // Resource Deck — this app doesn't model the resource deck",
      });
      return;
    }

    if (!byId.has(id)) {
      skipped.push({
        lineNumber,
        text: rawLine,
        reason: `card id "${id}" not found in catalog`,
      });
      return;
    }

    entries.set(id, (entries.get(id) ?? 0) + copies);
  });

  return {
    entries: [...entries.entries()].map(([card_id, copies]) => ({ card_id, copies })),
    skipped,
  };
}

/**
 * Render a saved deck as decklist text. Variants are collapsed onto their base
 * id (e.g. 2x GD01-118 + 1x GD01-118_p1 → 3x GD01-118) so the output is portable
 * to other tools that don't track alt arts.
 */
export function exportDecklist(deck: DeckWithCards): string {
  // Sum copies per base_id
  const totalByBase = new Map<string, number>();
  for (const { card, copies } of deck.cards) {
    totalByBase.set(card.base_id, (totalByBase.get(card.base_id) ?? 0) + copies);
  }
  // Stable sort by base_id (set_code + card_number gives natural order)
  const sorted = [...totalByBase.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const lines = ["// Main Deck", ...sorted.map(([baseId, n]) => `${n}x ${baseId}`)];
  return lines.join("\n") + "\n";
}
