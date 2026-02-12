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

    const token = localStorage.getItem('accessToken');
    wsClient.connect(eventId, token || undefined);

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

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'host': return 'text-indigo-600 bg-indigo-50';
      case 'moderator': return 'text-green-600 bg-green-50';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full items-center justify-center py-8">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Pinned message indicator */}
      {pinnedMessageId && (
        <div className="mx-4 mt-3 px-3 py-2 bg-indigo-50 rounded-lg text-sm text-indigo-700 flex items-center gap-2">
          <Pin className="w-4 h-4" />
          <span>1 message pinned</span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No messages yet</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`group relative p-3 rounded-xl transition ${
                pinnedMessageId === msg.id
                  ? 'bg-indigo-50 border border-indigo-200'
                  : 'bg-gray-50 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${getRoleColor(msg.user.role)}`}>
                  {msg.user.displayName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900 text-sm">
                      {msg.user.displayName}
                    </span>
                    {msg.user.role === 'host' && (
                      <span className="px-1.5 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-700 rounded">Host</span>
                    )}
                    {pinnedMessageId === msg.id && (
                      <Pin className="w-3 h-3 text-indigo-500" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600 break-words">{msg.content}</p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handlePin(msg.id)}
                  className={`p-1.5 rounded-lg transition ${
                    pinnedMessageId === msg.id
                      ? 'bg-indigo-100 text-indigo-600'
                      : 'bg-white text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 shadow-sm'
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
                  className="p-1.5 rounded-lg bg-white text-gray-400 hover:text-red-500 hover:bg-red-50 shadow-sm transition"
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
      <div className="p-4 border-t border-gray-100 bg-gray-50">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Send a message as host..."
            className="flex-1 bg-white border border-gray-200 text-gray-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            maxLength={500}
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim()}
            className="p-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
