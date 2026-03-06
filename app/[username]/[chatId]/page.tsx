import GeminiChatPage from "../../page";

interface ChatPageProps {
  params: Promise<{
    username: string;
    chatId: string;
  }>;
}

export default async function UserChatPage({ params }: ChatPageProps) {
  const { username, chatId } = await params;
  
  // Pass the chatId as initial chat to load
  return <GeminiChatPage initialChatId={chatId} initialUsername={username} />;
}
