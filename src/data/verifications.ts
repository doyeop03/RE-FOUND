import type {
  CheckResult,
  Verification,
  VerificationCheck,
  VerificationCheckKey,
} from "@/types";

/**
 * 데모용 아카이브 인증 데이터.
 *
 * RE:FOUND 자체 검증 기준을 시연하기 위한 가상 데이터이며 유니클로 공식 인증이 아니다.
 * 실제 서비스에서는 검수 백오피스(FastAPI)가 이 구조의 JSON을 내려준다.
 */

const CHECK_LABEL: Record<VerificationCheckKey, string> = {
  label: "택 · 케어라벨",
  season: "품번 · 시즌 표기",
  material: "소재 · 봉제",
  hardware: "부자재",
  condition: "상태 검수",
};

const CHECK_ORDER: VerificationCheckKey[] = [
  "label",
  "season",
  "material",
  "hardware",
  "condition",
];

type CheckInput = [CheckResult, string];

/** 다섯 가지 검증 기준을 항상 같은 순서로 만든다 */
function checks(input: Record<VerificationCheckKey, CheckInput>): VerificationCheck[] {
  return CHECK_ORDER.map((key) => ({
    key,
    label: CHECK_LABEL[key],
    result: input[key][0],
    detail: input[key][1],
  }));
}

export const VERIFICATIONS: Verification[] = [
  /* ── 검증 완료 ── */
  {
    productId: "fleece-98-zip",
    status: "verified",
    certNo: "RF-1998-0001",
    requestNo: "REQ-261028-0412",
    requestedAt: "2026.10.28",
    verifiedAt: "2026.10.31",
    checks: checks({
      label: ["pass", "구형 레드 박스 로고 메인택, 생산국 표기 일치"],
      season: ["pass", "품번 체계가 1998 F/W 아카이브 샘플과 일치"],
      material: ["pass", "폴리에스터 100% 표기와 원단 조직 일치"],
      hardware: ["pass", "당시 사양 지퍼 풀러 · 작동 정상"],
      condition: ["pass", "소매 끝 가벼운 보풀 외 이상 없음"],
    }),
  },
  {
    productId: "plusj-09-coat",
    status: "verified",
    certNo: "RF-2009-0002",
    requestNo: "REQ-261102-0187",
    requestedAt: "2026.11.02",
    verifiedAt: "2026.11.05",
    checks: checks({
      label: ["pass", "+J 협업 전용 메인택 · 케어라벨 표기 일치"],
      season: ["pass", "2009 F/W 협업 품번 체계 확인"],
      material: ["pass", "울 · 캐시미어 혼방 원단과 안감 봉제 사양 일치"],
      hardware: ["pass", "협업 각인 단추 전 수량 확인"],
      condition: ["pass", "안감 미세 오염 외 보존 상태 우수"],
    }),
  },
  {
    productId: "uu-16-blouson",
    status: "verified",
    certNo: "RF-2016-0003",
    requestNo: "REQ-261104-0954",
    requestedAt: "2026.11.04",
    verifiedAt: "2026.11.07",
    checks: checks({
      label: ["pass", "Uniqlo U 초기 시즌 라벨 디자인 확인"],
      season: ["pass", "2016 F/W 품번 일치"],
      material: ["pass", "코튼 · 나일론 혼방 표기와 원단 일치"],
      hardware: ["pass", "스냅 버튼 · 지퍼 사양 일치"],
      condition: ["pass", "착용감 적음 · 오염 없음"],
    }),
  },
  {
    productId: "lambswool-03-crew",
    status: "verified",
    certNo: "RF-2003-0004",
    requestNo: "REQ-261030-0221",
    requestedAt: "2026.10.30",
    verifiedAt: "2026.11.03",
    checks: checks({
      label: ["pass", "2000년대 초 메인택 서체 · 레이아웃 일치"],
      season: ["pass", "2003 F/W 니트 품번 체계 확인"],
      material: ["pass", "램스울 100% 표기 · 게이지 일치"],
      hardware: ["pass", "부자재 없음 (해당 없음 처리)"],
      condition: ["pass", "겨드랑이 가벼운 필링 외 양호"],
    }),
  },
  {
    productId: "oxford-07-shirt",
    status: "verified",
    certNo: "RF-2007-0005",
    requestNo: "REQ-261101-0603",
    requestedAt: "2026.11.01",
    verifiedAt: "2026.11.04",
    checks: checks({
      label: ["pass", "케어라벨 세탁 기호 구판 표기 확인"],
      season: ["pass", "2007 S/S 셔츠 라인 품번 일치"],
      material: ["pass", "옥스퍼드 면 100% 조직 확인"],
      hardware: ["pass", "자개 대체 단추 · 버튼다운 사양 일치"],
      condition: ["pass", "칼라 안쪽 미세 변색"],
    }),
  },
  {
    productId: "selvedge-10-jeans",
    status: "verified",
    certNo: "RF-2010-0006",
    requestNo: "REQ-261027-0338",
    requestedAt: "2026.10.27",
    verifiedAt: "2026.10.30",
    checks: checks({
      label: ["pass", "가죽 패치 · 내부 라벨 일치"],
      season: ["pass", "2010 F/W 셀비지 라인 품번 확인"],
      material: ["pass", "셀비지 데님 귀 · 원단 중량 일치"],
      hardware: ["pass", "각인 리벳 · 버튼 플라이 확인"],
      condition: ["pass", "자연스러운 페이딩 · 손상 없음"],
    }),
  },
  {
    productId: "fleece-00-halfzip",
    status: "verified",
    certNo: "RF-2000-0007",
    requestNo: "REQ-261025-0079",
    requestedAt: "2026.10.25",
    verifiedAt: "2026.10.29",
    checks: checks({
      label: ["pass", "2000년 플리스 캠페인 시기 메인택"],
      season: ["pass", "2000 F/W 품번 일치"],
      material: ["pass", "폴리에스터 플리스 밀도 · 표기 일치"],
      hardware: ["pass", "하프집 지퍼 사양 일치"],
      condition: ["pass", "전체 보풀 경미"],
    }),
  },
  {
    productId: "designer-17-stripe-knit",
    status: "verified",
    certNo: "RF-2017-0008",
    requestNo: "REQ-261106-0715",
    requestedAt: "2026.11.06",
    verifiedAt: "2026.11.09",
    checks: checks({
      label: ["pass", "디자이너 협업 전용 넥라벨 확인"],
      season: ["pass", "2017 F/W 협업 품번 일치"],
      material: ["pass", "울 100% 표기 · 니트 조직 일치"],
      hardware: ["pass", "부자재 없음 (해당 없음 처리)"],
      condition: ["pass", "착용 흔적 적음"],
    }),
  },
  {
    productId: "ut-03-graphic",
    status: "verified",
    certNo: "RF-2003-0009",
    requestNo: "REQ-261103-0546",
    requestedAt: "2026.11.03",
    verifiedAt: "2026.11.06",
    checks: checks({
      label: ["pass", "UT 초기 넥라벨 일치"],
      season: ["pass", "2003 S/S 그래픽 품번 확인"],
      material: ["pass", "면 100% 싱글 저지 확인"],
      hardware: ["pass", "부자재 없음 (해당 없음 처리)"],
      condition: ["pass", "프린트 미세 크랙 · 늘어남 없음"],
    }),
  },

  /* ── 검증 진행 중 ── */
  {
    productId: "ut-19-artist",
    status: "in_review",
    certNo: null,
    requestNo: "REQ-261114-1022",
    requestedAt: "2026.11.14",
    verifiedAt: null,
    expectedAt: "2026.11.18",
    checks: checks({
      label: ["pass", "아티스트 협업 넥라벨 확인"],
      season: ["pass", "2019 S/S 협업 품번 일치"],
      material: ["pending", "원단 조직 확대 촬영 검토 중"],
      hardware: ["pending", "검수 대기"],
      condition: ["pending", "검수 대기"],
    }),
  },
  {
    productId: "m65-04-field",
    status: "in_review",
    certNo: null,
    requestNo: "REQ-261115-1047",
    requestedAt: "2026.11.15",
    verifiedAt: null,
    expectedAt: "2026.11.19",
    checks: checks({
      label: ["pass", "메인택 · 케어라벨 확인"],
      season: ["pending", "2004 F/W 품번 대조 중"],
      material: ["pending", "검수 대기"],
      hardware: ["pending", "검수 대기"],
      condition: ["pending", "검수 대기"],
    }),
  },

  /* ── 추가 확인 필요 ── */
  {
    productId: "denim-01-trucker",
    status: "needs_review",
    certNo: null,
    requestNo: "REQ-261111-0968",
    requestedAt: "2026.11.11",
    verifiedAt: null,
    checks: checks({
      label: ["flag", "케어라벨 인쇄가 바래 생산국 판독 불가"],
      season: ["pass", "2001 S/S 품번 일부 확인"],
      material: ["pass", "데님 원단 · 스티치 사양 일치"],
      hardware: ["flag", "버튼 1개 교체 흔적 — 정품 부자재 여부 확인 필요"],
      condition: ["pass", "밑단 해짐 외 양호"],
    }),
    note: "케어라벨 근접 사진과 앞판 버튼 클로즈업 사진을 추가로 제출해 주세요. 제출 후 영업일 기준 2일 안에 다시 검토합니다.",
  },
];
