import Link from "next/link";
import { NewGroupWizard } from "@/components/wizard/NewGroupWizard";

export default function NewGroupPage() {
  return (
    <div>
      <Link href="/dashboard" className="text-sm text-cream/50 hover:text-cream">
        ← Back to groups
      </Link>
      <h1 className="mt-3 mb-6 font-display text-3xl font-black">New group</h1>
      <NewGroupWizard />
    </div>
  );
}
