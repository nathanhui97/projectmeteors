"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

export async function createRoom(_formData: FormData) {
  const { supabase, user } = await getAuthenticatedUser();

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    const { error } = await supabase.from("rooms").insert({
      code,
      host_id: user.id,
      host_email: user.email!,
    });
    if (!error) redirect(`/rooms/${code}`);
    if (!error.message.includes("unique")) throw error;
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

  const { error } = await supabase
    .from("rooms")
    .update({ guest_id: user.id, guest_email: user.email })
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

export async function leaveRoom(
  roomId: string,
  role: "host" | "guest",
): Promise<void> {
  const { supabase } = await getAuthenticatedUser();

  if (role === "host") {
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
