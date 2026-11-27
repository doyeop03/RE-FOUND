import type { EvalKey, Product } from "@/types";

export const EVAL_ORDER: EvalKey[] = ["era", "scarcity", "design", "condition", "demand"];

/** Figma 05 — 다섯 가지 가치 (시계 방향: 시대성 · 서사성 · 대표성 · 보존성 · 수요성) */
export const EVAL_LABEL: Record<EvalKey, string> = {
  era: "시대성",
  scarcity: "서사성",
  design: "대표성",
  demand: "수요성",
  condition: "보존성",
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
        <polygon points={polygon(ratios)} fill="rgba(230,0,18,0.13)" stroke="#E60012" strokeWidth="2" strokeLinejoin="round" />
        {ratios.map((r, i) => {
          const [x, y] = point(i, r);
          return <circle key={i} cx={x} cy={y} r="4" fill="#E60012" />;
        })}
      </g>
      {EVAL_ORDER.map((k, i) => {
        const [x, y] = point(i, 1.2);
        return (
          <text key={k} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize="11" fontWeight="700" fill="#111">
            {EVAL_LABEL[k]}
            <tspan fill="#E60012" fontWeight="700">
              {evaluation[k].score}
            </tspan>
          </text>
        );
      })}
    </svg>
  );
}
