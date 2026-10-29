import React from 'react';
import { useApp } from '../../context/AppContext';
import { Zap, Bell, ShieldAlert, Check, Plus } from 'lucide-react';

export const AutomationScreen: React.FC = () => {
  const { automations, toggleAutomationRule, t } = useApp();

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      <div>
        <h1 className="text-xl lg:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          مركز الأتمتة والتنبيهات (Automation Center)
        </h1>
        <p className="text-xs lg:text-sm text-slate-500 dark:text-slate-400 mt-1">
          إعداد قواعد أتمتة الإشعارات والتذكيرات التلقائية باستخدام منطق الشرط الذكي (WHEN → IF → THEN).
        </p>
      </div>

      {/* Rules Grid */}
      <div className="space-y-4">
        {automations.map((rule) => (
          <div
            key={rule.id}
            className="p-5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3 hover:shadow-[0_0_25px_rgba(99,102,241,0.22)] hover:scale-[1.01] transition-all duration-300 ease-out"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">{rule.name}</h3>
                  <span className="text-[10px] text-slate-400 font-mono">تم التنفيذ {rule.triggerCount} مرة · آخر تنفيذ: {rule.lastExecuted || 'N/A'}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => toggleAutomationRule(rule.id)}
                className={`w-12 h-6 rounded-full transition-colors p-1 relative ${
                  rule.enabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    rule.enabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Workflow Logic Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-2">
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-800">
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold block uppercase">WHEN (الحدث)</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{rule.whenTrigger}</span>
              </div>

              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-800">
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold block uppercase">IF (الشرط)</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{rule.ifCondition}</span>
              </div>

              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-800">
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block uppercase">THEN (الإجراء)</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{rule.thenAction}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
