"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const DAILY_API = "https://api.daily.co/v1";

async function dailyFetch(path: string, options?: RequestInit) {
  return fetch(`${DAILY_API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.DAILY_API_KEY}`,
      ...options?.headers,
    },
  });
}

async function createDailyRoom(code: string): Promise<string | null> {
  try {
    const res = await dailyFetch("/rooms", {
      method: "POST",
      body: JSON.stringify({
        name: `meteors-${code.toLowerCase()}`,
        privacy: "private",
        properties: { exp: Math.floor(Date.now() / 1000) + 86400 * 7 },
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (data.url as string) ?? null;
  } catch {
    return null;
  }
}

async function deleteDailyRoom(roomUrl: string): Promise<void> {
  try {
    const name = roomUrl.split("/").pop();
    if (!name) return;
    await dailyFetch(`/rooms/${name}`, { method: "DELETE" });
  } catch {
    // best-effort
  }
}

function generateCode(): string {
  // Uppercase only, excluding I and O to avoid confusion with 1 and 0.
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function createRoom(formData: FormData) {
  const { supabase, user } = await getAuthenticatedUser();
  const deckId = (formData.get("deck_id") as string | null) || null;

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    const { data: inserted, error } = await supabase
      .from("rooms")
      .insert({ code, host_id: user.id, host_email: user.email! })
      .select("id")
      .single();
    if (error?.message.includes("unique")) continue;
    if (error) throw error;

    // Create Daily video room and optionally pre-set deck (best-effort)
    const dailyUrl = await createDailyRoom(code);
    const updates: Record<string, string> = {};
    if (dailyUrl) updates.daily_room_url = dailyUrl;
    if (deckId) updates.host_deck_id = deckId;
    if (Object.keys(updates).length > 0 && inserted?.id) {
      await supabase.from("rooms").update(updates).eq("id", inserted.id);
    }

    redirect(`/rooms/${code}`);
  }
  throw new Error("Failed to generate a unique room code — try again.");
}

export async function joinRoom(formData: FormData) {
  const { supabase, user } = await getAuthenticatedUser();

  const code = ((formData.get("code") as string) ?? "").trim().toUpperCase();
  if (!code) redirect("/rooms?error=Enter+a+room+code");

  const { data: room } = await supabase
    .from("rooms")
    .select("*")
    .eq("code", code)
    .maybeSingle();

  if (!room) redirect("/rooms?error=Room+not+found");

  // Already a member — just send them in.
  if (room.host_id === user.id || room.guest_id === user.id) {
    redirect(`/rooms/${code}`);
  }

  if (room.guest_id) redirect("/rooms?error=Room+is+full");
  if (room.status !== "waiting")
    redirect("/rooms?error=Room+is+not+accepting+players");

  const deckId = (formData.get("deck_id") as string | null) || null;
  const guestUpdate: Record<string, string | null> = {
    guest_id: user.id,
    guest_email: user.email ?? null,
  };
  if (deckId) guestUpdate.guest_deck_id = deckId;

  const { error } = await supabase
    .from("rooms")
    .update(guestUpdate)
    .eq("code", code);

  if (error) redirect(`/rooms?error=${encodeURIComponent(error.message)}`);
  redirect(`/rooms/${code}`);
}

export async function selectDeck(
  roomId: string,
  deckId: string,
  role: "host" | "guest",
): Promise<{ error: string | null }> {
  const { supabase, user } = await getAuthenticatedUser();

  // Verify the deck belongs to this user.
  const { data: deck } = await supabase
    .from("decks")
    .select("id")
    .eq("id", deckId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!deck) return { error: "Deck not found" };

  const field = role === "host" ? "host_deck_id" : "guest_deck_id";
  const { error } = await supabase
    .from("rooms")
    .update({ [field]: deckId })
    .eq("id", roomId);

  return { error: error?.message ?? null };
}

export async function setReady(
  roomId: string,
  role: "host" | "guest",
): Promise<{ error: string | null }> {
  const { supabase } = await getAuthenticatedUser();
  const field = role === "host" ? "host_ready" : "guest_ready";
  const { error } = await supabase
    .from("rooms")
    .update({ [field]: true })
    .eq("id", roomId);
  return { error: error?.message ?? null };
}

export async function showCard(
  roomId: string,
  cardId: string,
  role: "host" | "guest",
): Promise<{ error: string | null }> {
  const { supabase } = await getAuthenticatedUser();
  const field = role === "host" ? "host_shown_card_id" : "guest_shown_card_id";
  const { error } = await supabase
    .from("rooms")
    .update({ [field]: cardId })
    .eq("id", roomId);
  return { error: error?.message ?? null };
}

export async function clearShownCard(
  roomId: string,
  role: "host" | "guest",
): Promise<{ error: string | null }> {
  const { supabase } = await getAuthenticatedUser();
  const field = role === "host" ? "host_shown_card_id" : "guest_shown_card_id";
  const { error } = await supabase
    .from("rooms")
    .update({ [field]: null })
    .eq("id", roomId);
  return { error: error?.message ?? null };
}

export async function reportResult(
  roomId: string,
  claimedWinnerId: string,
  role: "host" | "guest",
): Promise<{ error: string | null }> {
  const { supabase } = await getAuthenticatedUser();

  const { data: room } = await supabase
    .from("rooms")
    .select("host_id, guest_id, host_result_claim, guest_result_claim")
    .eq("id", roomId)
    .maybeSingle();
  if (!room) return { error: "Room not found" };
  if (claimedWinnerId !== room.host_id && claimedWinnerId !== room.guest_id) {
    return { error: "Invalid winner" };
  }

  const claimField = role === "host" ? "host_result_claim" : "guest_result_claim";
  const { error: claimErr } = await supabase
    .from("rooms")
    .update({ [claimField]: claimedWinnerId })
    .eq("id", roomId);
  if (claimErr) return { error: claimErr.message };

  // Resolve immediately if both claims are now set.
  const hostClaim  = role === "host"  ? claimedWinnerId : room.host_result_claim;
  const guestClaim = role === "guest" ? claimedWinnerId : room.guest_result_claim;

  if (hostClaim && guestClaim) {
    if (hostClaim === guestClaim) {
      const finishedAt = new Date().toISOString();
      await supabase.from("rooms").update({
        winner_id: hostClaim,
        status: "finished",
        finished_at: finishedAt,
      }).eq("id", roomId);
      await supabase.from("match_results").insert({
        host_id: room.host_id,
        guest_id: room.guest_id,
        winner_id: hostClaim,
        finished_at: finishedAt,
      });
    } else {
      await supabase.from("rooms").update({ status: "disputed" }).eq("id", roomId);
    }
  }

  return { error: null };
}


export async function leaveRoom(
  roomId: string,
  role: "host" | "guest",
): Promise<void> {
  const { supabase } = await getAuthenticatedUser();

  if (role === "host") {
    // Delete Daily video room before removing the DB row.
    const { data: roomRow } = await supabase
      .from("rooms")
      .select("daily_room_url")
      .eq("id", roomId)
      .maybeSingle();
    if (roomRow?.daily_room_url) await deleteDailyRoom(roomRow.daily_room_url);

    // Deleting the room kicks the guest via realtime DELETE event.
    await supabase.from("rooms").delete().eq("id", roomId);
  } else {
    await supabase
      .from("rooms")
      .update({ guest_id: null, guest_email: null, guest_deck_id: null })
      .eq("id", roomId);
  }
  redirect("/rooms");
}
