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
import { resolve, join } from "node:path";

import { CLI_STRATEGIES, resolveBin, detectAvailableCLIs, runCli } from "./cli.mjs";
import { PHASE_DEFS } from "./phases.mjs";
import {
    findProjectRoot,
    createSessionId,
    buildPrompt,
    buildServiceContext,
    resolveVariables,
    generateSummary,
} from "./utils.mjs";

// ────────────────────────────────────────
// Main
// ────────────────────────────────────────

async function main() {
    const args = process.argv.slice(2);
    const inputIdx = args.indexOf("--input");
    const cliIdx = args.indexOf("--cli");
    const dryRun = args.includes("--dry-run");

    // ── 1. 입력 파일 로드 ──
    if (inputIdx === -1 || !args[inputIdx + 1]) {
        console.error("Usage: node scripts/run.mjs --input <path-to-input.json> [--cli gemini] [--dry-run]");
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

    // ── 3. CLI 도구 결정 ──
    let cliName = cliIdx !== -1 ? args[cliIdx + 1] : input.CLI_TOOL;

    if (!cliName) {
        const available = detectAvailableCLIs();
        console.log(`\n🔍 사용 가능한 LLM CLI 감지 중...`);
        for (const name of Object.keys(CLI_STRATEGIES)) {
            const found = available.some((a) => a.name === name);
            console.log(`  ${found ? "✅" : "❌"} ${name}`);
        }

        if (available.length === 0) {
            console.error("\n❌ 설치된 LLM CLI 도구를 찾을 수 없습니다.");
            console.error("   gemini, claude, codex, opencode 중 하나를 설치해주세요.");
            process.exit(1);
        }

        cliName = available[0].name;
        console.log(`\n👉 ${cliName}을(를) 사용합니다. (변경: --cli <name>)`);
    }

    const strategy = CLI_STRATEGIES[cliName];
    if (!strategy) {
        console.error(`❌ 알 수 없는 CLI 도구: ${cliName}`);
        console.error(`   지원 목록: ${Object.keys(CLI_STRATEGIES).join(", ")}`);
        process.exit(1);
    }

    // ── 3.5. 바이너리 풀패스 resolve (shell 우회) ──
    let binPath;
    try {
        binPath = resolveBin(strategy.bin);
        console.log(`🔧 CLI: ${cliName} → ${binPath}`);
    } catch (err) {
        console.error(`❌ ${err.message}`);
        process.exit(1);
    }

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
        console.log("🏃 DRY RUN 모드 — 실제 CLI 호출 없이 구성만 확인합니다.\n");
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
            const prompt = await buildPrompt(promptPath, resolvedVars);

            console.log(`  ⏳ ${task.name} 실행 중...`);

            // CLI 호출 (resolveBin 결과 사용)
            await runCli(binPath, strategy.args, prompt, outputPath);

            console.log(`  ✅ ${task.name} → ${task.outputFile}`);
        });

        // Phase 내 태스크는 Promise.all로 병렬 실행
        try {
            await Promise.all(promises);
        } catch (err) {
            console.error(`\n❌ ${phase.name} 실행 중 오류 발생:`);
            console.error(`   ${err.message}`);
            process.exit(1);
        }

        // Phase 2 완료 후 expert summary 생성
        if (phase.name.includes("Expert")) {
            await generateSummary(artifactDir, "R1/expert");
        }

        // Phase 3 완료 후 attacker summary 생성
        if (phase.name.includes("Attacker")) {
            await generateSummary(artifactDir, "R1/attacker");
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
