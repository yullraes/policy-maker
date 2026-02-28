---
name: policy-maker-init
description: Interactively gathers all necessary information for the Policy Maker project (service summary, users, revenue model, etc.) through targeted Q&A, then invokes the multi-agent orchestration script.
---

# Policy Maker: Initialization Skill

이 SKILL은 사용자와의 구조화된 문답을 통해 서비스 컨텍스트를 수집하고, 수집된 데이터를 기반으로 멀티 에이전트 정책 발굴 파이프라인을 실행한다.

## Phase 0: 서비스 컨텍스트 수집

아래 항목을 하나씩 질문하여 사용자 입력을 수집한다.

### 수집 항목

1. **SERVICE_ONE_LINER**: 서비스를 한 문장으로 요약해주세요.
   - 예시: "음식점과 소비자를 연결하는 배달 중개 플랫폼"
2. **USER_TYPES**: 이 서비스의 주요 사용자/고객 유형은?
   - 예시: "소비자, 음식점 사장님, 배달 라이더"
3. **REVENUE_MODEL**: 수익은 어떻게 발생하나요?
   - 예시: "배달비 + 음식점 수수료 + 광고"
4. **LIFECYCLE_OVERVIEW**: 서비스의 주요 흐름(생성→완료)을 단계별로 설명해주세요.
   - 예시: "주문 → 음식점 수락 → 라이더 배정 → 픽업 → 배달 → 완료 → 정산"
5. **INTEGRATIONS**: 핵심 외부 의존성은? (PG, 물류, 인증 등)
   - 예시: "PG(토스페이먼츠), 지도(카카오맵), 실시간 위치 추적"
6. **TOP_KPIS**: 비즈니스에서 가장 중요한 지표는?
   - 예시: "주문 전환율, 배달 시간, 라이더 이탈률"
7. **ORG_ROLES**: 서비스를 운영하는 주요 조직/역할은?
   - 예시: "CS팀, 라이더 관리팀, 음식점 파트너 매니저"

### 수집 가이드라인

- **한두 개씩** 질문하여 사용자를 압도하지 않는다.
- 사용자가 잘 모르면 **유사 도메인의 예시**를 제공한다.
- 충분한 정보가 모이면 **요약을 보여주고 확인**받는다.

---

## Phase 0.5: CLI 도구 선택

사용 가능한 LLM CLI 도구를 자동 감지하고, 사용자에게 선택을 요청한다.

```
다음 CLI 도구가 감지되었습니다:
  ✅ gemini
  ✅ claude
  ❌ codex

어떤 도구로 에이전트를 실행할까요?
```

선택 결과를 **CLI_TOOL** 변수에 저장한다.

---

## Phase 1~3: 스크립트 실행

수집이 완료되면 아래 절차를 따른다:

### 1. 입력 JSON 생성

수집된 데이터를 JSON 파일로 저장한다.
파일 위치: `{project_root}/.policy-maker/input.json`

```json
{
  "SERVICE_ONE_LINER": "...",
  "USER_TYPES": "...",
  "REVENUE_MODEL": "...",
  "LIFECYCLE_OVERVIEW": "...",
  "INTEGRATIONS": "...",
  "TOP_KPIS": "...",
  "ORG_ROLES": "...",
  "CLI_TOOL": "gemini"
}
```

### 2. 오케스트레이션 스크립트 실행

```bash
node scripts/run.mjs --input .policy-maker/input.json
```

이 스크립트는 3개 Phase를 순차 실행하며, 각 Phase 내부에서는 에이전트를 병렬로 spawn한다:

| Phase | 에이전트 | 실행 방식 |
|-------|---------|----------|
| 1 | domain-strategist | 순차 (1개) |
| 2 | policy-ops, policy-resilience, policy-risk, policy-security | 병렬 (4개) |
| 3 | adversary-hacker, angry-user, insider | 병렬 (3개) |

### 3. 결과 확인

실행이 완료되면 artifact 디렉토리를 사용자에게 안내한다:

```
🎉 모든 Phase가 완료되었습니다!
📁 결과: .policy-maker/{session_id}/artifacts/

주요 산출물:
├── R1/domain_charter.md          — 도메인 헌장
├── R1/expert/                    — 전문가 정책 (4개)
│   ├── policy_ops.md
│   ├── policy_resilience.md
│   ├── policy_risk.md
│   ├── policy_security.md
│   └── _summary.md               — 정책 요약
└── R1/attacker/                  — 공격 시나리오 (3개)
    ├── adversary_hacker.md
    ├── angry_user.md
    ├── insider.md
    └── _summary.md                — 시나리오 요약
```

---

## Completion Criteria

다음 조건이 모두 충족되면 이 SKILL의 실행이 완료된다:
- 모든 수집 변수가 채워짐 (`SERVICE_ONE_LINER` ~ `CLI_TOOL`)
- `scripts/run.mjs`가 정상 종료 (exit code 0)
- `.policy-maker/{session}/artifacts/` 디렉토리에 산출물이 생성됨

---

## Reference Prompts

이 SKILL이 오케스트레이션하는 에이전트 프롬프트 목록:

| 에이전트 | 프롬프트 파일 | 역할 |
|---------|-------------|------|
| Domain Strategist | `expert/domain-strategist/prompt.md` | 도메인 헌장 작성 |
| Ops Lead | `expert/policy-ops/prompt.md` | 운영 정책 수립 |
| Resilience Lead | `expert/policy-resilience/prompt.md` | 신뢰성/복구 정책 |
| Risk/Legal Lead | `expert/policy-risk/prompt.md` | 리스크/법무 정책 |
| Security Lead | `expert/policy-security/prompt.md` | 보안/프라이버시 정책 |
| External Adversary | `attacker/policy-adversaryhacker/PROMPT.md` | 외부 해커 시나리오 |
| Angry Power User | `attacker/policy-angryuser/PROMPT.md` | 성난 파워유저 시나리오 |
| Insider Threat | `attacker/policy-insider/PROMPT.md` | 내부자 위협 시나리오 |
