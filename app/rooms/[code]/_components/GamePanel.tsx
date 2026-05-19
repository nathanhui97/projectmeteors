"use client";

import { useState, useEffect, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { showCard, clearShownCard, reportResult, leaveRoom } from "@/lib/rooms/actions";
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
  const [opponentCard, setOpponentCard] = useState<Card | null>(null);
  const [expanded, setExpanded]         = useState(false);
  const [modalOpen, setModalOpen]       = useState(false);
  const [reportError, setReportError]   = useState<string | null>(null);
  const [isPending, startTransition]    = useTransition();

  const myShownId        = role === "host" ? room.host_shown_card_id  : room.guest_shown_card_id;
  const opponentShownId  = role === "host" ? room.guest_shown_card_id : room.host_shown_card_id;
  const myShownCard      = myCards.find(({ card }) => card.id === myShownId)?.card ?? null;
  const myClaimId        = role === "host" ? room.host_result_claim   : room.guest_result_claim;
  const opponentClaimId  = role === "host" ? room.guest_result_claim  : room.host_result_claim;

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

  // Auto-open modal when opponent reports and we haven't yet, or when match ends.
  useEffect(() => {
    if (finished || disputed || (opponentClaimId && !myClaimId)) {
      setModalOpen(true);
    }
  }, [finished, disputed, opponentClaimId, myClaimId]);

  function handleShow(cardId: string) {
    onRoomUpdate({ ...room, [role === "host" ? "host_shown_card_id" : "guest_shown_card_id"]: cardId });
    startTransition(async () => { await showCard(room.id, cardId, role); });
  }

  function handleClear() {
    onRoomUpdate({ ...room, [role === "host" ? "host_shown_card_id" : "guest_shown_card_id"]: null });
    startTransition(async () => { await clearShownCard(room.id, role); });
  }

  function handleReport(winnerId: string) {
    const claimField = role === "host" ? "host_result_claim" : "guest_result_claim";
    const prevRoom = room;
    setReportError(null);
    onRoomUpdate({ ...room, [claimField]: winnerId });
    startTransition(async () => {
      const result = await reportResult(room.id, winnerId, role);
      if (result.error) {
        onRoomUpdate(prevRoom);
        setReportError(result.error);
      }
    });
  }

  function handleLeave() {
    startTransition(async () => { await leaveRoom(room.id, role); });
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
        <div className="flex flex-1 flex-col overflow-hidden border-b border-neutral-800 p-3">
          <p className="mb-2 text-xs font-medium text-neutral-500">Your deck — tap to show</p>
          {myCards.length === 0 ? (
            <p className="py-4 text-center text-xs text-neutral-600">No deck loaded</p>
          ) : (
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-4 gap-x-2 gap-y-3">
                {myCards.map(({ card, copies }) => (
                  <button
                    key={card.id}
                    onClick={() => handleShow(card.id)}
                    disabled={isPending || finished}
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
            </div>
          )}
          <div className="mt-2 flex items-center justify-between border-t border-neutral-800 pt-2">
            <p className="truncate text-xs text-neutral-500">
              Showing:{" "}
              <span className="font-medium text-neutral-200">{myShownCard?.name ?? "—"}</span>
            </p>
            {myShownId && !finished && (
              <button onClick={handleClear} disabled={isPending}
                className="ml-2 flex-shrink-0 text-xs text-neutral-500 hover:text-neutral-200 disabled:opacity-50">
                Clear
              </button>
            )}
          </div>
        </div>

        {/* ── Report Match button ───────────────────────────────── */}
        <div className="flex-shrink-0 p-3">
          {finished ? (
            <button
              onClick={() => setModalOpen(true)}
              className="w-full rounded-md bg-neutral-800 px-3 py-2 text-sm font-medium text-neutral-300 hover:bg-neutral-700"
            >
              View Result
            </button>
          ) : (
            <button
              onClick={() => setModalOpen(true)}
              disabled={isPending}
              className="w-full rounded-md border border-neutral-700 px-3 py-2 text-sm font-medium text-neutral-400 hover:border-neutral-500 hover:text-neutral-200 disabled:opacity-50"
            >
              {myClaimId ? "Waiting for opponent…" : "Report Match"}
            </button>
          )}
        </div>
      </aside>

      {/* ── Match result modal ────────────────────────────────────── */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70"
          onClick={() => { if (!finished) setModalOpen(false); }}
        >
          <div
            className="w-80 rounded-2xl border border-neutral-700 bg-neutral-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Match finished ── */}
            {finished && (
              <div className="space-y-5 text-center">
                <p className="text-4xl font-bold text-neutral-100">
                  {iWon ? "You won!" : "You lost."}
                </p>
                <p className="text-sm text-neutral-400">
                  {iWon
                    ? `${emailOf(room.winner_id === room.host_id ? room.guest_id : room.host_id)} lost.`
                    : `${emailOf(room.winner_id)} was declared the winner.`}
                </p>
                <button
                  onClick={handleLeave}
                  disabled={isPending}
                  className="w-full rounded-lg bg-neutral-100 px-4 py-2.5 text-sm font-semibold text-neutral-900 hover:bg-white disabled:opacity-50"
                >
                  Exit Match
                </button>
              </div>
            )}

            {/* ── Disputed — re-pick ── */}
            {disputed && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <p className="text-base font-semibold text-red-400">Results don&apos;t match</p>
                  <p className="text-xs text-neutral-500">Discuss with your opponent, then re-submit.</p>
                </div>
                <div className="rounded-lg bg-neutral-800 p-3 text-xs space-y-1">
                  <p className="text-neutral-400">You reported: <span className="font-medium text-neutral-200">{emailOf(myClaimId)}</span></p>
                  <p className="text-neutral-400">Opponent reported: <span className="font-medium text-neutral-200">{emailOf(opponentClaimId)}</span></p>
                </div>
                <p className="text-xs font-medium text-neutral-400">Who won?</p>
                <div className="space-y-2">
                  <button onClick={() => handleReport(room.host_id)} disabled={isPending}
                    className="w-full truncate rounded-lg bg-emerald-800 px-3 py-2.5 text-left text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                    {room.host_email}
                  </button>
                  <button onClick={() => handleReport(room.guest_id!)} disabled={isPending}
                    className="w-full truncate rounded-lg bg-emerald-800 px-3 py-2.5 text-left text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                    {room.guest_email ?? "Player 2"}
                  </button>
                </div>
                <button onClick={() => setModalOpen(false)} disabled={isPending}
                  className="w-full text-xs text-neutral-500 hover:text-neutral-300 disabled:opacity-50">
                  Close
                </button>
              </div>
            )}

            {/* ── Active: waiting for opponent ── */}
            {!finished && !disputed && myClaimId && (
              <div className="space-y-4 text-center">
                <div className="space-y-1">
                  <p className="text-base font-semibold text-neutral-100">Waiting for opponent</p>
                  <p className="text-xs text-neutral-500">
                    You reported <span className="font-medium text-neutral-300">{emailOf(myClaimId)}</span> as winner.
                  </p>
                </div>
                <div className="flex justify-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-700 border-t-neutral-300" />
                </div>
                <button onClick={() => setModalOpen(false)}
                  className="w-full text-xs text-neutral-500 hover:text-neutral-300">
                  Close
                </button>
              </div>
            )}

            {/* ── Active: opponent has reported, your turn ── */}
            {!finished && !disputed && !myClaimId && opponentClaimId && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <p className="text-base font-semibold text-neutral-100">Opponent has reported</p>
                  <p className="text-xs text-neutral-500">Submit your result to confirm.</p>
                </div>
                <p className="text-xs font-medium text-neutral-400">Who won?</p>
                <div className="space-y-2">
                  <button onClick={() => handleReport(room.host_id)} disabled={isPending}
                    className="w-full truncate rounded-lg bg-emerald-800 px-3 py-2.5 text-left text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                    {room.host_email}
                  </button>
                  <button onClick={() => handleReport(room.guest_id!)} disabled={isPending}
                    className="w-full truncate rounded-lg bg-emerald-800 px-3 py-2.5 text-left text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                    {room.guest_email ?? "Player 2"}
                  </button>
                </div>
                {reportError && (
                  <p className="rounded-lg bg-red-950 px-3 py-2 text-xs text-red-400">{reportError}</p>
                )}
              </div>
            )}

            {/* ── Active: neither has reported yet ── */}
            {!finished && !disputed && !myClaimId && !opponentClaimId && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <p className="text-base font-semibold text-neutral-100">Report Match Result</p>
                  <p className="text-xs text-neutral-500">Both players must agree on the winner.</p>
                </div>
                <p className="text-xs font-medium text-neutral-400">Who won?</p>
                <div className="space-y-2">
                  <button onClick={() => handleReport(room.host_id)} disabled={isPending}
                    className="w-full truncate rounded-lg bg-emerald-800 px-3 py-2.5 text-left text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                    {room.host_email}
                  </button>
                  <button onClick={() => handleReport(room.guest_id!)} disabled={isPending}
                    className="w-full truncate rounded-lg bg-emerald-800 px-3 py-2.5 text-left text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                    {room.guest_email ?? "Player 2"}
                  </button>
                </div>
                {reportError && (
                  <p className="rounded-lg bg-red-950 px-3 py-2 text-xs text-red-400">{reportError}</p>
                )}
                <button onClick={() => setModalOpen(false)} disabled={isPending}
                  className="w-full text-xs text-neutral-500 hover:text-neutral-300 disabled:opacity-50">
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Fullscreen card expand ────────────────────────────────── */}
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
