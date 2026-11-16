import { useId } from "react";
import type { GarmentSpec, GarmentView } from "@/types";

/**
 * 제품 이미지 플레이스홀더.
 * 외부 이미지의 저작권 문제를 피하기 위해 제품 스펙으로 SVG 일러스트를 직접 그린다.
 * 실제 서비스에서는 이 컴포넌트를 제품 사진(<Image>)으로 교체하면 된다.
 */

const HEM = { short: 366, regular: 398, long: 450 } as const;

function isDark(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b < 110;
}

function topPath(spec: GarmentSpec, back: boolean) {
  const h = HEM[spec.length ?? "regular"];
  const neck = back ? "Q200,88 158,80" : "Q200,102 158,80";
  if (spec.sleeve === "short") {
    return `M158,80 L112,98 Q98,103 92,116 L60,192 Q56,202 66,206 L102,218 Q111,221 115,212 L132,176 L128,${h - 8} Q128,${h} 136,${h} L264,${h} Q272,${h} 272,${h - 8} L268,176 L285,212 Q289,221 298,218 L334,206 Q344,202 340,192 L308,116 Q302,103 288,98 L242,80 ${neck} Z`;
  }
  return `M158,80 L112,98 Q96,104 90,124 L50,330 Q48,340 58,343 L92,352 Q101,354 104,345 L132,196 L128,${h - 8} Q128,${h} 136,${h} L264,${h} Q272,${h} 272,${h - 8} L268,196 L296,345 Q299,354 308,352 L342,343 Q352,340 350,330 L310,124 Q304,104 288,98 L242,80 ${neck} Z`;
}

const PANTS_PATH =
  "M138,56 L262,56 L268,104 L284,428 Q284,438 274,438 L224,438 Q215,438 214,429 L200,176 L186,429 Q185,438 176,438 L126,438 Q116,438 116,428 L132,104 Z";

function Texture({ id, fabric, dark }: { id: string; fabric: GarmentSpec["fabric"]; dark: boolean }) {
  const ink = dark ? "#ffffff" : "#000000";
  switch (fabric) {
    case "fleece":
      return (
        <pattern id={id} width="9" height="9" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.6" fill={ink} opacity="0.07" />
          <circle cx="6.5" cy="6.5" r="1.6" fill={ink} opacity="0.05" />
          <circle cx="7" cy="1.5" r="0.9" fill="#000" opacity="0.08" />
        </pattern>
      );
    case "wool":
      return (
        <pattern id={id} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
          <rect width="6" height="1" fill={ink} opacity="0.05" />
          <rect y="3" width="6" height="1" fill="#000" opacity="0.05" />
        </pattern>
      );
    case "denim":
      return (
        <pattern id={id} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="5" height="1.2" fill="#fff" opacity="0.1" />
        </pattern>
      );
    case "knit":
      return (
        <pattern id={id} width="7" height="10" patternUnits="userSpaceOnUse">
          <path d="M0,0 L3.5,5 L7,0" fill="none" stroke={ink} strokeWidth="0.8" opacity="0.1" />
          <path d="M0,5 L3.5,10 L7,5" fill="none" stroke={ink} strokeWidth="0.8" opacity="0.1" />
        </pattern>
      );
    default:
      return (
        <pattern id={id} width="4" height="4" patternUnits="userSpaceOnUse">
          <rect width="4" height="4" fill="none" />
        </pattern>
      );
  }
}

interface Props {
  spec: GarmentSpec;
  view?: GarmentView;
  className?: string;
  label?: string;
}

export function GarmentImage({ spec, view = "front", className, label }: Props) {
  const raw = useId();
  const uid = raw.replace(/[^a-zA-Z0-9_-]/g, "");
  const texId = `tex-${uid}`;
  const clipId = `clip-${uid}`;
  const dark = isDark(spec.color);
  const line = dark ? "rgba(255,255,255,0.24)" : "rgba(0,0,0,0.24)";
  const soft = dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)";
  const outline = dark ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0.28)";

  if (view === "label" || view === "detail") {
    return (
      <svg viewBox="0 0 400 480" className={className} role="img" aria-label={label ?? "의류 디테일"} preserveAspectRatio="xMidYMid slice">
        <defs>
          <Texture id={texId} fabric={spec.fabric} dark={dark} />
        </defs>
        <rect width="400" height="480" fill={spec.color} />
        <g transform="scale(2.4)">
          <rect width="400" height="480" fill={`url(#${texId})`} />
        </g>
        {view === "label" ? (
          <g>
            <rect x="128" y="176" width="144" height="112" fill="#FBFAF7" stroke="rgba(0,0,0,0.2)" />
            <path d="M134,182 H266 M134,282 H266" stroke="rgba(0,0,0,0.25)" strokeDasharray="4 3" />
            <rect x="146" y="198" width="30" height="30" fill="#E60012" />
            <text x="186" y="212" fontSize="11" fontWeight="700" fill="#111" letterSpacing="1">ARCHIVE</text>
            <text x="186" y="226" fontSize="9" fill="#666" letterSpacing="1">SAMPLE LABEL</text>
            <path d="M146,244 H254 M146,254 H232 M146,264 H244" stroke="#9a9a9a" strokeWidth="2" />
            <text x="254" y="216" fontSize="18" fontWeight="800" fill="#111" textAnchor="end">L</text>
          </g>
        ) : (
          <g>
            <path d="M-10,330 Q200,250 410,310" fill="none" stroke={outline} strokeWidth="3" />
            <path d="M-10,342 Q200,262 410,322" fill="none" stroke={line} strokeWidth="2" strokeDasharray="9 7" />
            <rect width="400" height="480" fill="rgba(0,0,0,0.06)" />
          </g>
        )}
      </svg>
    );
  }

  const back = view === "back";

  if (spec.kind === "pants") {
    return (
      <svg viewBox="0 0 400 480" className={className} role="img" aria-label={label ?? "팬츠 이미지"}>
        <defs>
          <Texture id={texId} fabric={spec.fabric} dark={dark} />
          <clipPath id={clipId}>
            <path d={PANTS_PATH} />
          </clipPath>
        </defs>
        <ellipse cx="200" cy="452" rx="110" ry="7" fill="rgba(0,0,0,0.07)" />
        <path d={PANTS_PATH} fill={spec.color} stroke={outline} strokeWidth="1.5" strokeLinejoin="round" />
        <g clipPath={`url(#${clipId})`}>
          <rect width="400" height="480" fill={`url(#${texId})`} />
          <rect x="200" y="0" width="200" height="480" fill="rgba(0,0,0,0.07)" />
          {/* 셀비지 롤업 */}
          <rect x="110" y="412" width="80" height="30" fill="rgba(255,255,255,0.16)" />
          <rect x="210" y="412" width="80" height="30" fill="rgba(255,255,255,0.16)" />
          {!back && (
            <>
              <rect x="180" y="412" width="3" height="30" fill="#E60012" />
              <rect x="217" y="412" width="3" height="30" fill="#E60012" />
            </>
          )}
        </g>
        <path d="M134,84 H266" stroke={line} strokeWidth="1.5" />
        <path d="M118,412 H186 M214,412 H282" stroke={line} strokeWidth="1.5" />
        {back ? (
          <>
            <path d="M136,100 L200,116 L264,100" fill="none" stroke={line} strokeWidth="1.5" />
            <rect x="146" y="124" width="42" height="48" fill="none" stroke={line} strokeWidth="1.5" />
            <rect x="212" y="124" width="42" height="48" fill="none" stroke={line} strokeWidth="1.5" />
            <rect x="218" y="62" width="26" height="16" fill="#C8A26B" opacity="0.9" />
          </>
        ) : (
          <>
            <path d="M200,84 V176" stroke={line} strokeWidth="1.5" />
            <path d="M200,84 Q214,120 208,150" fill="none" stroke={line} strokeWidth="1.5" strokeDasharray="4 3" />
            <path d="M138,88 Q150,118 172,120" fill="none" stroke={line} strokeWidth="1.5" />
            <path d="M262,88 Q250,118 228,120" fill="none" stroke={line} strokeWidth="1.5" />
            <circle cx="200" cy="70" r="4.5" fill="#C9B38A" stroke="rgba(0,0,0,0.3)" />
            {[150, 180, 220, 250].map((x) => (
              <rect key={x} x={x - 2.5} y="54" width="5" height="32" fill={soft} />
            ))}
          </>
        )}
      </svg>
    );
  }

  const h = HEM[spec.length ?? "regular"];
  const body = topPath(spec, back);
  const short = spec.sleeve === "short";
  const collarFill = dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
  const zipTop = spec.collar === "stand" ? 52 : 92;

  return (
    <svg viewBox="0 0 400 480" className={className} role="img" aria-label={label ?? "의류 이미지"}>
      <defs>
        <Texture id={texId} fabric={spec.fabric} dark={dark} />
        <clipPath id={clipId}>
          <path d={body} />
        </clipPath>
      </defs>

      <ellipse cx="200" cy={h + 18} rx="120" ry="7" fill="rgba(0,0,0,0.07)" />

      {/* 목 안쪽 */}
      {!back && spec.collar !== "stand" && (
        <path d="M158,80 Q200,66 242,80 Q200,104 158,80 Z" fill="rgba(0,0,0,0.42)" />
      )}

      <path d={body} fill={spec.color} stroke={outline} strokeWidth="1.5" strokeLinejoin="round" />

      <g clipPath={`url(#${clipId})`}>
        {spec.graphic === "stripe" &&
          Array.from({ length: 9 }).map((_, i) => (
            <rect key={i} x="0" y={112 + i * 44} width="400" height="20" fill={spec.accent ?? "#111"} />
          ))}
        <rect width="400" height="480" fill={`url(#${texId})`} />
        {/* 소매 음영 */}
        <rect x="0" y="0" width="131" height="480" fill="rgba(0,0,0,0.07)" />
        <rect x="269" y="0" width="131" height="480" fill="rgba(0,0,0,0.07)" />
        {spec.ribHem && (
          <g>
            <rect x="120" y={h - 22} width="160" height="24" fill="rgba(0,0,0,0.1)" />
            {Array.from({ length: 26 }).map((_, i) => (
              <path key={i} d={`M${130 + i * 5.6},${h - 22} V${h}`} stroke={soft} strokeWidth="1" />
            ))}
          </g>
        )}
      </g>

      {/* 암홀 봉제선 */}
      <path d={`M118,100 Q130,${short ? 140 : 150} 132,${short ? 176 : 196}`} fill="none" stroke={line} strokeWidth="1.5" />
      <path d={`M282,100 Q270,${short ? 140 : 150} 268,${short ? 176 : 196}`} fill="none" stroke={line} strokeWidth="1.5" />

      {/* 소매 끝 */}
      {short ? (
        <>
          <path d="M65,188 L112,204" stroke={line} strokeWidth="1.5" />
          <path d="M335,188 L288,204" stroke={line} strokeWidth="1.5" />
        </>
      ) : (
        <>
          <path d="M54,314 L101,326" stroke={line} strokeWidth="1.5" />
          <path d="M346,314 L299,326" stroke={line} strokeWidth="1.5" />
        </>
      )}

      {/* 칼라 */}
      {spec.collar === "stand" && (
        <path
          d={back ? "M156,82 L162,54 Q200,44 238,54 L244,82 Q200,90 156,82 Z" : "M156,82 L162,52 Q200,40 238,52 L244,82 Q200,104 156,82 Z"}
          fill={spec.color}
          stroke={outline}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      )}
      {spec.collar === "stand" && (
        <path d={back ? "M156,82 L162,54 Q200,44 238,54 L244,82 Q200,90 156,82 Z" : "M156,82 L162,52 Q200,40 238,52 L244,82 Q200,104 156,82 Z"} fill={collarFill} />
      )}
      {spec.collar === "crew" && (
        <path d={back ? "M158,80 Q200,88 242,80" : "M158,80 Q200,102 242,80"} fill="none" stroke={dark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"} strokeWidth="8" strokeLinecap="round" />
      )}
      {spec.collar === "shirt" &&
        (back ? (
          <path d="M156,82 L164,62 Q200,54 236,62 L244,82 Q200,92 156,82 Z" fill={spec.color} stroke={outline} strokeWidth="1.5" strokeLinejoin="round" />
        ) : (
          <>
            <path d="M158,80 L168,60 Q200,52 232,60 L242,80 L216,108 L200,90 L184,108 Z" fill={spec.color} stroke={outline} strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M158,80 L168,60 Q200,52 232,60 L242,80 L216,108 L200,90 L184,108 Z" fill={collarFill} />
            <path d="M176,66 Q200,84 224,66" fill="none" stroke={line} strokeWidth="1.5" />
          </>
        ))}
      {spec.collar === "lapel" &&
        (back ? (
          <path d="M156,82 L164,64 Q200,56 236,64 L244,82 Q200,92 156,82 Z" fill={spec.color} stroke={outline} strokeWidth="1.5" strokeLinejoin="round" />
        ) : (
          <>
            <path d="M172,76 L200,196 L228,76 Q200,92 172,76 Z" fill="rgba(0,0,0,0.5)" />
            <path d="M160,78 L200,198 L170,170 L146,150 L168,138 L142,106 Z" fill={spec.color} stroke={outline} strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M240,78 L200,198 L230,170 L254,150 L232,138 L258,106 Z" fill={spec.color} stroke={outline} strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M160,78 L200,198 L170,170 L146,150 L168,138 L142,106 Z" fill={collarFill} />
            <path d="M240,78 L200,198 L230,170 L254,150 L232,138 L258,106 Z" fill={collarFill} />
          </>
        ))}

      {back ? (
        <path d="M120,112 Q200,136 280,112" fill="none" stroke={line} strokeWidth="1.5" />
      ) : (
        <>
          {/* 여밈 */}
          {spec.front === "zip" && (
            <g>
              <path d={`M200,${zipTop} V${h}`} stroke="rgba(0,0,0,0.35)" strokeWidth="5" />
              <path d={`M200,${zipTop} V${h}`} stroke="#D9D9D9" strokeWidth="2.4" strokeDasharray="2 2.4" />
              <rect x="196" y={zipTop + 6} width="8" height="16" rx="2" fill="#CFCFCF" stroke="rgba(0,0,0,0.4)" />
            </g>
          )}
          {spec.front === "halfzip" && (
            <g>
              <path d={`M200,${zipTop} V214`} stroke="rgba(0,0,0,0.35)" strokeWidth="5" />
              <path d={`M200,${zipTop} V214`} stroke="#D9D9D9" strokeWidth="2.4" strokeDasharray="2 2.4" />
              <rect x="196" y={zipTop + 6} width="8" height="16" rx="2" fill="#CFCFCF" stroke="rgba(0,0,0,0.4)" />
              <path d="M190,214 H210" stroke={line} strokeWidth="1.5" />
            </g>
          )}
          {spec.front === "buttons" && (
            <g>
              <path d={`M207,${spec.collar === "lapel" ? 196 : 104} V${h}`} stroke={line} strokeWidth="1.5" />
              {Array.from({ length: spec.collar === "lapel" ? 3 : spec.length === "short" ? 5 : 6 }).map((_, i) => {
                const start = spec.collar === "lapel" ? 222 : 124;
                const gap = spec.collar === "lapel" ? 62 : spec.length === "short" ? 52 : 48;
                return (
                  <circle key={i} cx="200" cy={start + i * gap} r="4.2" fill={dark ? "#1b1b1b" : "#F4F1EA"} stroke="rgba(0,0,0,0.45)" />
                );
              })}
            </g>
          )}

          {/* 포켓 */}
          {spec.pockets === "chest" && <path d="M222,168 H262 V208 L242,218 L222,208 Z" fill="none" stroke={line} strokeWidth="1.5" />}
          {spec.pockets === "welt" && (
            <>
              <path d={`M146,${h - 108} L158,${h - 52}`} stroke={line} strokeWidth="2.2" />
              <path d={`M254,${h - 108} L242,${h - 52}`} stroke={line} strokeWidth="2.2" />
            </>
          )}
          {spec.pockets === "flap2" && (
            <>
              {[142, 214].map((x) => (
                <g key={x}>
                  <rect x={x} y="158" width="44" height="46" fill="none" stroke={line} strokeWidth="1.5" />
                  <path d={`M${x},158 H${x + 44} V170 L${x + 22},178 L${x},170 Z`} fill={collarFill} stroke={line} strokeWidth="1.5" />
                  <circle cx={x + 22} cy="170" r="2.6" fill="#C9B38A" stroke="rgba(0,0,0,0.35)" />
                </g>
              ))}
              <path d={`M164,204 L176,${h - 22}`} stroke={line} strokeWidth="1.5" />
              <path d={`M236,204 L224,${h - 22}`} stroke={line} strokeWidth="1.5" />
              <path d={`M128,${h - 22} H272`} stroke={line} strokeWidth="1.5" />
            </>
          )}
          {spec.pockets === "flap4" && (
            <>
              {[
                [142, 150, 44, 44],
                [214, 150, 44, 44],
                [138, 290, 50, 62],
                [212, 290, 50, 62],
              ].map(([x, y, w, ph]) => (
                <g key={`${x}-${y}`}>
                  <rect x={x} y={y} width={w} height={ph} fill="none" stroke={line} strokeWidth="1.5" />
                  <path d={`M${x - 2},${y} H${x + w + 2} V${y + 14} H${x - 2} Z`} fill={collarFill} stroke={line} strokeWidth="1.5" />
                  <circle cx={x + w / 2} cy={y + 8} r="2.4" fill={soft} stroke={line} />
                </g>
              ))}
              <path d="M130,262 H270" stroke={line} strokeWidth="1.5" strokeDasharray="5 4" />
            </>
          )}

          {/* 그래픽 */}
          {spec.graphic === "box" && (
            <g>
              <rect x="164" y="146" width="72" height="72" fill={spec.accent ?? "#fff"} opacity="0.92" />
              <path d="M176,170 H224 M176,182 H212 M176,194 H220" stroke={spec.color} strokeWidth="4" />
            </g>
          )}
          {spec.graphic === "circle" && (
            <g>
              <circle cx="200" cy="184" r="36" fill={spec.accent ?? "#E60012"} />
              <circle cx="200" cy="184" r="17" fill={spec.color} />
              <circle cx="200" cy="184" r="6" fill={spec.accent ?? "#E60012"} />
            </g>
          )}
        </>
      )}
    </svg>
  );
}
