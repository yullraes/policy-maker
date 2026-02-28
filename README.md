# Policy Maker

> 업계 비전문가가 서비스 기획 시 **"상상하지도 못하는 정책"**을 발굴하기 위한 멀티 페르소나 AI 에이전트 워크플로우

## 아키텍처

```txt
SKILL (AI 대화)                    Node.js 스크립트 (subprocess)
┌──────────────────┐              ┌──────────────────────────────────┐
│policy-maker-init │   invoke    │ scripts/run.mjs                  │
│                  │ ──────────→  │                                  │
│ • Q&A 수집       │  (JSON)       │Phase 1: domain-strategist        │
│ • CLI 도구 선택   │              │Phase 2: expert ×4  (Promise.all) │
│                  │              │Phase 3: attacker ×3 (Promise.all)│
└──────────────────┘              └──────────────────────────────────┘
                                           │
                                           ▼
                                  .policy-maker/{session}/artifacts/
```

## 에이전트 구성

### Expert Panel (방어측)

| 에이전트 | 관점 | 주요 정책 표면 |
|---------|------|-------------|
| **Domain Strategist** | 산업 베테랑 | 도메인 본질, 숨겨진 원가, 병목 자원 |
| **Ops Lead** | 운영 책임자 | 희소자원, 라이프사이클, 현장 프로세스 |
| **Resilience Lead** | 신뢰성 책임자 | 데이터 정합성, 외부 의존, 모니터링 |
| **Risk/Legal Lead** | 법무 책임자 | 가격/정산, 분쟁/클레임, 규제/컴플라이언스 |
| **Security Lead** | 보안 책임자 | 권한/접근, 부정/어뷰징, 프라이버시 |

### Attacker Panel (공격측)

| 에이전트 | 관점 | 주요 공격 표면 |
|---------|------|-------------|
| **External Adversary** | 외부 해커 | 권한 우회, 자동화 공격, API 변조 |
| **Angry Power User** | 성난 파워유저 | 약관 모호함, 고지 부족, CS 불일치 |
| **Insider Threat** | 내부자 위협 | 권한 남용, 데이터 조작, 감사 회피 |

## 사용법

### 1. AI 코딩 에이전트에서 SKILL 실행

```
이 프로젝트의 policy-maker-init SKILL을 실행해줘
```

SKILL이 서비스 컨텍스트를 문답으로 수집합니다.

### 2. 직접 스크립트 실행

입력 JSON을 직접 작성하여 실행할 수도 있습니다:

```bash
# 구성 확인 (dry-run)
node scripts/run.mjs --input input.json --dry-run

# 실행 (CLI 도구 자동 감지)
node scripts/run.mjs --input input.json

# 특정 CLI 도구 지정
node scripts/run.mjs --input input.json --cli claude
```

### 입력 JSON 형식

```json
{
  "SERVICE_ONE_LINER": "음식점과 소비자를 연결하는 배달 중개 플랫폼",
  "USER_TYPES": "소비자, 음식점 사장님, 배달 라이더",
  "REVENUE_MODEL": "배달비 + 음식점 수수료 + 광고",
  "LIFECYCLE_OVERVIEW": "주문 → 수락 → 라이더 배정 → 픽업 → 배달 → 완료 → 정산",
  "INTEGRATIONS": "PG(토스페이먼츠), 지도(카카오맵), 실시간 위치 추적",
  "TOP_KPIS": "주문 전환율, 배달 시간, 라이더 이탈률",
  "ORG_ROLES": "CS팀, 라이더 관리팀, 음식점 파트너 매니저",
  "CLI_TOOL": "gemini"
}
```

### 지원 CLI 도구

| 도구 | 명령어 |
|------|--------|
| Gemini CLI | `gemini -p` |
| Claude Code | `claude -p` |
| Codex | `codex -q` |
| OpenCode | `opencode -p` |

## 산출물 구조

```
.policy-maker/{session_id}/
├── input.json                         ← 입력 백업
└── artifacts/
    └── R1/
        ├── domain_charter.md          ← 도메인 헌장
        ├── expert/
        │   ├── policy_ops.md          ← 운영 정책
        │   ├── policy_resilience.md   ← 신뢰성 정책
        │   ├── policy_risk.md         ← 리스크/법무 정책
        │   ├── policy_security.md     ← 보안 정책
        │   └── _summary.md           ← 정책 요약 (자동 생성)
        └── attacker/
            ├── adversary_hacker.md    ← 외부 해커 시나리오
            ├── angry_user.md          ← 성난 파워유저 시나리오
            ├── insider.md             ← 내부자 위협 시나리오
            └── _summary.md           ← 시나리오 요약 (자동 생성)
```

## 요구사항

- **Node.js** 18+ (외부 패키지 불필요)
- **LLM CLI 도구** 1개 이상 설치 (gemini, claude, codex, opencode)
