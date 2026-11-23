/**
 * 촬영 이미지 처리 — 리사이즈 · JPEG 인코딩 · 흐림/밝기 판정.
 * 흐림 판정은 라플라시안 분산(값이 낮을수록 경계가 흐림)을 쓴다. AI 호출 전에 기기에서 먼저 걸러 비용과 대기 시간을 줄인다.
 */

export const MAX_SIDE = 1600;
/** 320px 폭 그레이스케일 기준. 실측으로 조정할 수 있게 상수로 둔다 */
export const BLUR_THRESHOLD = 60;
export const DARK_THRESHOLD = 45;

export interface ImageQuality {
  blurScore: number;
  brightness: number;
  blurry: boolean;
  dark: boolean;
}

/** 순수 함수 — 그레이스케일 픽셀의 라플라시안 분산 */
export function laplacianVariance(gray: ArrayLike<number>, w: number, h: number) {
  let sum = 0;
  let sumSq = 0;
  let n = 0;
  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const i = y * w + x;
      const v = gray[i - w] + gray[i + w] + gray[i - 1] + gray[i + 1] - 4 * gray[i];
      sum += v;
      sumSq += v * v;
      n += 1;
    }
  }
  if (n === 0) return 0;
  const mean = sum / n;
  return sumSq / n - mean * mean;
}

export function assessQuality(rgba: ArrayLike<number>, w: number, h: number): ImageQuality {
  const gray = new Float32Array(w * h);
  let total = 0;
  for (let i = 0; i < w * h; i += 1) {
    const g = 0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2];
    gray[i] = g;
    total += g;
  }
  const blurScore = laplacianVariance(gray, w, h);
  const brightness = total / (w * h);
  return { blurScore: Math.round(blurScore), brightness: Math.round(brightness), blurry: blurScore < BLUR_THRESHOLD, dark: brightness < DARK_THRESHOLD };
}

type Drawable = HTMLVideoElement | ImageBitmap;

function sizeOf(src: Drawable) {
  return src instanceof HTMLVideoElement ? { w: src.videoWidth, h: src.videoHeight } : { w: src.width, h: src.height };
}

function canvasOf(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("캔버스를 사용할 수 없습니다.");
  return { c, ctx };
}

/** 비디오 프레임 또는 비트맵 → 최대 1600px JPEG + 품질 판정 */
export async function encodeCapture(src: Drawable): Promise<{ blob: Blob; width: number; height: number; quality: ImageQuality }> {
  const { w, h } = sizeOf(src);
  if (!w || !h) throw new Error("카메라 화면이 아직 준비되지 않았습니다.");
  const k = Math.min(1, MAX_SIDE / Math.max(w, h));
  const W = Math.round(w * k);
  const H = Math.round(h * k);
  const { c, ctx } = canvasOf(W, H);
  ctx.drawImage(src, 0, 0, W, H);

  const qw = 320;
  const qh = Math.max(1, Math.round((H / W) * qw));
  const q = canvasOf(qw, qh);
  q.ctx.drawImage(c, 0, 0, qw, qh);
  const quality = assessQuality(q.ctx.getImageData(0, 0, qw, qh).data, qw, qh);

  const blob = await new Promise<Blob>((resolve, reject) =>
    c.toBlob((b) => (b ? resolve(b) : reject(new Error("이미지 인코딩 실패"))), "image/jpeg", 0.86),
  );
  return { blob, width: W, height: H, quality };
}

/** 갤러리에서 고른 파일 → 같은 처리 (EXIF 회전 반영) */
export async function encodeFile(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("이미지 파일만 사용할 수 있습니다.");
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    return await encodeCapture(bitmap);
  } finally {
    bitmap.close();
  }
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < buf.length; i += CHUNK) bin += String.fromCharCode(...buf.subarray(i, i + CHUNK));
  return btoa(bin);
}
