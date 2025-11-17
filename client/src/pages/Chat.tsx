import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getSessionId, resetSession } from "@/lib/session";
import { type Message } from "@shared/schema";
import EmptyState from "@/components/EmptyState";
import ChatThread from "@/components/ChatThread";
import ChatInput from "@/components/ChatInput";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

type MessageWithLoading = Message & { isLoading?: boolean };

export default function Chat() {
  const [messages, setMessages] = useState<MessageWithLoading[]>([]);
  const [sessionId, setSessionId] = useState(getSessionId());

  const { data: storedMessages } = useQuery<Message[]>({
    queryKey: ["/api/messages", sessionId],
    queryFn: async () => {
      const res = await fetch(`/api/messages?sessionId=${sessionId}`, {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch messages: ${res.status}`);
      }
      return await res.json();
    },
  });

  useEffect(() => {
    if (storedMessages) {
      setMessages(storedMessages);
    }
  }, [storedMessages]);

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 300000); // 5 minute timeout

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, role: "user", sessionId }),
          credentials: "include",
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!res.ok) {
          const text = (await res.text()) || res.statusText;
          throw new Error(`${res.status}: ${text}`);
        }

        return (await res.json()) as {
          userMessage: Message;
          aiMessage: Message;
        };
      } catch (error) {
        clearTimeout(timeout);
        throw error;
      }
    },
    onSuccess: (data) => {
      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => !m.id.startsWith("temp-"));
        return [...withoutTemp, data.userMessage, data.aiMessage];
      });
      queryClient.invalidateQueries({ queryKey: ["/api/messages", sessionId] });
    },
    onError: () => {
      setMessages((prev) => prev.filter((m) => !m.id.startsWith("temp-")));
    },
  });

  const handleSend = (content: string) => {
    const userMessage: MessageWithLoading = {
      id: `temp-user-${Date.now()}`,
      sessionId,
      role: "user",
      content,
      timestamp: new Date(),
    };

    const loadingMessage: MessageWithLoading = {
      id: `temp-loading-${Date.now()}`,
      sessionId,
      role: "assistant",
      content: "Gândesc...",
      timestamp: new Date(),
      isLoading: true,
    };

    setMessages((prev) => [...prev, userMessage, loadingMessage]);
    sendMessageMutation.mutate(content);
  };

  const handleReset = () => {
    const newSessionId = resetSession();
    setSessionId(newSessionId);
    setMessages([]);
    queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {messages.length === 0 ? (
        <EmptyState />
      ) : (
        <ChatThread messages={messages} isLoading={false} />
      )}
      <ChatInput onSend={handleSend} disabled={sendMessageMutation.isPending} />
      <div className="fixed top-4 left-4">
        <Button
          onClick={handleReset}
          variant="outline"
          size="sm"
          className="gap-2"
          data-testid="button-reset"
        >
          <RotateCcw className="h-4 w-4" />
          Resetare
        </Button>
      </div>
    </div>
  );
}
