'use client';

import { useState, useEffect, useRef } from 'react';
import { chat } from '@/lib/api';
import { wsClient } from '@/lib/ws';
import { Trash2, Pin, PinOff, Send, MessageSquare } from 'lucide-react';

interface ChatMessage {
  id: string;
  content: string;
  user: {
    id: string;
    displayName: string;
    avatarUrl?: string;
    role: string;
  };
  timestampMs: number;
  createdAt: Date;
  isPinned?: boolean;
}

interface ChatModerationProps {
  eventId: string;
}

export function ChatModeration({ eventId }: ChatModerationProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pinnedMessageId, setPinnedMessageId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadChat = async () => {
      try {
        const data = await chat.list(eventId, 100) as Array<{
          id: string;
          content: string;
          user: { id: string; displayName: string; avatarUrl?: string; role: string };
          timestampMs: number;
          createdAt: string;
          isPinned?: boolean;
        }>;
        // Reverse to get oldest first for chronological display
        setMessages(data.map(m => ({ ...m, createdAt: new Date(m.createdAt) })).reverse());

        const pinned = await chat.getPinned(eventId) as { id: string } | null;
        if (pinned) {
          setPinnedMessageId(pinned.id);
        }
      } catch (err) {
        console.error('Failed to load chat:', err);
      } finally {
        setLoading(false);
      }
    };

    loadChat();

    // Connect to WebSocket for real-time updates and sending messages
    const token = localStorage.getItem('accessToken');
    wsClient.connect(eventId, token || undefined);

    // Subscribe to WebSocket for real-time updates
    const unsubscribers = [
      wsClient.on('chat_message', (msg) => {
        const data = msg.data as ChatMessage;
        setMessages(prev => [...prev.slice(-99), { ...data, createdAt: new Date(data.createdAt as unknown as string) }]);
      }),
      wsClient.on('chat_delete', (msg) => {
        const data = msg.data as { messageId: string };
        setMessages(prev => prev.filter(m => m.id !== data.messageId));
      }),
      wsClient.on('chat_pin', (msg) => {
        const data = msg.data as { messageId: string; action: string };
        if (data.action === 'pin') {
          setPinnedMessageId(data.messageId);
        } else {
          setPinnedMessageId(null);
        }
      }),
    ];

    return () => {
      unsubscribers.forEach(unsub => unsub());
      wsClient.disconnect();
    };
  }, [eventId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleDelete = async (messageId: string) => {
    try {
      await chat.delete(eventId, messageId);
      setMessages(prev => prev.filter(m => m.id !== messageId));
    } catch (err) {
      console.error('Failed to delete message:', err);
    }
  };

  const handlePin = async (messageId: string) => {
    try {
      if (pinnedMessageId === messageId) {
        await chat.unpin(eventId, messageId);
        setPinnedMessageId(null);
      } else {
        await chat.pin(eventId, messageId);
        setPinnedMessageId(messageId);
      }
    } catch (err) {
      console.error('Failed to pin/unpin message:', err);
    }
  };

  const handleSend = () => {
    if (!inputValue.trim()) return;

    const idempotencyKey = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    wsClient.sendChatMessage(inputValue.trim(), idempotencyKey);
    setInputValue('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="w-5 h-5 text-white" />
          <h3 className="text-lg font-semibold text-white">Chat</h3>
        </div>
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-xl p-4 flex flex-col h-full max-h-96">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Chat
        </h3>
        <span className="text-xs text-gray-400">{messages.length} messages</span>
      </div>

      {/* Pinned message indicator */}
      {pinnedMessageId && (
        <div className="mb-2 px-2 py-1 bg-primary-900/50 rounded text-xs text-primary-300 flex items-center gap-1">
          <Pin className="w-3 h-3" />
          <span>1 message pinned</span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
        {messages.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">No messages yet</p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`group flex items-start gap-2 p-2 rounded-lg hover:bg-gray-700/50 ${
                pinnedMessageId === msg.id ? 'bg-primary-900/30 border border-primary-600/50' : ''
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`font-semibold text-sm ${
                      msg.user.role === 'host'
                        ? 'text-primary-400'
                        : msg.user.role === 'moderator'
                        ? 'text-green-400'
                        : 'text-gray-300'
                    }`}
                  >
                    {msg.user.displayName}
                  </span>
                  {pinnedMessageId === msg.id && (
                    <Pin className="w-3 h-3 text-primary-400" />
                  )}
                </div>
                <p className="text-sm text-gray-200 break-words">{msg.content}</p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <button
                  onClick={() => handlePin(msg.id)}
                  className={`p-1 rounded hover:bg-gray-600 ${
                    pinnedMessageId === msg.id ? 'text-primary-400' : 'text-gray-400'
                  }`}
                  title={pinnedMessageId === msg.id ? 'Unpin message' : 'Pin message'}
                >
                  {pinnedMessageId === msg.id ? (
                    <PinOff className="w-4 h-4" />
                  ) : (
                    <Pin className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => handleDelete(msg.id)}
                  className="p-1 rounded text-gray-400 hover:text-red-400 hover:bg-gray-600"
                  title="Delete message"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Host message input */}
      <div className="mt-3 pt-3 border-t border-gray-700">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Send a message as host..."
            className="flex-1 bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            maxLength={500}
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim()}
            className="p-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
