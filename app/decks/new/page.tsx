import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAllBuildableCards } from "@/lib/cards/queries";
import DeckBuilder from "../_components/DeckBuilder";

export default async function NewDeckPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cards = await getAllBuildableCards();

  return (
    <main className="min-h-screen bg-neutral-50 p-6 dark:bg-neutral-950">
      <div className="mx-auto max-w-7xl space-y-4">
        <header className="flex items-center justify-between">
          <div>
            <Link
              href="/decks"
              className="text-sm text-neutral-700 hover:underline dark:text-neutral-300"
            >
              ← My Decks
            </Link>
            <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
              New deck
            </h1>
          </div>
        </header>
        <DeckBuilder cards={cards} mode="create" />
      </div>
    </main>
  );
}
