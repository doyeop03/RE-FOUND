import type { MarketData } from "@/types";

const W = 340;
const H = 190;
const PAD = { l: 38, r: 12, t: 14, b: 28 };

/** 월별 매물 호가 범위(밴드)와 중간값(선) */
export function PriceChart({ market }: { market: MarketData }) {
  const { trend } = market;
  const max = Math.max(...trend.map((t) => t.high));
  const min = Math.min(...trend.map((t) => t.low));
  const span = max - min || 1;
  const top = max + span * 0.15;
  const bottom = Math.max(0, min - span * 0.15);

  const x = (i: number) => PAD.l + (i * (W - PAD.l - PAD.r)) / (trend.length - 1);
  const y = (v: number) => PAD.t + ((top - v) / (top - bottom)) * (H - PAD.t - PAD.b);

  const band = [
    ...trend.map((t, i) => `${x(i)},${y(t.high)}`),
    ...trend.map((t, i) => `${x(i)},${y(t.low)}`).reverse(),
  ].join(" ");
  const median = trend.map((t, i) => `${x(i)},${y(t.median)}`).join(" ");
  const ticks = [bottom + (top - bottom) * 0.1, (top + bottom) / 2, top - (top - bottom) * 0.1];
  const last = trend[trend.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="최근 6개월 매물 호가 추이">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="#ececec" />
          <text x={PAD.l - 6} y={y(t)} textAnchor="end" dominantBaseline="middle" fontSize="10" fill="#a3a3a3">
            {(t / 10000).toFixed(1)}만
          </text>
        </g>
      ))}
      <polygon points={band} fill="rgba(230,0,18,0.1)" />
      <polyline points={median} fill="none" stroke="#E60012" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {trend.map((t, i) => (
        <text key={t.month} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="#6f6f6f">
          {t.month}
        </text>
      ))}
      <circle cx={x(trend.length - 1)} cy={y(last.median)} r="4" fill="#fff" stroke="#E60012" strokeWidth="2" />
    </svg>
  );
}
