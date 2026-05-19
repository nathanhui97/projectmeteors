import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAllBuildableCards } from "@/lib/cards/queries";
import { getDeckWithCards } from "@/lib/decks/queries";
import DeckBuilder from "../../_components/DeckBuilder";

export default async function EditDeckPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [cards, deck] = await Promise.all([
    getAllBuildableCards(),
    getDeckWithCards(id),
  ]);
  if (!deck) notFound();

  return (
    <main className="min-h-screen bg-neutral-50 p-6 dark:bg-neutral-950">
      <div className="mx-auto max-w-7xl space-y-4">
        <header>
          <Link
            href={`/decks/${deck.id}`}
            className="text-sm text-neutral-700 hover:underline dark:text-neutral-300"
          >
            ← {deck.name}
          </Link>
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
            Edit deck
          </h1>
        </header>
        <DeckBuilder
          cards={cards}
          mode="edit"
          initial={{
            id: deck.id,
            name: deck.name,
            entries: deck.cards.map((c) => ({ card_id: c.card_id, copies: c.copies })),
          }}
        />
      </div>
    </main>
  );
}
