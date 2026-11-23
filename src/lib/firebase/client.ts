"use client";

import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { CustomProvider, ReCaptchaEnterpriseProvider, initializeAppCheck } from "firebase/app-check";
import { GoogleAIBackend, getAI, type AI } from "firebase/ai";

/**
 * Firebase AI Logic 클라이언트.
 *
 * - Gemini 비밀 API 키는 프론트엔드에 두지 않는다. 브라우저는 Firebase 웹 설정값(공개용 식별자)만 갖고,
 *   Gemini 키는 Firebase AI Logic 프록시가 서버 쪽에서 붙인다.
 * - 남용 방지는 App Check(reCAPTCHA Enterprise)로 한다. App Check 가 구성되지 않으면 호출하지 않는다.
 * - NEXT_PUBLIC_* 값은 빌드 시 번들에 들어간다. 공개되어도 되는 값만 넣는다.
 */

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
};

const RECAPTCHA_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY;
/** 로컬 개발에서만 App Check 디버그 토큰 사용 (배포 빌드에서는 무시) */
const DEBUG_APPCHECK = process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_APPCHECK_DEBUG === "true";

/** 이미지 입력을 지원하는 현재 안정 버전 모델. 바꾸려면 NEXT_PUBLIC_GEMINI_MODEL 을 설정한다. */
export const GEMINI_MODEL = process.env.NEXT_PUBLIC_GEMINI_MODEL || "gemini-4-hydrogen";

/**
 * Gemini API 키 직접 호출 모드 (Firebase · App Check 불필요). 키 출처는 두 가지:
 * 1. 사용자가 스캔 화면에서 입력한 키 — 그 기기 브라우저(localStorage)에만 저장된다. 배포 사이트는 이 방식만 쓴다.
 * 2. 로컬 개발용 .env.local 의 NEXT_PUBLIC_GEMINI_API_KEY — 빌드 결과물에 그대로 들어가므로 배포용 빌드에는 절대 넣지 않는다.
 */
const ENV_GEMINI_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
const KEY_STORAGE = "refound.geminiApiKey";

export function getDirectKey(): string {
  if (typeof window !== "undefined") {
    try {
      const saved = window.localStorage.getItem(KEY_STORAGE);
      if (saved) return saved;
    } catch {
      /* 저장소 차단(사생활 보호 모드 등) — env 값으로 대체 */
    }
  }
  return ENV_GEMINI_KEY;
}

const KEY_EVENT = "refound:gemini-key";

/** 키 변경 구독 (useSyncExternalStore 용) — 같은 탭 저장 · 다른 탭 storage 이벤트 모두 */
export function subscribeDirectKey(onChange: () => void): () => void {
  window.addEventListener(KEY_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(KEY_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** 이 기기에 키를 저장한다. 빈 값이면 지운다. 저장 실패 시 false */
export function saveDirectKey(key: string): boolean {
  try {
    const v = key.trim();
    if (v) window.localStorage.setItem(KEY_STORAGE, v);
    else window.localStorage.removeItem(KEY_STORAGE);
    window.dispatchEvent(new Event(KEY_EVENT));
    return true;
  } catch {
    return false;
  }
}

/** 키가 이 기기에 저장된 것인지(.env 가 아니라) */
export function hasSavedKey(): boolean {
  try {
    return !!window.localStorage.getItem(KEY_STORAGE);
  } catch {
    return false;
  }
}

export interface FirebaseStatus {
  configured: boolean;
  missing: string[];
  appCheck: "recaptcha_enterprise" | "debug" | "missing";
  model: string;
  /** direct: Gemini API 키로 직접 호출 · firebase: Firebase AI Logic 경유 */
  mode: "direct" | "firebase";
}

export function firebaseStatus(): FirebaseStatus {
  if (getDirectKey()) return { configured: true, missing: [], appCheck: "missing", model: GEMINI_MODEL, mode: "direct" };
  const required: [string, string | undefined][] = [
    ["NEXT_PUBLIC_FIREBASE_API_KEY", config.apiKey],
    ["NEXT_PUBLIC_FIREBASE_PROJECT_ID", config.projectId],
    ["NEXT_PUBLIC_FIREBASE_APP_ID", config.appId],
  ];
  const missing = required.filter(([, v]) => !v).map(([k]) => k);
  const appCheck = DEBUG_APPCHECK ? "debug" : RECAPTCHA_KEY ? "recaptcha_enterprise" : "missing";
  if (appCheck === "missing") missing.push("NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY");
  return { configured: missing.length === 0, missing, appCheck, model: GEMINI_MODEL, mode: "firebase" };
}

let app: FirebaseApp | null = null;
let ai: AI | null = null;

function getFirebaseApp() {
  if (app) return app;
  app = getApps()[0] ?? initializeApp(config);
  if (DEBUG_APPCHECK) {
    // 콘솔에 출력되는 디버그 토큰을 Firebase 콘솔 > App Check > Manage debug tokens 에 등록한다
    (self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean }).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }
  initializeAppCheck(app, {
    // 디버그 모드에서는 SDK가 provider 대신 디버그 토큰을 교환한다. 사이트 키가 없으면 reCAPTCHA 스크립트를 불러오지 않는다.
    provider: RECAPTCHA_KEY
      ? new ReCaptchaEnterpriseProvider(RECAPTCHA_KEY)
      : new CustomProvider({ getToken: () => Promise.reject(new Error("App Check 디버그 모드 전용")) }),
    isTokenAutoRefreshEnabled: true,
  });
  return app;
}

export function getAIService(): AI {
  const status = firebaseStatus();
  if (!status.configured) {
    throw Object.assign(new Error(`Firebase 설정이 비어 있습니다: ${status.missing.join(", ")}`), { code: "not-configured" });
  }
  if (!ai) {
    ai = getAI(getFirebaseApp(), { backend: new GoogleAIBackend(), useLimitedUseAppCheckTokens: true });
  }
  return ai;
}
