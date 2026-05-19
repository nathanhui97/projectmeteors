"use client";

import { useEffect, useState } from "react";

type Props = { text: string };

export default function ExportButton({ text }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API blocked; user can still select-all manually
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-800"
      >
        Export as text
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative flex w-full max-w-xl flex-col rounded-xl bg-white p-6 shadow-xl dark:bg-neutral-900"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="absolute right-3 top-3 rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
            >
              ✕
            </button>

            <h2 className="pr-8 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Export as text
            </h2>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              Alt-art variants are collapsed onto their base ID for portability with other tools.
            </p>

            <textarea
              value={text}
              readOnly
              rows={Math.min(20, text.split("\n").length + 1)}
              className="mt-3 w-full rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 font-mono text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              onFocus={(e) => e.currentTarget.select()}
            />

            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-800"
              >
                Close
              </button>
              <button
                type="button"
                onClick={copy}
                className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
              >
                {copied ? "Copied!" : "Copy to clipboard"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
