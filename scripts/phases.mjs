/**
 * Phase Definitions
 *
 * 각 Phase에 포함된 에이전트 태스크의 이름, 프롬프트 경로,
 * 출력 파일 경로, 변수 매핑을 정의한다.
 *
 * vars 값 규칙:
 *   "input"              → userInput[key]에서 직접 참조
 *   "computed"           → buildServiceContext() 결과
 *   "empty"              → 이번 라운드에서는 미제공
 *   "artifact:<path>"    → 이전 Phase 산출물 파일 읽기
 */

export const PHASE_DEFS = [
    // Phase 1: Domain Strategist (순차 — 1개 태스크)
    {
        name: "Phase 1: Domain Strategist",
        tasks: [
            {
                name: "domain-strategist",
                promptFile: "expert/domain-strategist/prompt.md",
                outputFile: "R1/domain_charter.md",
                vars: {
                    SERVICE_ONE_LINER: "input",
                    USER_TYPES: "input",
                    REVENUE_MODEL: "input",
                    LIFECYCLE_OVERVIEW: "input",
                    INTEGRATIONS: "input",
                },
            },
        ],
    },

    // Phase 2: Expert Panel (병렬 — 4개 태스크)
    {
        name: "Phase 2: Expert Panel",
        tasks: [
            {
                name: "policy-ops",
                promptFile: "expert/policy-ops/prompt.md",
                outputFile: "R1/expert/policy_ops.md",
                vars: {
                    SERVICE_CONTEXT: "computed",
                    DOMAIN_CHARTER: "artifact:R1/domain_charter.md",
                    BREACH_REPORT: "empty",
                },
            },
            {
                name: "policy-resilience",
                promptFile: "expert/policy-resilience/prompt.md",
                outputFile: "R1/expert/policy_resilience.md",
                vars: {
                    SERVICE_CONTEXT: "computed",
                    DOMAIN_CHARTER: "artifact:R1/domain_charter.md",
                    BREACH_REPORT: "empty",
                },
            },
            {
                name: "policy-risk",
                promptFile: "expert/policy-risk/prompt.md",
                outputFile: "R1/expert/policy_risk.md",
                vars: {
                    SERVICE_CONTEXT: "computed",
                    DOMAIN_CHARTER: "artifact:R1/domain_charter.md",
                    BREACH_REPORT: "empty",
                },
            },
            {
                name: "policy-security",
                promptFile: "expert/policy-security/prompt.md",
                outputFile: "R1/expert/policy_security.md",
                vars: {
                    SERVICE_CONTEXT: "computed",
                    DOMAIN_CHARTER: "artifact:R1/domain_charter.md",
                    BREACH_REPORT: "empty",
                },
            },
        ],
    },

    // Phase 3: Attacker Panel (병렬 — 3개 태스크)
    {
        name: "Phase 3: Attacker Panel",
        tasks: [
            {
                name: "adversary-hacker",
                promptFile: "attacker/policy-adversaryhacker/PROMPT.md",
                outputFile: "R1/attacker/adversary_hacker.md",
                vars: {
                    SERVICE_CONTEXT: "computed",
                    DOMAIN_CHARTER: "artifact:R1/domain_charter.md",
                    EXPERT_POLICIES: "artifact:R1/expert/_summary.md",
                },
            },
            {
                name: "angry-user",
                promptFile: "attacker/policy-angryuser/PROMPT.md",
                outputFile: "R1/attacker/angry_user.md",
                vars: {
                    SERVICE_CONTEXT: "computed",
                    DOMAIN_CHARTER: "artifact:R1/domain_charter.md",
                    EXPERT_POLICIES: "artifact:R1/expert/_summary.md",
                },
            },
            {
                name: "insider",
                promptFile: "attacker/policy-insider/PROMPT.md",
                outputFile: "R1/attacker/insider.md",
                vars: {
                    SERVICE_CONTEXT: "computed",
                    DOMAIN_CHARTER: "artifact:R1/domain_charter.md",
                    EXPERT_POLICIES: "artifact:R1/expert/_summary.md",
                },
            },
        ],
    },
];
