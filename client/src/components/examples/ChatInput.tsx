import ChatInput from "../ChatInput";

export default function ChatInputExample() {
  const handleSend = (message: string) => {
    console.log("Message sent:", message);
  };

  return (
    <div className="bg-background h-[200px] relative">
      <ChatInput onSend={handleSend} />
    </div>
  );
}
