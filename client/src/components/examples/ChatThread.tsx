import ChatThread from "../ChatThread";

export default function ChatThreadExample() {
  const messages = [
    {
      id: "1",
      role: "user",
      content: "What is the weather in Sacramento?",
      timestamp: new Date(),
    },
    {
      id: "2",
      role: "assistant",
      content: "Currently 56° · Rain\nSacramento, CA, United States\n\nHere's the current weather in Sacramento, CA, USA:\n\n• Current conditions: Rain, about 56 °F (13 °C)\n• Short-term outlook: Rain continues through the early morning, dropping to around 54 °F (12 °C). From about 7-10 a.m., it shifts to intermittent clouds, reaching 52-53 °F (11-12 °C).\n• Late morning to early afternoon: Conditions will be mostly cloudy with showers showing up again; temperatures climbing toward 59-60 °F (15-16 °C) by 1 p.m.\n\nTip: If you're heading out this morning, a rain jacket or umbrella is wise; by midday it might calm somewhat but could still drizzle. Would you like a full 7-day forecast too?",
      timestamp: new Date(),
    },
  ];

  return (
    <div className="bg-background min-h-screen">
      <ChatThread messages={messages} />
    </div>
  );
}
