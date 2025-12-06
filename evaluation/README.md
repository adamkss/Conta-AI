# Evaluation Harness (LLM-as-a-Judge)

This folder contains a small harness that hits the local chat API multiple times, then grades the answers with GPT-4o against a golden dataset.

## Files
- `dataset.ts` — 6 accounting test cases (question + reference answer).
- `judge.ts` — sends the question, reference answer, and model output to GPT-4o; returns JSON `{ score, reason }`.
- `index.ts` — end-to-end evaluator (collects per-case pass/fail, writes `evaluation/report.json`).
- `run_eval.ts` — alternate runner that writes timestamped reports and prints a console table.

## Scripts
- `npm run eval` — runs `evaluation/index.ts`.
- `npm run eval:run` — runs `evaluation/run_eval.ts` (shows a table, writes `report_<timestamp>.json`).

## Required env vars
- `OPENAI_API_KEY` — for the judge (GPT-4o).
- `APP_PASSWORD` or `EVAL_APP_PASSWORD` — used to obtain `authToken` from `/api/auth/validate`.
- Optional: `EVAL_AUTH_TOKEN` to skip the auth call and use a pre-provided token.
- Optional: `EVAL_API_BASE_URL` (default `http://localhost:5000` in `run_eval.ts`, `http://localhost:3003` in `index.ts`).
- Optional: `EVAL_RUNS` — number of iterations per question (default 5).

## How it works
1) Authenticate (unless `EVAL_AUTH_TOKEN` is provided) via `POST /api/auth/validate` with the app password.  
2) For each test case and each run:
   - Call `POST /api/chat` with the question and `Authorization: Bearer <authToken>`.
   - Send the model’s answer plus the golden answer to GPT-4o for grading.  
3) Aggregate scores, compute accuracy, and write a JSON report under `evaluation/`.

## Running locally
1) Start the app: `PORT=3003 APP_PASSWORD=... npm run dev` (or your preferred start command).  
2) In another shell, from repo root:
   - `OPENAI_API_KEY=... APP_PASSWORD=... npm run eval:run`
3) Inspect the generated report in `evaluation/` and the console summary.

## Output
- `npm run eval` → `evaluation/report.json`
- `npm run eval:run` → `evaluation/report_<timestamp>.json`

Each entry includes question id, run index, score, judge reason, and the model’s actual output. The summary shows per-question pass counts and overall accuracy.***
