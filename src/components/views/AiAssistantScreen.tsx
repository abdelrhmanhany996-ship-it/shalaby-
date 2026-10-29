import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Bot, Send, Sparkles, Loader2, DollarSign, ShieldCheck, Zap } from 'lucide-react';

export const AiAssistantScreen: React.FC = () => {
  const { chatMessages, sendChatMessage, isAiChatLoading, subscriptions, optimizations, budgets, t } = useApp();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

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
    'ما هي التراخيص والمقاعد غير المستخدمة؟',
    'ما هي التجديدات القادمة هذا الأسبوع؟',
    'أين يمكننا توفير الميزانية؟',
    'أي فريق ينفق أكثر في الذكاء الاصطناعي؟'
  ];

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      <div>
        <h1 className="text-xl lg:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          المساعد الذكي للتحليل والأوتوماتيكية (AI Assistant)
        </h1>
        <p className="text-xs lg:text-sm text-slate-500 dark:text-slate-400 mt-1">
          مساعد متصل مباشرة ببيانات المنصة الحية لإجابتك الفورية وتوليد التوصيات والتقارير الماليّة.
        </p>
      </div>

      {/* Quick Insights Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-xs text-slate-400 block">إجمالي الإنفاق الحقيقي</span>
          <span className="text-xl font-mono font-extrabold text-indigo-600 dark:text-indigo-400">
            ${subscriptions.reduce((a, s) => a + s.cost, 0)}/mo
          </span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-xs text-slate-400 block">فرص التوفير المكتشفة</span>
          <span className="text-xl font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
            +${optimizations.reduce((a, o) => a + o.potentialSavingsMonthly, 0)}/mo
          </span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-xs text-slate-400 block">الميزانية الكلية المعتمدة</span>
          <span className="text-xl font-mono font-extrabold text-slate-900 dark:text-white">
            ${budgets.reduce((a, b) => a + b.monthlyBudget, 0)}/mo
          </span>
        </div>
      </div>

      {/* Main Chat Box Panel */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col h-[520px]">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">المساعد الذكي لمنصة Saber Group</h3>
              <span className="text-[11px] text-indigo-300">مربوط فورياً بقواعد البيانات والاشتراكات</span>
            </div>
          </div>
        </div>

        {/* Quick Prompts */}
        <div className="p-2.5 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex gap-2 overflow-x-auto text-xs">
          {sampleQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => sendChatMessage(q)}
              className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-xl whitespace-nowrap font-bold border border-slate-200 dark:border-slate-700 transition-colors shrink-0"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Messages List - HIGH CONTRAST CLEAR TEXT */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-50 dark:bg-slate-950">
          {chatMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.sender === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div
                className={`p-4 rounded-2xl max-w-[80%] text-xs leading-relaxed font-bold shadow-xs ${
                  msg.sender === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-none'
                    : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-bl-none'
                }`}
              >
                {msg.text}
              </div>
              <span className="text-[10px] text-slate-400 font-mono mt-1 px-1">
                {msg.timestamp}
              </span>
            </div>
          ))}

          {isAiChatLoading && (
            <div className="flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400 font-bold p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl w-fit">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>جاري استعلام النماذج وتحليل البيانات الفعلية...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Form - CRYSTAL CLEAR INPUT */}
        <form onSubmit={handleSend} className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="اسأل المساعد الذكي أي سؤال عن المصروفات أو التجديدات أو التراخيص..."
            className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 text-xs rounded-xl font-bold border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={!input.trim() || isAiChatLoading}
            className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition-colors flex items-center gap-2"
          >
            <span>إرسال</span>
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
