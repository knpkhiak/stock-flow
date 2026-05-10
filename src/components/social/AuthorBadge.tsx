import { useProfiles } from "@/hooks/useNickname";
import { relativeTime } from "@/lib/profileUtils";

interface Props {
  userId: string;
  timestamp?: string | null;
  isMine?: boolean;
}

export default function AuthorBadge({ userId, timestamp, isMine }: Props) {
  const profiles = useProfiles([userId]);
  const p = profiles[userId];
  const initial = (p?.nickname || "?").slice(0, 1);
  return (
    <div className="flex items-center gap-2">
      <div className="h-7 w-7 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
        {initial}
      </div>
      <div className="flex items-center gap-1.5 text-xs">
        <span className="font-medium text-foreground">{p?.nickname || "..."}</span>
        {isMine && (
          <span className="rounded bg-muted/50 px-1.5 py-0.5 text-[10px] text-muted-foreground">내 노트</span>
        )}
        {timestamp && <span className="text-muted-foreground">· {relativeTime(timestamp)}</span>}
      </div>
    </div>
  );
}
