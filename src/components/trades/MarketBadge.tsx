import { marketColorVar } from "./marketStyle";

export function MarketDot({ market }: { market: string }) {
  return (
    <span
      className="inline-block h-2 w-2 rounded-full"
      style={{ backgroundColor: `hsl(${marketColorVar(market)})` }}
    />
  );
}

export default function MarketBadge({ market }: { market: string }) {
  const c = marketColorVar(market);
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium tabular-nums"
      style={{
        backgroundColor: `hsl(${c} / 0.15)`,
        color: `hsl(${c})`,
        borderColor: `hsl(${c} / 0.3)`,
      }}
    >
      <MarketDot market={market} />
      {market}
    </span>
  );
}
