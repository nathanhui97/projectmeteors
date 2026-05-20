"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Card } from "@/lib/types";
import { DECK_RULES } from "@/lib/types";
import { createDeck, updateDeck, deleteDeck, type SaveDeckInput } from "@/lib/decks/actions";
import CardPreviewModal from "./CardPreviewModal";
import ImportModal from "./ImportModal";

type Props = {
  cards: Card[];
  mode: "create" | "edit";
  initial?: {
    id: string;
    name: string;
    entries: { card_id: string; copies: number }[];
  };
  onSaved?: () => void;
};

const COLOR_OPTIONS = ["Blue", "Green", "Red", "Purple", "White"] as const;
const TYPE_OPTIONS = ["UNIT", "PILOT", "COMMAND", "BASE"] as const;

export default function DeckBuilder({ cards, mode, initial, onSaved }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(initial?.name ?? "");

  const [selection, setSelection] = useState<Map<string, number>>(() => {
    const m = new Map<string, number>();
    for (const e of initial?.entries ?? []) m.set(e.card_id, e.copies);
    return m;
  });

  const [search, setSearch] = useState("");
  const [colorFilter, setColorFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [setFilter, setSetFilter] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [previewCardId, setPreviewCardId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const cardById = useMemo(() => {
    const m = new Map<string, Card>();
    for (const c of cards) m.set(c.id, c);
    return m;
  }, [cards]);

  const allSets = useMemo(() => {
    const s = new Set<string>();
    for (const c of cards) s.add(c.set_code);
    return [...s].sort();
  }, [cards]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cards.filter((c) => {
      if (colorFilter && c.color !== colorFilter) return false;
      if (typeFilter && c.card_type !== typeFilter) return false;
      if (setFilter && c.set_code !== setFilter) return false;
      if (q) {
        const haystack = `${c.name} ${c.id} ${c.base_id} ${c.set_code} ${c.card_number} ${c.trait ?? ""} ${c.source_title ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [cards, search, colorFilter, typeFilter, setFilter]);

  const copiesByBaseId = useMemo(() => {
    const m = new Map<string, number>();
    for (const [cardId, copies] of selection) {
      const card = cardById.get(cardId);
      if (!card) continue;
      m.set(card.base_id, (m.get(card.base_id) ?? 0) + copies);
    }
    return m;
  }, [selection, cardById]);

  const totalCards = useMemo(() => {
    let total = 0;
    for (const copies of selection.values()) total += copies;
    return total;
  }, [selection]);

  const colorsUsed = useMemo(() => {
    const colors = new Set<string>();
    for (const cardId of selection.keys()) {
      const c = cardById.get(cardId);
      if (c?.color) colors.add(c.color);
    }
    return colors;
  }, [selection, cardById]);

  function addCopy(card: Card) {
    setError(null);
    const baseTotal = copiesByBaseId.get(card.base_id) ?? 0;
    if (baseTotal >= DECK_RULES.MAX_COPIES_PER_BASE_CARD) {
      setError(`${card.base_id}: already at ${DECK_RULES.MAX_COPIES_PER_BASE_CARD} copies.`);
      return;
    }
    if (card.color && !colorsUsed.has(card.color) && colorsUsed.size >= DECK_RULES.MAX_COLORS_PER_DECK) {
      setError(`Deck already uses ${DECK_RULES.MAX_COLORS_PER_DECK} colors (${[...colorsUsed].join(", ")}); cannot add ${card.color}.`);
      return;
    }
    const next = new Map(selection);
    next.set(card.id, (selection.get(card.id) ?? 0) + 1);
    setSelection(next);
  }

  function removeCopy(cardId: string) {
    setError(null);
    const cur = selection.get(cardId) ?? 0;
    const next = new Map(selection);
    if (cur <= 1) next.delete(cardId);
    else next.set(cardId, cur - 1);
    setSelection(next);
  }

  const cardCountOk = totalCards === DECK_RULES.MAIN_DECK_SIZE;

  async function handleSave() {
    setError(null);
    if (!name.trim()) { setError("Deck name is required."); return; }
    if (totalCards === 0) { setError("Add at least one card."); return; }
    const input: SaveDeckInput = {
      name: name.trim(),
      cards: [...selection.entries()].map(([card_id, copies]) => ({ card_id, copies })),
    };
    startTransition(async () => {
      const result =
        mode === "edit" && initial
          ? await updateDeck(initial.id, input)
          : await createDeck(input);
      if (!result.ok) { setError(result.error); return; }
      if (onSaved) { onSaved(); return; }
      router.push(`/decks/${result.deckId}`);
    });
  }

  async function handleDelete() {
    if (!initial) return;
    if (!confirm(`Delete "${initial.name}"? This cannot be undone.`)) return;
    startTransition(async () => { await deleteDeck(initial.id); });
  }

  // Deck cards sorted for display
  const deckCards = useMemo(() =>
    [...selection.entries()]
      .map(([cardId, copies]) => ({ card: cardById.get(cardId)!, copies }))
      .filter((x) => x.card)
      .sort((a, b) => a.card.id.localeCompare(b.card.id)),
    [selection, cardById],
  );

  return (
    <div className="flex h-[calc(100vh-9rem)] gap-4">
      {/* ── Left: your deck ───────────────────────────────────────────── */}
      <section className="flex flex-1 flex-col gap-3 overflow-hidden">
        {/* Header bar */}
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Deck name"
            className="min-w-0 flex-1 rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          />
          <span className={`text-sm font-medium tabular-nums ${cardCountOk ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
            {totalCards} / {DECK_RULES.MAIN_DECK_SIZE}
          </span>
          {colorsUsed.size > 0 && (
            <span className="text-sm text-neutral-500 dark:text-neutral-400">
              {[...colorsUsed].join(", ")}
            </span>
          )}
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Import
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            {isPending ? "Saving…" : "Save"}
          </button>
          {mode === "edit" && initial && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              className="text-sm text-red-500 hover:underline disabled:opacity-50"
            >
              Delete
            </button>
          )}
        </div>

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}

        {/* Deck card grid */}
        <div className="flex-1 overflow-y-auto rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
          {deckCards.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-neutral-400 dark:text-neutral-500">
                Search for cards on the right and click + to add them.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6 xl:grid-cols-7">
              {deckCards.map(({ card, copies }) => (
                <div
                  key={card.id}
                  className="group relative aspect-[5/7] overflow-hidden rounded-md border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-800"
                >
                  <button
                    type="button"
                    onClick={() => setPreviewCardId(card.id)}
                    className="block h-full w-full"
                    title={`${card.id} — ${card.name}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={card.image_path}
                      alt={card.name}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </button>

                  {/* Copy count badge */}
                  {copies > 1 && (
                    <span className="absolute left-1 top-1 rounded bg-neutral-900/80 px-1 py-0.5 text-[10px] font-bold text-white">
                      ×{copies}
                    </span>
                  )}

                  {/* −/+ controls */}
                  <div className="absolute bottom-0 left-0 right-0 flex translate-y-full items-center justify-between bg-neutral-900/85 px-1.5 py-1 transition-transform group-hover:translate-y-0">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeCopy(card.id); }}
                      className="rounded px-1.5 text-sm font-bold text-white hover:bg-neutral-700"
                      aria-label="Remove one"
                    >
                      −
                    </button>
                    <span className="text-xs tabular-nums text-neutral-300">{copies}</span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); addCopy(card); }}
                      className="rounded px-1.5 text-sm font-bold text-white hover:bg-neutral-700"
                      aria-label="Add one"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Right: card search panel ───────────────────────────────────── */}
      <aside className="flex w-64 flex-col gap-2 overflow-hidden xl:w-72">
        {/* Filters */}
        <div className="space-y-2 rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
          <input
            type="text"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          />
          <select
            value={colorFilter}
            onChange={(e) => setColorFilter(e.target.value)}
            className="w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          >
            <option value="">All colors</option>
            {COLOR_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          >
            <option value="">All types</option>
            {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select
            value={setFilter}
            onChange={(e) => setSetFilter(e.target.value)}
            className="w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          >
            <option value="">All sets</option>
            {allSets.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {filtered.length} card{filtered.length === 1 ? "" : "s"}
          </p>
        </div>

        {/* Card pool */}
        <div className="flex-1 overflow-y-auto rounded-xl border border-neutral-200 bg-white p-2 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="grid grid-cols-3 gap-1.5">
            {filtered.map((c) => {
              const inDeck = selection.get(c.id) ?? 0;
              return (
                <div
                  key={c.id}
                  className="group relative aspect-[5/7] overflow-hidden rounded-md border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-800"
                >
                  <button
                    type="button"
                    onClick={() => setPreviewCardId(c.id)}
                    className="block h-full w-full"
                    title={`${c.id} — ${c.name}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={c.image_path}
                      alt={c.name}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); addCopy(c); }}
                    className="absolute bottom-1 right-1 rounded-full bg-neutral-900/90 px-1.5 py-0.5 text-xs font-bold text-white opacity-0 shadow transition-opacity group-hover:opacity-100 dark:bg-neutral-100/90 dark:text-neutral-900"
                    aria-label={`Add ${c.name}`}
                  >
                    +
                  </button>
                  {inDeck > 0 && (
                    <span className="absolute left-1 top-1 rounded bg-neutral-900/80 px-1 py-0.5 text-[10px] font-bold text-white">
                      ×{inDeck}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </aside>

      {previewCardId && cardById.get(previewCardId) && (
        <CardPreviewModal
          card={cardById.get(previewCardId)!}
          copies={selection.get(previewCardId) ?? 0}
          onAdd={() => addCopy(cardById.get(previewCardId)!)}
          onRemove={() => removeCopy(previewCardId)}
          onClose={() => setPreviewCardId(null)}
        />
      )}

      {importOpen && (
        <ImportModal
          catalog={cards}
          onClose={() => setImportOpen(false)}
          onLoad={(entries) => {
            const next = new Map<string, number>();
            for (const e of entries) next.set(e.card_id, e.copies);
            setSelection(next);
            setError(null);
          }}
        />
      )}
    </div>
  );
}
