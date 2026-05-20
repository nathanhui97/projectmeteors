"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createRoom, joinRoom } from "@/lib/rooms/actions";
import { EditDeckModal } from "./EditDeckModal";

export type DeckSummary = {
  id: string;
  name: string;
  totalCards: number;
  colors: string[];
};

type Props = {
  decks: DeckSummary[];
  error?: string;
};

export function RoomsClient({ decks, error }: Props) {
  const router = useRouter();
  const [selectedDeckId, setSelectedDeckId] = useState<string>(decks[0]?.id ?? "");
  const [code, setCode] = useState("");
  const [isPending, startTransition] = useTransition();
  const [editingDeckId, setEditingDeckId] = useState<string | null>(null);

  const selectedDeck = decks.find((d) => d.id === selectedDeckId);

  function submit(mode: "create" | "join") {
    const formData = new FormData();
    if (selectedDeckId) formData.set("deck_id", selectedDeckId);
    if (mode === "join") formData.set("code", code.trim().toUpperCase());
    startTransition(async () => {
      if (mode === "create") await createRoom(formData);
      else await joinRoom(formData);
    });
  }

  function handleSaved() {
    setEditingDeckId(null);
    router.refresh();
  }

  return (
    <>
      <div className="w-full max-w-sm space-y-5 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            Game Room
          </h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Pick your deck, then create or join a room.
          </p>
        </div>

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
            {error}
          </p>
        )}

        {/* Deck selector */}
        <div>
          <p className="mb-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">
            Your deck
          </p>

          {decks.length === 0 ? (
            <div className="rounded-lg border border-neutral-200 px-4 py-3 dark:border-neutral-800">
              <p className="text-sm text-neutral-500 dark:text-neutral-400">No decks yet.</p>
              <a href="/decks/new" className="mt-1 block text-xs text-neutral-700 underline dark:text-neutral-300">
                Build one →
              </a>
            </div>
          ) : decks.length === 1 ? (
            /* Single deck — show as a row with Edit button */
            <div className="flex items-center justify-between rounded-lg border border-neutral-900 bg-neutral-50 px-3 py-2.5 dark:border-neutral-300 dark:bg-neutral-800">
              <div>
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {decks[0].name}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {decks[0].totalCards} / 50 cards
                  {decks[0].colors.length > 0 && ` · ${decks[0].colors.join(", ")}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingDeckId(decks[0].id)}
                className="ml-3 shrink-0 text-xs text-neutral-500 hover:text-neutral-800 hover:underline dark:hover:text-neutral-200"
              >
                Edit
              </button>
            </div>
          ) : (
            /* Multiple decks — dropdown */
            <div className="space-y-2">
              <div className="flex gap-2">
                <select
                  value={selectedDeckId}
                  onChange={(e) => setSelectedDeckId(e.target.value)}
                  className="min-w-0 flex-1 rounded-md border border-neutral-300 bg-white px-2 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
                >
                  {decks.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
                {selectedDeck && (
                  <button
                    type="button"
                    onClick={() => setEditingDeckId(selectedDeckId)}
                    className="shrink-0 rounded-md border border-neutral-300 px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  >
                    Edit
                  </button>
                )}
              </div>
              {selectedDeck && (
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {selectedDeck.totalCards} / 50 cards
                  {selectedDeck.colors.length > 0 && ` · ${selectedDeck.colors.join(", ")}`}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => submit("create")}
            disabled={isPending || !selectedDeckId}
            className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            {isPending ? "Loading…" : "Create Room"}
          </button>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-700" />
            <span className="text-xs text-neutral-400">or join with a code</span>
            <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-700" />
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="XXXXXX"
              maxLength={6}
              autoComplete="off"
              className="min-w-0 flex-1 rounded-md border border-neutral-300 bg-white px-3 py-2 text-center font-mono text-sm uppercase tracking-widest text-neutral-900 outline-none placeholder:text-neutral-300 focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100 dark:placeholder:text-neutral-600"
            />
            <button
              type="button"
              onClick={() => submit("join")}
              disabled={isPending || !selectedDeckId || code.trim().length !== 6}
              className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-800"
            >
              Join
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-neutral-500 dark:text-neutral-400">
          <a href="/" className="hover:underline">← Back</a>
          <div className="flex gap-4">
            <a href="/camera-test" className="hover:underline">Camera test</a>
            <a href="/history" className="hover:underline">Match history</a>
          </div>
        </div>
      </div>

      {editingDeckId && (
        <EditDeckModal
          deckId={editingDeckId}
          deckName={decks.find((d) => d.id === editingDeckId)?.name ?? ""}
          onClose={() => setEditingDeckId(null)}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}
