"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { login, signup, forgotPassword } from "./actions";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error") ?? "";

  const [tab, setTab] = useState<"signin" | "signup" | "forgot">("signin");
  const [error, setError] = useState(urlError);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleLogin(formData: FormData) {
    setError("");
    startTransition(async () => {
      const result = await login(formData);
      if (result?.error) setError(result.error);
    });
  }

  function handleSignup(formData: FormData) {
    setError("");
    startTransition(async () => {
      const result = await signup(formData);
      if (result?.error) setError(result.error);
      else setMessage("Check your email to confirm your account.");
    });
  }

  function handleForgot(formData: FormData) {
    setError("");
    startTransition(async () => {
      const result = await forgotPassword(formData);
      if (result?.error) setError(result.error);
      else setMessage("Password reset link sent — check your inbox.");
    });
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-neutral-950 p-6">
      <div className="w-full max-w-sm space-y-8">

        {/* Branding */}
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-neutral-100">
            Project V
          </h1>
          <p className="text-sm text-neutral-500">
            Gundam TCG — online webcam play
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-xl space-y-5">

          {/* Tabs */}
          {tab !== "forgot" && (
            <div className="flex rounded-lg bg-neutral-800 p-1">
              <button
                type="button"
                onClick={() => { setTab("signin"); setError(""); setMessage(""); }}
                className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
                  tab === "signin"
                    ? "bg-neutral-100 text-neutral-900"
                    : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => { setTab("signup"); setError(""); setMessage(""); }}
                className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
                  tab === "signup"
                    ? "bg-neutral-100 text-neutral-900"
                    : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                Sign up
              </button>
            </div>
          )}

          {/* Sign In */}
          {tab === "signin" && (
            <form action={handleLogin} className="space-y-4">
              <Field label="Email" name="email" type="email" />
              <Field label="Password" name="password" type="password" />
              {error && <p className="text-sm text-red-400">{error}</p>}
              <button
                type="submit"
                disabled={isPending}
                className="w-full rounded-lg bg-neutral-100 py-2.5 text-sm font-semibold text-neutral-900 hover:bg-white disabled:opacity-50 transition-colors"
              >
                {isPending ? "Signing in…" : "Sign in"}
              </button>
              <button
                type="button"
                onClick={() => { setTab("forgot"); setError(""); setMessage(""); }}
                className="w-full text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
              >
                Forgot password?
              </button>
            </form>
          )}

          {/* Sign Up */}
          {tab === "signup" && (
            <form action={handleSignup} className="space-y-4">
              <Field label="Email" name="email" type="email" />
              <Field label="Password" name="password" type="password" minLength={6} />
              {error && <p className="text-sm text-red-400">{error}</p>}
              {message && <p className="text-sm text-emerald-400">{message}</p>}
              <button
                type="submit"
                disabled={isPending}
                className="w-full rounded-lg bg-neutral-100 py-2.5 text-sm font-semibold text-neutral-900 hover:bg-white disabled:opacity-50 transition-colors"
              >
                {isPending ? "Creating account…" : "Create account"}
              </button>
              <p className="text-center text-xs text-neutral-600">
                You&apos;ll receive a confirmation email.
              </p>
            </form>
          )}

          {/* Forgot Password */}
          {tab === "forgot" && (
            <form action={handleForgot} className="space-y-4">
              <div>
                <button
                  type="button"
                  onClick={() => { setTab("signin"); setError(""); setMessage(""); }}
                  className="mb-4 text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
                >
                  ← Back to sign in
                </button>
                <h2 className="text-base font-semibold text-neutral-100">Reset password</h2>
                <p className="mt-1 text-sm text-neutral-500">
                  Enter your email and we&apos;ll send a reset link.
                </p>
              </div>
              <Field label="Email" name="email" type="email" />
              {error && <p className="text-sm text-red-400">{error}</p>}
              {message && <p className="text-sm text-emerald-400">{message}</p>}
              <button
                type="submit"
                disabled={isPending}
                className="w-full rounded-lg bg-neutral-100 py-2.5 text-sm font-semibold text-neutral-900 hover:bg-white disabled:opacity-50 transition-colors"
              >
                {isPending ? "Sending…" : "Send reset link"}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  name,
  type,
  minLength,
}: {
  label: string;
  name: string;
  type: string;
  minLength?: number;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-neutral-300">{label}</span>
      <input
        name={name}
        type={type}
        required
        minLength={minLength}
        className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2.5 text-sm text-neutral-100 placeholder-neutral-600 outline-none focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 transition-colors"
      />
    </label>
  );
}
