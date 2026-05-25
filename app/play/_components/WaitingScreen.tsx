"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cancelQueue } from "@/lib/matchmaking/actions";

type Props = {
  queueId: string;
  mode: "casual" | "ranked";
  deckName: string;
  onCancel: () => void;
  onExpired: () => void;
};

export function WaitingScreen({ queueId, mode, deckName, onCancel, onExpired }: Props) {
  const router = useRouter();
  const [seconds, setSeconds] = useState(0);
  const [found, setFound] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Elapsed timer
  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Realtime subscription — fires the instant the RPC matches us
  useEffect(() => {
    const supabase = createClient();

    async function redirectToRoom(roomId: string) {
      const { data } = await supabase
        .from("rooms")
        .select("code")
        .eq("id", roomId)
        .single();
      if (data?.code) {
        setFound(true);
        setTimeout(() => router.push(`/rooms/${data.code}`), 600);
      }
    }

    // Check immediately in case we were already matched (e.g. page refresh)
    supabase
      .from("matchmaking_queue")
      .select("status, matched_room_id")
      .eq("id", queueId)
      .single()
      .then(({ data }) => {
        if (data?.status === "matched" && data.matched_room_id) {
          redirectToRoom(data.matched_room_id);
        } else if (data?.status === "cancelled") {
          onExpired();
        }
      });

    const channel = supabase
      .channel(`queue:${queueId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "matchmaking_queue",
          filter: `id=eq.${queueId}`,
        },
        (payload: any) => {
          if (payload.new.status === "matched" && payload.new.matched_room_id) {
            redirectToRoom(payload.new.matched_room_id);
          } else if (payload.new.status === "cancelled") {
            onExpired();
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queueId, router, onExpired]);

  async function handleCancel() {
    setCancelling(true);
    await cancelQueue(queueId);
    onCancel();
  }

  const elapsed = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  if (found) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-950 p-6">
        <div className="space-y-4 text-center">
          <div className="text-4xl">⚡</div>
          <p className="text-xl font-semibold text-neutral-100">Opponent found!</p>
          <p className="text-sm text-neutral-500">Entering room…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-950 p-6">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-neutral-100">Finding opponent…</h1>
          <p className="text-sm text-neutral-500">
            {mode === "ranked" ? "Ranked" : "Casual"} · {deckName}
          </p>
        </div>

        {/* Spinner */}
        <div className="flex justify-center">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-neutral-800 border-t-neutral-300" />
        </div>

        <p className="font-mono text-2xl tabular-nums text-neutral-400">{elapsed}</p>

        <p className="text-xs text-neutral-600">
          Queue expires after 3 minutes if no opponent is found.
        </p>

        <button
          onClick={handleCancel}
          disabled={cancelling}
          className="w-full rounded-xl border border-neutral-800 py-2.5 text-sm font-medium text-neutral-500 hover:border-neutral-700 hover:text-neutral-300 disabled:opacity-50 transition-colors"
        >
          {cancelling ? "Cancelling…" : "Cancel"}
        </button>
      </div>
    </div>
  );
}
