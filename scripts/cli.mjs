/**
 * CLI Strategy Dictionary + Runner
 *
 * 각 LLM CLI 도구의 비대화형 실행 명령어와
 * subprocess 호출 로직을 관리한다.
 */

import { spawn, execSync } from "node:child_process";
import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

// ────────────────────────────────────────
// CLI Strategy Dictionary
// ────────────────────────────────────────

export const CLI_STRATEGIES = {
    gemini: {
        bin: "gemini",
        // -p <string>: headless mode (값 필수!), -o text: plain text 출력
        // 프롬프트는 stdin으로 전달 → -p의 " "에 append됨
        args: ["-p", " ", "-o", "text"],
    },
    claude: {
        bin: "claude",
        // -p: --print (headless), --output-format text
        args: ["-p", " ", "--output-format", "text"],
    },
    codex: {
        bin: "codex",
        // exec 서브커맨드 + - (stdin 읽기)
        args: ["exec", "-"],
    },
    opencode: {
        bin: "opencode",
        // run 서브커맨드 (stdin 자동 읽기)
        args: ["run"],
    },
};

// ────────────────────────────────────────
// Binary Resolution
// ────────────────────────────────────────

/**
 * where(Windows) / which(Unix)로 바이너리의 풀패스를 취득한다.
 * 풀패스를 사용하면 shell: true 없이도 .cmd/.bat 래퍼를 직접 실행할 수 있어
 * 셸 파이프라인을 거치지 않으므로 한글 인코딩 문제를 방지한다.
 *
 * @param {string} name - 바이너리 이름 (e.g. "gemini")
 * @returns {string} 풀패스 (e.g. "C:\Users\dev\AppData\Roaming\npm\gemini.cmd")
 * @throws {Error} 바이너리를 찾을 수 없을 때
 */
export function resolveBin(name) {
    const cmd = process.platform === "win32" ? "where" : "which";
    try {
        return execSync(`${cmd} ${name}`, { encoding: "utf-8" })
            .trim()
            .split(/\r?\n/)[0]
            .trim();
    } catch {
        throw new Error(`'${name}' 바이너리를 찾을 수 없습니다. PATH를 확인해주세요.`);
    }
}

// ────────────────────────────────────────
// CLI Detection
// ────────────────────────────────────────

/**
 * 사용 가능한 CLI 도구를 자동 감지한다.
 * @returns {{ name: string, path: string }[]}
 */
export function detectAvailableCLIs() {
    const available = [];
    for (const name of Object.keys(CLI_STRATEGIES)) {
        try {
            const binPath = resolveBin(name);
            available.push({ name, path: binPath });
        } catch {
            // not found
        }
    }
    return available;
}

// ────────────────────────────────────────
// CLI Runner
// ────────────────────────────────────────

/**
 * CLI 도구를 subprocess로 호출하고 결과를 파일에 저장한다.
 *
 * 핵심: Node.js spawn의 stdio pipe를 통해 직접 stdin에 UTF-8로 쓴다.
 * - resolveBin()으로 풀패스를 취득하여 shell: false로 실행
 * - 셸 파이프라인을 거치지 않으므로 Windows 인코딩 문제 없음
 * - 임시 파일 불필요
 * - 크로스 플랫폼 동일 동작
 *
 * @param {string} binPath - CLI 바이너리 풀패스
 * @param {string[]} args - CLI 인자 배열
 * @param {string} prompt - 프롬프트 텍스트
 * @param {string} outputPath - 결과 저장 경로
 */
export function runCli(binPath, args, prompt, outputPath) {
    return new Promise((resolvePromise, reject) => {
        const proc = spawn(binPath, args, {
            stdio: ["pipe", "pipe", "pipe"],
            // shell: false (기본값) — 인코딩 안전
        });

        // 프롬프트를 stdin에 UTF-8로 직접 쓰기
        proc.stdin.write(prompt, "utf-8");
        proc.stdin.end();

        let stdout = "";
        let stderr = "";

        proc.stdout.on("data", (chunk) => {
            stdout += chunk.toString("utf-8");
        });

        proc.stderr.on("data", (chunk) => {
            stderr += chunk.toString("utf-8");
        });

        proc.on("error", (err) => {
            reject(new Error(`Failed to spawn ${binPath}: ${err.message}`));
        });

        proc.on("close", async (code) => {
            if (code !== 0) {
                reject(
                    new Error(
                        `CLI exited with code ${code}\nstderr: ${stderr.slice(0, 500)}`
                    )
                );
                return;
            }

            try {
                await mkdir(dirname(outputPath), { recursive: true });
                await writeFile(outputPath, stdout, "utf-8");
                resolvePromise(outputPath);
            } catch (err) {
                reject(new Error(`Failed to write output: ${err.message}`));
            }
        });
    });
}
