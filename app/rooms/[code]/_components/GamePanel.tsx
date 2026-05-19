"use client";

import { useState, useEffect, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { showCard, clearShownCard, reportResult } from "@/lib/rooms/actions";
import type { Room, Card, DeckCard } from "@/lib/types";

type DeckCardWithCard = DeckCard & { card: Card };

type Props = {
  room: Room;
  role: "host" | "guest";
  myCards: DeckCardWithCard[];
  currentUserId: string;
  onRoomUpdate: (room: Room) => void;
};

export function GamePanel({ room, role, myCards, currentUserId, onRoomUpdate }: Props) {
  const [opponentCard, setOpponentCard]   = useState<Card | null>(null);
  const [expanded, setExpanded]           = useState(false);
  const [pickingWinner, setPickingWinner] = useState(false);
  const [isPending, startTransition]      = useTransition();

  const myShownId       = role === "host" ? room.host_shown_card_id  : room.guest_shown_card_id;
  const opponentShownId = role === "host" ? room.guest_shown_card_id : room.host_shown_card_id;
  const myShownCard     = myCards.find(({ card }) => card.id === myShownId)?.card ?? null;
  const myClaimId       = role === "host" ? room.host_result_claim   : room.guest_result_claim;

  const finished = room.status === "finished";
  const disputed = room.status === "disputed";
  const iWon     = finished && room.winner_id === currentUserId;

  const emailOf = (id: string | null) =>
    id === room.host_id ? room.host_email : (room.guest_email ?? "Player 2");

  // Fetch opponent's shown card when it changes.
  useEffect(() => {
    if (!opponentShownId) { setOpponentCard(null); return; }
    const cached = myCards.find(({ card }) => card.id === opponentShownId);
    if (cached) { setOpponentCard(cached.card); return; }
    const supabase = createClient();
    supabase.from("cards").select("*").eq("id", opponentShownId).single()
      .then(({ data }) => { if (data) setOpponentCard(data as Card); });
  }, [opponentShownId, myCards]);

  useEffect(() => {
    if (finished || disputed) setPickingWinner(false);
  }, [finished, disputed]);

  function handleShow(cardId: string) {
    onRoomUpdate({ ...room, [role === "host" ? "host_shown_card_id" : "guest_shown_card_id"]: cardId });
    startTransition(async () => { await showCard(room.id, cardId, role); });
  }

  function handleClear() {
    onRoomUpdate({ ...room, [role === "host" ? "host_shown_card_id" : "guest_shown_card_id"]: null });
    startTransition(async () => { await clearShownCard(room.id, role); });
  }

  function handleReport(winnerId: string) {
    startTransition(async () => {
      await reportResult(room.id, winnerId, role);
      setPickingWinner(false);
    });
  }

  return (
    <>
      <aside className="flex h-full w-80 flex-shrink-0 flex-col border-l border-neutral-800 bg-neutral-900">

        {/* ── Opponent's card ───────────────────────────────────── */}
        <div className="border-b border-neutral-800 p-3">
          <p className="mb-2 text-xs font-medium text-neutral-500">Opponent&apos;s card</p>
          {opponentCard ? (
            <button
              onClick={() => setExpanded(true)}
              className="mx-auto block aspect-[5/7] w-36 overflow-hidden rounded-lg border border-neutral-700 shadow-sm transition-opacity hover:opacity-90"
              title="Click to expand"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={opponentCard.image_path} alt={opponentCard.name} className="h-full w-full object-cover" />
            </button>
          ) : (
            <p className="py-4 text-center text-xs text-neutral-600">Nothing shown</p>
          )}
        </div>

        {/* ── My deck browser ───────────────────────────────────── */}
        {!finished && !disputed && (
          <div className="flex flex-1 flex-col overflow-hidden border-b border-neutral-800 p-3">
            <p className="mb-2 text-xs font-medium text-neutral-500">Your deck — tap to show</p>
            {myCards.length === 0 ? (
              <p className="py-4 text-center text-xs text-neutral-600">No deck loaded</p>
            ) : (
              <div className="grid flex-1 grid-cols-3 gap-2 overflow-y-auto">
                {myCards.map(({ card, copies }) => (
                  <button
                    key={card.id}
                    onClick={() => handleShow(card.id)}
                    disabled={isPending}
                    title={card.name}
                    className={`relative aspect-[5/7] overflow-hidden rounded border-2 transition-colors disabled:opacity-60 ${
                      myShownId === card.id
                        ? "border-blue-500"
                        : "border-transparent hover:border-neutral-500"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={card.image_path} alt={card.name} className="h-full w-full object-cover" />
                    {copies > 1 && (
                      <span className="absolute bottom-0.5 right-0.5 rounded bg-black/70 px-0.5 text-[8px] font-bold leading-3 text-white">
                        ×{copies}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
            <div className="mt-2 flex items-center justify-between border-t border-neutral-800 pt-2">
              <p className="truncate text-xs text-neutral-500">
                Showing:{" "}
                <span className="font-medium text-neutral-200">{myShownCard?.name ?? "—"}</span>
              </p>
              {myShownId && (
                <button onClick={handleClear} disabled={isPending}
                  className="ml-2 flex-shrink-0 text-xs text-neutral-500 hover:text-neutral-200 disabled:opacity-50">
                  Clear
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Match section ─────────────────────────────────────── */}
        <div className="flex-shrink-0 p-3">

          {/* Match confirmed */}
          {finished && (
            <div className="space-y-1 text-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">Match over</p>
              <p className="text-sm font-semibold text-emerald-400">
                {iWon ? "You won!" : `${emailOf(room.winner_id)} won`}
              </p>
              <p className="text-xs text-neutral-500">
                {iWon ? "Opponent lost" : "You lost"}
              </p>
            </div>
          )}

          {/* Disputed — ask them to re-report */}
          {disputed && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-red-400">Reports don&apos;t match</p>
              <p className="text-xs text-neutral-400">
                You: <span className="text-neutral-200">{emailOf(myClaimId)}</span>
              </p>
              <p className="text-xs text-neutral-400">
                Opponent: <span className="text-neutral-200">{emailOf(role === "host" ? room.guest_result_claim : room.host_result_claim)}</span>
              </p>
              <p className="text-xs text-neutral-500">Discuss with your opponent and re-submit.</p>
              <button
                onClick={() => setPickingWinner(true)}
                disabled={isPending}
                className="w-full rounded-md border border-neutral-700 px-3 py-2 text-sm text-neutral-300 hover:border-neutral-500 disabled:opacity-50"
              >
                Re-submit result
              </button>
            </div>
          )}

          {/* Active — no claim yet or waiting */}
          {!finished && !disputed && !pickingWinner && (
            <div className="space-y-2">
              {myClaimId ? (
                <>
                  <p className="text-xs text-neutral-400">
                    You reported <span className="font-medium text-neutral-200">{emailOf(myClaimId)}</span> as winner.
                    Waiting for opponent.
                  </p>
                  <button onClick={() => setPickingWinner(true)} disabled={isPending}
                    className="w-full text-xs text-neutral-500 hover:text-neutral-300 disabled:opacity-50">
                    Change
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setPickingWinner(true)}
                  disabled={isPending}
                  className="w-full rounded-md border border-neutral-700 px-3 py-2 text-sm font-medium text-neutral-400 hover:border-neutral-500 hover:text-neutral-200 disabled:opacity-50"
                >
                  End Match
                </button>
              )}
            </div>
          )}

          {/* Winner picker */}
          {!finished && !disputed && pickingWinner && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-neutral-400">Who won?</p>
              <button onClick={() => handleReport(room.host_id)} disabled={isPending}
                className="w-full truncate rounded-md bg-emerald-800 px-3 py-2 text-left text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                {room.host_email}
              </button>
              <button onClick={() => handleReport(room.guest_id!)} disabled={isPending}
                className="w-full truncate rounded-md bg-emerald-800 px-3 py-2 text-left text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                {room.guest_email ?? "Player 2"}
              </button>
              <button onClick={() => setPickingWinner(false)} disabled={isPending}
                className="w-full text-xs text-neutral-500 hover:text-neutral-300 disabled:opacity-50">
                Cancel
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Fullscreen card expand */}
      {expanded && opponentCard && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80"
          onClick={() => setExpanded(false)}>
          <div className="max-h-[90vh] max-w-[90vw]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={opponentCard.image_path} alt={opponentCard.name}
              className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl" />
            <p className="mt-2 text-center text-sm text-neutral-300">
              {opponentCard.name} — click anywhere to close
            </p>
          </div>
        </div>
      )}
    </>
  );
}
