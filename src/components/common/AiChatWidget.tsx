import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Bot, Send, X, Sparkles, MessageSquare, Loader2 } from 'lucide-react';

export const AiChatWidget: React.FC = () => {
  const { chatMessages, sendChatMessage, isAiChatLoading, t } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isOpen]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isAiChatLoading) {
      const txt = input;
      setInput('');
      sendChatMessage(txt);
    }
  };

  const sampleQuestions = [
    'كم حجم إنفاقنا هذا الشهر؟',
    'ما هي التراخيص غير المستخدمة؟',
    'أي فريق ينفق أكثر في الذكاء الاصطناعي؟',
    'أين يمكننا توفير الميزانية؟'
  ];

  return (
    <div className="fixed bottom-20 end-5 z-40">
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-xs lg:text-sm rounded-2xl shadow-xl hover:shadow-2xl transition-all transform hover:scale-105 active:scale-95 group"
        >
          <Bot className="w-5 h-5 text-white animate-bounce" />
          <span className="font-bold">المساعد الذكي (AI Assistant)</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-white animate-pulse" />
        </button>
      )}

      {/* Floating Chat Panel */}
      {isOpen && (
        <div className="bg-white dark:bg-slate-900 w-80 sm:w-96 h-[500px] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white flex items-center justify-between border-b border-indigo-950">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-extrabold text-white">المساعد الذكي (AI Assistant)</h3>
                <span className="text-[10px] text-indigo-300">متصل ببيانات المنصة الحية 🟢</span>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-indigo-200 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Prompts */}
          <div className="p-2 bg-slate-100 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 flex gap-1.5 overflow-x-auto text-[10px]">
            {sampleQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => sendChatMessage(q)}
                className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg whitespace-nowrap font-medium border border-slate-200 dark:border-slate-700 transition-colors shrink-0"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Messages Area - CRYSTAL CLEAR CONTRAST */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50 dark:bg-slate-950">
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.sender === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`p-3 rounded-2xl max-w-[85%] text-xs leading-relaxed font-semibold shadow-xs ${
                    msg.sender === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-none'
                      : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-bl-none'
                  }`}
                >
                  {msg.text}
                </div>
                <span className="text-[9px] text-slate-400 font-mono mt-1 px-1">
                  {msg.timestamp}
                </span>
              </div>
            ))}

            {isAiChatLoading && (
              <div className="flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400 font-bold p-2 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl w-fit">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري تحليل بيانات المنصة...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Bar - HIGH CONTRAST CLEAR TEXT */}
          <form onSubmit={handleSend} className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="اكتب استفسارك هنا..."
              className="flex-1 px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 text-xs rounded-xl font-bold border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={!input.trim() || isAiChatLoading}
              className="p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl shadow-md transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
