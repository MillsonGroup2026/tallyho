import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-white/10">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" aria-label="Tallyho home">
            <Wordmark size="sm" />
          </Link>
          <form action="/auth/signout" method="post">
            <button className="btn btn-ghost text-sm" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</div>
    </div>
  );
}
