import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  Send,
  Bot,
  User,
  ArrowRight,
  TrendingDown,
  AlertTriangle,
  Boxes,
  ClipboardList,
  RefreshCw,
  Lightbulb,
  ExternalLink,
} from 'lucide-react';
import intelligenceService from '../services/intelligence';
import { CopilotQueryResponse, CopilotDataCard } from '../types/intelligence';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  timestamp: string;
  text: string;
  dataCards?: CopilotDataCard[];
  actionLink?: string;
  actionLabel?: string;
}

export const Copilot: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initial welcome message
    const welcomeMsg: ChatMessage = {
      id: 'welcome',
      sender: 'assistant',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: `Hello! I am your **StockSense AI Inventory Copilot**.\n\nI am connected directly to your live warehouse SQLite database, double-entry stock ledger, and predictive algorithms.\n\nAsk me read-only analytics questions, or pick one of the recommended starter queries below!`,
    };
    setMessages([welcomeMsg]);

    // Load suggested prompts
    intelligenceService.getCopilotSuggestedPrompts().then((prompts) => {
      setSuggestedPrompts(prompts);
    });
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || inputValue;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: textToSend.trim(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response: CopilotQueryResponse = await intelligenceService.queryCopilot(textToSend);
      const assistantMsg: ChatMessage = {
        id: `asst-${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: response.summary,
        dataCards: response.data_cards,
        actionLink: response.action_link,
        actionLabel: response.action_label,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error('Copilot query error:', err);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: 'Sorry, I encountered an issue querying the inventory database. Please ensure the backend server is operational.',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] max-w-6xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              AI Inventory Copilot
              <span className="text-[10px] font-semibold tracking-wider uppercase text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                Live Database Active
              </span>
            </h1>
            <p className="text-xs text-slate-500">
              Deterministic real-time intelligence assistant powered by live inventory state
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            const welcomeMsg: ChatMessage = {
              id: `welcome-${Date.now()}`,
              sender: 'assistant',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              text: `Conversation reset. How can I assist you with your inventory analytics?`,
            };
            setMessages([welcomeMsg]);
          }}
          className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Clear Chat
        </button>
      </div>

      {/* Suggested Quick Prompt Chips */}
      {suggestedPrompts.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 shrink-0 no-scrollbar">
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1 shrink-0 pl-1">
            <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
            Quick Prompts:
          </span>
          {suggestedPrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(prompt)}
              disabled={isLoading}
              className="text-xs font-medium text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50/70 border border-slate-200 hover:border-indigo-200 px-3 py-1.5 rounded-full whitespace-nowrap transition shadow-sm disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Chat Messages Stream */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 overflow-y-auto space-y-4">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-white text-xs ${
                  isUser
                    ? 'bg-slate-800'
                    : 'bg-gradient-to-tr from-indigo-600 to-indigo-500 shadow-sm shadow-indigo-600/20'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Content */}
              <div
                className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed ${
                  isUser
                    ? 'bg-indigo-600 text-white rounded-tr-none'
                    : 'bg-slate-50 border border-slate-200/80 text-slate-800 rounded-tl-none shadow-sm'
                }`}
              >
                {/* Header info */}
                <div
                  className={`text-[10px] mb-1 font-semibold ${
                    isUser ? 'text-indigo-200' : 'text-slate-400'
                  }`}
                >
                  {isUser ? 'You' : 'StockSense Copilot'} • {msg.timestamp}
                </div>

                {/* Text Body */}
                <div className="whitespace-pre-wrap font-sans space-y-2">
                  {msg.text.split('\n').map((line, i) => {
                    if (line.startsWith('### ')) {
                      return (
                        <h4 key={i} className="text-sm font-bold text-slate-900 mt-2 mb-1">
                          {line.replace('### ', '')}
                        </h4>
                      );
                    }
                    if (line.startsWith('- ')) {
                      return (
                        <div key={i} className="flex items-start gap-1.5 ml-2 text-xs text-slate-700">
                          <span className="text-indigo-500 font-bold">•</span>
                          <span>{line.replace('- ', '')}</span>
                        </div>
                      );
                    }
                    return line ? <p key={i}>{line}</p> : <div key={i} className="h-1" />;
                  })}
                </div>

                {/* Structured Data Cards (if any) */}
                {msg.dataCards && msg.dataCards.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-200/80 grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {msg.dataCards.map((card, cIdx) => (
                      <div
                        key={cIdx}
                        className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-1 hover:border-indigo-300 transition"
                      >
                        <div className="flex items-center justify-between">
                          <h5 className="font-semibold text-xs text-slate-900 truncate max-w-[200px]">
                            {card.title}
                          </h5>
                          {card.tag && (
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                card.tag === 'CRITICAL' || card.tag === 'HIGH'
                                  ? 'bg-rose-100 text-rose-700'
                                  : card.tag === 'WARNING'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-emerald-100 text-emerald-700'
                              }`}
                            >
                              {card.tag}
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-bold text-indigo-700">{card.metric}</div>
                        {card.detail && (
                          <p className="text-[11px] text-slate-500 leading-tight">{card.detail}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Deep-link Action Button */}
                {msg.actionLink && msg.actionLabel && (
                  <div className="mt-3 pt-2">
                    <Link
                      to={msg.actionLink}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-white hover:bg-indigo-50/50 px-3 py-1.5 rounded-lg border border-indigo-200 transition shadow-2xs"
                    >
                      <span>{msg.actionLabel}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white text-xs shrink-0 shadow-sm shadow-indigo-600/20">
              <Bot className="w-4 h-4 animate-pulse" />
            </div>
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl rounded-tl-none p-3.5 shadow-sm text-xs text-slate-500 flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
              <span>Analyzing live inventory database and evaluating mathematical models...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input Bar */}
      <div className="shrink-0 bg-white rounded-2xl border border-slate-200 shadow-sm p-2 flex items-center gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question about stock levels, reorder runway, pending operations, or anomalies..."
          className="flex-1 text-sm bg-transparent px-3 py-2 outline-none text-slate-800 placeholder-slate-400"
          disabled={isLoading}
        />
        <button
          onClick={() => handleSend()}
          disabled={!inputValue.trim() || isLoading}
          className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
          title="Send query"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Copilot;
