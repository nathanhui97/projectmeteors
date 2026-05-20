"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import DeckBuilder from "@/app/decks/_components/DeckBuilder";
import type { Card } from "@/lib/types";

type Initial = {
  id: string;
  name: string;
  entries: { card_id: string; copies: number }[];
};

type Props = {
  deckId: string;
  deckName: string;
  onClose: () => void;
  onSaved: () => void;
};

export function EditDeckModal({ deckId, deckName, onClose, onSaved }: Props) {
  const [cards, setCards] = useState<Card[] | null>(null);
  const [initial, setInitial] = useState<Initial | null>(null);

  useEffect(() => {
    fetch("/api/cards")
      .then((r) => r.json())
      .then(setCards);

    createClient()
      .from("deck_cards")
      .select("card_id, copies")
      .eq("deck_id", deckId)
      .then(({ data }) => {
        setInitial({
          id: deckId,
          name: deckName,
          entries: (data ?? []).map((r) => ({ card_id: r.card_id, copies: r.copies })),
        });
      });
  }, [deckId, deckName]);

  const loaded = cards && initial;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-neutral-50 dark:bg-neutral-950">
      <header className="flex flex-shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-6 py-3 dark:border-neutral-800 dark:bg-neutral-900">
        <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Edit deck</span>
        <button
          onClick={onClose}
          className="rounded-md px-2 py-1 text-sm text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
        >
          ✕ Close
        </button>
      </header>

      <div className="flex-1 overflow-hidden p-6">
        {!loaded ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-neutral-500">Loading deck…</p>
          </div>
        ) : (
          <DeckBuilder
            cards={cards}
            mode="edit"
            initial={initial}
            onSaved={onSaved}
          />
        )}
      </div>
    </div>
  );
}
