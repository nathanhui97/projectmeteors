"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type SaveDeckInput = {
  name: string;
  cards: { card_id: string; copies: number }[];
};

export type SaveDeckResult =
  | { ok: true; deckId: string }
  | { ok: false; error: string };

async function getUserOrThrow() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("not authenticated");
  return { supabase, user: data.user };
}

export async function createDeck(input: SaveDeckInput): Promise<SaveDeckResult> {
  if (!input.name.trim()) return { ok: false, error: "Deck name is required." };
  if (input.cards.length === 0) return { ok: false, error: "Add at least one card before saving." };

  const { supabase, user } = await getUserOrThrow();

  const { data: deck, error: deckErr } = await supabase
    .from("decks")
    .insert({ name: input.name.trim(), user_id: user.id })
    .select("id")
    .single();
  if (deckErr || !deck) return { ok: false, error: deckErr?.message ?? "Insert failed." };

  const rows = input.cards.map((c) => ({
    deck_id: deck.id,
    card_id: c.card_id,
    copies: c.copies,
  }));
  const { error: cardsErr } = await supabase.from("deck_cards").insert(rows);
  if (cardsErr) {
    // best-effort cleanup
    await supabase.from("decks").delete().eq("id", deck.id);
    return { ok: false, error: cardsErr.message };
  }

  revalidatePath("/decks");
  return { ok: true, deckId: deck.id };
}

export async function updateDeck(deckId: string, input: SaveDeckInput): Promise<SaveDeckResult> {
  if (!input.name.trim()) return { ok: false, error: "Deck name is required." };
  if (input.cards.length === 0) return { ok: false, error: "Add at least one card before saving." };

  const { supabase } = await getUserOrThrow();

  const { error: updErr } = await supabase
    .from("decks")
    .update({ name: input.name.trim() })
    .eq("id", deckId);
  if (updErr) return { ok: false, error: updErr.message };

  // replace deck_cards: simplest correct approach for an MVP
  const { error: delErr } = await supabase.from("deck_cards").delete().eq("deck_id", deckId);
  if (delErr) return { ok: false, error: delErr.message };

  const rows = input.cards.map((c) => ({
    deck_id: deckId,
    card_id: c.card_id,
    copies: c.copies,
  }));
  const { error: insErr } = await supabase.from("deck_cards").insert(rows);
  if (insErr) return { ok: false, error: insErr.message };

  revalidatePath("/decks");
  revalidatePath(`/decks/${deckId}`);
  return { ok: true, deckId };
}

export async function deleteDeck(deckId: string): Promise<void> {
  const { supabase } = await getUserOrThrow();
  await supabase.from("decks").delete().eq("id", deckId);
  revalidatePath("/decks");
  redirect("/decks");
}
