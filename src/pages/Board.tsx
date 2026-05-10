import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search } from "lucide-react";
import { useBoardPosts, type BoardSort } from "@/hooks/useBoardPosts";
import BoardPostRow from "@/components/social/BoardPostRow";

export default function Board() {
  const nav = useNavigate();
  const [sort, setSort] = useState<BoardSort>("latest");
  const [search, setSearch] = useState("");
  const { posts, loading } = useBoardPosts(sort, search);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">자유게시판</h1>
          <p className="text-sm text-muted-foreground mt-1">친구들과 자유롭게 의견을 나눠보세요</p>
        </div>
        <Button onClick={() => nav("/board/new")}><Plus className="h-4 w-4" />새 글 작성</Button>
      </div>

      <Card className="glass-card p-4 flex flex-wrap items-center gap-3">
        <Select value={sort} onValueChange={(v) => setSort(v as BoardSort)}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="latest">최신순</SelectItem>
            <SelectItem value="popular">인기순</SelectItem>
            <SelectItem value="views">조회순</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="제목 검색..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </Card>

      <Card className="glass-card p-0 overflow-hidden">
        {loading ? (
          <div className="text-center text-sm text-muted-foreground py-12">불러오는 중...</div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">아직 게시글이 없어요.<br />첫 번째 글을 작성해보세요!</p>
            <Button onClick={() => nav("/board/new")}><Plus className="h-4 w-4" />첫 글 작성하기</Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>제목</TableHead>
                <TableHead className="text-right w-20">좋아요</TableHead>
                <TableHead className="text-right w-20">조회</TableHead>
                <TableHead className="text-right w-28">작성</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {posts.map((p) => (
                <BoardPostRow key={p.id} post={p} onClick={() => nav(`/board/${p.id}`)} />
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
