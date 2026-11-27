"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import type { GalleryPhoto } from "@/components/archive/Gallery";
import { buttonLinkClass } from "@/components/ui/primitives";
import { curationMedia, type CurationMedia } from "@/data/demo-scan";
import type { ScanProduct } from "@/lib/scan/curation";
import { acceptedImages } from "@/lib/scan/flow";
import { TARGET_LABEL, type Target } from "@/lib/scan/schemas";
import { getBlob, getSession } from "@/lib/scan/session-store";
import { useQueryString } from "@/lib/use-query";

export interface ScanProductData {
  sessionId: string;
  product: ScanProduct;
  /** 내가 찍은 사진 (촬영 순서) */
  photos: GalleryPhoto[];
  /** 큐레이션 자료 사진 (없으면 null) */
  media: CurationMedia | null;
}

const PHOTO_LABEL: Partial<Record<Target, string>> = {
  front_full: "앞면",
  back_full: "뒷면",
  care_label: "케어라벨",
  main_tag: "목 라벨",
};

type State = { kind: "loading" } | { kind: "missing" } | { kind: "ready"; data: ScanProductData };

/**
 * ?session=<id> 의 스캔 결과(AI 큐레이션)를 이 기기의 IndexedDB 에서 읽어 children 에 넘긴다.
 * 판매 작성 · 판매 완료 · 판매 상품 상세에서 데모 상품과 같은 화면을 그대로 쓰기 위한 연결부.
 */
export function ScanProductGate({ children }: { children: (data: ScanProductData) => React.ReactNode }) {
  const qs = useQueryString();
  const id = new URLSearchParams(qs).get("session");
  return <Inner key={id ?? "none"} id={id} render={children} />;
}

function Inner({ id, render }: { id: string | null; render: (data: ScanProductData) => React.ReactNode }) {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    if (!id) return;
    let alive = true;
    const urls: string[] = [];
    (async () => {
      const s = await getSession(id);
      if (!s?.curated) return alive && setState({ kind: "missing" });
      const photos: GalleryPhoto[] = [];
      for (const u of acceptedImages(s.flow)) {
        const blob = await getBlob(u.imageId);
        if (!blob) continue;
        const src = URL.createObjectURL(blob);
        urls.push(src);
        photos.push({ label: PHOTO_LABEL[u.target] ?? TARGET_LABEL[u.target], src });
      }
      if (alive) setState({ kind: "ready", data: { sessionId: s.id, product: s.curated, photos, media: curationMedia(s.curated.mediaKey) } });
    })().catch(() => alive && setState({ kind: "missing" }));
    return () => {
      alive = false;
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [id]);

  if (!id || state.kind === "missing") {
    return (
      <div className="container-page py-20 text-center">
        <p className="display text-[40px] text-faint">NOT FOUND</p>
        <p className="mt-3 text-[15px] font-bold">스캔 기록을 찾을 수 없습니다</p>
        <p className="mt-1 text-[13px] text-sub">스캔 기록은 촬영한 기기의 브라우저에만 저장됩니다.</p>
        <Link href="/my" className={`${buttonLinkClass.dark} mt-6`}>나의 옷장으로</Link>
      </div>
    );
  }
  if (state.kind === "loading") {
    return (
      <div className="container-page flex items-center justify-center gap-2 py-24 text-[14px] text-sub" role="status">
        <LoaderCircle className="animate-spin" size={18} /> 불러오는 중
      </div>
    );
  }
  return <>{render(state.data)}</>;
}
