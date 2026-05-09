import { Card } from "@/components/ui/card";
import MarketIcon from "@/components/MarketIcon";
import IdeaStatusBadge from "./StatusBadge";
import { extractTextFromJSON } from "@/lib/extractText";
import type { Idea } from "@/types/idea";

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
};

export default function IdeaCard({
  idea,
  linkedCount = 0,
  onClick,
}: {
  idea: Idea;
  linkedCount?: number;
  onClick?: () => void;
}) {
  const preview = extractTextFromJSON(idea.content).slice(0, 140);
  const tagsShown = idea.tags.slice(0, 3);
  const extraTags = Math.max(0, idea.tags.length - 3);
  const updatedDifferent = idea.updated_at !== idea.created_at;

  return (
    <Card
      onClick={onClick}
      className="glass-card p-4 cursor-pointer transition hover:-translate-y-0.5 hover:shadow-lg hover:border-primary/40"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-semibold text-sm truncate flex-1">{idea.title}</h3>
        <IdeaStatusBadge status={idea.status} />
      </div>

      {idea.ticker && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
          {idea.market && <MarketIcon market={idea.market} />}
          <span className="truncate">
            {idea.ticker}
          </span>
        </div>
      )}

      {preview && (
        <p className="text-xs text-muted-foreground line-clamp-3 mb-3 min-h-[3em]">{preview}</p>
      )}

      {tagsShown.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {tagsShown.map((t) => (
            <span key={t} className="rounded bg-muted/40 px-1.5 py-0.5 text-[10px] text-muted-foreground">
              #{t}
            </span>
          ))}
          {extraTags > 0 && (
            <span className="text-[10px] text-muted-foreground">+{extraTags}</span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{fmtDate(idea.created_at)}{updatedDifferent && ` · 수정 ${fmtDate(idea.updated_at)}`}</span>
        {linkedCount > 0 && <span>💼 매매 {linkedCount}건</span>}
      </div>
    </Card>
  );
}
