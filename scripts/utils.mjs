/**
 * Utility Functions
 *
 * 프로젝트 루트 탐색, 세션 ID, 프롬프트 빌드,
 * 변수 해석, 요약 생성 등 공통 유틸리티.
 */

import { readFile, writeFile, readdir } from "node:fs/promises";
import { resolve, dirname, join, basename } from "node:path";
import { existsSync } from "node:fs";

// ────────────────────────────────────────
// Project Root
// ────────────────────────────────────────

/**
 * .git 폴더를 기반으로 프로젝트 루트를 탐색한다.
 */
export function findProjectRoot(startDir = process.cwd()) {
    let dir = resolve(startDir);
    while (true) {
        if (existsSync(join(dir, ".git"))) {
            return dir;
        }
        const parent = dirname(dir);
        if (parent === dir) {
            console.warn("⚠ .git 폴더를 찾을 수 없습니다. cwd를 루트로 사용합니다.");
            return process.cwd();
        }
        dir = parent;
    }
}

// ────────────────────────────────────────
// Session
// ────────────────────────────────────────

/**
 * 타임스탬프 기반 세션 ID를 생성한다.
 */
export function createSessionId() {
    const now = new Date();
    const pad = (n, len = 2) => String(n).padStart(len, "0");
    return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

// ────────────────────────────────────────
// Prompt Building
// ────────────────────────────────────────

/**
 * 프롬프트 파일을 읽고 변수를 치환한다.
 */
export async function buildPrompt(promptPath, variables) {
    let content = await readFile(promptPath, "utf-8");
    for (const [key, value] of Object.entries(variables)) {
        content = content.replaceAll(`{${key}}`, value);
    }
    return content;
}

/**
 * userInput으로부터 SERVICE_CONTEXT 문자열을 조합한다.
 */
export function buildServiceContext(input) {
    return [
        `서비스 요약: ${input.SERVICE_ONE_LINER || "N/A"}`,
        `사용자 유형: ${input.USER_TYPES || "N/A"}`,
        `수익 모델: ${input.REVENUE_MODEL || "N/A"}`,
        `주요 흐름: ${input.LIFECYCLE_OVERVIEW || "N/A"}`,
        `외부 의존성: ${input.INTEGRATIONS || "N/A"}`,
        `핵심 KPI: ${input.TOP_KPIS || "N/A"}`,
        `운영 조직: ${input.ORG_ROLES || "N/A"}`,
    ].join("\n");
}

// ────────────────────────────────────────
// Variable Resolution
// ────────────────────────────────────────

/**
 * 변수 맵을 실제 값으로 해석한다.
 *
 * source 타입:
 *   "input"           → input[key]
 *   "computed"        → serviceContext
 *   "empty"           → placeholder
 *   "artifact:<path>" → 파일 읽기
 */
export async function resolveVariables(vars, input, serviceContext, artifactDir) {
    const resolved = {};

    for (const [key, source] of Object.entries(vars)) {
        if (source === "input") {
            resolved[key] = input[key] || "N/A";
        } else if (source === "computed") {
            resolved[key] = serviceContext;
        } else if (source === "empty") {
            resolved[key] = "(이번 라운드에서는 제공되지 않음)";
        } else if (source.startsWith("artifact:")) {
            const artifactPath = join(artifactDir, source.replace("artifact:", ""));
            try {
                resolved[key] = await readFile(artifactPath, "utf-8");
            } catch {
                resolved[key] = "(아직 생성되지 않음)";
            }
        }
    }

    return resolved;
}

// ────────────────────────────────────────
// Summary Generation
// ────────────────────────────────────────

/**
 * 에이전트 결과 파일들로부터 _summary.md를 자동 생성한다.
 * 각 파일의 첫 번째 주요 섹션에서 핵심 정보를 추출.
 */
export async function generateSummary(artifactDir, subDir) {
    const dir = join(artifactDir, subDir);

    let files;
    try {
        files = await readdir(dir);
    } catch {
        return;
    }

    const mdFiles = files.filter((f) => f.endsWith(".md") && !f.startsWith("_"));

    let summary = `---\ngenerated: true\ntimestamp: ${new Date().toISOString()}\nsources:\n`;
    for (const f of mdFiles) {
        summary += `  - ${f}\n`;
    }
    summary += "---\n\n# Summary\n\n";

    for (const f of mdFiles) {
        const content = await readFile(join(dir, f), "utf-8");
        const agentName = basename(f, ".md");

        summary += `## ${agentName}\n\n`;

        const lines = content.split("\n");
        let extracting = false;
        let extracted = 0;

        for (const line of lines) {
            if (line.startsWith("### ") || line.startsWith("## ") || line.startsWith("# ")) {
                if (extracting && extracted > 5) break;
                extracting = true;
                summary += `${line}\n`;
                continue;
            }
            if (extracting && line.trim()) {
                summary += `${line}\n`;
                extracted++;
                if (extracted >= 10) break; // 에이전트당 최대 10줄
            }
        }

        summary += "\n---\n\n";
    }

    const summaryPath = join(dir, "_summary.md");
    await writeFile(summaryPath, summary, "utf-8");
    console.log(`  📋 ${subDir}/_summary.md 생성 완료`);
}

/**
 * 에이전트 결과 파일들의 **전체 내용**을 하나의 파일로 병합한다.
 * Phase 4와 같이 컨텍스트 유실 없이 전체 컨텍스트를 LLM에 전달할 때 사용한다.
 */
export async function generateFullCompilation(artifactDir, subDir) {
    const dir = join(artifactDir, subDir);

    let files;
    try {
        files = await readdir(dir);
    } catch {
        return;
    }

    const mdFiles = files.filter((f) => f.endsWith(".md") && !f.startsWith("_"));

    let compilation = `---\ngenerated: true\ntimestamp: ${new Date().toISOString()}\nsources:\n`;
    for (const f of mdFiles) {
        compilation += `  - ${f}\n`;
    }
    compilation += "---\n\n# Full Compilation\n\n";

    for (const f of mdFiles) {
        const content = await readFile(join(dir, f), "utf-8");
        const agentName = basename(f, ".md");

        compilation += `\n\n========================================================================\n`;
        compilation += `[AGENT REPORT: ${agentName}]\n`;
        compilation += `========================================================================\n\n`;
        compilation += content;
        compilation += `\n\n`;
    }

    const compilationPath = join(dir, "_full_compilation.md");
    await writeFile(compilationPath, compilation, "utf-8");
    console.log(`  📚 ${subDir}/_full_compilation.md 생성 완료`);
}
