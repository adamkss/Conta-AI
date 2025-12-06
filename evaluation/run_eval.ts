import "dotenv/config";
import axios from "axios";
import fs from "node:fs/promises";
import path from "node:path";
import { GOLDEN_DATASET, type EvalCase } from "./dataset";
import { judgeAnswer } from "./judge";

type RunResult = {
  questionId: string;
  runIndex: number;
  score: 0 | 1;
  reason: string;
  actualOutput: string;
  error?: string;
};

type CaseSummary = {
  id: string;
  passes: number;
  total: number;
  accuracy: number;
};

const API_BASE_URL = process.env.EVAL_API_BASE_URL ?? "http://localhost:3003";
const RUNS_PER_QUESTION = Number(process.env.EVAL_RUNS ?? "5");
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

async function getAuthToken(): Promise<string> {
  if (PRESET_AUTH_TOKEN) return PRESET_AUTH_TOKEN;
  if (!APP_PASSWORD) {
    throw new Error("APP_PASSWORD or EVAL_APP_PASSWORD must be set.");
  }

  console.log(`[auth] Requesting token from ${API_BASE_URL}/api/auth/validate`);
  const res = await http.post("/api/auth/validate", { password: APP_PASSWORD });
  const token = res.data?.authToken as string | undefined;
  if (!token) throw new Error("authToken missing from /api/auth/validate.");
  console.log("[auth] Token received");
  return token;
}

async function callChat(
  testCase: EvalCase,
  runIndex: number,
  authToken: string
): Promise<string> {
  const sessionId = `${testCase.id}-${Date.now()}-${runIndex}`;
  try {
    console.log(
      `[chat] -> case=${testCase.id} run=${runIndex} (${testCase.question.slice(
        0,
        48
      )}...)`
    );
    const res = await http.post(
      "/api/chat",
      { content: testCase.question, sessionId, role: "user" },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    const answer = res.data?.aiMessage?.content as string | undefined;
    if (!answer) throw new Error("aiMessage.content missing from /api/chat.");
    console.log(`[chat] <- case=${testCase.id} run=${runIndex} ok`);
    return answer;
  } catch (error: any) {
    const reason = formatAxiosError(error);
    console.error(
      `[chat] Failed for case=${testCase.id} run=${runIndex} :: ${reason}`
    );
    throw new Error(reason);
  }
}

async function evaluateCase(
  testCase: EvalCase,
  authToken: string
): Promise<RunResult[]> {
  const results: RunResult[] = [];

  for (let i = 0; i < RUNS_PER_QUESTION; i++) {
    try {
      const candidate = await callChat(testCase, i, authToken);
      console.log(`[judge] -> case=${testCase.id} run=${i}`);
      const judgement = await judgeAnswer({
        question: testCase.question,
        referenceAnswer: testCase.referenceAnswer,
        candidateAnswer: candidate,
      });

      results.push({
        questionId: testCase.id,
        runIndex: i,
        score: judgement.score,
        reason: judgement.reason,
        actualOutput: candidate,
      });
      console.log(
        `[judge] <- case=${testCase.id} run=${i} score=${judgement.score}`
      );
    } catch (error: any) {
      const reason = error?.message || "Unknown error";
      results.push({
        questionId: testCase.id,
        runIndex: i,
        score: 0,
        reason,
        actualOutput: "",
        error: reason,
      });
    }
  }

  return results;
}

function buildSummary(results: RunResult[]): CaseSummary[] {
  const byCase = new Map<string, RunResult[]>();
  for (const r of results) {
    const arr = byCase.get(r.questionId) ?? [];
    arr.push(r);
    byCase.set(r.questionId, arr);
  }

  const summaries: CaseSummary[] = [];
  for (const [id, runs] of byCase.entries()) {
    const passes = runs.filter((r) => r.score === 1).length;
    const total = runs.length;
    const accuracy = total === 0 ? 0 : Number(((passes / total) * 100).toFixed(2));
    summaries.push({ id, passes, total, accuracy });
  }
  return summaries;
}

async function writeReport(results: RunResult[]): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const reportPath = path.join(
    process.cwd(),
    "evaluation",
    `report_${timestamp}.json`
  );
  await fs.writeFile(reportPath, JSON.stringify(results, null, 2), "utf8");
  return reportPath;
}

function printSummary(summaries: CaseSummary[]) {
  const rows = summaries.map((s) => ({
    Question: s.id,
    Passed: `${s.passes}/${s.total}`,
    Accuracy: `${s.accuracy}%`,
  }));
  console.table(rows);
}

async function main() {
  const authToken = await getAuthToken();
  const allResults: RunResult[] = [];

  for (const testCase of GOLDEN_DATASET) {
    const caseResults = await evaluateCase(testCase, authToken);
    allResults.push(...caseResults);
  }

  const reportPath = await writeReport(allResults);
  const summaries = buildSummary(allResults);
  printSummary(summaries);

  const totalPasses = allResults.filter((r) => r.score === 1).length;
  const total = allResults.length;
  const overallAccuracy = total === 0 ? 0 : Number(((totalPasses / total) * 100).toFixed(2));
  console.log(`Overall accuracy: ${overallAccuracy}% (${totalPasses}/${total})`);
  console.log(`Report saved to ${reportPath}`);
}

main().catch((error) => {
  console.error("Evaluation run failed:", error);
  process.exit(1);
});
