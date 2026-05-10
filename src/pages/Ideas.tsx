import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import IdeaCard from "@/components/ideas/IdeaCard";
import NewIdeaDialog from "@/components/ideas/NewIdeaDialog";
import { useIdeas } from "@/hooks/useIdeas";
import { supabase } from "@/integrations/supabase/client";

type Status = "all" | "watching" | "entered" | "passed";
type ShareTab = "all" | "private" | "shared";
type SortKey = "updated" | "newest" | "oldest" | "entered_first";

export default function Ideas() {
  const nav = useNavigate();
  const { ideas, loading, refresh } = useIdeas();
  const [shareTab, setShareTab] = useState<ShareTab>("all");
  const [status, setStatus] = useState<Status>("all");
  const [market, setMarket] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("updated");
  const [newOpen, setNewOpen] = useState(false);
  const [linkedCounts, setLinkedCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("trades").select("idea_id").not("idea_id", "is", null);
      const counts: Record<string, number> = {};
      (data || []).forEach((r: any) => {
        if (r.idea_id) counts[r.idea_id] = (counts[r.idea_id] || 0) + 1;
      });
      setLinkedCounts(counts);
    })();
  }, [ideas]);

  const filtered = useMemo(() => {
    let arr = ideas;
    if (shareTab === "private") arr = arr.filter((i) => !i.is_shared);
    else if (shareTab === "shared") arr = arr.filter((i) => i.is_shared);
    if (status !== "all") arr = arr.filter((i) => i.status === status);
    if (market !== "all") arr = arr.filter((i) => i.market === market);
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.content.toLowerCase().includes(q) ||
          (i.ticker || "").toLowerCase().includes(q),
      );
    }
    const sorted = [...arr];
    if (sort === "newest") sorted.sort((a, b) => b.created_at.localeCompare(a.created_at));
    else if (sort === "oldest") sorted.sort((a, b) => a.created_at.localeCompare(b.created_at));
    else if (sort === "updated") sorted.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    else if (sort === "entered_first")
      sorted.sort((a, b) => Number(b.status === "entered") - Number(a.status === "entered"));
    return sorted;
  }, [ideas, shareTab, status, market, search, sort]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">아이디어 노트</h1>
          <p className="text-sm text-muted-foreground mt-1">투자 아이디어를 기록하고 매매와 연결하세요</p>
        </div>
        <Button onClick={() => setNewOpen(true)}><Plus className="h-4 w-4" />새 아이디어</Button>
      </div>

      <Card className="glass-card p-4 space-y-3">
        <ToggleGroup type="single" value={shareTab} onValueChange={(v) => v && setShareTab(v as ShareTab)}>
          <ToggleGroupItem value="all">전체</ToggleGroupItem>
          <ToggleGroupItem value="private">본인 비공개</ToggleGroupItem>
          <ToggleGroupItem value="shared">본인 공유 중</ToggleGroupItem>
        </ToggleGroup>
        <div className="flex flex-wrap items-center gap-3">
          <ToggleGroup type="single" value={status} onValueChange={(v) => v && setStatus(v as Status)}>
            <ToggleGroupItem value="all">전체</ToggleGroupItem>
            <ToggleGroupItem value="watching">대기중</ToggleGroupItem>
            <ToggleGroupItem value="entered">진입함</ToggleGroupItem>
            <ToggleGroupItem value="passed">패스</ToggleGroupItem>
          </ToggleGroup>

          <Select value={market} onValueChange={setMarket}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">시장 전체</SelectItem>
              <SelectItem value="국내">🇰🇷 국내</SelectItem>
              <SelectItem value="해외">🇺🇸 해외</SelectItem>
              <SelectItem value="암호화폐">₿ 암호화폐</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="updated">수정순</SelectItem>
              <SelectItem value="newest">최신순</SelectItem>
              <SelectItem value="oldest">오래된순</SelectItem>
              <SelectItem value="entered_first">진입한 순</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="제목/본문 검색..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="text-center text-sm text-muted-foreground py-12">불러오는 중...</div>
      ) : filtered.length === 0 ? (
        <Card className="glass-card p-12 text-center">
          {ideas.length === 0 ? (
            <>
              <p className="text-muted-foreground mb-4">아직 작성된 아이디어가 없습니다.<br />첫 매매 분석 아이디어를 기록해보세요.</p>
              <Button onClick={() => setNewOpen(true)}><Plus className="h-4 w-4" />새 아이디어</Button>
            </>
          ) : (
            <>
              <p className="text-muted-foreground mb-4">검색 결과가 없습니다.</p>
              <Button variant="outline" onClick={() => { setStatus("all"); setMarket("all"); setSearch(""); }}>필터 초기화</Button>
            </>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((i) => (
            <IdeaCard key={i.id} idea={i} linkedCount={linkedCounts[i.id] || 0} onClick={() => nav(`/ideas/${i.id}`)} />
          ))}
        </div>
      )}

      <NewIdeaDialog open={newOpen} onOpenChange={setNewOpen} onCreated={() => refresh()} />
    </div>
  );
}
