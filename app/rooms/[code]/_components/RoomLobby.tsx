"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { selectDeck, leaveRoom, setReady } from "@/lib/rooms/actions";
import { GamePanel } from "./GamePanel";
import type { Room, Deck, DeckCard, Card, DeckWithCards } from "@/lib/types";

type DeckCardWithCard = DeckCard & { card: Card };

type Props = {
  room: Room;
  currentUserId: string;
  role: "host" | "guest";
  userDecks: Deck[];
  myDeck: DeckWithCards | null;
};

export function RoomLobby({
  room: initialRoom,
  currentUserId,
  role,
  userDecks,
  myDeck: initialMyDeck,
}: Props) {
  const [room, setRoom] = useState(initialRoom);
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const [myCards, setMyCards] = useState<DeckCardWithCard[]>(
    initialMyDeck?.cards ?? [],
  );
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // ── Realtime subscription ──────────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`room:${room.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${room.id}` },
        (payload) => setRoom(payload.new as Room),
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "rooms", filter: `id=eq.${room.id}` },
        () => router.push("/rooms"),
      )
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{ user_id: string }>();
        setOnlineIds(
          new Set(Object.values(state).flatMap((p) => p.map((x) => x.user_id))),
        );
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") await channel.track({ user_id: currentUserId });
      });

    return () => { supabase.removeChannel(channel); };
  }, [room.id, currentUserId, router]);

  // ── Polling fallback (4 s) — covers networks where WebSockets are blocked ──
  useEffect(() => {
    const supabase = createClient();
    const id = setInterval(async () => {
      const { data } = await supabase
        .from("rooms")
        .select("*")
        .eq("id", room.id)
        .maybeSingle();
      if (data) setRoom(data as Room);
    }, 4000);
    return () => clearInterval(id);
  }, [room.id]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  async function handleDeckSelect(deckId: string) {
    setRoom((prev) => ({
      ...prev,
      [role === "host" ? "host_deck_id" : "guest_deck_id"]: deckId,
    }));
    startTransition(async () => {
      const result = await selectDeck(room.id, deckId, role);
      if (result.error) { setRoom(initialRoom); return; }
    });
    // Fetch the deck's cards client-side so they're ready when play starts.
    const supabase = createClient();
    const { data } = await supabase
      .from("deck_cards")
      .select("*, card:cards(*)")
      .eq("deck_id", deckId);
    setMyCards((data ?? []) as DeckCardWithCard[]);
  }

  function handleReady() {
    setRoom((prev) => ({
      ...prev,
      [role === "host" ? "host_ready" : "guest_ready"]: true,
    }));
    startTransition(async () => { await setReady(room.id, role); });
  }

  function handleLeave() {
    startTransition(async () => { await leaveRoom(room.id, role); });
  }

  // ── Derived state ──────────────────────────────────────────────────────────
  const myDeckId   = role === "host" ? room.host_deck_id  : room.guest_deck_id;
  const theirDeckId= role === "host" ? room.guest_deck_id : room.host_deck_id;
  const myReady    = role === "host" ? room.host_ready    : room.guest_ready;
  const myDeckName = userDecks.find((d) => d.id === myDeckId)?.name;
  const hostOnline = onlineIds.has(room.host_id);
  const guestOnline= !!room.guest_id && onlineIds.has(room.guest_id);
  const bothReady  = room.host_ready && room.guest_ready && !!room.guest_id;

  // ── Play view ──────────────────────────────────────────────────────────────
  if (bothReady) {
    const finished   = room.status === "finished";
    const iWon       = finished && room.winner_id === currentUserId;
    const winnerEmail= room.winner_id === room.host_id ? room.host_email : room.guest_email;
    const loserEmail = room.winner_id === room.host_id ? room.guest_email : room.host_email;

    return (
      <main className="flex h-screen flex-col overflow-hidden bg-neutral-950">
        <header className="flex flex-shrink-0 items-center justify-between border-b border-neutral-800 px-6 py-3">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-bold tracking-widest text-neutral-100">
              {room.code}
            </span>
            <span className="text-xs text-neutral-500">
              {room.host_email} vs {room.guest_email}
            </span>
          </div>
          <button
            onClick={handleLeave}
            disabled={isPending}
            className="rounded-md border border-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-400 hover:bg-neutral-800 disabled:opacity-50"
          >
            Leave
          </button>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Left — main area (video feed goes here later) */}
          <div className="flex flex-1 items-center justify-center">
            {finished ? (
              <div className="space-y-3 text-center">
                <p className="text-4xl font-bold text-neutral-100">
                  {iWon ? "You won!" : "You lost."}
                </p>
                <p className="text-sm text-neutral-400">
                  {iWon
                    ? `${loserEmail} conceded the match.`
                    : `${winnerEmail} was declared the winner.`}
                </p>
              </div>
            ) : (
              <p className="text-sm text-neutral-700">
                Video feed coming in a later phase.
              </p>
            )}
          </div>

          {/* Right — static sidebar */}
          <GamePanel
            room={room}
            role={role}
            myCards={myCards}
            currentUserId={currentUserId}
            onRoomUpdate={setRoom}
          />
        </div>
      </main>
    );
  }

  // ── Lobby view ─────────────────────────────────────────────────────────────
  const statusText = !room.guest_id
    ? "Waiting for opponent to join…"
    : !room.host_deck_id || !room.guest_deck_id
      ? "Both players connected — pick your decks"
      : !room.host_ready || !room.guest_ready
        ? "Click Ready when you're set"
        : "Both players ready — entering room…";

  const statusColor =
    room.host_ready && room.guest_ready
      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
      : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-neutral-50 p-8 dark:bg-neutral-950">
      <div className="flex w-full max-w-2xl items-center justify-between">
        <div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Room code</p>
          <p className="font-mono text-3xl font-bold tracking-[0.2em] text-neutral-900 dark:text-neutral-100">
            {room.code}
          </p>
        </div>
        <button
          onClick={handleLeave}
          disabled={isPending}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          Leave
        </button>
      </div>

      <div className={`w-full max-w-2xl rounded-lg px-4 py-2.5 text-sm font-medium ${statusColor}`}>
        {statusText}
      </div>

      <div className="grid w-full max-w-2xl grid-cols-2 gap-4">
        <PlayerCard
          label="Player 1 — Host"
          email={room.host_email}
          isOnline={hostOnline}
          isYou={role === "host"}
          isReady={room.host_ready}
          deckLabel={
            role === "host"
              ? myDeckName ?? (myDeckId ? "Loading…" : undefined)
              : theirDeckId ? "Deck selected" : undefined
          }
          decks={role === "host" ? userDecks : undefined}
          selectedDeckId={role === "host" ? myDeckId : undefined}
          onSelectDeck={role === "host" ? handleDeckSelect : undefined}
          onReady={role === "host" && !!myDeckId && !myReady ? handleReady : undefined}
          isPending={isPending}
        />
        <PlayerCard
          label="Player 2"
          email={room.guest_email ?? undefined}
          isOnline={guestOnline}
          isYou={role === "guest"}
          isReady={room.guest_ready}
          deckLabel={
            role === "guest"
              ? myDeckName ?? (myDeckId ? "Loading…" : undefined)
              : theirDeckId ? "Deck selected" : undefined
          }
          decks={role === "guest" ? userDecks : undefined}
          selectedDeckId={role === "guest" ? myDeckId : undefined}
          onSelectDeck={role === "guest" ? handleDeckSelect : undefined}
          onReady={role === "guest" && !!myDeckId && !myReady ? handleReady : undefined}
          isPending={isPending}
          empty={!room.guest_id}
        />
      </div>
    </main>
  );
}

// ── PlayerCard ───────────────────────────────────────────────────────────────

type PlayerCardProps = {
  label: string;
  email?: string;
  isOnline: boolean;
  isYou: boolean;
  isReady: boolean;
  deckLabel?: string;
  decks?: Deck[];
  selectedDeckId?: string | null;
  onSelectDeck?: (deckId: string) => void;
  onReady?: () => void;
  isPending: boolean;
  empty?: boolean;
};

function PlayerCard({
  label, email, isOnline, isYou, isReady,
  deckLabel, decks, selectedDeckId, onSelectDeck, onReady, isPending, empty,
}: PlayerCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-center gap-2">
        <span
          className={`h-2 w-2 flex-shrink-0 rounded-full ${
            empty ? "bg-neutral-300 dark:bg-neutral-600"
            : isOnline ? "bg-emerald-500"
            : "bg-neutral-400"
          }`}
        />
        <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
          {label}{isYou && " (you)"}
        </span>
      </div>

      {empty ? (
        <p className="text-sm text-neutral-400 dark:text-neutral-500">Waiting for player…</p>
      ) : (
        <>
          <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
            {email}
          </p>

          {decks && onSelectDeck ? (
            <select
              value={selectedDeckId ?? ""}
              onChange={(e) => e.target.value && onSelectDeck(e.target.value)}
              disabled={isPending || isReady}
              className="w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm text-neutral-900 outline-none focus:border-neutral-500 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
            >
              <option value="">Pick a deck…</option>
              {decks.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          ) : (
            <p className={`text-sm ${deckLabel ? "text-neutral-700 dark:text-neutral-300" : "text-neutral-400 dark:text-neutral-500"}`}>
              {deckLabel ?? "Picking deck…"}
            </p>
          )}

          {/* Ready state */}
          <div className="border-t border-neutral-100 pt-2 dark:border-neutral-800">
            {isReady ? (
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Ready</span>
              </div>
            ) : isYou ? (
              <button
                onClick={onReady}
                disabled={!onReady || isPending}
                className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
              >
                Ready
              </button>
            ) : (
              <span className="text-xs text-neutral-400 dark:text-neutral-500">Not ready</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
