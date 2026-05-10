import { Heart } from "lucide-react";
import { useLike, type LikeTarget } from "@/hooks/useLikes";
import { cn } from "@/lib/utils";

interface Props {
  targetType: LikeTarget;
  targetId: string;
  initialCount?: number;
  size?: "sm" | "md";
}

export default function LikeButton({ targetType, targetId, initialCount = 0, size = "md" }: Props) {
  const { liked, count, toggle, busy } = useLike(targetType, targetId, initialCount);
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); void toggle(); }}
      disabled={busy}
      aria-pressed={liked}
      aria-label="좋아요"
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs transition-colors",
        liked ? "text-destructive" : "text-muted-foreground hover:text-foreground",
        busy && "opacity-60",
      )}
    >
      <Heart className={cn(iconSize, "transition-transform", liked && "fill-current scale-110")} />
      <span className="num tabular-nums">{count}</span>
    </button>
  );
}
