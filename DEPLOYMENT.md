# RE:FOUND GitHub Pages

Next.js 16 · React 19 · TypeScript 기반 프로토타입입니다. Mock Data(DEMO), 출처 확인 자료(src/data/archive_seed.json), 실제 AI 스캔 결과를 서로 다른 데이터 구조로 분리합니다.

## 실행 및 검증

```sh
npm ci
npm run dev
npm run lint
npm test
npm run build
```

Windows PowerShell 실행 정책으로 npm이 차단되면 npm.cmd를 사용합니다.
하위 경로 검증: `$env:PAGES_BASE_PATH='/RE-FOUND'; npm.cmd run build`

## 자동 배포

저장소 Settings → Pages → Source를 GitHub Actions로 설정합니다.
main push 또는 workflow_dispatch 시 Node.js 22에서 npm ci 및 npm run build를 실행하고 out을 배포합니다.
Configure Pages 출력으로 PAGES_BASE_PATH를 설정하여 실제 저장소 경로를 적용합니다.
Next.js Link는 basePath를 자동 적용합니다. 상품 이미지는 인라인 SVG입니다.
trailingSlash와 images.unoptimized를 적용했으며 서버 캐시/부분 프리페치 설정은 제거했습니다.
상품과 매장 상세는 기존 generateStaticParams로 생성합니다.
새 Mock Data를 추가하면 main에 push하여 새 페이지를 생성합니다.

out은 정적 파일 서버로 확인하며 next start를 사용하지 않습니다.
사용자 옷장 기록은 브라우저 저장소에 남으며 기기 간 동기화되지 않습니다.
AI 스캔은 Firebase AI Logic(Gemini), 상품 DB · 스캔 저장은 Supabase를 브라우저에서 직접 호출합니다. 설정 방법은 SETUP-AI-SCAN.md 참고.
스캔 결과 상세는 정적 페이지 /archive/scan/?session=<id> 하나로 렌더링하며, 기록은 촬영한 기기의 IndexedDB에 저장됩니다.
.env*, node_modules, .next, out은 Git 업로드에서 제외됩니다.
