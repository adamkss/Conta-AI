import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMessageSchema } from "@shared/schema";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "mock",
});

// Simple in-memory session store
const authenticatedSessions = new Set<string>();

function generateSessionToken(): string {
  return `auth_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authToken = req.headers.authorization?.replace("Bearer ", "") || 
                    req.body?.authToken || 
                    req.query?.authToken as string;

  if (!authToken || !authenticatedSessions.has(authToken)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  next();
}

const SYSTEM_PROMPT = `
Română:

Ești un expert contabil și fiscal, specializat în legislația României.
Răspunzi exclusiv la întrebări de contabilitate, fiscalitate, legislație ANAF, TVA, impozite, contribuții, contabilitate financiară, norme metodologice, raportări, obligații declarative, contabilitate societăți comerciale, PFA, SRL, micro, profit, bilanțuri, norme CECCAR și orice alt subiect strict conex domeniului contabil-fiscal românesc.

Dacă întrebarea nu este strict din aceste domenii, spui doar:
„Nu pot răspunde la această întrebare.”

Reguli de răspuns:

Răspunzi foarte scurt, concis și strict la obiect.

Folosești internetul pentru a căuta răspunsuri doar pe site-uri oficiale și de încredere, precum:

ANAF (anaf.ro)

Ministerul Finanțelor (mfinante.gov.ro)

just.ro (legislație)

Monitorul Oficial (monitoruloficial.ro)

CECCAR (ceccar.ro)

Ești obligat să consideri că data curentă este noiembrie 2025 și să folosești doar informații actualizate.

Nu dezvălui niciodată că ești un model AI, nu descrii cum funcționezi și nu vorbești despre limitările tale.

Răspunzi exclusiv în limba română.

La finalul fiecărui răspuns, incluzi o listă simplă de referințe, fără formatare Markdown, doar în acest format:

https://site.ro

https://site2.ro

Nu explici niciodată ce este o întrebare follow-up și nu sugerezi alte acțiuni suplimentare.

Nu oferi opinii, interpretări personale sau recomandări care nu sunt strict tehnice, fiscale sau contabile.
Răspunsului trebuie să fie întotdeauna in ordinea aceasta:
1. Răspuns
2. Lista de referințe
`;

const ALLOWED_REFERENCE_DOMAINS = [
  "anaf.ro",
  "mfinante.gov.ro",
  "just.ro",
  "monitoruloficial.ro",
  "ceccar.ro",
];

function verifyReferences(content: string): void {
  const urlRegex = /https?:\/\/[^\s]+/g;
  const matches = content.match(urlRegex);
  if (!matches) {
    return;
  }

  const invalidHosts = matches
    .map((url) => {
      try {
        return new URL(url).hostname.toLowerCase();
      } catch {
        return undefined;
      }
    })
    .filter((hostname): hostname is string => Boolean(hostname))
    .filter((hostname) => {
      return !ALLOWED_REFERENCE_DOMAINS.some((domain) => {
        return (
          hostname === domain ||
          hostname.endsWith(`.${domain}`)
        );
      });
    });

  if (invalidHosts.length > 0) {
    const uniqueInvalidHosts = Array.from(new Set(invalidHosts));
    console.warn(
      `[ReferenceCheck] Unauthorized reference hosts detected: ${uniqueInvalidHosts.join(
        ", ",
      )}`,
    );
  }
}

const TOKEN_PRICING = {
  INPUT: 0.25 / 1_000_000,
  CACHED_INPUT: 0.025 / 1_000_000,
  OUTPUT: 2 / 1_000_000,
  WEB_SEARCH_CALL: 10 / 1_000,
};

function logUsageAndCost(response: any): void {
  const usage = response.usage;
  if (!usage) {
    return;
  }

  const inputTokens = usage.input_tokens ?? 0;
  const cachedTokens =
    usage.input_tokens_details?.cached_tokens &&
    usage.input_tokens_details.cached_tokens > 0
      ? usage.input_tokens_details.cached_tokens
      : 0;
  const billedInputTokens = Math.max(inputTokens - cachedTokens, 0);
  const outputTokens = usage.output_tokens ?? 0;

  const inputCost = billedInputTokens * TOKEN_PRICING.INPUT;
  const cachedCost = cachedTokens * TOKEN_PRICING.CACHED_INPUT;
  const outputCost = outputTokens * TOKEN_PRICING.OUTPUT;

  const outputItems = Array.isArray(response.output) ? response.output : [];
  const webSearchCalls = outputItems.filter(
    (item: any) => item?.type === "web_search_call",
  ).length;
  const toolCost = webSearchCalls * TOKEN_PRICING.WEB_SEARCH_CALL;

  const totalCost = inputCost + cachedCost + outputCost + toolCost;

  console.log(
    `[OpenAI Usage] input=${inputTokens} (cached=${cachedTokens}) output=${outputTokens} total=${usage.total_tokens}`,
  );

  console.log(
    `[OpenAI Cost] input=$${inputCost.toFixed(6)} cached=$${cachedCost.toFixed(
      6,
    )} output=$${outputCost.toFixed(6)} tools=$${toolCost.toFixed(
      6,
    )} (web_search_calls=${webSearchCalls}) total=$${totalCost.toFixed(6)}`,
  );
}

async function dummyFunction(
  message: string,
  sessionId: string,
): Promise<void> {
  console.log(`[Dummy Function] Message: ${message}, SessionId: ${sessionId}`);
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/auth/validate", async (req, res) => {
    try {
      const { password } = req.body;
      const correctPassword = process.env.APP_PASSWORD;

      if (!correctPassword) {
        console.error("APP_PASSWORD environment variable is not set");
        res.status(500).json({ error: "Server configuration error" });
        return;
      }

      if (password === correctPassword) {
        const authToken = generateSessionToken();
        authenticatedSessions.add(authToken);
        res.json({ valid: true, authToken });
      } else {
        res.status(401).json({ valid: false });
      }
    } catch (error) {
      console.error("Password validation error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/chat", requireAuth, async (req, res) => {
    try {
      const { content, sessionId } = insertMessageSchema.parse(req.body);

      await dummyFunction(content, sessionId);

      const userMessage = await storage.createMessage({
        sessionId,
        role: "user",
        content,
      });

      const conversationHistory = await storage.getMessages(sessionId);

      const conversationMessages = conversationHistory.slice(0, -1);

      let inputContent: string | any[] = content;

      if (conversationMessages.length > 0) {
        inputContent = [
          ...conversationMessages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
          {
            role: "user",
            content,
          },
        ];
      }

      try {
        const response = await openai.responses.create({
          model: "gpt-5-mini",
          reasoning: {
            effort: "low",
          },
          tools: [{ type: "web_search" }],
          instructions: SYSTEM_PROMPT,
          input: inputContent,
        });

        logUsageAndCost(response);

        const aiContent =
          response.output_text ||
          "Imi pare rau, nu am putut raspunde la intrebarea ta.";

        const aiMessage = await storage.createMessage({
          sessionId,
          role: "assistant",
          content: aiContent,
        });

        verifyReferences(aiContent);

        res.json({ userMessage, aiMessage });
      } catch (apiError: any) {
        console.error("OpenAI API Error:", apiError);

        const fallbackContent = `Imi pare rau. Eroare: ${apiError.message}`;

        const aiMessage = await storage.createMessage({
          sessionId,
          role: "assistant",
          content: fallbackContent,
        });

        verifyReferences(fallbackContent);

        res.json({ userMessage, aiMessage });
      }
    } catch (error) {
      console.error("Request processing error:", error);
      res.status(400).json({ error: "Invalid request" });
    }
  });

  app.get("/api/messages", requireAuth, async (req, res) => {
    const sessionId = req.query.sessionId as string;
    if (!sessionId) {
      res.status(400).json({ error: "sessionId is required" });
      return;
    }
    const messages = await storage.getMessages(sessionId);
    res.json(messages);
  });

  const httpServer = createServer(app);

  return httpServer;
}
