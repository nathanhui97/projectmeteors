import { createClient } from "@/lib/supabase/server";
import type { Card } from "@/lib/types";

/**
 * Fetch every card in the catalog. Excludes resource and unit-token rows since
 * those are out of the deck builder's scope (see feedback-deck-scope).
 *
 * 1000-ish rows × ~300 bytes is small enough to ship to the client in one shot;
 * the deck builder filters in memory for snappy search.
 */
export async function getAllBuildableCards(): Promise<Card[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cards")
    .select("*")
    .not("card_type", "in", '("RESOURCE","UNIT TOKEN")')
    .order("set_code", { ascending: true })
    .order("card_number", { ascending: true })
    .order("variant_suffix", { ascending: true, nullsFirst: true });
  if (error) throw error;
  return (data ?? []) as Card[];
}
