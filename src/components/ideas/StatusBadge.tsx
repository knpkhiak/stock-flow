import { STATUS_LABEL, type IdeaStatus } from "@/types/idea";

const STYLES: Record<IdeaStatus, string> = {
  watching: "border-muted-foreground/30 bg-muted/40 text-muted-foreground",
  entered: "border-status-partial/30 bg-status-partial/15 text-status-partial",
  passed: "border-market-overseas/30 bg-market-overseas/15 text-market-overseas",
};

export default function IdeaStatusBadge({ status }: { status: IdeaStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${STYLES[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
