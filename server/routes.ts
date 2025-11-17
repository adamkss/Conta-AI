import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMessageSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/chat", async (req, res) => {
    try {
      const { content } = insertMessageSchema.parse(req.body);
      
      const userMessage = await storage.createMessage({
        role: "user",
        content,
      });

      const aiResponse = `This is a mock AI response to: "${content}". In production, this would connect to an actual AI service.`;
      
      const aiMessage = await storage.createMessage({
        role: "assistant",
        content: aiResponse,
      });

      res.json({ userMessage, aiMessage });
    } catch (error) {
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
