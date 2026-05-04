import { KR, US } from "country-flag-icons/react/3x2";

export type Market = "국내" | "해외" | "암호화폐" | string;

/**
 * Renders a market identifier using flags / symbols (no color).
 * - 국내 → 🇰🇷 SVG
 * - 해외 → 🇺🇸 SVG
 * - 암호화폐 → ₿ text symbol
 */
export default function MarketIcon({
  market,
  className = "w-4 h-3 inline-block align-middle",
}: {
  market: Market;
  className?: string;
}) {
  if (market === "국내") return <KR title="국내" className={className} />;
  if (market === "해외") return <US title="해외" className={className} />;
  if (market === "암호화폐")
    return (
      <span title="암호화폐" className="inline-block font-bold">
        ₿
      </span>
    );
  return <span className="text-xs text-muted-foreground">{market}</span>;
}
