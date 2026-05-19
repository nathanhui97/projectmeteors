import { createClient } from "@/lib/supabase/server";
import type { Deck, DeckWithCards } from "@/lib/types";

export async function getUserDecks(): Promise<Deck[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("decks")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Deck[];
}

export async function getDeckWithCards(deckId: string): Promise<DeckWithCards | null> {
  const supabase = await createClient();
  const { data: deck, error: deckErr } = await supabase
    .from("decks")
    .select("*")
    .eq("id", deckId)
    .maybeSingle();
  if (deckErr) throw deckErr;
  if (!deck) return null;

  const { data: cards, error: cardsErr } = await supabase
    .from("deck_cards")
    .select("*, card:cards(*)")
    .eq("deck_id", deckId);
  if (cardsErr) throw cardsErr;

  return { ...deck, cards: cards ?? [] } as DeckWithCards;
}
