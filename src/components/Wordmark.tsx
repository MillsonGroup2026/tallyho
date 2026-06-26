import { cn } from "@/lib/utils";

/** The Says Who? wordmark — "Says" + a magenta speech bubble reading "Who?". */
export function Wordmark({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const scale =
    size === "lg"
      ? "text-5xl sm:text-7xl"
      : size === "sm"
        ? "text-xl"
        : "text-3xl sm:text-4xl";

  return (
    <span
      className={cn(
        "inline-flex items-center font-display font-black tracking-tight select-none leading-none",
        scale,
        className,
      )}
    >
      <span className="text-cream">Says</span>
      <span className="relative ml-2 inline-flex items-center rounded-2xl bg-magenta px-3 pb-1 pt-1.5 text-white shadow-[0_10px_30px_-8px_rgba(255,46,136,0.7)]">
        Who<span className="text-gold">?</span>
        {/* speech-bubble tail */}
        <span className="absolute -bottom-1.5 left-5 h-0 w-0 border-l-8 border-t-8 border-l-transparent border-t-magenta" />
      </span>
    </span>
  );
}
