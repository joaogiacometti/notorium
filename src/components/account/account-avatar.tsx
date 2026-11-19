import { cn } from "@/lib/utils";

function getInitials(name: string): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return initials || "?";
}

/** Initials avatar for the signed-in user; size it through `className`. */
export function AccountAvatar({
  name,
  className,
}: Readonly<{ name: string; className?: string }>) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-secondary font-semibold text-secondary-foreground",
        className,
      )}
    >
      {getInitials(name)}
    </span>
  );
}
