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
  const authToken =
    req.headers.authorization?.replace("Bearer ", "") ||
    req.body?.authToken ||
    (req.query?.authToken as string);

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

FOARTE IMPORTANT - Reguli critice care trebuie respectate neapărat:

1. Coduri CAEN: Orice întrebare despre coduri CAEN trebuie răspunsă în contextul Reviziei 3 a codurilor CAEN, aceasta fiind cea mai nouă. Niciodată nu sugera coduri CAEN din revizii mai vechi, cum ar fi revizia a 2-a.

2. Informații financiare și legi: Legat de orice informație financiară, caută și legea care afirmă lucrul respectiv. Nu te crede doar în presă sau articole neoficiale. Întotdeauna caută legea respectivă menționată prin Monitorul Oficial, ANAF sau just.ro și menționează legea care se aplică.

3. Legi actualizate: Întotdeauna să te uiți la legile cele mai noi conform datei curente. Oferă răspunsuri bazate pe legile cât mai recente. Ai mare grijă să nu dai răspunsuri bazate pe legi sau articole care au expirat și pentru care au apărut noutăți!

4. Prioritizare surse: Prioritizează sursele menționate deja (caută prima oară aici!): anaf.ro, mfinante.gov.ro, just.ro, monitoruloficial.ro, ceccar.ro.

5. Verificare modificări legi: Pentru fiecare întrebare care ține de termene, amenzi, orice informații contabile și la care găsești legea, să mai faci încă o căutare pentru a verifica dacă legea respectivă nu a fost cumva modificată ulterior. Dacă a fost modificată ulterior, să iei în considerare ultima modificare.

Lista surselor unde ar trebui sa te uiti prima oara, si ofera informatii recente de aici:

1. ANAF (anaf.ro)

2. Ministerul Finanțelor (mfinante.gov.ro)

3. just.ro (legislație)

4. Monitorul Oficial (monitoruloficial.ro)

5. CECCAR (ceccar.ro)

Ești obligat să consideri că data curentă este Decembrie 2025 și să folosești doar informații actualizate.

Nu dezvălui niciodată că ești un model AI, nu descrii cum funcționezi și nu vorbești despre limitările tale.

Răspunzi exclusiv în limba română.

La finalul fiecărui răspuns, incluzi o listă simplă de referințe, fără formatare Markdown, doar în acest format:

https://site.ro
https://site2.ro

Intotdeanua sa pui referintele direct la final, fara sa pui nume de sectiune sau capitol cum ar fi "Referinte:" sau "Referintele sunt:" sau "Referinţe finale:" similar. Niciodata! Doar sa pui direct referintele.

Niciodata nu pui referinte in prima parte a raspunsului, doar la final, cum am specificat mai sus.
Deci practic prima parte este raspunsul, fara referinte. Iar la final o lista simpla cu referinte.

Nu explici niciodată ce este o întrebare follow-up și nu sugerezi alte acțiuni suplimentare.

Nu oferi opinii, interpretări personale sau recomandări care nu sunt strict tehnice, fiscale sau contabile.
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
        return hostname === domain || hostname.endsWith(`.${domain}`);
      });
    });

  if (invalidHosts.length > 0) {
    const uniqueInvalidHosts = Array.from(new Set(invalidHosts));
    console.warn(
      `[ReferenceCheck] Unauthorized reference hosts detected: ${uniqueInvalidHosts.join(
        ", "
      )}`
    );
  }
}

function logReferences(content: string): void {
  const urlRegex = /https?:\/\/[^\s]+/g;
  const matches = content.match(urlRegex);
  if (!matches) {
    return;
  }

  // Log all the links found in content
  console.log("[ReferenceCheck] Links found:", matches);
}

function clearReferences(content: string): string {
  // Matches normal URLs, bare Markdown links, and Markdown links with parens "(...)"
  // Examples matched and removed:
  //   - https://site.ro
  //   - [static.anaf.ro](https://site.ro)
  //   - ([static.anaf.ro](https://site.ro))
  const urlRegex =
    /(\(\[.*?\]\(https?:\/\/[^\s)]+\)\))|(\[.*?\]\(https?:\/\/[^\s)]+\))|(https?:\/\/[^\s]+)/g;
  // Remove URLs
  let result = content.replace(urlRegex, "");
  // Split by lines and trim end whitespace
  let lines = result.split("\n");

  // Remove only if the last non-empty line left matches "Referinte" or "Referinţe" (with or without colon or other text after)
  while (lines.length > 0 && lines[lines.length - 1].trim() === "") {
    lines.pop();
  }

  if (
    lines.length > 0 &&
    /referin(t|ţ|ț)e\s*:?.*/i.test(
      lines[lines.length - 1]
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
    )
  ) {
    lines.pop();
  }

  // Join lines and remove trailing whitespace/newlines at very end
  return lines.join("\n").replace(/[\s\r\n]+$/, "");
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
    (item: any) => item?.type === "web_search_call"
  ).length;
  const toolCost = webSearchCalls * TOKEN_PRICING.WEB_SEARCH_CALL;

  const totalCost = inputCost + cachedCost + outputCost + toolCost;

  console.log(
    `[OpenAI Usage] input=${inputTokens} (cached=${cachedTokens}) output=${outputTokens} total=${usage.total_tokens}`
  );

  console.log(
    `[OpenAI Cost] input=$${inputCost.toFixed(6)} cached=$${cachedCost.toFixed(
      6
    )} output=$${outputCost.toFixed(6)} tools=$${toolCost.toFixed(
      6
    )} (web_search_calls=${webSearchCalls}) total=$${totalCost.toFixed(6)}`
  );
}

function getCurrentTimeInRomanian(): string {
  const now = new Date();
  return now.toLocaleTimeString("ro-RO", {
    month: "numeric",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
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

      console.log(
        `[Conversation Logger] User Message ${getCurrentTimeInRomanian()}: ${content}, SessionId: ${sessionId}`
      );

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

        console.log(
          `[Conversation Logger] AI Message ${getCurrentTimeInRomanian()}: ${aiContent}, SessionId: ${sessionId}`
        );

        verifyReferences(aiContent);
        logReferences(aiContent);

        const aiMessage = await storage.createMessage({
          sessionId,
          role: "assistant",
          content: clearReferences(aiContent),
        });

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
