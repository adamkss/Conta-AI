import "dotenv/config";
import axios from "axios";
import fs from "node:fs/promises";
import path from "node:path";
import { GOLDEN_DATASET, type EvalCase } from "./dataset";
import { judgeAnswer, type JudgeOutcome } from "./judge";

const RUNS_PER_QUESTION = Number(process.env.EVAL_RUNS ?? "5");
const API_BASE_URL = process.env.EVAL_API_BASE_URL ?? "http://localhost:3003";
const APP_PASSWORD = process.env.APP_PASSWORD ?? process.env.EVAL_APP_PASSWORD;
const PRESET_AUTH_TOKEN = process.env.EVAL_AUTH_TOKEN;

const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60_000,
});

function formatAxiosError(error: any): string {
  if (error?.response) {
    const { status, statusText, data } = error.response;
    return `HTTP ${status} ${statusText} :: ${JSON.stringify(data)}`;
  }
  if (error?.request) {
    return "No response received from server";
  }
  return error?.message || "Unknown error";
}

interface IterationResult {
  iteration: number;
  answer: string;
  judge?: JudgeOutcome;
  error?: string;
}

interface CaseResult extends EvalCase {
  iterations: IterationResult[];
  passCount: number;
  failCount: number;
}

interface EvalReport {
  generatedAt: string;
  baseUrl: string;
  runsPerQuestion: number;
  totals: {
    cases: number;
    evaluations: number;
    score: number;
    accuracy: number;
  };
  cases: CaseResult[];
}

async function getAuthToken(): Promise<string> {
  if (PRESET_AUTH_TOKEN) {
    return PRESET_AUTH_TOKEN;
  }

  if (!APP_PASSWORD) {
    throw new Error(
      "APP_PASSWORD or EVAL_APP_PASSWORD must be set to request an auth token."
    );
  }

  console.log(`[auth] Requesting token from ${API_BASE_URL}/api/auth/validate`);
  const response = await http.post("/api/auth/validate", {
    password: APP_PASSWORD,
  });

  const authToken = response.data?.authToken as string | undefined;
  if (!authToken) {
    throw new Error("Auth token not returned from /api/auth/validate.");
  }

  return authToken;
}

async function callChatApi(
  testCase: EvalCase,
  iteration: number,
  authToken: string
): Promise<string> {
  const sessionId = `${testCase.id}-${Date.now()}-${iteration}`;
  try {
    console.log(
      `[chat] -> case=${testCase.id} iteration=${iteration} (${testCase.question.slice(
        0,
        48
      )}...)`
    );
    const response = await http.post(
      "/api/chat",
      {
        content: testCase.question,
        role: "user",
        sessionId,
      },
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    const aiMessage = response.data?.aiMessage;
    const answer = aiMessage?.content as string | undefined;

    if (!answer) {
      throw new Error("AI answer missing in /api/chat response.");
    }

    console.log(`[chat] <- case=${testCase.id} iteration=${iteration} ok`);
    return answer;
  } catch (error: any) {
    const reason = formatAxiosError(error);
    console.error(
      `[chat] Failed for case=${testCase.id} iteration=${iteration} :: ${reason}`
    );
    throw new Error(reason);
  }
}

async function evaluateCase(
  testCase: EvalCase,
  authToken: string
): Promise<CaseResult> {
  const iterations: IterationResult[] = [];
  let passCount = 0;
  let failCount = 0;

  for (let i = 1; i <= RUNS_PER_QUESTION; i++) {
    try {
      const answer = await callChatApi(testCase, i, authToken);
      console.log(`[judge] -> case=${testCase.id} iteration=${i}`);
      const judge = await judgeAnswer({
        question: testCase.question,
        referenceAnswer: testCase.referenceAnswer,
        candidateAnswer: answer,
      });

      if (judge.score === 1) {
        passCount += 1;
      } else {
        failCount += 1;
      }

      iterations.push({ iteration: i, answer, judge });
      console.log(
        `[judge] <- case=${testCase.id} iteration=${i} score=${judge.score}`
      );
    } catch (error: any) {
      failCount += 1;
      iterations.push({
        iteration: i,
        answer: "",
        error: error?.message || "Unknown error",
      });
    }
  }

  return {
    ...testCase,
    iterations,
    passCount,
    failCount,
  };
}

async function writeReport(report: EvalReport): Promise<string> {
  const reportPath = path.join(process.cwd(), "evaluation", "report.json");
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");
  return reportPath;
}

async function main() {
  const authToken = await getAuthToken();

  const results: CaseResult[] = [];
  let totalEvaluations = 0;
  let totalScore = 0;

  for (const testCase of GOLDEN_DATASET) {
    const caseResult = await evaluateCase(testCase, authToken);
    results.push(caseResult);

    totalEvaluations += caseResult.passCount + caseResult.failCount;
    totalScore += caseResult.passCount;
  }

  const accuracy =
    totalEvaluations === 0 ? 0 : (totalScore / totalEvaluations) * 100;

  const report: EvalReport = {
    generatedAt: new Date().toISOString(),
    baseUrl: API_BASE_URL,
    runsPerQuestion: RUNS_PER_QUESTION,
    totals: {
      cases: GOLDEN_DATASET.length,
      evaluations: totalEvaluations,
      score: totalScore,
      accuracy: Number(accuracy.toFixed(2)),
    },
    cases: results,
  };

  const savedPath = await writeReport(report);
  console.log(
    `Evaluation completed. Accuracy ${report.totals.accuracy}% (${totalScore}/${totalEvaluations}).`
  );
  console.log(`Report saved to ${savedPath}`);
}

main().catch((error) => {
  console.error("Evaluation failed:", error);
  process.exit(1);
});
