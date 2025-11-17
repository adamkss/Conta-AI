import ChatMessage from "../ChatMessage";

export default function ChatMessageExample() {
  const userMessage = {
    id: "1",
    role: "user",
    content: "What is the weather in Sacramento?",
    timestamp: new Date(),
  };

  const assistantMessage = {
    id: "2",
    role: "assistant",
    content: "Currently 56° · Rain\nSacramento, CA, United States\n\nHere's the current weather in Sacramento, CA, USA:\n\n• Current conditions: Rain, about 56 °F (13 °C)\n• Short-term outlook: Rain continues through the early morning, dropping to around 54 °F (12 °C). From about 7-10 a.m., it shifts to intermittent clouds, reaching 52-53 °F (11-12 °C).",
    timestamp: new Date(),
  };

  return (
    <div className="bg-background p-8 space-y-6">
      <ChatMessage message={userMessage} />
      <ChatMessage message={assistantMessage} />
    </div>
  );
}
