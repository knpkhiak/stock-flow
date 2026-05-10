import { TableCell, TableRow } from "@/components/ui/table";
import { useProfiles } from "@/hooks/useNickname";
import { relativeTime } from "@/lib/profileUtils";
import type { BoardPost } from "@/hooks/useBoardPosts";
import { MessageSquare, Heart, Eye } from "lucide-react";

interface Props {
  post: BoardPost;
  onClick: () => void;
}

export default function BoardPostRow({ post, onClick }: Props) {
  const profiles = useProfiles([post.author_id]);
  const nick = profiles[post.author_id]?.nickname || "...";
  return (
    <TableRow onClick={onClick} className="cursor-pointer hover:bg-muted/30">
      <TableCell>
        <div className="font-medium truncate max-w-[420px]">
          {post.title}
          {post.comment_count > 0 && (
            <span className="ml-2 text-xs text-primary">[{post.comment_count}]</span>
          )}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">{nick}</div>
      </TableCell>
      <TableCell className="text-right text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1"><Heart className="h-3 w-3" />{post.like_count}</span>
      </TableCell>
      <TableCell className="text-right text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" />{post.view_count}</span>
      </TableCell>
      <TableCell className="text-right text-xs text-muted-foreground whitespace-nowrap">
        {relativeTime(post.created_at)}
      </TableCell>
    </TableRow>
  );
}
