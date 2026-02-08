'use client';

import { useState, useRef, useEffect } from 'react';
import { useViewerStore } from '@/stores/viewerStore';
import { wsClient } from '@/lib/ws';
import { Send } from 'lucide-react';

export function ChatPanel() {
  const { messages, pinnedMessage, eventId } = useViewerStore();
  const [inputValue, setInputValue] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    setIsAuthenticated(!!token);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim() || !eventId) return;

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

  return (
    <div className="flex flex-col h-full bg-gray-800 rounded-lg">
      {/* Pinned message */}
      {pinnedMessage && (
        <div className="px-3 py-2 bg-primary-900/50 border-b border-gray-700">
          <div className="flex items-center gap-2 text-xs text-primary-400 mb-1">
            <span>📌</span>
            <span>{pinnedMessage.user.displayName}</span>
          </div>
          <p className="text-sm text-gray-200">{pinnedMessage.content}</p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.map((msg) => (
          <div key={msg.id} className="chat-message">
            <span
              className={`font-semibold ${
                msg.user.role === 'host'
                  ? 'text-primary-400'
                  : msg.user.role === 'moderator'
                  ? 'text-green-400'
                  : 'text-gray-300'
              }`}
            >
              {msg.user.displayName}:
            </span>{' '}
            <span className="text-gray-200">{msg.content}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-gray-700">
        {isAuthenticated ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
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
        ) : (
          <p className="text-center text-sm text-gray-400">
            <a href="/login" className="text-primary-400 hover:underline">
              Sign in
            </a>{' '}
            to chat
          </p>
        )}
      </div>
    </div>
  );
}
