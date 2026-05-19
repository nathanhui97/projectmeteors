"use client";

import { useEffect, useMemo, useState } from "react";
import type { Card } from "@/lib/types";
import { parseDecklist } from "@/lib/decks/parse";

type Props = {
  catalog: Card[];
  onLoad: (entries: { card_id: string; copies: number }[]) => void;
  onClose: () => void;
};

export default function ImportModal({ catalog, onLoad, onClose }: Props) {
  const [text, setText] = useState("");
  const [showSkipped, setShowSkipped] = useState(false);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const result = useMemo(() => parseDecklist(text, catalog), [text, catalog]);
  const totalCopies = result.entries.reduce((sum, e) => sum + e.copies, 0);
  const canLoad = result.entries.length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative flex w-full max-w-2xl flex-col rounded-xl bg-white p-6 shadow-xl dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
        >
          ✕
        </button>

        <h2 className="pr-8 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Import from text
        </h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Paste a decklist. Lines look like{" "}
          <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">4x GD01-118</code>.
          Use <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">// Main Deck</code>{" "}
          and <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">// Resource Deck</code> as section headers.
        </p>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={12}
          placeholder={"// Main Deck\n4x ST05-004\n3x GD01-118\n2x ST09-010"}
          className="mt-3 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 font-mono text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          spellCheck={false}
        />

        {text.trim() && (
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex items-center gap-3">
              <span className="text-neutral-700 dark:text-neutral-300">
                <strong>{totalCopies}</strong> cards · <strong>{result.entries.length}</strong> unique entries
              </span>
              {result.skipped.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowSkipped((s) => !s)}
                  className="text-amber-700 hover:underline dark:text-amber-400"
                >
                  {result.skipped.length} line{result.skipped.length === 1 ? "" : "s"} skipped {showSkipped ? "▲" : "▼"}
                </button>
              )}
            </div>

            {showSkipped && result.skipped.length > 0 && (
              <ul className="max-h-40 overflow-y-auto rounded-md border border-amber-200 bg-amber-50 p-2 text-xs dark:border-amber-900 dark:bg-amber-950">
                {result.skipped.map((s, i) => (
                  <li key={i} className="py-0.5 text-amber-900 dark:text-amber-200">
                    <span className="text-amber-600 dark:text-amber-400">Line {s.lineNumber}:</span>{" "}
                    <code className="font-mono">{s.text || "(empty)"}</code> — {s.reason}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onLoad(result.entries);
              onClose();
            }}
            disabled={!canLoad}
            className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            Load into builder
          </button>
        </div>

        <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
          Loading replaces what&apos;s currently in the builder. Nothing is saved until you click <strong>Save</strong>.
        </p>
      </div>
    </div>
  );
}
