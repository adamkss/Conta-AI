import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMessageSchema } from "@shared/schema";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "mock-api-key-for-development",
});

const SYSTEM_PROMPT = `You are a helpful AI assistant. Provide accurate, clear, and concise responses. When using web search results, cite your sources appropriately.`;

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/chat", async (req, res) => {
    try {
      const { content } = insertMessageSchema.parse(req.body);
      
      const userMessage = await storage.createMessage({
        role: "user",
        content,
      });

      try {
        const response = await openai.responses.create({
          model: "gpt-5-mini",
          reasoning: { 
            effort: "medium"
          },
          tools: [
            { type: "web_search" }
          ],
          instructions: SYSTEM_PROMPT,
          input: content,
        });

        const aiContent = response.output_text || "I apologize, but I couldn't generate a response.";
        
        const aiMessage = await storage.createMessage({
          role: "assistant",
          content: aiContent,
        });

        res.json({ userMessage, aiMessage });
      } catch (apiError: any) {
        console.error("OpenAI API Error:", apiError);
        
        const fallbackContent = `I apologize, but I encountered an error while processing your request. This is likely because the API key is not configured. Error: ${apiError.message}`;
        
        const aiMessage = await storage.createMessage({
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

  app.get("/api/messages", async (_req, res) => {
    const messages = await storage.getMessages();
    res.json(messages);
  });

  const httpServer = createServer(app);

  return httpServer;
}
