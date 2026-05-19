"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { selectDeck, leaveRoom } from "@/lib/rooms/actions";
import type { Room, Deck } from "@/lib/types";

type Props = {
  room: Room;
  currentUserId: string;
  role: "host" | "guest";
  userDecks: Deck[];
};

export function RoomLobby({ room: initialRoom, currentUserId, role, userDecks }: Props) {
  const [room, setRoom] = useState(initialRoom);
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`room:${room.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rooms",
          filter: `id=eq.${room.id}`,
        },
        (payload) => {
          setRoom(payload.new as Room);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "rooms",
          filter: `id=eq.${room.id}`,
        },
        () => {
          router.push("/rooms");
        },
      )
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{ user_id: string }>();
        const ids = new Set(
          Object.values(state).flatMap((presences) =>
            presences.map((p) => p.user_id),
          ),
        );
        setOnlineIds(ids);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ user_id: currentUserId });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room.id, currentUserId, router]);

  function handleDeckSelect(deckId: string) {
    // Optimistic update so the dropdown reflects the selection immediately.
    setRoom((prev) => ({
      ...prev,
      [role === "host" ? "host_deck_id" : "guest_deck_id"]: deckId,
    }));
    startTransition(async () => {
      const result = await selectDeck(room.id, deckId, role);
      if (result.error) {
        setRoom(initialRoom);
      }
    });
  }

  function handleLeave() {
    startTransition(async () => {
      await leaveRoom(room.id, role);
    });
  }

  const hostOnline = onlineIds.has(room.host_id);
  const guestOnline = !!room.guest_id && onlineIds.has(room.guest_id);
  const myDeckId = role === "host" ? room.host_deck_id : room.guest_deck_id;
  const theirDeckId = role === "host" ? room.guest_deck_id : room.host_deck_id;
  const myDeckName = userDecks.find((d) => d.id === myDeckId)?.name;
  const bothReady = !!room.host_deck_id && !!room.guest_deck_id && !!room.guest_id;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-neutral-50 p-8 dark:bg-neutral-950">
      {/* Header row */}
      <div className="flex w-full max-w-2xl items-center justify-between">
        <div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Room code
          </p>
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

      {/* Status banner */}
      <div
        className={`w-full max-w-2xl rounded-lg px-4 py-2.5 text-sm font-medium ${
          bothReady
            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
            : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
        }`}
      >
        {!room.guest_id
          ? "Waiting for opponent to join…"
          : !room.host_deck_id || !room.guest_deck_id
            ? "Both players connected — pick your decks"
            : "Both players ready!"}
      </div>

      {/* Player cards */}
      <div className="grid w-full max-w-2xl grid-cols-2 gap-4">
        <PlayerCard
          label="Player 1 — Host"
          email={room.host_email}
          isOnline={hostOnline}
          isYou={role === "host"}
          deckLabel={
            role === "host"
              ? myDeckName ?? (myDeckId ? "Loading…" : undefined)
              : theirDeckId
                ? "Deck selected"
                : undefined
          }
          decks={role === "host" ? userDecks : undefined}
          selectedDeckId={role === "host" ? myDeckId : undefined}
          onSelectDeck={role === "host" ? handleDeckSelect : undefined}
          isPending={isPending}
        />
        <PlayerCard
          label="Player 2"
          email={room.guest_email ?? undefined}
          isOnline={guestOnline}
          isYou={role === "guest"}
          deckLabel={
            role === "guest"
              ? myDeckName ?? (myDeckId ? "Loading…" : undefined)
              : theirDeckId
                ? "Deck selected"
                : undefined
          }
          decks={role === "guest" ? userDecks : undefined}
          selectedDeckId={role === "guest" ? myDeckId : undefined}
          onSelectDeck={role === "guest" ? handleDeckSelect : undefined}
          isPending={isPending}
          empty={!room.guest_id}
        />
      </div>
    </main>
  );
}

type PlayerCardProps = {
  label: string;
  email?: string;
  isOnline: boolean;
  isYou: boolean;
  deckLabel?: string;
  decks?: Deck[];
  selectedDeckId?: string | null;
  onSelectDeck?: (deckId: string) => void;
  isPending: boolean;
  empty?: boolean;
};

function PlayerCard({
  label,
  email,
  isOnline,
  isYou,
  deckLabel,
  decks,
  selectedDeckId,
  onSelectDeck,
  isPending,
  empty,
}: PlayerCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      {/* Label + presence dot */}
      <div className="flex items-center gap-2">
        <span
          className={`h-2 w-2 flex-shrink-0 rounded-full ${
            empty
              ? "bg-neutral-300 dark:bg-neutral-600"
              : isOnline
                ? "bg-emerald-500"
                : "bg-neutral-400"
          }`}
        />
        <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
          {label}
          {isYou && " (you)"}
        </span>
      </div>

      {empty ? (
        <p className="text-sm text-neutral-400 dark:text-neutral-500">
          Waiting for player…
        </p>
      ) : (
        <>
          <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
            {email}
          </p>

          {/* Deck area */}
          {decks && onSelectDeck ? (
            <select
              value={selectedDeckId ?? ""}
              onChange={(e) => e.target.value && onSelectDeck(e.target.value)}
              disabled={isPending}
              className="w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm text-neutral-900 outline-none focus:border-neutral-500 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
            >
              <option value="">Pick a deck…</option>
              {decks.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          ) : (
            <p
              className={`text-sm ${
                deckLabel
                  ? "text-neutral-700 dark:text-neutral-300"
                  : "text-neutral-400 dark:text-neutral-500"
              }`}
            >
              {deckLabel ?? "Picking deck…"}
            </p>
          )}
        </>
      )}
    </div>
  );
}
