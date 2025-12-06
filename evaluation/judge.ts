import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface JudgeOutcome {
  score: 0 | 1;
  reason: string;
  rawText?: string;
}

const SYSTEM_PROMPT = `
You are a Senior Fiscal Auditor for Romanian legislation. You are evaluating an AI Assistant's answer against a Reference Answer provided by a human expert.

Evaluation Criteria:
- PASS (Score 1): The Assistant's answer contains the core correct facts from the Reference (core numere, cote, termene, status legislație). Formulările pot diferi.
- FAIL (Score 0): Informații depășite/greșite (ex: 90 salarii în loc de 72), cifre eronate sau refuz nejustificat de răspuns.

Output JSON format exactly: { "score": 0 or 1, "reason": "Short explanation why." }
`;

export async function judgeAnswer(params: {
  question: string;
  referenceAnswer: string;
  candidateAnswer: string;
}): Promise<JudgeOutcome> {
  const { question, referenceAnswer, candidateAnswer } = params;

  const response = await openai.responses.create({
    model: "gpt-4o",
    temperature: 0,
    text: { format: { type: "json_object" } },
    input: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          "User Question:",
          question,
          "\nReference Answer (The Truth):",
          referenceAnswer,
          "\nAI Assistant Answer (To Grade):",
          candidateAnswer,
          '\nReturn JSON: { "score": 0 or 1, "reason": "Short explanation why." }',
        ].join("\n"),
      },
    ],
  });

  const rawText = response.output_text || "";

  try {
    const parsed = JSON.parse(rawText) as JudgeOutcome;
    const score = parsed.score === 1 ? 1 : 0;
    const reason =
      typeof parsed.reason === "string" && parsed.reason.trim().length > 0
        ? parsed.reason.trim()
        : "No reason provided.";

    return { score, reason, rawText };
  } catch (error) {
    return {
      score: 0,
      reason: "Failed to parse judge response as JSON.",
      rawText,
    };
  }
}
