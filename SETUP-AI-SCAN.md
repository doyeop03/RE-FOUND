# RE:FOUND 실제 AI 스캔 · 상품 DB 설정

GitHub Pages 정적 배포 구조는 그대로입니다. 서버를 새로 두지 않고
**Firebase AI Logic(Gemini)** 과 **Supabase** 를 브라우저에서 직접 호출합니다.

| 무엇 | 브라우저에 들어가는 값 | 비밀 값 (절대 프론트엔드 금지) |
| --- | --- | --- |
| Gemini | Firebase 웹 설정 + reCAPTCHA Enterprise 사이트 키 | Gemini API 키 — Firebase AI Logic이 서버 측에서 관리하므로 코드에 없음 |
| Supabase | Project URL + anon(publishable) 키 (RLS로 보호) | service_role 키 — `.env.local`에서 등록 스크립트만 사용 |

---

## 1. Firebase AI Logic (Gemini)

1. [Firebase 콘솔](https://console.firebase.google.com)에서 프로젝트를 만듭니다.
2. **AI Services → AI Logic → Get started** → 제공자로 **Gemini Developer API** 를 고릅니다.
3. **프로젝트 설정 → 내 앱 → 웹 앱 추가** → 표시되는 `firebaseConfig` 값을 `.env.local`에 넣습니다
   (`.env.example` 참고: `NEXT_PUBLIC_FIREBASE_API_KEY`, `..._PROJECT_ID`, `..._APP_ID` 등).
4. **App Check (필수)** — 설정하지 않으면 앱이 AI 호출을 시작하지 않습니다.
   1. Google Cloud 콘솔 → **reCAPTCHA Enterprise → 키 만들기** (플랫폼: 웹, 도메인: `<사용자명>.github.io`).
      `localhost`는 도메인에 추가하지 마세요(로컬은 디버그 토큰 사용).
   2. Firebase 콘솔 → **Security → App Check → Apps** → 웹 앱에 reCAPTCHA Enterprise 로 등록하고 사이트 키를 입력합니다.
   3. 같은 사이트 키를 `NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY` 에 넣습니다.
   4. **App Check → APIs → Firebase AI Logic → Enforced** 로 바꿉니다.
      코드는 `useLimitedUseAppCheckTokens: true` 를 쓰므로 **Replay protection** 도 먼저 *Monitoring only* 로 켜 두었다가 문제가 없으면 *Enforced* 로 바꿉니다.
5. 모델: 기본값 `gemini-4-hydrogen` (2026-11-20 기준 Firebase AI Logic 모델 목록의 이미지 입력 지원 안정 버전, 결제 없이 사용 가능).
   바꾸려면 `NEXT_PUBLIC_GEMINI_MODEL` 에 모델 ID(예: `gemini-3.8-flash`)를 넣습니다.

### 로컬 개발에서 App Check 디버그 토큰

```sh
# .env.local
NEXT_PUBLIC_APPCHECK_DEBUG=true
npm run dev
```

브라우저 콘솔에 `Firebase App Check debug token: …` 가 출력됩니다.
Firebase 콘솔 → **App Check → Apps → (앱 메뉴) → Manage debug tokens** 에 등록합니다. 토큰은 저장소에 커밋하지 마세요.
디버그 모드는 `next dev`(development)에서만 켜지고 배포 빌드에서는 무시됩니다.

### 휴대폰 카메라 테스트

카메라(`getUserMedia`)는 **HTTPS** 에서만 동작합니다.

- 가장 간단한 방법: GitHub Pages에 배포한 주소(`https://…github.io/…/scan/`)에서 테스트
- 로컬: `npx next dev --experimental-https -H 0.0.0.0` 후 휴대폰에서 `https://<PC IP>:3000/scan/` 접속(인증서 경고 허용).
  이 경우 휴대폰 브라우저가 만든 디버그 토큰도 따로 등록해야 합니다.

---

## 2. Supabase (상품 DB · 스캔 저장)

1. [Supabase](https://supabase.com/dashboard) 에서 프로젝트를 만듭니다.
2. **SQL Editor** 에서 `supabase/migrations/20261120000000_refound_archive.sql` 전체를 실행합니다
   (Supabase CLI를 쓰면 `supabase link` 후 `supabase db push`).
   - 테이블 8개(products, product_sources, product_images, market_listings, scan_sessions, scan_images, scan_observations, archive_results), RLS 정책, 스토리지 버킷 `scan-images`(비공개) · `product-images`(공개)가 만들어집니다.
3. **Authentication → Sign In / Providers → Anonymous sign-ins 켜기**
   (스캔 저장은 익명 사용자 소유로 저장됩니다. 남용 방지를 위해 같은 화면의 CAPTCHA 보호를 켜는 것을 권장합니다.)
4. **Project Settings → API**
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_URL`
   - `anon` / publishable 키 → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` 키 → `SUPABASE_SERVICE_ROLE_KEY` (**`.env.local` 에만**, GitHub에 올리지 않음)

### 실제 상품 등록 (개발자)

브라우저에서는 상품을 쓸 수 없습니다(RLS 쓰기 정책 없음). 출처가 확인된 상품만 스크립트로 등록합니다.

```sh
npm run db:register -- supabase/seed/uniqlo-u-fleece-cardigan-2017fw.json --dry-run   # 검증만
npm run db:register -- supabase/seed/uniqlo-u-fleece-cardigan-2017fw.json             # 등록
```

- 새 상품은 `supabase/seed/product.template.json` 을 복사해 작성합니다. 템플릿 문구가 남아 있으면 등록을 거부합니다.
- 출처(URL · 확인 날짜) 없는 상품, 허가 근거 없는 '권한 확인' 이미지, 수집일 없는 시세는 등록되지 않습니다.
- 권한 미확인(`unverified`) 이미지는 DB 정책상 공개 조회되지 않습니다.
- `uniqlo-u-fleece-cardigan-2017fw.json` 은 archive_seed.json 의 UNIQLO U 항목을 원문 확인 결과대로 옮긴 것입니다.
  품번이 없으므로 품번 일치로는 찾을 수 없고, 유형(플리스 카디건) 후보로만 나타납니다.
  OLD UNIQLO 옐로 플리스는 공식 상품 정보가 확인되지 않아 상품 DB에 넣지 않았습니다.

---

## 3. GitHub Pages 배포

저장소 **Settings → Secrets and variables → Actions → Variables** 에 `.env.example` 의 `NEXT_PUBLIC_*` 값을 등록합니다
(이 값들은 원래 공개용 식별자이므로 Variables 로 충분합니다). `SUPABASE_SERVICE_ROLE_KEY` 는 등록하지 않습니다.
main 에 push 하면 워크플로가 `npm test` → `npm run build` 후 배포합니다.

---

## 4. 실제 테스트 순서 (설정 후)

| # | 확인할 것 | 어디서 |
| --- | --- | --- |
| 1 | `/scan` 상단 상태가 **AI 분석 준비됨**, **상품 DB 준비됨** | 스캔 첫 화면 |
| 2 | 필수 동의 체크 → 촬영 시작 → 권한 요청 → **후면 카메라** 미리보기 | 휴대폰 (HTTPS) |
| 3 | 앞면 촬영 → "AI가 사진을 확인하고 있어요" → 결과 | 개발자 도구 Network: `firebasevertexai.googleapis.com` 요청 |
| 4 | 일부러 옷을 잘라 찍기 → AI 재촬영 안내 문구가 표시됨 | 앞면/뒷면 |
| 5 | 케어라벨을 멀리서 찍기 → "제품번호가 흐릿합니다" → 가까이 재촬영 | 케어라벨 |
| 6 | 손상 의심 부위가 있으면 **AI 요청** 단계가 레일에 추가됨 (최대 4개, 단계당 3회) | 단계 레일 |
| 7 | 최종 분석 → 품번 조회 → 후보 확인(또는 '해당 제품 없음') | 제품 확인 화면 |
| 8 | `/archive/scan/?session=…` 상세 페이지: 대표 사진 = 내 앞면 사진, 상태 항목별 근거 사진, 검증 단계 'AI 분석 완료' | 결과 페이지 |
| 9 | 저장 동의 시 Supabase `scan_sessions` · `scan_images` · `archive_results` 행과 `scan-images/{uid}/…` 파일 생성 | Supabase 대시보드 |

오류 확인: AI 요청이 실패하면 화면에 원인(App Check · 요청 제한 · 시간 초과 · 응답 형식)과 **다시 시도 / AI 검토 없이 계속** 버튼이 나옵니다.

## 5. 구현 상태

| 기능 | 상태 |
| --- | --- |
| 카메라 · 가이드 오버레이 · 재촬영 · 갤러리 대체 · 확대 · 흐림 판정 | 구현 · 빌드 확인 · 실기기 미검증 |
| 사진별 Gemini 검토 → 재촬영/추가 부위 삽입 · 횟수 제한 | 로직 단위 테스트 통과 · 실제 Gemini 호출은 Firebase 설정 후 검증 필요 |
| 구조화 JSON 응답 · zod 검증 · 품번/근거 사진 가드 | 단위 테스트 통과 (실제 응답은 미검증) |
| 상품 DB 조회 · 교차 검증 · 기준 이미지 비교 · 후보 선택 | 구현 · 실제 DB 미검증 (등록된 상품 1건, 품번 없음) |
| 상세 페이지 연결 · 희귀도/시세/스토리 '자료 없음' 처리 | 구현 · 단위 테스트 통과 |
| 중고 시세 수집 | **미구현** — 실제 매물 데이터 소스가 없어 `market_listings` 테이블과 등록 경로만 준비 |
| 만료 스캔 자동 삭제 | SQL 함수만 제공 — 스케줄러(Edge Function/Cron) 연결 필요 |
| Gemini Live API | 미구현 — `ShotReviewer` 인터페이스로 교체 지점 분리 |
