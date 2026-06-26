import { CopyButton } from "@/components/CopyButton";

export function InviteCard({
  title,
  emoji,
  message,
  accent = "magenta",
}: {
  title: string;
  emoji: string;
  message: string;
  accent?: "magenta" | "cyan";
}) {
  const ring = accent === "cyan" ? "border-cyan/30" : "border-magenta/30";
  return (
    <div className={`card border ${ring} p-5`}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-lg font-bold">
          <span className="mr-2">{emoji}</span>
          {title}
        </h3>
        <CopyButton text={message} label="Copy message" className="text-sm" />
      </div>
      <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap rounded-xl bg-black/30 p-4 font-sans text-sm leading-relaxed text-cream/80">
        {message}
      </pre>
    </div>
  );
}
