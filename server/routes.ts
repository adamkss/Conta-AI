import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMessageSchema } from "@shared/schema";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "mock",
});

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

async function dummyFunction(
  message: string,
  sessionId: string,
): Promise<void> {
  console.log(`[Dummy Function] Message: ${message}, SessionId: ${sessionId}`);
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/chat", async (req, res) => {
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

        const aiContent =
          response.output_text ||
          "Imi pare rau, nu am putut raspunde la intrebarea ta.";

        const aiMessage = await storage.createMessage({
          sessionId,
          role: "assistant",
          content: aiContent,
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

        res.json({ userMessage, aiMessage });
      }
    } catch (error) {
      console.error("Request processing error:", error);
      res.status(400).json({ error: "Invalid request" });
    }
  });

  app.get("/api/messages", async (req, res) => {
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
