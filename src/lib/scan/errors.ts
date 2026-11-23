/**
 * AI · DB 호출 오류를 화면에서 다룰 수 있는 종류로 정리한다.
 * 어떤 경우에도 예시 결과로 대체하지 않고, 사용자에게 재시도 · 건너뛰기를 선택하게 한다.
 */

export type ScanErrorKind =
  | "not_configured"
  | "app_check"
  | "rate_limited"
  | "timeout"
  | "network"
  | "aborted"
  | "blocked"
  | "invalid_response"
  | "server"
  | "unknown";

export class ScanError extends Error {
  constructor(
    public kind: ScanErrorKind,
    message: string,
    public detail?: string,
  ) {
    super(message);
    this.name = "ScanError";
  }
  get retryable() {
    return ["rate_limited", "timeout", "network", "server", "invalid_response", "unknown"].includes(this.kind);
  }
}

export const ERROR_MESSAGE: Record<ScanErrorKind, string> = {
  not_configured: "AI 분석이 아직 설정되지 않았습니다. Gemini API 키(또는 Firebase 설정값)를 확인해 주세요.",
  app_check: "앱 확인(App Check)에 실패했습니다. 잠시 후 다시 시도하거나 관리자에게 알려 주세요.",
  rate_limited: "요청이 많아 잠시 제한되었습니다. 30초쯤 뒤에 다시 시도해 주세요.",
  timeout: "AI 응답이 너무 오래 걸립니다. 네트워크를 확인하고 다시 시도해 주세요.",
  network: "네트워크 연결이 불안정합니다. 연결을 확인하고 다시 시도해 주세요.",
  aborted: "요청이 취소되었습니다.",
  blocked: "AI가 이 이미지에 대한 응답을 거부했습니다. 옷만 보이도록 다시 촬영해 주세요.",
  invalid_response: "AI 응답 형식이 올바르지 않아 결과를 사용하지 않았습니다. 다시 시도해 주세요.",
  server: "AI 서버에서 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
  unknown: "알 수 없는 오류가 발생했습니다. 다시 시도해 주세요.",
};

/** Firebase AIError · fetch 오류 · 타임아웃을 ScanError 로 바꾼다 */
export function toScanError(err: unknown): ScanError {
  if (err instanceof ScanError) return err;
  const e = err as { name?: string; code?: string; message?: string; customErrorData?: { status?: number; statusText?: string } };
  const msg = e?.message ?? String(err);
  const status = e?.customErrorData?.status ?? Number(msg.match(/\[(\d{3})\b/)?.[1] ?? NaN);

  if (e?.code === "not-configured" || e?.code === "no-api-key" || e?.code === "no-project-id" || e?.code === "no-app-id")
    return new ScanError("not_configured", ERROR_MESSAGE.not_configured, msg);
  if (e?.name === "AbortError" || /aborted/i.test(msg)) return new ScanError("aborted", ERROR_MESSAGE.aborted, msg);
  if (/app.?check|appCheck/i.test(msg) || status === 401) return new ScanError("app_check", ERROR_MESSAGE.app_check, msg);
  if (status === 429 || /quota|rate.?limit|resource.?exhausted/i.test(msg)) return new ScanError("rate_limited", ERROR_MESSAGE.rate_limited, msg);
  if (/timeout|timed out|deadline/i.test(msg) || status === 504) return new ScanError("timeout", ERROR_MESSAGE.timeout, msg);
  if (/SAFETY|blocked|PROHIBITED/i.test(msg)) return new ScanError("blocked", ERROR_MESSAGE.blocked, msg);
  if (e?.code === "api-not-enabled" || status === 403) return new ScanError("not_configured", "Firebase AI Logic API가 활성화되지 않았거나 권한이 없습니다.", msg);
  if (status >= 500) return new ScanError("server", ERROR_MESSAGE.server, msg);
  if (e?.code === "fetch-error" || /failed to fetch|network/i.test(msg)) return new ScanError("network", ERROR_MESSAGE.network, msg);
  if (e?.code === "parse-failed") return new ScanError("invalid_response", ERROR_MESSAGE.invalid_response, msg);
  return new ScanError("unknown", ERROR_MESSAGE.unknown, msg);
}
