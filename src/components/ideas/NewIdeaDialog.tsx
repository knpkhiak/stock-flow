import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const OVERSEAS_EXCDS = ["NAS", "NYS", "AMS"];

export default function NewIdeaDialog({
  open, onOpenChange, onCreated,
}: { open: boolean; onOpenChange: (v: boolean) => void; onCreated?: (id: string) => void }) {
  const { user } = useAuth();
  const nav = useNavigate();
  const [title, setTitle] = useState("");
  const [ticker, setTicker] = useState("");
  const [market, setMarket] = useState("국내");
  const [excd, setExcd] = useState("NAS");
  const [tagsInput, setTagsInput] = useState("");
  const [resolvedName, setResolvedName] = useState("");
  const [resolving, setResolving] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(""); setTicker(""); setMarket("국내"); setExcd("NAS");
      setTagsInput(""); setResolvedName("");
    }
  }, [open]);

  const resolveTicker = async () => {
    const t = ticker.trim();
    if (!t) return;
    if (market === "암호화폐") return;
    setResolving(true);
    try {
      const isOverseas = market === "해외";
      const action = isOverseas ? "stock_info_overseas" : "stock_info";
      const body: Record<string, string> = { action, env: "real", ticker: t };
      if (isOverseas) body.excd = excd;
      const { data } = await supabase.functions.invoke("kis-proxy", { body });
      const out = (data as any)?.output;
      const nm = isOverseas
        ? out?.prdt_name || out?.prdt_eng_name || out?.std_pdno || t
        : out?.prdt_abrv_name || out?.prdt_name || out?.prdt_eng_name || t;
      setResolvedName(nm);
      toast.success(`종목 확인: ${nm}`);
    } catch (e: any) {
      toast.error(`종목 조회 실패: ${e.message}`);
    } finally { setResolving(false); }
  };

  const submit = async () => {
    if (!user) return;
    if (!title.trim()) { toast.error("제목을 입력하세요"); return; }
    setSaving(true);
    try {
      const tags = tagsInput.split(",").map((s) => s.trim()).filter(Boolean);
      const { data, error } = await supabase
        .from("ideas")
        .insert({
          user_id: user.id,
          title: title.trim(),
          ticker: ticker.trim() || null,
          market: ticker.trim() ? market : null,
          tags,
        })
        .select("id")
        .single();
      if (error) throw error;
      toast.success("아이디어가 생성되었습니다");
      onOpenChange(false);
      const id = (data as any).id as string;
      onCreated?.(id);
      nav(`/ideas/${id}`);
    } catch (e: any) {
      toast.error(`생성 실패: ${e.message}`);
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>새 아이디어</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>제목 *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 삼성전자 반도체 사이클 전환" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>시장</Label>
              <Select value={market} onValueChange={setMarket}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="국내">🇰🇷 국내</SelectItem>
                  <SelectItem value="해외">🇺🇸 해외</SelectItem>
                  <SelectItem value="암호화폐">₿ 암호화폐</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {market === "해외" && (
              <div>
                <Label>거래소</Label>
                <Select value={excd} onValueChange={setExcd}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {OVERSEAS_EXCDS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div>
            <Label>티커 (선택)</Label>
            <div className="flex gap-2">
              <Input value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase())} placeholder="005930 or AAPL" />
              <Button type="button" variant="outline" onClick={resolveTicker} disabled={resolving || !ticker.trim()}>
                {resolving ? "조회중" : "확인"}
              </Button>
            </div>
            {resolvedName && <p className="text-xs text-muted-foreground mt-1">→ {resolvedName}</p>}
          </div>
          <div>
            <Label>태그 (쉼표로 구분, 선택)</Label>
            <Input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="반도체, 장기, 사이클" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>취소</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "생성중..." : "작성 시작"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
