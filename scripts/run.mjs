#!/usr/bin/env node

/**
 * Policy Maker — Multi-Agent Orchestration Script
 *
 * SKILL(policy-maker-init)이 수집한 userInput을 받아
 * CLI 도구를 통해 다수의 AI 에이전트를 병렬로 실행하고
 * 결과를 artifact 파일로 저장한다.
 *
 * Usage:
 *   node scripts/run.mjs --input <path-to-input.json> [--cli gemini] [--dry-run]
 */

import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { resolve, join, dirname } from "node:path";

import { generateText } from "ai";
import { createGeminiProvider } from "ai-sdk-provider-gemini-cli";

import { PHASE_DEFS } from "./phases.mjs";
import {
    findProjectRoot,
    createSessionId,
    buildPrompt,
    buildServiceContext,
    resolveVariables,
    generateSummary,
    generateFullCompilation,
} from "./utils.mjs";

// ────────────────────────────────────────
// Main
// ────────────────────────────────────────

async function main() {
    const args = process.argv.slice(2);
    const inputIdx = args.indexOf("--input");
    const dryRun = args.includes("--dry-run");

    // ── 1. 입력 파일 로드 ──
    if (inputIdx === -1 || !args[inputIdx + 1]) {
        console.error("Usage: node scripts/run.mjs --input <path-to-input.json> [--dry-run]");
        process.exit(1);
    }

    const inputPath = resolve(args[inputIdx + 1]);
    let input;
    try {
        input = JSON.parse(await readFile(inputPath, "utf-8"));
    } catch (err) {
        console.error(`❌ 입력 파일을 읽을 수 없습니다: ${err.message}`);
        process.exit(1);
    }

    // ── 2. 프로젝트 루트 탐지 ──
    const projectRoot = findProjectRoot();
    console.log(`📂 프로젝트 루트: ${projectRoot}`);

    // ── 3. AI SDK Provider 초기화 ──
    // oauth-personal: ~/.gemini/oauth_creds.json을 사용
    console.log(`🔍 AI SDK Provider 초기화 중...`);
    const gemini = createGeminiProvider({
        authType: "oauth-personal",
    });

    // ── 4. 세션 디렉토리 생성 ──
    const sessionId = createSessionId();
    const artifactDir = join(projectRoot, ".policy-maker", sessionId, "artifacts");
    await mkdir(artifactDir, { recursive: true });
    console.log(`\n📁 세션: ${sessionId}`);
    console.log(`📁 Artifact: ${artifactDir}\n`);

    // ── 5. 입력 백업 저장 ──
    await writeFile(
        join(projectRoot, ".policy-maker", sessionId, "input.json"),
        JSON.stringify(input, null, 2),
        "utf-8"
    );

    // ── 6. SERVICE_CONTEXT 조합 ──
    const serviceContext = buildServiceContext(input);

    // ── DRY RUN ──
    if (dryRun) {
        console.log("🏃 DRY RUN 모드 — 실제 호출 없이 구성만 확인합니다.\n");
        console.log("SERVICE_CONTEXT:");
        console.log(serviceContext);
        console.log("");

        for (const phase of PHASE_DEFS) {
            console.log(`\n── ${phase.name} ──`);
            for (const task of phase.tasks) {
                const promptPath = join(projectRoot, task.promptFile);
                let promptExists = true;
                try {
                    await access(promptPath);
                } catch {
                    promptExists = false;
                }
                console.log(`  ${promptExists ? "✅" : "❌"} ${task.name}`);
                console.log(`     prompt: ${task.promptFile}`);
                console.log(`     output: ${task.outputFile}`);
            }
        }
        console.log("\n✅ Dry run 완료. 모든 구성이 유효합니다.");
        return;
    }

    // ── 7. Phase 순차 실행 ──
    for (const phase of PHASE_DEFS) {
        console.log(`\n${"═".repeat(50)}`);
        console.log(`🚀 ${phase.name}`);
        console.log(`${"═".repeat(50)}`);

        const promises = phase.tasks.map(async (task) => {
            const promptPath = join(projectRoot, task.promptFile);
            const outputPath = join(artifactDir, task.outputFile);

            // 변수 해석
            const resolvedVars = await resolveVariables(
                task.vars,
                input,
                serviceContext,
                artifactDir
            );

            // 프롬프트 빌드
            const promptContent = await buildPrompt(promptPath, resolvedVars);

            console.log(`  ⏳ ${task.name} 실행 중...`);

            try {
                // AI SDK 호출
                const { text } = await generateText({
                    model: gemini("gemini-2.5-pro"), // 기본 모델 사용
                    prompt: promptContent,
                });

                // 결과 저장
                await mkdir(dirname(outputPath), { recursive: true });
                await writeFile(outputPath, text, "utf-8");

                console.log(`  ✅ ${task.name} → ${task.outputFile}`);
            } catch (err) {
                console.error(`  ❌ ${task.name} 오류: ${err.message}`);
                throw err;
            }
        });

        // Phase 내 태스크는 Promise.all로 병렬 실행
        try {
            await Promise.all(promises);
        } catch (err) {
            console.error(`\n❌ ${phase.name} 실행 중 오류 발생:`);
            console.error(`   ${err.message}`);
            process.exit(1);
        }

        // Phase 2 완료 후 expert summary 및 full compilation 생성
        if (phase.name.includes("Expert")) {
            await generateSummary(artifactDir, "R1/expert");
            await generateFullCompilation(artifactDir, "R1/expert");
        }

        // Phase 3 완료 후 attacker summary 및 full compilation 생성
        if (phase.name.includes("Attacker")) {
            await generateSummary(artifactDir, "R1/attacker");
            await generateFullCompilation(artifactDir, "R1/attacker");
        }
    }

    // ── 8. 완료 ──
    console.log(`\n${"═".repeat(50)}`);
    console.log(`🎉 모든 Phase가 완료되었습니다!`);
    console.log(`📁 결과: ${artifactDir}`);
    console.log(`${"═".repeat(50)}\n`);
}

main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});
