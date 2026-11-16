import type { EvalKey, Product } from "@/types";

export const EVAL_ORDER: EvalKey[] = ["era", "scarcity", "design", "condition", "demand"];

export const EVAL_LABEL: Record<EvalKey, string> = {
  era: "시대성",
  scarcity: "희소성",
  design: "디자인 가치",
  demand: "수요",
  condition: "상태",
};

const CX = 150;
const CY = 140;
const R = 92;
const MAX = 5;

function point(index: number, ratio: number) {
  const angle = (Math.PI * 2 * index) / 5 - Math.PI / 2;
  return [CX + Math.cos(angle) * R * ratio, CY + Math.sin(angle) * R * ratio];
}

function polygon(ratios: number[]) {
  return ratios.map((r, i) => point(i, r).join(",")).join(" ");
}

/** 5각형 레이더 차트 — 제품 종합 평가 시각화 (희귀도 등급과는 별개) */
export function RadarChart({ evaluation }: { evaluation: Product["evaluation"] }) {
  const ratios = EVAL_ORDER.map((k) => evaluation[k].score / MAX);

  return (
    <svg viewBox="0 0 300 280" className="h-auto w-full" role="img" aria-label="제품 종합 평가 레이더 차트">
      {[0.2, 0.4, 0.6, 0.8, 1].map((r) => (
        <polygon
          key={r}
          points={polygon([r, r, r, r, r])}
          fill="none"
          stroke={r === 1 ? "#cfcfcf" : "#e6e6e6"}
          strokeWidth="1"
        />
      ))}
      {EVAL_ORDER.map((k, i) => {
        const [x, y] = point(i, 1);
        return <line key={k} x1={CX} y1={CY} x2={x} y2={y} stroke="#e6e6e6" />;
      })}
      <g className="origin-[150px_140px] animate-rise">
        <polygon points={polygon(ratios)} fill="rgba(230,0,18,0.14)" stroke="#E60012" strokeWidth="2" strokeLinejoin="round" />
        {ratios.map((r, i) => {
          const [x, y] = point(i, r);
          return <circle key={i} cx={x} cy={y} r="3.5" fill="#E60012" />;
        })}
      </g>
      {EVAL_ORDER.map((k, i) => {
        const [x, y] = point(i, 1.24);
        return (
          <text key={k} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize="12" fontWeight="600" fill="#111">
            {EVAL_LABEL[k]}
            <tspan dx="4" fill="#E60012" fontWeight="800">
              {evaluation[k].score}
            </tspan>
          </text>
        );
      })}
    </svg>
  );
}
