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
};

const COLOR_OPTIONS = ["Blue", "Green", "Red", "Purple", "White"] as const;
const TYPE_OPTIONS = ["UNIT", "PILOT", "COMMAND", "BASE"] as const;

export default function DeckBuilder({ cards, mode, initial }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(initial?.name ?? "");

  // selection: card_id -> copies
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
        const haystack = `${c.name} ${c.id}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [cards, search, colorFilter, typeFilter, setFilter]);

  // copies per base_id (for 4-copy rule)
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
    const cur = selection.get(card.id) ?? 0;
    const baseTotal = copiesByBaseId.get(card.base_id) ?? 0;
    if (baseTotal >= DECK_RULES.MAX_COPIES_PER_BASE_CARD) {
      setError(
        `${card.base_id}: already at ${DECK_RULES.MAX_COPIES_PER_BASE_CARD} copies (across all art variants).`,
      );
      return;
    }
    // color rule: if adding this color would exceed 2, block
    if (card.color && !colorsUsed.has(card.color) && colorsUsed.size >= DECK_RULES.MAX_COLORS_PER_DECK) {
      setError(
        `Deck already uses ${DECK_RULES.MAX_COLORS_PER_DECK} colors (${[...colorsUsed].join(", ")}); cannot add ${card.color}.`,
      );
      return;
    }
    const next = new Map(selection);
    next.set(card.id, cur + 1);
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

  const cardCountStatus = totalCards === DECK_RULES.MAIN_DECK_SIZE ? "ok" : "warn";
  const colorStatus =
    colorsUsed.size <= DECK_RULES.MAX_COLORS_PER_DECK ? "ok" : "error";

  function statusClass(s: "ok" | "warn" | "error") {
    if (s === "ok") return "text-green-700 dark:text-green-400";
    if (s === "warn") return "text-amber-700 dark:text-amber-400";
    return "text-red-700 dark:text-red-400";
  }

  async function handleSave() {
    setError(null);
    if (!name.trim()) {
      setError("Deck name is required.");
      return;
    }
    if (totalCards === 0) {
      setError("Add at least one card.");
      return;
    }
    const input: SaveDeckInput = {
      name: name.trim(),
      cards: [...selection.entries()].map(([card_id, copies]) => ({ card_id, copies })),
    };

    startTransition(async () => {
      const result =
        mode === "edit" && initial
          ? await updateDeck(initial.id, input)
          : await createDeck(input);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/decks/${result.deckId}`);
    });
  }

  async function handleDelete() {
    if (!initial) return;
    if (!confirm(`Delete "${initial.name}"? This cannot be undone.`)) return;
    startTransition(async () => {
      await deleteDeck(initial.id);
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      {/* Left: filters + card grid */}
      <section className="space-y-3">
        <div className="rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <input
              type="text"
              placeholder="Search by name or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="col-span-2 rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 sm:col-span-2"
            />
            <select
              value={colorFilter}
              onChange={(e) => setColorFilter(e.target.value)}
              className="rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
            >
              <option value="">All colors</option>
              {COLOR_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
            >
              <option value="">All types</option>
              {TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <select
              value={setFilter}
              onChange={(e) => setSetFilter(e.target.value)}
              className="col-span-2 rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 sm:col-span-4"
            >
              <option value="">All sets</option>
              {allSets.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
            {filtered.length} card{filtered.length === 1 ? "" : "s"}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((c) => {
            const inDeck = selection.get(c.id) ?? 0;
            return (
              <div
                key={c.id}
                className="group relative aspect-[5/7] overflow-hidden rounded-md border border-neutral-200 bg-neutral-100 transition hover:ring-2 hover:ring-neutral-900 dark:border-neutral-800 dark:bg-neutral-800 dark:hover:ring-neutral-100"
              >
                <button
                  type="button"
                  onClick={() => setPreviewCardId(c.id)}
                  className="block h-full w-full"
                  title={`${c.id} — ${c.name}`}
                  aria-label={`Preview ${c.name}`}
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
                  onClick={(e) => {
                    e.stopPropagation();
                    addCopy(c);
                  }}
                  className="absolute bottom-1 right-1 rounded-full bg-neutral-900/90 px-2 py-0.5 text-xs font-semibold text-white shadow hover:bg-neutral-900 dark:bg-neutral-100/90 dark:text-neutral-900 dark:hover:bg-neutral-100"
                  aria-label={`Add ${c.name} to deck`}
                  title="Add to deck"
                >
                  +
                </button>
                {inDeck > 0 && (
                  <span className="absolute right-1 top-1 rounded-full bg-neutral-900 px-1.5 py-0.5 text-[10px] font-semibold text-white dark:bg-neutral-100 dark:text-neutral-900">
                    ×{inDeck}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Right: deck panel */}
      <aside className="space-y-3 lg:sticky lg:top-4 lg:self-start">
        <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="mb-3 w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Import from text
          </button>

          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Deck name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My new deck"
            className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          />

          <dl className="mt-4 space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-neutral-600 dark:text-neutral-400">Cards</dt>
              <dd className={statusClass(cardCountStatus)}>
                {totalCards} / {DECK_RULES.MAIN_DECK_SIZE}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neutral-600 dark:text-neutral-400">Colors</dt>
              <dd className={statusClass(colorStatus)}>
                {colorsUsed.size === 0 ? "—" : [...colorsUsed].join(", ")} ({colorsUsed.size}/{DECK_RULES.MAX_COLORS_PER_DECK})
              </dd>
            </div>
          </dl>

          {error && (
            <p className="mt-3 rounded-md bg-red-50 px-2 py-1.5 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              {error}
            </p>
          )}

          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              {isPending ? "Saving..." : mode === "edit" ? "Save changes" : "Save deck"}
            </button>
            {mode === "edit" && initial && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
              >
                Delete deck
              </button>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <h3 className="mb-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            In this deck
          </h3>
          {selection.size === 0 ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Click a card on the left to add it.
            </p>
          ) : (
            <ul className="max-h-[60vh] space-y-1 overflow-y-auto">
              {[...selection.entries()]
                .map(([cardId, copies]) => ({ card: cardById.get(cardId), copies }))
                .filter((x): x is { card: Card; copies: number } => Boolean(x.card))
                .sort((a, b) => a.card.id.localeCompare(b.card.id))
                .map(({ card, copies }) => (
                  <li
                    key={card.id}
                    className="flex items-center gap-2 rounded-md px-1 py-1 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  >
                    <button
                      type="button"
                      onClick={() => setPreviewCardId(card.id)}
                      className="shrink-0"
                      aria-label={`Preview ${card.name}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={card.image_path}
                        alt={card.name}
                        className="h-10 w-7 rounded object-cover"
                        loading="lazy"
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewCardId(card.id)}
                      className="min-w-0 flex-1 truncate text-left text-xs text-neutral-700 hover:underline dark:text-neutral-300"
                    >
                      <span className="font-mono">{card.id}</span> {card.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeCopy(card.id)}
                      className="rounded-md border border-neutral-300 px-1.5 text-xs hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
                      aria-label="remove one"
                    >
                      −
                    </button>
                    <span className="w-4 text-center text-xs tabular-nums">{copies}</span>
                    <button
                      type="button"
                      onClick={() => addCopy(card)}
                      className="rounded-md border border-neutral-300 px-1.5 text-xs hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
                      aria-label="add one"
                    >
                      +
                    </button>
                  </li>
                ))}
            </ul>
          )}
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

