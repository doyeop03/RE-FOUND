"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, LoaderCircle } from "lucide-react";
import { cx } from "@/lib/format";
import { encodeCapture, encodeFile, sampleFrame, type ImageQuality } from "@/lib/scan/image";
import type { Target } from "@/lib/scan/schemas";
import { GuideOverlay } from "./GuideOverlay";

/**
 * 자동 촬영 카메라 — 촬영만 담당한다 (AI 로직 없음).
 * armed 인 동안 프레임을 살펴 선명하고 흔들림 없는 상태가 이어지면 스스로 촬영해 onCaptured 로 넘긴다.
 * 검토 · 단계 진행은 부모(ScanFlow)가 한다. 카메라가 없을 때를 위해 수동 촬영 · 갤러리 선택도 둔다.
 */

export interface Captured {
  blob: Blob;
  url: string;
  width: number;
  height: number;
  quality: ImageQuality;
  source: "camera" | "gallery";
}

type CamState = "starting" | "live" | "denied" | "unavailable" | "insecure" | "error";

const CAM_MESSAGE: Record<Exclude<CamState, "starting" | "live">, string> = {
  denied: "카메라 권한이 거부되었습니다. 브라우저 주소창의 사이트 설정에서 카메라를 허용하거나, 아래 '갤러리에서 선택'을 이용해 주세요.",
  unavailable: "사용할 수 있는 카메라를 찾지 못했습니다. 갤러리에서 사진을 선택해 주세요.",
  insecure: "카메라는 HTTPS 주소(또는 localhost)에서만 사용할 수 있습니다. 갤러리에서 사진을 선택해 주세요.",
  error: "카메라를 시작하지 못했습니다. 다른 앱이 카메라를 쓰고 있지 않은지 확인하거나 갤러리에서 선택해 주세요.",
};

/** 자동 촬영 조건 — 준비 시간 뒤, 선명 · 밝음 · 정지 상태가 연속으로 이어질 때 */
const SAMPLE_MS = 500;
const WARMUP_MS = 1200;
const STEADY_FRAMES = 3;
const MOTION_LIMIT = 8;

interface Props {
  target: Target;
  /** 자동 촬영을 해도 되는 상태인지 (안내 · 재촬영 대기 · AI 확인 중에는 false) */
  armed: boolean;
  /** 카메라 대신 보여 줄 사진 (방금 찍은 사진 등) */
  frozenUrl: string | null;
  tone?: "normal" | "error";
  busy: boolean;
  busyLabel?: string;
  /** 미리보기 위에 겹쳐 보여 줄 표시 (손상 의심 등) */
  badge?: React.ReactNode;
  onCaptured: (c: Captured) => void;
  /** 미리보기 아래 상태 영역 */
  children?: React.ReactNode;
}

export function CameraCapture({ target, armed, frozenUrl, tone = "normal", busy, busyLabel, badge, onCaptured, children }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cam, setCam] = useState<CamState>("starting");
  const [shooting, setShooting] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const onCapturedRef = useRef(onCaptured);
  useEffect(() => {
    onCapturedRef.current = onCaptured;
  });

  useEffect(() => {
    let cancelled = false;
    const start = async () => {
      if (!window.isSecureContext) return setCam("insecure");
      if (!navigator.mediaDevices?.getUserMedia) return setCam("unavailable");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1440 } },
          audio: false,
        });
        if (cancelled) return stream.getTracks().forEach((t) => t.stop());
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
        setCam("live");
      } catch (err) {
        const name = (err as DOMException)?.name;
        if (cancelled) return;
        setCam(name === "NotAllowedError" || name === "SecurityError" ? "denied" : name === "NotFoundError" || name === "OverconstrainedError" ? "unavailable" : "error");
      }
    };
    void start();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  const ready = armed && !busy && !frozenUrl && !shooting;

  const shoot = async () => {
    const video = videoRef.current;
    if (!video || cam !== "live") return;
    setShooting(true);
    try {
      const r = await encodeCapture(video);
      onCapturedRef.current({ ...r, url: URL.createObjectURL(r.blob), source: "camera" });
    } catch (e) {
      setFileError((e as Error).message);
    } finally {
      setShooting(false);
    }
  };
  const shootRef = useRef(shoot);
  useEffect(() => {
    shootRef.current = shoot;
  });

  // 자동 촬영 — 선명하고 흔들림 없는 프레임이 이어지면 촬영한다
  useEffect(() => {
    if (!ready || cam !== "live") return;
    const t0 = Date.now();
    let prev: Float32Array | null = null;
    let steady = 0;
    const timer = window.setInterval(() => {
      const video = videoRef.current;
      if (!video || Date.now() - t0 < WARMUP_MS) return;
      const s = sampleFrame(video, prev);
      if (!s) return;
      prev = s.gray;
      steady = !s.quality.blurry && !s.quality.dark && s.motion < MOTION_LIMIT ? steady + 1 : 0;
      if (steady >= STEADY_FRAMES) {
        window.clearInterval(timer);
        void shootRef.current();
      }
    }, SAMPLE_MS);
    return () => window.clearInterval(timer);
  }, [ready, cam, target]);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setFileError(null);
    try {
      const r = await encodeFile(file);
      onCapturedRef.current({ ...r, url: URL.createObjectURL(r.blob), source: "gallery" });
    } catch (e) {
      setFileError((e as Error).message);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div
        className={cx(
          "relative -mx-5 aspect-[3/4] overflow-hidden bg-[#f5f5f4] md:mx-0 md:aspect-auto md:h-[460px]",
          tone === "error" ? "border-2 border-brand" : "border border-[#d5d5d5]",
        )}
      >
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={cx("absolute inset-0 h-full w-full object-cover", (frozenUrl || cam !== "live") && "invisible")}
        />
        {!frozenUrl && cam === "live" && <GuideOverlay target={target} />}

        {frozenUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- 방금 촬영한 로컬 사진
          <img src={frozenUrl} alt="방금 촬영한 사진" className="absolute inset-0 h-full w-full object-contain" />
        )}

        {!frozenUrl && cam !== "live" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center">
            {cam === "starting" ? (
              <>
                <LoaderCircle className="animate-spin text-sub" />
                <p className="text-[13px] text-sub">카메라를 켜는 중… 권한 요청이 뜨면 허용해 주세요.</p>
              </>
            ) : (
              <>
                <AlertTriangle className="text-brand" />
                <p className="max-w-[420px] text-[13px] leading-relaxed text-sub">{CAM_MESSAGE[cam]}</p>
              </>
            )}
          </div>
        )}

        {badge && <div className="absolute inset-x-0 bottom-12 flex justify-center px-4">{badge}</div>}

        {(busy || shooting) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/45 text-white" role="status" aria-live="polite">
            <LoaderCircle size={28} className="animate-spin" />
            <p className="text-[14px] font-bold">{shooting ? "촬영하고 있어요" : (busyLabel ?? "AI가 사진을 확인하고 있어요")}</p>
            <div className="absolute inset-x-0 h-[2px] animate-scan bg-brand shadow-[0_0_18px_4px_rgba(230,0,18,0.45)]" />
          </div>
        )}
      </div>

      {children}

      {ready && (
        <div className="flex flex-wrap items-center gap-x-4 text-[12px] text-sub">
          {cam === "live" && (
            <button type="button" onClick={() => void shoot()} className="h-9 font-semibold underline-offset-4 hover:text-ink hover:underline">
              자동 촬영이 안 되나요? 지금 촬영
            </button>
          )}
          <label className="flex h-9 cursor-pointer items-center font-semibold underline-offset-4 hover:text-ink hover:underline">
            갤러리에서 선택
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                void pick(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      )}
      {fileError && <p className="text-[12px] font-bold text-brand">{fileError}</p>}
    </div>
  );
}
