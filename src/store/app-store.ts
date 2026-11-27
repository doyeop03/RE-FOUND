"use client";

import { useSyncExternalStore } from "react";
import type {
  Activity,
  ActivityType,
  ClosetEntry,
  ListingTerms,
  Ownership,
} from "@/types";

/**
 * 사용자 상태 저장소 (나의 옷장 · 찜 · 사용 기록).
 * 로그인/DB가 없으므로 localStorage 에 저장한다.
 * 향후 Firestore 로 옮길 때는 load/persist 두 함수만 교체하면 된다.
 */

export interface AppState {
  closet: ClosetEntry[];
  likes: string[];
  activities: Activity[];
}

const STORAGE_KEY = "refound-demo-v1";

const SEED: AppState = {
  closet: [
    {
      id: "c-seed-1",
      productId: "denim-01-trucker",
      ownership: "owned",
      addedAt: "2026-10-28",
      conditionLabel: "양호",
      selling: false,
    },
    {
      id: "c-seed-2",
      productId: "fleece-00-halfzip",
      ownership: "found",
      addedAt: "2026-11-03",
      conditionLabel: "보통",
      selling: false,
      place: "세컨드룸 · 성수",
    },
    {
      id: "c-seed-3",
      productId: "oxford-07-shirt",
      ownership: "owned",
      addedAt: "2026-10-18",
      conditionLabel: "양호",
      selling: true,
      askingPrice: 30000,
    },
  ],
  likes: ["plusj-09-coat", "ut-03-graphic"],
  activities: [
    {
      id: "a-seed-3",
      type: "save",
      productId: "fleece-00-halfzip",
      message: "세컨드룸에서 발견한 옷을 옷장에 저장했어요",
      at: "2026-11-03",
    },
    {
      id: "a-seed-2",
      type: "wear",
      productId: "denim-01-trucker",
      message: "착용 기록을 남겼어요",
      at: "2026-10-31",
    },
    {
      id: "a-seed-1",
      type: "resale",
      productId: "oxford-07-shirt",
      message: "재판매 등록을 신청했어요",
      at: "2026-10-20",
    },
  ],
};

let state: AppState = SEED;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  loaded = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppState>;
      state = {
        closet: parsed.closet ?? SEED.closet,
        likes: parsed.likes ?? SEED.likes,
        activities: parsed.activities ?? SEED.activities,
      };
    }
  } catch {
    // 저장소를 쓸 수 없는 환경에서는 메모리 상태만 사용한다
  }
}

function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 무시
  }
}

function setState(next: AppState) {
  state = next;
  persist();
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  if (!loaded) load();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => state;
const getServerSnapshot = () => SEED;

export function useAppState() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4)}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function logActivity(
  type: ActivityType,
  productId: string,
  message: string,
) {
  const activity: Activity = {
    id: uid("a"),
    type,
    productId,
    message,
    at: today(),
  };
  setState({ ...state, activities: [activity, ...state.activities] });
}

/** 찜 토글. 반환값은 토글 후의 찜 여부 */
export function toggleLike(productId: string) {
  const liked = state.likes.includes(productId);
  setState({
    ...state,
    likes: liked
      ? state.likes.filter((id) => id !== productId)
      : [productId, ...state.likes],
  });
  return !liked;
}

export function addToCloset(input: {
  productId: string;
  ownership: Ownership;
  conditionLabel: string;
  place?: string;
}) {
  const entry: ClosetEntry = {
    id: uid("c"),
    productId: input.productId,
    ownership: input.ownership,
    addedAt: today(),
    conditionLabel: input.conditionLabel,
    selling: false,
    place: input.place,
  };
  const activity: Activity = {
    id: uid("a"),
    type: "save",
    productId: input.productId,
    message:
      input.ownership === "found"
        ? "발견한 옷을 옷장에 저장했어요"
        : "소유한 옷을 옷장에 등록했어요",
    at: today(),
  };
  setState({
    ...state,
    closet: [entry, ...state.closet],
    activities: [activity, ...state.activities],
  });
  return entry;
}

export function removeFromCloset(entryId: string) {
  setState({ ...state, closet: state.closet.filter((e) => e.id !== entryId) });
}

/** 재판매 등록: 옷장에 없으면 '소유'로 추가한 뒤 판매 중으로 표시한다 */
export function registerResale(input: {
  productId: string;
  askingPrice: number;
  conditionLabel: string;
  listing?: ListingTerms;
}) {
  const existing = state.closet.find((e) => e.productId === input.productId);
  const closet = existing
    ? state.closet.map((e) =>
        e.id === existing.id
          ? {
              ...e,
              ownership: "owned" as const,
              selling: true,
              askingPrice: input.askingPrice,
              listing: input.listing ?? e.listing,
            }
          : e,
      )
    : [
        {
          id: uid("c"),
          productId: input.productId,
          ownership: "owned" as const,
          addedAt: today(),
          conditionLabel: input.conditionLabel,
          selling: true,
          askingPrice: input.askingPrice,
          listing: input.listing,
        },
        ...state.closet,
      ];
  const activity: Activity = {
    id: uid("a"),
    type: "resale",
    productId: input.productId,
    message: "재판매 등록을 신청했어요",
    at: today(),
  };
  setState({ ...state, closet, activities: [activity, ...state.activities] });
}

export function stopSelling(entryId: string) {
  setState({
    ...state,
    closet: state.closet.map((e) =>
      e.id === entryId ? { ...e, selling: false, askingPrice: undefined, listing: undefined } : e,
    ),
  });
}

export function resetDemoData() {
  setState(SEED);
}
