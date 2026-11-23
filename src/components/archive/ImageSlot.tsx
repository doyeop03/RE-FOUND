"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, ImagePlus, Maximize2, X } from "lucide-react";
import { idb } from "@/lib/idb";
import { cx } from "@/lib/format";
import type { RecordImage, RecordSource } from "@/types/archive-record";

/**
 * 권한을 아는 이미지 칸.
 *
 * - 표시 가능(src 있음): 이미지를 그리고 터치하면 확대
 * - 권한 미확인 외부 이미지: 렌더링하지 않고 출처 링크 + 이미지 등록 영역
 * - 자료 없음: 이미지 등록 영역
 *
 * '이미지 등록'은 사용자가 가진 사진을 이 기기(IndexedDB)에만 저장해 보여 준다.
 * 서버로 전송하지 않으며, 등록 이미지는 항상 '내가 등록한 이미지'로 표기한다.
 */

interface Props {
  image: RecordImage | null;
  source?: RecordSource | null;
  /** 이미지 등록 저장 키 (없으면 등록 버튼을 숨긴다) */
  registerKey?: string;
  className?: string;
  label: string;
  emptyNote?: string;
  size?: "lg" | "sm";
  tone?: "light" | "dark";
  onOpen?: (src: string, caption: string) => void;
}

function useRegistered(key: string | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!key) return;
    let alive = true;
    let objectUrl: string | null = null;
    idb
      .get<{ blob: Blob }>("registered_images", key)
      .then((v) => {
        if (!alive) return;
        objectUrl = v ? URL.createObjectURL(v.blob) : null;
        setUrl(objectUrl);
      })
      .catch(() => alive && setUrl(null));
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [key, version]);

  const register = async (file: File) => {
    if (!key || !file.type.startsWith("image/")) return;
    await idb.set("registered_images", key, { blob: file, name: file.name, at: new Date().toISOString() });
    setVersion((v) => v + 1);
  };
  const remove = async () => {
    if (!key) return;
    await idb.del("registered_images", key);
    setVersion((v) => v + 1);
  };
  return { url, register, remove };
}

export function ImageSlot({ image, source, registerKey, className, label, emptyNote, size = "lg", tone = "light", onOpen }: Props) {
  const reg = useRegistered(image?.src ? undefined : registerKey);
  const small = size === "sm";
  const dark = tone === "dark";

  const displayable = image?.src ?? null;
  if (displayable || reg.url) {
    const src = (displayable ?? reg.url) as string;
    const caption = displayable
      ? `${label} · ${image?.sourceLabel ?? ""}`
      : `${label} · 내가 등록한 이미지 (이 기기에만 저장됨)`;
    return (
      <div className={cx("group relative overflow-hidden bg-paper", className)}>
        <button type="button" onClick={() => onOpen?.(src, caption)} aria-label={`${label} 확대 보기`} className="block h-full w-full">
          {/* eslint-disable-next-line @next/next/no-img-element -- 권한이 확인된 이미지 또는 사용자 로컬 이미지 */}
          <img src={src} alt={label} className="h-full w-full object-cover" />
          <span className="absolute right-2 top-2 flex size-8 items-center justify-center bg-white/90 text-ink opacity-90">
            <Maximize2 size={14} />
          </span>
        </button>
        {!displayable && (
          <>
            <span className="absolute bottom-2 left-2 bg-ink px-1.5 py-1 text-[10px] font-bold text-white">내가 등록 · 이 기기에만 저장</span>
            <button
              type="button"
              onClick={reg.remove}
              aria-label={`${label} 등록 이미지 삭제`}
              className="absolute left-0 top-0 flex size-11 items-center justify-center"
            >
              <span className="flex size-7 items-center justify-center bg-white">
                <X size={14} />
              </span>
            </button>
          </>
        )}
      </div>
    );
  }

  const pending = Boolean(image && image.rights === "unverified");
  const link = source?.url ?? image?.originalUrl ?? null;

  return (
    <div
      className={cx(
        "relative flex flex-col justify-between overflow-hidden",
        dark ? "bg-[#161616] text-white" : "bg-ivory text-ink ring-1 ring-inset ring-line",
        small ? "p-3" : "p-5 md:p-7",
        className,
      )}
    >
      <div>
        <p className={cx("font-semibold uppercase tracking-[0.16em]", small ? "text-[9px]" : "text-[10px]", dark ? "text-white/50" : "text-sub")}>
          {pending ? "Image rights pending" : "No image on record"}
        </p>
        <p className={cx("display mt-2", small ? "text-[18px]" : "text-[30px] md:text-[44px]")}>{label}</p>
        {!small && (
          <p className={cx("mt-3 max-w-[30em] text-[12px] leading-relaxed", dark ? "text-white/60" : "text-sub")}>
            {pending ? image?.rightsNote : emptyNote ?? "등록된 사진 자료가 없습니다."}
          </p>
        )}
      </div>
      <div className={cx("flex flex-wrap items-center gap-x-3 gap-y-1", small ? "mt-2" : "mt-5")}>
        {pending && link && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className={cx("inline-flex min-h-9 items-center gap-1 font-bold underline-offset-4 hover:underline", small ? "text-[11px]" : "text-[13px]")}
          >
            {small ? "출처" : `출처에서 보기 · ${image?.sourceLabel}`} <ArrowUpRight size={small ? 12 : 14} />
          </a>
        )}
        {registerKey && (
          <label
            className={cx(
              "inline-flex min-h-9 cursor-pointer items-center gap-1 font-bold",
              small ? "text-[11px]" : "text-[13px]",
              dark ? "text-white" : "text-brand",
            )}
          >
            <ImagePlus size={small ? 13 : 15} /> 이미지 등록
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void reg.register(f);
                e.target.value = "";
              }}
            />
          </label>
        )}
      </div>
    </div>
  );
}
