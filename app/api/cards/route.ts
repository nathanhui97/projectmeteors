import { NextResponse } from "next/server";
import { getAllBuildableCards } from "@/lib/cards/queries";

export async function GET() {
  const cards = await getAllBuildableCards();
  return NextResponse.json(cards);
}
