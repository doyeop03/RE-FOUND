"use client";

import { useSyncExternalStore } from "react";

function subscribe(listener: () => void) {
  window.addEventListener("popstate", listener);
  return () => window.removeEventListener("popstate", listener);
}

/**
 * 현재 URL의 쿼리스트링.
 * next/navigation 의 useSearchParams 를 쓰면 페이지 전체가 Suspense 뒤로 밀려
 * 첫 HTML에 본문이 담기지 않으므로, 정적 HTML을 유지하기 위해 클라이언트에서만 읽는다.
 * (서버 렌더링과 하이드레이션 시에는 빈 문자열)
 */
export function useQueryString() {
  return useSyncExternalStore(
    subscribe,
    () => window.location.search,
    () => "",
  );
}
