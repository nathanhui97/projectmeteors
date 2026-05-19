import { createClient } from "@/lib/supabase/server";
import type { Room } from "@/lib/types";

export async function getRoomByCode(code: string): Promise<Room | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .eq("code", code.toUpperCase())
    .maybeSingle();
  if (error) throw error;
  return data as Room | null;
}
