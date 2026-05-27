"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function login(
  formData: FormData,
): Promise<{ error: string } | void> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: formData.get("email") as string,
      password: formData.get("password") as string,
    });
    if (error) return { error: error.message };
    revalidatePath("/", "layout");
    redirect("/");
  } catch (e: any) {
    if (e?.digest?.startsWith("NEXT_REDIRECT")) throw e;
    return { error: e?.message ?? "Unexpected error — check Vercel logs" };
  }
}

export async function signup(
  formData: FormData,
): Promise<{ error: string } | void> {
  const supabase = await createClient();
  const origin = (await headers()).get("origin") ?? "";
  const { error } = await supabase.auth.signUp({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });
  if (error) return { error: error.message };
}

export async function forgotPassword(
  formData: FormData,
): Promise<{ error: string } | void> {
  const supabase = await createClient();
  const origin = (await headers()).get("origin") ?? "";
  const { error } = await supabase.auth.resetPasswordForEmail(
    formData.get("email") as string,
    { redirectTo: `${origin}/auth/callback?next=/reset-password` },
  );
  if (error) return { error: error.message };
}
