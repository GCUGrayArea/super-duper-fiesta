import { useEffect, useState, useRef } from 'react';
import { collection, addDoc, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase/config';
import { enqueueCommand } from '../ai/queueProcessor';
import "@chatscope/chat-ui-kit-styles/dist/default/styles.min.css";
import {
  MainContainer,
  ChatContainer,
  MessageList,
  Message,
  MessageInput,
  TypingIndicator
} from "@chatscope/chat-ui-kit-react";

interface ChatMessage {
  id: string;
  canvasId: string;
  userId: string;
  displayName: string;
  message: string;
  isAI: boolean;
  timestamp: number;
}

export function ChatWindow({ canvasId, userId, displayName }: { canvasId: string; userId: string; displayName: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const unsubRef = useRef<() => void>();

  useEffect(() => {
    const chatRef = collection(db, `chats/${canvasId}/messages`);
    const q = query(chatRef, orderBy('timestamp', 'asc'));
    unsubRef.current = onSnapshot(q, (snap) => {
      const items: ChatMessage[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      setMessages(items);
    });
    return () => unsubRef.current?.();
  }, [canvasId]);

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text) return;
    const chatRef = collection(db, `chats/${canvasId}/messages`);
    await addDoc(chatRef, {
      canvasId,
      userId,
      displayName,
      message: text,
      isAI: false,
      timestamp: Date.now(),
    });
    // Also enqueue the message as a command for the AI agent
    try {
      await enqueueCommand(canvasId, userId, displayName, text);
    } catch (e) {
      // Best-effort; chat still records even if queue fails
      console.error('Failed to enqueue command:', e);
    }
    setIsTyping(true);
    // AI response will be appended by the queue processor later
    setTimeout(() => setIsTyping(false), 1500);
  };

  return (
    <div style={{ height: 360, position: "relative" }}>
      <MainContainer>
        <ChatContainer>
          <MessageList typingIndicator={isTyping ? <TypingIndicator content="AI is typing…" /> : undefined}>
            {messages.map(m => (
              <Message
                key={m.id}
                model={{
                  message: m.message,
                  direction: m.isAI ? 'incoming' : 'outgoing',
                  sender: m.displayName,
                  position: 'single'
                }}
              />
            ))}
          </MessageList>
          <MessageInput
            placeholder="Type a message (Enter to send, Shift+Enter for newline)"
            attachButton={false}
            onSend={send}
          />
        </ChatContainer>
      </MainContainer>
    </div>
  );
}


