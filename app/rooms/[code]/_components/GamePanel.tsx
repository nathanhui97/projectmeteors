"use client";

import { useState, useEffect, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { showCard, clearShownCard } from "@/lib/rooms/actions";
import type { Room, Card, DeckCard } from "@/lib/types";

type DeckCardWithCard = DeckCard & { card: Card };

type Props = {
  room: Room;
  role: "host" | "guest";
  myCards: DeckCardWithCard[];
  onRoomUpdate: (room: Room) => void;
};

export function GamePanel({ room, role, myCards, onRoomUpdate }: Props) {
  const [pos, setPos] = useState({ x: 0, y: 20 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ mx: 0, my: 0, px: 0, py: 0 });
  const [opponentCard, setOpponentCard] = useState<Card | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();

  const myShownId = role === "host" ? room.host_shown_card_id : room.guest_shown_card_id;
  const opponentShownId = role === "host" ? room.guest_shown_card_id : room.host_shown_card_id;
  const myShownCard = myCards.find(({ card }) => card.id === myShownId)?.card ?? null;

  // Default position: top-right of viewport after mount.
  useEffect(() => {
    setPos({ x: Math.max(0, window.innerWidth - 344), y: 20 });
  }, []);

  // Fetch the opponent's shown card whenever it changes.
  useEffect(() => {
    if (!opponentShownId) {
      setOpponentCard(null);
      return;
    }
    // Check myCards first (avoid a round-trip if it's in my deck too).
    const cached = myCards.find(({ card }) => card.id === opponentShownId);
    if (cached) {
      setOpponentCard(cached.card);
      return;
    }
    const supabase = createClient();
    supabase
      .from("cards")
      .select("*")
      .eq("id", opponentShownId)
      .single()
      .then(({ data }) => { if (data) setOpponentCard(data as Card); });
  }, [opponentShownId, myCards]);

  // Drag: attach global listeners only while dragging.
  useEffect(() => {
    if (!dragging) return;
    function onMove(e: MouseEvent) {
      setPos({
        x: Math.max(0, dragStart.px + (e.clientX - dragStart.mx)),
        y: Math.max(0, dragStart.py + (e.clientY - dragStart.my)),
      });
    }
    function onUp() { setDragging(false); }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging, dragStart]);

  function handleShow(cardId: string) {
    // Optimistic: update parent room state immediately.
    onRoomUpdate({
      ...room,
      [role === "host" ? "host_shown_card_id" : "guest_shown_card_id"]: cardId,
    });
    startTransition(async () => {
      await showCard(room.id, cardId, role);
    });
  }

  function handleClear() {
    onRoomUpdate({
      ...room,
      [role === "host" ? "host_shown_card_id" : "guest_shown_card_id"]: null,
    });
    startTransition(async () => {
      await clearShownCard(room.id, role);
    });
  }

  return (
    <>
    <div
      style={{ left: pos.x, top: pos.y }}
      className="fixed z-50 w-80 select-none rounded-xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-700 dark:bg-neutral-900"
    >
      {/* Drag handle */}
      <div
        onMouseDown={(e) => {
          e.preventDefault();
          setDragging(true);
          setDragStart({ mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y });
        }}
        className="flex cursor-grab items-center justify-between rounded-t-xl border-b border-neutral-200 px-3 py-2 active:cursor-grabbing dark:border-neutral-700"
      >
        <span className="text-xs font-semibold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
          Card Table
        </span>
        <span className="text-[10px] text-neutral-400 dark:text-neutral-500">drag to move</span>
      </div>

      {/* Opponent's shown card */}
      <div className="border-b border-neutral-200 p-3 dark:border-neutral-700">
        <p className="mb-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">
          Opponent&apos;s card
        </p>
        {opponentCard ? (
          <button
            onClick={() => setExpanded(true)}
            className="mx-auto block aspect-[5/7] w-36 overflow-hidden rounded-lg border border-neutral-200 shadow-sm transition-opacity hover:opacity-90 dark:border-neutral-700"
            title="Click to expand"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={opponentCard.image_path}
              alt={opponentCard.name}
              className="h-full w-full object-cover"
            />
          </button>
        ) : (
          <p className="py-4 text-center text-xs text-neutral-400 dark:text-neutral-500">
            Nothing shown
          </p>
        )}
      </div>

      {/* My deck browser */}
      <div className="p-3">
        <p className="mb-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">
          Your deck — tap to show
        </p>
        {myCards.length === 0 ? (
          <p className="py-4 text-center text-xs text-neutral-400 dark:text-neutral-500">
            No deck loaded
          </p>
        ) : (
          <div className="grid max-h-52 grid-cols-4 gap-1 overflow-y-auto">
            {myCards.map(({ card, copies }) => (
              <button
                key={card.id}
                onClick={() => handleShow(card.id)}
                disabled={isPending}
                title={card.name}
                className={`relative aspect-[5/7] overflow-hidden rounded border-2 transition-colors disabled:opacity-60 ${
                  myShownId === card.id
                    ? "border-blue-500"
                    : "border-transparent hover:border-neutral-400 dark:hover:border-neutral-500"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={card.image_path}
                  alt={card.name}
                  className="h-full w-full object-cover"
                />
                {copies > 1 && (
                  <span className="absolute bottom-0.5 right-0.5 rounded bg-black/70 px-0.5 text-[8px] font-bold leading-3 text-white">
                    ×{copies}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Currently showing strip */}
        <div className="mt-2 flex items-center justify-between border-t border-neutral-200 pt-2 dark:border-neutral-700">
          <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
            Showing:{" "}
            <span className="font-medium text-neutral-900 dark:text-neutral-100">
              {myShownCard?.name ?? "—"}
            </span>
          </p>
          {myShownId && (
            <button
              onClick={handleClear}
              disabled={isPending}
              className="ml-2 flex-shrink-0 text-xs text-neutral-400 hover:text-neutral-700 disabled:opacity-50 dark:text-neutral-500 dark:hover:text-neutral-200"
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </div>

    {/* Fullscreen expand overlay */}

    {expanded && opponentCard && (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80"
        onClick={() => setExpanded(false)}
      >
        <div className="relative max-h-[90vh] max-w-[90vw]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={opponentCard.image_path}
            alt={opponentCard.name}
            className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
          />
          <p className="mt-2 text-center text-sm text-neutral-300">{opponentCard.name} — click anywhere to close</p>
        </div>
      </div>
    )}
    </>
  );
}
