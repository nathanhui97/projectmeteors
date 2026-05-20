import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RoomsClient } from "./_components/RoomsClient";
import type { DeckSummary } from "./_components/RoomsClient";

export default async function RoomsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await searchParams;

  // Fetch user's decks with card counts and colors for the picker
  const { data: decks } = await supabase
    .from("decks")
    .select("id, name")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  const deckIds = (decks ?? []).map((d) => d.id);
  const { data: deckCardRows } = deckIds.length
    ? await supabase
        .from("deck_cards")
        .select("deck_id, copies, card:cards(color)")
        .in("deck_id", deckIds)
    : { data: [] };

  const summaries: DeckSummary[] = (decks ?? []).map((deck) => {
    const rows = (deckCardRows ?? []).filter((r) => r.deck_id === deck.id);
    const totalCards = rows.reduce((sum, r) => sum + r.copies, 0);
    const colors = [
      ...new Set(
        rows
          .map((r) => (r.card as unknown as { color: string | null } | null)?.color)
          .filter((c): c is string => Boolean(c)),
      ),
    ];
    return { id: deck.id, name: deck.name, totalCards, colors };
  });

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 p-8 dark:bg-neutral-950">
      <RoomsClient decks={summaries} error={error} />
    </main>
  );
}
