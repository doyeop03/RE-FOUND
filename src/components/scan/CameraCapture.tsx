"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Camera, ImagePlus, LoaderCircle, Maximize2, RotateCcw, Check } from "lucide-react";
import { ZoomViewer } from "@/components/ui/ZoomViewer";
import { cx } from "@/lib/format";
import { decideFromQuality } from "@/lib/scan/flow";
import { encodeCapture, encodeFile, type ImageQuality } from "@/lib/scan/image";
import type { Target } from "@/lib/scan/schemas";
import { GuideOverlay } from "./GuideOverlay";

/**
 * 카메라 UI — 촬영만 담당한다 (AI 로직 없음).
 * 사진(Blob)과 기기 품질 판정을 내보내고, 검토 · 단계 진행은 부모(ScanFlow)가 한다.
 * → 나중에 Gemini Live API 로 바꿔도 이 컴포넌트는 그대로 쓴다.
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

interface Props {
  target: Target;
  stepLabel: string;
  title: string;
  guide: string;
  message: string | null;
  pending: Captured | null;
  busy: boolean;
  busyLabel?: string;
  onCaptured: (c: Captured) => void;
  onRetake: () => void;
  onConfirm: () => void;
}

export function CameraCapture({ target, stepLabel, title, guide, message, pending, busy, busyLabel, onCaptured, onRetake, onConfirm }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cam, setCam] = useState<CamState>("starting");
  const [shooting, setShooting] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const closeZoom = useCallback(() => setZoom(false), []);

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

  const shoot = async () => {
    if (!videoRef.current || cam !== "live") return;
    setShooting(true);
    try {
      const r = await encodeCapture(videoRef.current);
      onCaptured({ ...r, url: URL.createObjectURL(r.blob), source: "camera" });
    } finally {
      setShooting(false);
    }
  };

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setFileError(null);
    try {
      const r = await encodeFile(file);
      onCaptured({ ...r, url: URL.createObjectURL(r.blob), source: "gallery" });
    } catch (e) {
      setFileError((e as Error).message);
    }
  };

  const q = pending?.quality;
  const qd = q ? decideFromQuality(q) : null;
  const qualityWarn = qd?.kind === "retake" ? qd.message : null;

  return (
    <div>
      <div className="relative -mx-5 aspect-[3/4] overflow-hidden bg-[#0c0c0c] md:mx-0">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={cx("absolute inset-0 h-full w-full object-cover", pending && "invisible")}
        />
        {!pending && cam === "live" && <GuideOverlay target={target} />}

        {pending && (
          // eslint-disable-next-line @next/next/no-img-element -- 방금 촬영한 로컬 사진 미리보기
          <img src={pending.url} alt={`${title} 촬영 사진`} className="absolute inset-0 h-full w-full object-contain" />
        )}

        {!pending && cam !== "live" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center text-white">
            {cam === "starting" ? (
              <>
                <LoaderCircle className="animate-spin" />
                <p className="text-[13px] text-white/70">카메라를 켜는 중… 권한 요청이 뜨면 허용해 주세요.</p>
              </>
            ) : (
              <>
                <AlertTriangle className="text-brand" />
                <p className="text-[13px] leading-relaxed text-white/80">{CAM_MESSAGE[cam]}</p>
              </>
            )}
          </div>
        )}

        {/* 상단 단계 표시 */}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
          <span className="bg-white px-2 py-1 text-[11px] font-extrabold">{stepLabel}</span>
          {pending && (
            <button type="button" onClick={() => setZoom(true)} aria-label="사진 확대해서 확인" className="flex size-11 items-center justify-center bg-white/90">
              <Maximize2 size={18} />
            </button>
          )}
        </div>

        {/* AI · 기기 안내 */}
        {(message || qualityWarn) && !busy && (
          <div className="absolute inset-x-3 bottom-3 border-l-[3px] border-brand bg-white p-3 text-[13px] font-bold leading-snug" role="status">
            {qualityWarn ?? message}
          </div>
        )}
        {busy && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/55 text-white" role="status" aria-live="polite">
            <LoaderCircle size={28} className="animate-spin" />
            <p className="text-[14px] font-bold">{busyLabel ?? "AI가 사진을 확인하고 있어요"}</p>
            <div className="absolute inset-x-0 h-[2px] animate-scan bg-brand shadow-[0_0_18px_4px_rgba(230,0,18,0.45)]" />
          </div>
        )}
      </div>

      <div className="mt-4">
        <h2 className="text-[22px] font-extrabold tracking-[-0.03em]">{title}</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-sub">{guide}</p>
        {fileError && <p className="mt-2 text-[12px] font-bold text-brand">{fileError}</p>}
      </div>

      {pending ? (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" disabled={busy} onClick={onRetake} className="inline-flex h-[52px] items-center justify-center gap-2 border border-ink bg-white text-[15px] font-bold disabled:opacity-40">
            <RotateCcw size={18} /> 다시 찍기
          </button>
          <button type="button" disabled={busy} onClick={onConfirm} className="inline-flex h-[52px] items-center justify-center gap-2 bg-brand text-[15px] font-bold text-white disabled:bg-line disabled:text-faint">
            <Check size={18} /> {qualityWarn ? "그래도 사용" : "이 사진 사용"}
          </button>
        </div>
      ) : (
        <div className="mt-4 flex items-center justify-between gap-3">
          <label className="inline-flex h-[52px] flex-1 cursor-pointer items-center justify-center gap-2 border border-line text-[14px] font-bold">
            <ImagePlus size={18} /> 갤러리에서 선택
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
          <button
            type="button"
            onClick={shoot}
            disabled={cam !== "live" || shooting}
            aria-label="촬영"
            className="flex size-[72px] shrink-0 items-center justify-center rounded-full border-4 border-ink bg-brand text-white disabled:border-line disabled:bg-line"
          >
            {shooting ? <LoaderCircle className="animate-spin" /> : <Camera size={28} />}
          </button>
          <span className="flex-1" />
        </div>
      )}

      {zoom && pending && <ZoomViewer src={pending.url} alt={title} caption={`${title} · 확대해서 초점과 글자를 확인하세요`} onClose={closeZoom} />}
    </div>
  );
}
