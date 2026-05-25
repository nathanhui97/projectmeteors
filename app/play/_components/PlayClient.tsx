"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { joinQueue } from "@/lib/matchmaking/actions";
import { createRoom, joinRoom } from "@/lib/rooms/actions";
import { WaitingScreen } from "./WaitingScreen";
import type { Deck, QueueEntry } from "@/lib/types";

type Props = {
  decks: Deck[];
  activeQueue: QueueEntry | null;
};

type Screen = "idle" | "waiting";

export function PlayClient({ decks, activeQueue }: Props) {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>(activeQueue ? "waiting" : "idle");
  const [queueId, setQueueId] = useState<string>(activeQueue?.id ?? "");
  const [queueMode, setQueueMode] = useState<"casual" | "ranked">(activeQueue?.mode ?? "casual");

  const [selectedDeckId, setSelectedDeckId] = useState<string>(
    activeQueue?.deck_id ?? decks[0]?.id ?? "",
  );
  const [joinCode, setJoinCode] = useState("");
  const [queueError, setQueueError] = useState("");
  const [isPending, startTransition] = useTransition();

  const selectedDeck = decks.find((d) => d.id === selectedDeckId);

  function handleQueue(mode: "casual" | "ranked") {
    if (!selectedDeckId) return;
    setQueueError("");
    startTransition(async () => {
      const result = await joinQueue(selectedDeckId, mode);
      if ("error" in result) {
        setQueueError(result.error);
        return;
      }
      if (result.matched) {
        router.push(`/rooms/${result.roomCode}`);
        return;
      }
      setQueueMode(mode);
      setQueueId(result.queueId);
      setScreen("waiting");
    });
  }

  function handlePrivateCreate() {
    const formData = new FormData();
    if (selectedDeckId) formData.set("deck_id", selectedDeckId);
    startTransition(async () => { await createRoom(formData); });
  }

  function handlePrivateJoin() {
    const formData = new FormData();
    formData.set("code", joinCode.trim().toUpperCase());
    if (selectedDeckId) formData.set("deck_id", selectedDeckId);
    startTransition(async () => { await joinRoom(formData); });
  }

  if (screen === "waiting") {
    return (
      <WaitingScreen
        queueId={queueId}
        mode={queueMode}
        deckName={selectedDeck?.name ?? "your deck"}
        onCancel={() => setScreen("idle")}
        onExpired={() => { setQueueError("No opponent found — try again."); setScreen("idle"); }}
      />
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-neutral-950 p-6">
      <div className="w-full max-w-sm space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-neutral-100">Play</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Find a match or play with a friend.
          </p>
        </div>

        {/* Deck selector */}
        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-wider text-neutral-500">
            Your deck
          </label>
          {decks.length === 0 ? (
            <div className="rounded-xl border border-neutral-800 p-4">
              <p className="text-sm text-neutral-500">No decks yet.</p>
              <a href="/decks/new" className="mt-1 block text-xs text-neutral-400 underline">
                Build one →
              </a>
            </div>
          ) : decks.length === 1 ? (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3">
              <p className="text-sm font-medium text-neutral-100">{decks[0].name}</p>
            </div>
          ) : (
            <select
              value={selectedDeckId}
              onChange={(e) => setSelectedDeckId(e.target.value)}
              disabled={isPending}
              className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-neutral-100 outline-none focus:border-neutral-600 disabled:opacity-50"
            >
              {decks.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Auto-match buttons */}
        <div className="space-y-3">
          <label className="text-xs font-medium uppercase tracking-wider text-neutral-500">
            Find a match
          </label>
          <button
            onClick={() => handleQueue("casual")}
            disabled={isPending || !selectedDeckId}
            className="w-full rounded-xl bg-neutral-100 py-3 text-sm font-semibold text-neutral-900 hover:bg-white disabled:opacity-50 transition-colors"
          >
            {isPending ? "Finding…" : "Quick Match — Casual"}
          </button>

          {queueError && (
            <p className="text-sm text-red-400">{queueError}</p>
          )}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-neutral-800" />
          <span className="text-xs text-neutral-600">or play with a friend</span>
          <div className="h-px flex-1 bg-neutral-800" />
        </div>

        {/* Private room */}
        <div className="space-y-3">
          <button
            onClick={handlePrivateCreate}
            disabled={isPending || !selectedDeckId}
            className="w-full rounded-xl border border-neutral-800 py-3 text-sm font-medium text-neutral-300 hover:bg-neutral-900 hover:text-neutral-100 disabled:opacity-50 transition-colors"
          >
            Create Private Room
          </button>

          <div className="flex gap-2">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Room code"
              maxLength={6}
              autoComplete="off"
              className="min-w-0 flex-1 rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-center font-mono text-sm uppercase tracking-widest text-neutral-100 placeholder-neutral-700 outline-none focus:border-neutral-600"
            />
            <button
              onClick={handlePrivateJoin}
              disabled={isPending || joinCode.trim().length !== 6 || !selectedDeckId}
              className="rounded-xl border border-neutral-800 px-5 py-3 text-sm font-medium text-neutral-300 hover:bg-neutral-900 hover:text-neutral-100 disabled:opacity-50 transition-colors"
            >
              Join
            </button>
          </div>
        </div>

        {/* Nav */}
        <div className="flex items-center justify-between pt-2 text-sm text-neutral-600">
          <a href="/" className="hover:text-neutral-400 transition-colors">← Home</a>
          <div className="flex gap-4">
            <a href="/decks" className="hover:text-neutral-400 transition-colors">Decks</a>
            <a href="/history" className="hover:text-neutral-400 transition-colors">History</a>
          </div>
        </div>
      </div>
    </main>
  );
}
