"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  if (!email || !password) {
    redirect("/login?error=" + encodeURIComponent("Enter your email and password."));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect("/login?error=" + encodeURIComponent(error.message));
  }
  redirect("/dashboard");
}

export async function signUp(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  if (!email || password.length < 6) {
    redirect(
      "/login?mode=signup&error=" +
        encodeURIComponent("Enter a valid email and a password of at least 6 characters."),
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${appUrl()}/auth/confirm?next=/dashboard` },
  });
  if (error) {
    redirect("/login?mode=signup&error=" + encodeURIComponent(error.message));
  }
  // If email confirmation is enabled in Supabase, there is no session yet.
  if (!data.session) {
    redirect("/login?check_email=1");
  }
  redirect("/dashboard");
}
