"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoaderCircle, Trash2 } from "lucide-react";
import type { GalleryPhoto } from "@/components/archive/Gallery";
import { ProductDetail } from "@/components/archive/ProductDetail";
import { RecordDetail } from "@/components/archive/record/RecordDetail";
import { buttonLinkClass } from "@/components/ui/primitives";
import { useQueryString } from "@/lib/use-query";
import { curationMedia } from "@/data/demo-scan";
import { acceptedImages } from "@/lib/scan/flow";
import { TARGET_LABEL, type Target } from "@/lib/scan/schemas";
import { deleteSession, getBlob, getSession } from "@/lib/scan/session-store";
import type { ScanSession } from "@/lib/scan/session";
import type { ArchiveRecord } from "@/types/archive-record";
import { ScanProgress } from "./ScanSidebar";

type State =
  | { kind: "loading" }
  | { kind: "missing" }
  | { kind: "error"; message: string }
  | { kind: "ready"; session: ScanSession; record: ArchiveRecord; photos: GalleryPhoto[] };

/** 갤러리 라벨 — 촬영한 부위 이름 (짧게) */
const PHOTO_LABEL: Partial<Record<Target, string>> = {
  front_full: "앞면",
  back_full: "뒷면",
  care_label: "케어라벨",
  main_tag: "목 라벨",
};

/**
 * 실제 스캔 결과 상세 — /archive/scan/?session=<id>
 * 정적 배포(GitHub Pages)에서도 동작하도록 세션은 이 기기의 IndexedDB 에서 읽고, 사진은 blob URL 로 붙인다.
 */
export function ScanRecordView() {
  const qs = useQueryString();
  const id = new URLSearchParams(qs).get("session");
  return <Inner key={id ?? "none"} id={id} />;
}

function Inner({ id }: { id: string | null }) {
  const router = useRouter();
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    if (!id) return;
    let alive = true;
    const urls: string[] = [];
    (async () => {
      const session = await getSession(id);
      if (!session?.record) return alive && setState({ kind: "missing" });
      const images = await Promise.all(
        session.record.images.map(async (im) => {
          if (im.rights !== "own_capture") return im;
          const blob = await getBlob(im.id);
          if (!blob) return im;
          const url = URL.createObjectURL(blob);
          urls.push(url);
          return { ...im, src: url };
        }),
      );
      const srcOf = new Map(images.map((im) => [im.id, im.src]));
      const used = acceptedImages(session.flow);
      // 촬영 순서 그대로 — 실제로 찍은 사진만 (없는 부위를 일러스트로 채우지 않는다)
      const photos: GalleryPhoto[] = used.flatMap((u) => {
        const src = srcOf.get(u.imageId);
        return src ? [{ label: PHOTO_LABEL[u.target] ?? TARGET_LABEL[u.target], src }] : [];
      });
      if (alive) setState({ kind: "ready", session, record: { ...session.record, images }, photos });
    })().catch((e) => alive && setState({ kind: "error", message: String(e?.message ?? e) }));
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
        <Link href="/scan" className={`${buttonLinkClass.dark} mt-6`}>새로 스캔하기</Link>
      </div>
    );
  }
  if (state.kind === "loading") {
    return (
      <div className="container-page flex items-center justify-center gap-2 py-24 text-[14px] text-sub" role="status">
        <LoaderCircle className="animate-spin" size={18} /> 스캔 기록을 불러오는 중
      </div>
    );
  }
  if (state.kind === "error") {
    return (
      <div className="container-page py-20 text-center">
        <p className="text-[15px] font-bold">기록을 불러오지 못했습니다</p>
        <p className="mt-1 text-[13px] text-sub">{state.message}</p>
        <button type="button" onClick={() => location.reload()} className={`${buttonLinkClass.dark} mt-6`}>다시 시도</button>
      </div>
    );
  }

  const { session, record, photos } = state;
  const remote = session.remote;
  const curated = session.curated ?? null;
  return (
    <>
      <div className="container-page">
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 bg-paper px-4 py-3 text-[12px]">
          <span>
            <b>저장 위치</b> · 이 기기
            {remote?.status === "uploaded" && " + RE:FOUND 서버(비공개)"}
            {remote?.status === "failed" && <span className="text-brand"> · {remote.error}</span>}
            {remote?.status === "skipped" && " (서버 저장 동의 안 함)"}
          </span>
          <button
            type="button"
            onClick={async () => {
              if (!confirm("이 기기에서 스캔 기록과 사진을 삭제할까요?")) return;
              await deleteSession(session);
              router.push("/scan");
            }}
            className="inline-flex h-9 items-center gap-1 font-bold text-sub hover:text-ink"
          >
            <Trash2 size={13} /> 기기에서 삭제
          </button>
        </div>
        {!curated && <ScanProgress active={2} variant="result" className="mt-5" />}
      </div>
      {curated ? <ProductDetail product={curated} care={curated.care} variant="scan" photos={photos} media={curationMedia(curated.mediaKey)} /> : <RecordDetail record={record} />}
    </>
  );
}
