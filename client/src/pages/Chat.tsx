import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type Message } from "@shared/schema";
import EmptyState from "@/components/EmptyState";
import ChatThread from "@/components/ChatThread";
import ChatInput from "@/components/ChatInput";

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);

  const { data: storedMessages } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
  });

  useEffect(() => {
    if (storedMessages) {
      setMessages(storedMessages);
    }
  }, [storedMessages]);

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", "/api/chat", { content, role: "user" });
      return await res.json() as { userMessage: Message; aiMessage: Message };
    },
    onSuccess: (data) => {
      setMessages((prev) => [...prev, data.userMessage, data.aiMessage]);
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
    },
  });

  const handleSend = (content: string) => {
    sendMessageMutation.mutate(content);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {messages.length === 0 && !sendMessageMutation.isPending ? (
        <EmptyState />
      ) : (
        <ChatThread messages={messages} isLoading={sendMessageMutation.isPending} />
      )}
      <ChatInput onSend={handleSend} disabled={sendMessageMutation.isPending} />
    </div>
  );
}
