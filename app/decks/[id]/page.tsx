import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDeckWithCards } from "@/lib/decks/queries";
import { exportDecklist } from "@/lib/decks/parse";
import { DECK_RULES } from "@/lib/types";
import ExportButton from "../_components/ExportButton";

export default async function DeckDetailPage({
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

  const deck = await getDeckWithCards(id);
  if (!deck) notFound();

  const totalCards = deck.cards.reduce((sum, c) => sum + c.copies, 0);
  const colors = new Set(deck.cards.map((c) => c.card.color).filter(Boolean) as string[]);

  // Sort cards by id for stable display
  const sortedCards = [...deck.cards].sort((a, b) => a.card.id.localeCompare(b.card.id));

  return (
    <main className="min-h-screen bg-neutral-50 p-6 dark:bg-neutral-950">
      <div className="mx-auto max-w-5xl space-y-4">
        <header className="flex items-center justify-between">
          <div>
            <Link
              href="/decks"
              className="text-sm text-neutral-700 hover:underline dark:text-neutral-300"
            >
              ← My Decks
            </Link>
            <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
              {deck.name}
            </h1>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              {totalCards} / {DECK_RULES.MAIN_DECK_SIZE} cards · {colors.size === 0 ? "no color" : [...colors].join(", ")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ExportButton text={exportDecklist(deck)} />
            <Link
              href={`/decks/${deck.id}/edit`}
              className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              Edit
            </Link>
          </div>
        </header>

        <section className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {sortedCards.flatMap(({ card, copies }) =>
            Array.from({ length: copies }, (_, i) => (
              <div
                key={`${card.id}-${i}`}
                className="aspect-[5/7] overflow-hidden rounded-md border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-800"
                title={`${card.id} — ${card.name}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={card.image_path}
                  alt={card.name}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </div>
            )),
          )}
        </section>
      </div>
    </main>
  );
}
