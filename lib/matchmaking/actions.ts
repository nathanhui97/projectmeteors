"use server";

import { createClient } from "@/lib/supabase/server";
import { createDailyRoom } from "@/lib/rooms/daily";
import { redirect } from "next/navigation";

export type JoinQueueResult =
  | { matched: true; roomCode: string }
  | { matched: false; queueId: string }
  | { error: string };

export async function joinQueue(
  deckId: string,
  mode: "casual" | "ranked",
): Promise<JoinQueueResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Verify user owns this deck
  const { data: deck } = await supabase
    .from("decks")
    .select("id")
    .eq("id", deckId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!deck) return { error: "Deck not found" };

  // Call the SECURITY DEFINER RPC — handles matching atomically
  const { data, error } = await supabase.rpc("find_or_create_match", {
    p_deck_id: deckId,
    p_mode: mode,
    p_user_id: user.id,
    p_email: user.email!,
  });

  if (error) return { error: error.message };

  if (data.matched) {
    // Best-effort: create Daily video room and attach it
    const dailyUrl = await createDailyRoom(data.room_code);
    if (dailyUrl) {
      await supabase
        .from("rooms")
        .update({ daily_room_url: dailyUrl })
        .eq("id", data.room_id);
    }
    return { matched: true, roomCode: data.room_code };
  }

  return { matched: false, queueId: data.queue_id };
}

export async function cancelQueue(queueId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("matchmaking_queue")
    .update({ status: "cancelled" })
    .eq("id", queueId)
    .eq("user_id", user.id);
}
