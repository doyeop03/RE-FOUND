/**
 * 제품 화면 경로.
 * 데모 상품은 /archive/[id] 처럼 정적 경로가 미리 만들어져 있지만,
 * 이 기기에서 스캔한 옷(id: scan-<세션 id>)은 정적 배포에서 경로를 미리 만들 수 없으므로
 * 정적 페이지 1개 + ?session= 쿼리로 연다 (/archive/scan, /sell/scan, /sell/scan/done, /market/scan).
 */

export type ProductRoute = "detail" | "sell" | "sellDone" | "market";

const SCAN_PREFIX = "scan-";

export function scanSessionOf(productId: string): string | null {
  return productId.startsWith(SCAN_PREFIX) ? productId.slice(SCAN_PREFIX.length) : null;
}

export function productHref(productId: string, route: ProductRoute = "detail"): string {
  const session = scanSessionOf(productId);
  if (session) {
    const q = `?session=${encodeURIComponent(session)}`;
    return { detail: `/archive/scan/${q}`, sell: `/sell/scan/${q}`, sellDone: `/sell/scan/done/${q}`, market: `/market/scan/${q}` }[route];
  }
  return { detail: `/archive/${productId}`, sell: `/sell/${productId}`, sellDone: `/sell/${productId}/done`, market: `/market/${productId}` }[route];
}
