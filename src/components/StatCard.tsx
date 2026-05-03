import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface Props {
  label: string;
  value: ReactNode;
  hint?: string;
  icon: LucideIcon;
  accent?: "primary" | "secondary";
}

export function StatCard({ label, value, hint, icon: Icon, accent = "primary" }: Props) {
  const color = accent === "primary" ? "text-primary" : "text-secondary";
  return (
    <Card className="glass-card p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className={`text-3xl font-semibold mt-2 num ${color}`}>{value}</p>
          {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
        </div>
        <div className={`h-10 w-10 rounded-lg bg-muted/50 flex items-center justify-center ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}
