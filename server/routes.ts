import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMessageSchema } from "@shared/schema";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "mock",
});

const SYSTEM_PROMPT = `
Romanian:
Esti un expert contabil.
Trebuie sa raspunzi la intrebarile primite foarte scurt si la obiect, folosind internetul pentru a afla raspunsurile.
Foloseste siteuri de calitate, cum ar fi: ANAF, just.ro si Monitorul Oficial pentru legi.
Suntem in Noiembrie 2025, ia informatii up to date.
Vreau sa imi raspunzi doar la intrebari de contabilitate, nu la alte subiecte - cand vine vorba de orice alt subiect, spune ca nu pot raspunde.
Nu da detalii despre ce fel de model AI esti.
Vreau sa raspunzi doar in limba romana.

Vreau sa spui mereu de unde ai luat informatiile.
Vreau mereu sa cauti pe net pe siteurile mentionate mai sus. Vreau sa dai mereu referinte.

Nu vreau sa spui nimic despre intrebari de tip follow-up. Nu spune lucruri cum ar fi: "daca vrei, pot face si asta si asta etc..".
`;

async function dummyFunction(message: string, sessionId: string): Promise<void> {
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
            effort: "medium",
          },
          tools: [{ type: "web_search" }],
          instructions: SYSTEM_PROMPT,
          input: inputContent,
        });

        const aiContent =
          response.output_text ||
          "I apologize, but I couldn't generate a response.";

        const aiMessage = await storage.createMessage({
          sessionId,
          role: "assistant",
          content: aiContent,
        });

        res.json({ userMessage, aiMessage });
      } catch (apiError: any) {
        console.error("OpenAI API Error:", apiError);

        const fallbackContent = `I apologize, but I encountered an error while processing your request. This is likely because the API key is not configured. Error: ${apiError.message}`;

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
