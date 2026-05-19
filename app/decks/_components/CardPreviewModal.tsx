"use client";

import { useEffect } from "react";
import type { Card } from "@/lib/types";

type Props = {
  card: Card;
  copies: number;
  onAdd: () => void;
  onRemove: () => void;
  onClose: () => void;
};

export default function CardPreviewModal({ card, copies, onAdd, onRemove, onClose }: Props) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "+" || e.key === "=") onAdd();
      else if (e.key === "-" || e.key === "_") onRemove();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onAdd, onRemove, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative grid w-full max-w-4xl gap-6 rounded-xl bg-white p-6 shadow-xl dark:bg-neutral-900 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
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

        <div className="flex items-start justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={card.image_path}
            alt={card.name}
            className="max-h-[70vh] w-full rounded-md object-contain"
          />
        </div>

        <div className="flex min-w-0 flex-col">
          <header className="mb-3 pr-8">
            <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
              <span className="font-mono">{card.id}</span>
              {card.rarity && (
                <span className="rounded bg-neutral-100 px-1.5 py-0.5 font-semibold dark:bg-neutral-800">
                  {card.rarity}
                </span>
              )}
              <span>{card.set_code}</span>
            </div>
            <h2 className="mt-1 text-xl font-semibold text-neutral-900 dark:text-neutral-100">
              {card.name}
            </h2>
          </header>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
            {card.card_type && <DlRow label="Type" value={card.card_type} />}
            {card.color && <DlRow label="Color" value={card.color} />}
            {card.level != null && <DlRow label="Level" value={String(card.level)} />}
            {card.cost != null && <DlRow label="Cost" value={String(card.cost)} />}
            {card.ap != null && <DlRow label="AP" value={String(card.ap)} />}
            {card.hp != null && <DlRow label="HP" value={String(card.hp)} />}
            {card.zone && <DlRow label="Zone" value={card.zone} />}
            {card.link && <DlRow label="Link" value={card.link} />}
          </dl>

          {card.trait && (
            <p className="mt-3 text-sm text-neutral-700 dark:text-neutral-300">
              <span className="font-medium text-neutral-900 dark:text-neutral-100">Trait: </span>
              {card.trait}
            </p>
          )}

          {card.effect && (
            <div className="mt-3 rounded-md bg-neutral-50 p-3 text-sm text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                Effect
              </p>
              <p className="whitespace-pre-wrap leading-relaxed">{card.effect}</p>
            </div>
          )}

          {card.source_title && (
            <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
              {card.source_title}
            </p>
          )}

          <div className="mt-auto flex items-center gap-2 pt-4">
            <button
              type="button"
              onClick={onRemove}
              disabled={copies === 0}
              className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm hover:bg-neutral-100 disabled:opacity-40 dark:border-neutral-700 dark:hover:bg-neutral-800"
              aria-label="Remove one copy"
            >
              −
            </button>
            <span className="min-w-12 text-center text-sm tabular-nums text-neutral-700 dark:text-neutral-300">
              {copies} in deck
            </span>
            <button
              type="button"
              onClick={onAdd}
              className="flex-1 rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              + Add to deck
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DlRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 border-b border-neutral-100 pb-1 dark:border-neutral-800">
      <dt className="text-neutral-500 dark:text-neutral-400">{label}</dt>
      <dd className="font-medium text-neutral-900 dark:text-neutral-100">{value}</dd>
    </div>
  );
}
