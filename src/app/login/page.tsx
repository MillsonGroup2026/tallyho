import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";
import { signIn, signUp } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; check_email?: string; mode?: string }>;
}) {
  const sp = await searchParams;
  const isSignup = sp.mode === "signup";

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 inline-block">
          <Wordmark size="sm" />
        </Link>

        <div className="card p-7">
          <h1 className="font-display text-2xl font-bold">
            {isSignup ? "Create your host account" : "Welcome back, host"}
          </h1>
          <p className="mt-1 text-sm text-cream/60">
            {isSignup
              ? "You'll own your groups and run the live games."
              : "Sign in to set up and run your games."}
          </p>

          {sp.check_email && (
            <p className="mt-4 rounded-xl border border-cyan/30 bg-cyan/10 px-4 py-3 text-sm text-cyan">
              Check your email to confirm your account, then sign in.
            </p>
          )}
          {sp.error && (
            <p className="mt-4 rounded-xl border border-magenta/30 bg-magenta/10 px-4 py-3 text-sm text-magenta-soft">
              {sp.error}
            </p>
          )}

          <form action={isSignup ? signUp : signIn} className="mt-5 space-y-4">
            <div>
              <label className="label" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                className="input mt-1"
                type="email"
                name="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                className="input mt-1"
                type="password"
                name="password"
                required
                minLength={6}
                autoComplete={isSignup ? "new-password" : "current-password"}
                placeholder="••••••••"
              />
            </div>
            <button className="btn btn-primary w-full" type="submit">
              {isSignup ? "Create account →" : "Sign in →"}
            </button>
          </form>

          <div className="mt-5 text-center text-sm text-cream/60">
            {isSignup ? (
              <>
                Already a host?{" "}
                <Link className="font-medium text-cyan" href="/login">
                  Sign in
                </Link>
              </>
            ) : (
              <>
                New here?{" "}
                <Link className="font-medium text-cyan" href="/login?mode=signup">
                  Create an account
                </Link>
              </>
            )}
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-cream/40">
          Tip: for the smoothest local testing, disable email confirmation in your
          Supabase project&apos;s Auth settings.
        </p>
      </div>
    </main>
  );
}
