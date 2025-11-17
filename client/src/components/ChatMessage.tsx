import { type Message } from "@shared/schema";

interface ChatMessageProps {
  message: Message;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"} mb-6`}
      data-testid={`message-${message.role}-${message.id}`}
    >
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-muted text-foreground ml-auto"
            : "bg-card text-card-foreground"
        }`}
      >
        <p className="text-base whitespace-pre-wrap break-words" data-testid="text-message-content">
          {message.content}
        </p>
      </div>
    </div>
  );
}
