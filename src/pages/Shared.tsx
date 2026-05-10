import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import SharedNoteCard from "@/components/social/SharedNoteCard";
import { useSharedIdeas, type SharedSort } from "@/hooks/useSharedIdeas";
import { useAuth } from "@/hooks/useAuth";

type Filter = "all" | "mine" | "friends";

export default function Shared() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [sort, setSort] = useState<SharedSort>("latest");
  const [filter, setFilter] = useState<Filter>("all");
  const { ideas, loading } = useSharedIdeas(sort);

  const filtered = useMemo(() => {
    if (filter === "mine") return ideas.filter((i) => i.user_id === user?.id);
    if (filter === "friends") return ideas.filter((i) => i.user_id !== user?.id);
    return ideas;
  }, [ideas, filter, user]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold">공유 노트</h1>
        <p className="text-sm text-muted-foreground mt-1">친구들이 공유한 매매 분석을 볼 수 있어요</p>
      </div>

      <Card className="glass-card p-4 flex flex-wrap items-center gap-3">
        <ToggleGroup type="single" value={filter} onValueChange={(v) => v && setFilter(v as Filter)}>
          <ToggleGroupItem value="all">전체</ToggleGroupItem>
          <ToggleGroupItem value="mine">본인 공유</ToggleGroupItem>
          <ToggleGroupItem value="friends">친구 공유</ToggleGroupItem>
        </ToggleGroup>

        <Select value={sort} onValueChange={(v) => setSort(v as SharedSort)}>
          <SelectTrigger className="w-36 ml-auto"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="latest">최신순</SelectItem>
            <SelectItem value="popular">인기순</SelectItem>
            <SelectItem value="comments">댓글 많은 순</SelectItem>
          </SelectContent>
        </Select>
      </Card>

      {loading ? (
        <div className="text-center text-sm text-muted-foreground py-12">불러오는 중...</div>
      ) : filtered.length === 0 ? (
        <Card className="glass-card p-12 text-center">
          <p className="text-muted-foreground mb-4">
            아직 공유된 노트가 없어요.<br />첫 번째로 본인 노트를 공유해보세요!
          </p>
          <Button onClick={() => nav("/ideas")}>내 아이디어 노트로 가기 →</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((i) => (
            <SharedNoteCard key={i.id} idea={i} onClick={() => nav(`/shared/${i.id}`)} />
          ))}
        </div>
      )}
    </div>
  );
}
