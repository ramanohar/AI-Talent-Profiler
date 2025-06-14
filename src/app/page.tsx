'use client';

import { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '@/types';
import { UserCircleIcon } from '@heroicons/react/20/solid';

// Helper function to format assistant responses
const formatAssistantResponse = (content: string): string => {
  // Simple regex to find lines starting with '- ' followed by a name and a colon
  const candidateMatchRegex = /^- ([^:]+): /;
  return content.split('\n').map(line => {
    const match = line.match(candidateMatchRegex);
    if (match && match[1]) {
      const name = match[1];
      // Replace the matched part with bolded name
      return line.replace(candidateMatchRegex, `- **${name}**: `);
    }
    return line; // Return other lines unchanged
  }).join('\n');
};

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: new Date().toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }), isSystem: true },
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
    inputRef.current?.focus();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: ChatMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    inputRef.current?.focus();

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const assistantMessage: ChatMessage = data.assistantMessage;

      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request.' + (error instanceof Error ? ` (${error.message})` : ''),
        isError: true,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-100 flex flex-col justify-center items-center">
      <div className="container mx-auto px-4 flex-1 flex flex-col justify-center items-center">
        <div className="max-w-4xl w-full mx-auto bg-white rounded-lg shadow-lg overflow-hidden flex flex-col h-[90vh]">
          {/* Header */}
          <div className="bg-blue-600 text-white p-4">
            <h1 className="text-xl font-semibold">AI Talent Profiler Assistant</h1>
            <p className="text-sm text-blue-100">Ask me about project requirements and I'll find the best matches</p>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 flex flex-col" style={{scrollbarGutter: 'stable'}}>
            {/* Conditional Welcome Message */}
            {messages.filter(msg => msg && msg.role === 'user').length === 0 ? (
              <div className="flex items-center justify-center flex-grow">
                <div className="text-center text-gray-500">
                  <p className="text-lg font-medium">Welcome! 👋</p>
                  <p className="text-sm">Ask me to find the best employee for your project requirements.</p>
                  <p className="text-sm mt-2">Example prompts:</p>
                  <ul className="text-sm list-disc list-inside">
                    <li>Find a senior full-stack developer skilled in React and Node.js.</li>
                    <li>I need a project manager for a healthcare project starting next month.</li>
                    <li>Who is available with expertise in AWS and Docker?</li>
                  </ul>
                </div>
              </div>
            ) : (
              messages.map((message, index) => {
                if (!message || !message.role) {
                  return null;
                }
                const isUser = message.role === 'user';
                return (
                  <div
                    key={index}
                    className={`flex ${isUser ? 'justify-end' : 'justify-start'} w-full`}
                  >
                    <div className={`flex items-end gap-2 max-w-2xl w-full ${isUser ? 'flex-row-reverse' : ''}`}>
                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        {isUser ? (
                          <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold shadow">U</div>
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center text-blue-700 font-bold shadow">A</div>
                        )}
                      </div>
                      {/* Bubble */}
                      <div
                        className={`rounded-2xl p-4 shadow ${isUser
                          ? 'bg-blue-500 text-white rounded-br-md'
                          : message.isError
                            ? 'bg-red-200 text-red-800 rounded-bl-md'
                            : 'bg-white text-gray-800 border border-gray-200 rounded-bl-md'}
                          whitespace-pre-line break-words w-full`}
                        style={{ wordBreak: 'break-word' }}
                      >
                        <p className="font-semibold mb-1">{isUser ? 'You' : 'Assistant'}:</p>
                        {message.role === 'assistant' ? (
                          <div dangerouslySetInnerHTML={{ __html: message.content }} />
                        ) : (
                          <p>{message.content}</p>
                        )}
                        {message.isError && (
                          <p className="text-xs text-red-600 mt-1">Error: {message.content}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            {/* Loading Indicator */}
            {loading && (
              <div className="flex justify-start w-full">
                <div className="flex items-end gap-2 max-w-2xl w-full">
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center text-blue-700 font-bold shadow">A</div>
                  </div>
                  <div className="rounded-2xl p-4 shadow bg-white text-gray-800 border border-gray-200 rounded-bl-md w-full flex items-center gap-2">
                    <span className="font-semibold">Assistant:</span>
                    <span className="animate-pulse">Typing...</span>
                    <svg className="animate-spin h-5 w-5 text-blue-500 ml-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="border-t p-4 bg-white flex items-center gap-3">
            <div className="h-10 w-10 flex items-center justify-center text-blue-600 text-2xl font-semibold flex-shrink-0 cursor-pointer">
              +
            </div>
            <form onSubmit={handleSubmit} className="flex-1 flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="e.g. Find a React developer in Europe, or ask how candidates are scored..."
                className="flex-1 p-3 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-100"
                disabled={loading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    handleSubmit(e);
                  }
                }}
                ref={inputRef}
              />
              <button
                type="submit"
                className="bg-blue-600 text-white p-3 rounded-full hover:bg-blue-700 transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading || !input.trim()}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
} 