import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AiTool, BillingCycle } from '../../types';
import { 
  X, Check, ChevronRight, ChevronLeft, Sparkles, 
  CreditCard, Calendar, Users, Bell, ArrowRight, Bot,
  Send, Link, Wallet as WalletIcon, ShieldCheck, UserCheck
} from 'lucide-react';
import { AI_CATALOG, CatalogTool, findCatalogTool } from '../../data/aiCatalog';
import { ToolIcon } from '../shared/ToolIcon';
import { currencyCode, formatEgp, toEgp } from '../../utils/money';

export const AddSubscriptionModal: React.FC = () => {
  const { 
    isAddWizardOpen, 
    setIsAddWizardOpen, 
    aiTools, 
    users, 
    teams,
    subscriptions,
    currentUser,
    walletBalanceEgp,
    exchangeRates,
    addSubscription,
    addAiTool,
    t, 
    dir 
  } = useApp();

  const [step, setStep] = useState(1);

  // Step 1: Program Chatbox / Selector
  const [selectedTool, setSelectedTool] = useState<AiTool | null>(aiTools[0] || null);
  const [selectedCatalog, setSelectedCatalog] = useState<CatalogTool | null>(null);
  const [isCustomTool, setIsCustomTool] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [customToolName, setCustomToolName] = useState('');

  // Step 2: Plan System & Duration / Expiry Date
  const [planType, setPlanType] = useState<'Individual' | 'Team' | 'Family' | 'Enterprise'>('Team');
  const [planName, setPlanName] = useState('Pro / Team');
  const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().substring(0, 10));
  const [renewalDate, setRenewalDate] = useState<string>(() => {
    const next = new Date();
    next.setMonth(next.getMonth() + 1);
    return next.toISOString().substring(0, 10);
  });
  const [durationMonths, setDurationMonths] = useState<number>(1);

  // Step 3: Cost, Currency & Payment Link
  const [cost, setCost] = useState<number>(20);
  const [currency, setCurrency] = useState<'USD' | 'EGP' | 'EUR' | 'SAR'>('USD');
  const [paymentUrl, setPaymentUrl] = useState('');

  // Step 4: Payment System (Visa / Wallet)
  const [paymentMethodType, setPaymentMethodType] = useState<'visa' | 'wallet' | 'transfer'>('visa');
  // Visa details
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  // Wallet details
  const [walletPhone, setWalletPhone] = useState('');

  // Step 5: Account Email & Target Audience Role (Multi-select)
  const [accountEmail, setAccountEmail] = useState('');
  const [accountError, setAccountError] = useState('');
  const [pickerCategory, setPickerCategory] = useState<string>('All');

  type ProgramChoice =
    | { kind: 'tool'; key: string; name: string; provider: string; category: string; tool: AiTool }
    | { kind: 'catalog'; key: string; name: string; provider: string; category: string; catalog: CatalogTool };

  // Tools already in the workspace first, then every catalog program not added yet
  const coveredCatalogNames = new Set(aiTools.map((tl) => findCatalogTool(tl.name)?.name).filter(Boolean));
  const allChoices: ProgramChoice[] = [
    ...aiTools.map((tl): ProgramChoice => ({ kind: 'tool', key: tl.id, name: tl.name, provider: tl.provider, category: tl.category, tool: tl })),
    ...AI_CATALOG.filter((c) => !coveredCatalogNames.has(c.name)).map((c): ProgramChoice => ({
      kind: 'catalog', key: `catalog-${c.name}`, name: c.name, provider: c.provider, category: c.category, catalog: c
    })),
  ];
  const typed = isCustomTool ? chatInput.trim().toLowerCase() : '';
  const programChoices = allChoices.filter((c) =>
    (pickerCategory === 'All' || c.category === pickerCategory) &&
    (!typed || c.name.toLowerCase().includes(typed) || c.provider.toLowerCase().includes(typed))
  );
  const selectedProgramName = selectedCatalog?.name || selectedTool?.name || '';

  const knownAccounts = Array.from(
    new Set(subscriptions.map((s) => s.ownerEmail).filter((e): e is string => !!e))
  );
  const [targetRoles, setTargetRoles] = useState<string[]>(['Developer', 'Sales']);
  const [selectedTeamId, setSelectedTeamId] = useState(teams[0]?.id || 'team-dev');

  const toggleTargetRole = (role: string) => {
    if (targetRoles.includes(role)) {
      if (targetRoles.length > 1) {
        setTargetRoles(targetRoles.filter(r => r !== role));
      }
    } else {
      setTargetRoles([...targetRoles, role]);
    }
  };

  const [isSuccess, setIsSuccess] = useState(false);

  if (!isAddWizardOpen) return null;

  // Handle Program Selection via Chatbox
  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const matched = aiTools.find(t => t.name.toLowerCase().includes(chatInput.trim().toLowerCase()));
    const catalogMatch = matched ? undefined : findCatalogTool(chatInput);
    if (matched) {
      setSelectedTool(matched);
      setSelectedCatalog(null);
      setIsCustomTool(false);
      setCustomToolName('');
    } else if (catalogMatch) {
      setSelectedCatalog(catalogMatch);
      setSelectedTool(null);
      setIsCustomTool(false);
      setCustomToolName('');
      setChatInput(catalogMatch.name);
    } else {
      setSelectedCatalog(null);
      setIsCustomTool(true);
      setCustomToolName(chatInput.trim());
      setSelectedTool(null);
    }
  };

  const handleNextStep = () => {
    if (step < 5) {
      setStep(step + 1);
    } else {
      // Final submission
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(accountEmail.trim())) {
        setAccountError('اكتب إيميل الأكونت المسجل عليه الاشتراك بشكل صحيح');
        return;
      }
      setAccountError('');
      // A catalog or custom program becomes a tool only once the subscription is actually saved
      let toolId = selectedTool?.id || '';
      let toolName = selectedTool?.name || 'برنامج مخصص';
      let provider = selectedTool?.provider || 'AI Provider';
      if (isCustomTool && customToolName.trim()) {
        toolName = customToolName.trim();
        provider = 'Custom Provider';
        const existing = aiTools.find((tl) => tl.name.toLowerCase() === toolName.toLowerCase());
        toolId = existing?.id || addAiTool({
          name: toolName,
          provider: 'Custom AI Provider',
          category: 'Chat & Writing',
          logo: '✨',
          badgeColor: '#6366f1',
          description: 'برنامج ذكاء اصطناعي مخصص',
          subscriptionsCount: 1,
          usersCount: 1,
          monthlySpending: Number(cost)
        });
      } else if (selectedCatalog) {
        toolName = selectedCatalog.name;
        provider = selectedCatalog.provider;
        const existing = aiTools.find((tl) => findCatalogTool(tl.name)?.name === selectedCatalog.name);
        toolId = existing?.id || addAiTool({
          name: selectedCatalog.name,
          provider: selectedCatalog.provider,
          category: selectedCatalog.category,
          logo: selectedCatalog.emoji,
          badgeColor: '#6366f1',
          description: selectedCatalog.description,
          subscriptionsCount: 1,
          usersCount: 1,
          monthlySpending: Number(cost),
          websiteUrl: `https://${selectedCatalog.domain}`
        });
      }
      const teamObj = teams.find(tm => tm.id === selectedTeamId);

      // Construct payment method summary
      let finalPaymentMethodStr = 'فيزا ائتمانية';
      if (paymentMethodType === 'visa') {
        const last4 = cardNumber ? cardNumber.slice(-4) : '4242';
        finalPaymentMethodStr = `بطاقة فيزا (•••• ${last4})`;
      } else if (paymentMethodType === 'wallet') {
        finalPaymentMethodStr = `محفظة إلكترونية (${walletPhone || 'فودافون كاش'})`;
      } else {
        finalPaymentMethodStr = 'تحويل بنكي / مباشر';
      }

      addSubscription({
        toolId: toolId || 'tool-custom-' + Date.now(),
        toolName,
        provider,
        planName: `${planName}`,
        planType,
        cost: Number(cost),
        currency: currency === 'USD' ? '$' : currency === 'EGP' ? 'ج.م' : currency,
        billingCycle: durationMonths >= 12 ? 'Yearly' : 'Monthly',
        ownerId: currentUser?.id || '',
        ownerName: `${targetRoles.join(', ')} (${accountEmail.trim().split('@')[0]})`,
        ownerEmail: accountEmail.trim().toLowerCase(),
        teamId: selectedTeamId,
        teamName: teamObj?.name || 'Development',
        assignedUserIds: [],
        startDate: startDate || new Date().toISOString().substring(0, 10),
        renewalDate: renewalDate || new Date().toISOString().substring(0, 10),
        paymentMethod: finalPaymentMethodStr,
        paymentUrl,
        autoRenewal: true,
        status: 'Active',
        reminders: { d30: true, d14: true, d7: true, d2: true, d1: true },
        notes: `Roles: ${targetRoles.join(', ')} · Account: ${accountEmail}`
      });

      setIsSuccess(true);
    }
  };

  const handleClose = () => {
    setIsAddWizardOpen(false);
    setStep(1);
    setIsSuccess(false);
    setAccountEmail('');
    setAccountError('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>إضافة اشتراك برنامج جديد</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
              {!isSuccess ? `الخطوة ${step} من 5: ${
                step === 1 ? 'اختيار البرنامج الشات بوكس' :
                step === 2 ? 'نظام الاشتراك والمدة' :
                step === 3 ? 'المبلغ، العملة ورابط الدفع' :
                step === 4 ? 'طريقة الدفع وبياناتها' : 'الأكونت المسجل والفئة المستهدفة'
              }` : 'تمت إضافة الاشتراك بنجاح'}
            </p>
          </div>

          <button
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Progress Line */}
        {!isSuccess && (
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 flex">
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                className={`flex-1 h-full transition-all duration-300 ${
                  s <= step ? 'bg-indigo-600' : 'bg-transparent'
                }`}
              />
            ))}
          </div>
        )}

        {/* Content Canvas */}
        <div className="p-6 overflow-y-auto flex-1 text-slate-900 dark:text-slate-100">
          {isSuccess ? (
            /* Success State */
            <div className="py-8 flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center shadow-lg ring-4 ring-emerald-50 dark:ring-emerald-900/30">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">تمت إضافة الاشتراك بنجاح!</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md leading-relaxed">
                تم تسجيل كافة تفاصيل اشتراك البرنامج، طريقة الدفع، والمدة المحددة بنجاح مع تفعيل التنبيهات المدرسية.
              </p>

              <div className="w-full max-w-md p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800 text-start space-y-2 mt-4 text-xs font-medium">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">البرنامج:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{isCustomTool ? customToolName : selectedProgramName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">المدة والنوع:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{durationMonths} شهر ({planType})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">المبلغ والعملة:</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono">{cost} {currency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">الأدوار المستهدفة:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{targetRoles.join(', ')} ({accountEmail})</span>
                </div>
              </div>

              <button
                onClick={handleClose}
                className="mt-6 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
              >
                إغلاق والعودة للاشتراكات
              </button>
            </div>
          ) : (
            <>
              {/* STEP 1: Interactive Chatbox & Program Selection */}
              {step === 1 && (
                <div className="space-y-5">
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                      اختر أو اكتب اسم البرنامج من خلال الشات بوكس:
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      يمكنك اختيار أحد البرامج الشائعة بالأسفل أو كتابة اسم البرنامج مباشرة في صندوق الشات وسيقوم النظام بتحديده.
                    </p>
                  </div>

                  {/* Interactive Chatbox Input */}
                  <form onSubmit={handleChatSubmit} className="p-3 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center gap-2">
                    <Bot className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => {
                        setChatInput(e.target.value);
                        if (e.target.value.trim()) {
                          setIsCustomTool(true);
                          setSelectedCatalog(null);
                          setCustomToolName(e.target.value.trim());
                        }
                      }}
                      placeholder="اكتب اسم البرنامج هنا (مثال: ChatGPT, Claude, Cursor, Midjourney, أو أي برنامج آخر)..."
                      className="flex-1 bg-transparent border-none text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors shrink-0 flex items-center gap-1.5"
                    >
                      <span>تأكيد</span>
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>

                  {/* Program Chips / Selection Grid */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                        كل برامج الذكاء الاصطناعي ({programChoices.length}):
                      </span>
                      <div className="flex items-center gap-1 overflow-x-auto">
                        {(['All', 'Chat & Writing', 'Coding', 'Image & Video', 'Workflow & Agents', 'Search & Knowledge'] as const).map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setPickerCategory(cat)}
                            className={`px-2 py-1 text-[10px] font-bold rounded-lg whitespace-nowrap transition-colors ${
                              pickerCategory === cat ? 'bg-indigo-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            {cat === 'All' ? 'الكل' : cat}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5 max-h-72 overflow-y-auto p-1">
                      {programChoices.map((choice) => {
                        const isSelected = choice.kind === 'tool'
                          ? !isCustomTool && !selectedCatalog && selectedTool?.id === choice.tool.id
                          : !isCustomTool && selectedCatalog?.name === choice.catalog.name;
                        return (
                          <button
                            key={choice.key}
                            type="button"
                            title={`${choice.name} — ${choice.provider}`}
                            onClick={() => {
                              if (choice.kind === 'tool') {
                                setSelectedTool(choice.tool);
                                setSelectedCatalog(null);
                              } else {
                                setSelectedCatalog(choice.catalog);
                                setSelectedTool(null);
                              }
                              setIsCustomTool(false);
                              setCustomToolName('');
                              setChatInput(choice.name);
                            }}
                            className={`p-2.5 rounded-2xl border flex flex-col items-center text-center gap-1 transition-all ${
                              isSelected
                                ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 ring-2 ring-indigo-600/30'
                                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:border-slate-300'
                            }`}
                          >
                            <ToolIcon name={choice.name} fallback={choice.kind === 'tool' ? choice.tool.logo : undefined} size={28} />
                            <span className="text-[11px] font-extrabold text-slate-900 dark:text-white leading-tight line-clamp-1">{choice.name}</span>
                            <span className="text-[9px] text-slate-400 line-clamp-1">{choice.provider}</span>
                          </button>
                        );
                      })}

                      {/* Other Custom Program Option */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomTool(true);
                          setSelectedTool(null);
                          setSelectedCatalog(null);
                          setCustomToolName(chatInput || 'برنامج آخر');
                        }}
                        className={`p-3.5 rounded-2xl border flex flex-col items-center justify-center text-center gap-1.5 transition-all ${
                          isCustomTool
                            ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 ring-2 ring-indigo-600/30'
                            : 'border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 hover:border-indigo-500'
                        }`}
                      >
                        <Sparkles className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                        <span className="text-xs font-extrabold text-slate-900 dark:text-white">أخرى (برنامج مخصص)</span>
                      </button>
                    </div>
                  </div>

                  {/* Selected Active Display Banner */}
                  <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isCustomTool ? (
                        <span className="text-2xl">✨</span>
                      ) : (
                        <ToolIcon name={selectedProgramName} fallback={selectedTool?.logo} size={32} />
                      )}
                      <div>
                        <span className="text-[10px] text-indigo-600 dark:text-indigo-300 font-bold block">البرنامج المحدد حالياً:</span>
                        <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                          {isCustomTool ? (customToolName || 'برنامج آخر مخصص') : selectedProgramName}
                        </span>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-indigo-600 text-white rounded-lg text-[10px] font-bold">
                      تم الاختيار بنجاح
                    </span>
                  </div>
                </div>
              )}

              {/* STEP 2: Plan System & Duration (المدة والنظام) */}
              {step === 2 && (
                <div className="space-y-5">
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                      اختر نظام الاشتراك والمدة الزمنية المطلوبة:
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      حدد نوع الخطة (فردي، فريق، عائلي، أو تجاري) ومدة صلاحية الاشتراك.
                    </p>
                  </div>

                  {/* Plan System Type */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">نظام الاشتراك / نوع الخطة *</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {[
                        { id: 'Individual', label: 'فردي (Individual)', desc: 'مستخدم واحد' },
                        { id: 'Team', label: 'فريق (Team)', desc: 'فرق وأقسام' },
                        { id: 'Family', label: 'عائلي (Family)', desc: 'مجموعة مشتركة' },
                        { id: 'Enterprise', label: 'مؤسسي (Enterprise)', desc: 'خصائص متقدمة' }
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setPlanType(item.id as any)}
                          className={`p-3 rounded-2xl border text-start transition-all ${
                            planType === item.id
                              ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 ring-2 ring-indigo-600/30'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60'
                          }`}
                        >
                          <span className="text-xs font-extrabold text-slate-900 dark:text-white block">{item.label}</span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">{item.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Start Date & Expiry Date Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">تاريخ بداية الاشتراك (Start Date)</label>
                      <div className="relative">
                        <Calendar className="w-4 h-4 text-slate-400 absolute start-3 top-3 pointer-events-none" />
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => {
                            setStartDate(e.target.value);
                          }}
                          className="w-full ps-9 pe-3 py-2.5 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:border-indigo-600 font-bold font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        تاريخ انتهاء الاشتراك / التجديد (Expiry Date) *
                      </label>
                      <div className="relative">
                        <Calendar className="w-4 h-4 text-indigo-500 absolute start-3 top-3 pointer-events-none" />
                        <input
                          type="date"
                          value={renewalDate}
                          onChange={(e) => setRenewalDate(e.target.value)}
                          className="w-full ps-9 pe-3 py-2.5 text-xs border-2 border-indigo-500/80 bg-indigo-50/30 dark:bg-indigo-950/30 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:border-indigo-600 font-bold font-mono shadow-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Duration Fast Selection (اختيار سريع للمدة بالأشهر) */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">اختيار سريع للمدة (يحسب التاريخ تلقائياً) *</label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                      {[
                        { months: 1, label: 'شهر واحد' },
                        { months: 3, label: '3 أشهر' },
                        { months: 6, label: '6 أشهر' },
                        { months: 12, label: '12 شهر (سنة)' },
                        { months: 18, label: '18 شهر' }
                      ].map((d) => (
                        <button
                          key={d.months}
                          type="button"
                          onClick={() => {
                            setDurationMonths(d.months);
                            const base = new Date(startDate || Date.now());
                            base.setMonth(base.getMonth() + d.months);
                            setRenewalDate(base.toISOString().substring(0, 10));
                          }}
                          className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                            durationMonths === d.months
                              ? 'border-indigo-600 bg-indigo-600 text-white font-extrabold shadow-md'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-bold hover:border-slate-300'
                          }`}
                        >
                          <span className="text-xs block">{d.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">اسم الخطة التوضيحي</label>
                    <input
                      type="text"
                      value={planName}
                      onChange={(e) => setPlanName(e.target.value)}
                      placeholder="مثال: Plus, Pro, Business, Advanced"
                      className="w-full px-3.5 py-2.5 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:border-indigo-600 font-bold"
                    />
                  </div>
                </div>
              )}

              {/* STEP 3: Cost, Currency & Payment Link */}
              {step === 3 && (
                <div className="space-y-5">
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                      أدخل المبلغ، العملة، ورابط صفحة الفوترة:
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      حدد القيمة المالية المطلوبة ورابط الدفع المباشر للخدمة.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">المبلغ المطلوب *</label>
                      <input
                        type="number"
                        value={cost}
                        onChange={(e) => setCost(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:border-indigo-600 font-mono font-extrabold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">العملة *</label>
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value as any)}
                        className="w-full px-3.5 py-2.5 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl font-bold"
                      >
                        <option value="USD">دولار أمريكي (USD $)</option>
                        <option value="EGP">جنيه مصري (EGP ج.م)</option>
                        <option value="EUR">يورو (EUR €)</option>
                        <option value="SAR">ريال سعودي (SAR)</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">رابط صفحة الدفع / الموقغ (Payment Link)</label>
                      <div className="relative">
                        <Link className="w-4 h-4 text-slate-400 absolute start-3.5 top-3" />
                        <input
                          type="url"
                          value={paymentUrl}
                          onChange={(e) => setPaymentUrl(e.target.value)}
                          placeholder="https://chatgpt.com/billing أو رابط صفحة الدفع..."
                          className="w-full ps-10 pe-4 py-2.5 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:border-indigo-600 font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* What this subscription does to the wallet */}
                  {(() => {
                    const costEgp = toEgp(Number(cost) || 0, currency, exchangeRates);
                    const after = walletBalanceEgp - costEgp;
                    return (
                      <div className={`p-3.5 rounded-2xl border text-xs space-y-1 ${after < 0 ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900' : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900'}`}>
                        {currencyCode(currency) !== 'EGP' && (
                          <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">المبلغ بالجنيه</span><b className="font-mono text-slate-900 dark:text-white">{formatEgp(costEgp)}</b></div>
                        )}
                        <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">رصيد المحفظة الحالي</span><b className="font-mono text-slate-900 dark:text-white">{formatEgp(walletBalanceEgp)}</b></div>
                        <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">الرصيد بعد خصم الاشتراك</span><b className={`font-mono ${after < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{formatEgp(after)}</b></div>
                        {after < 0 && <p className="text-[11px] font-bold text-red-600 dark:text-red-400 pt-1">الرصيد مش كفاية — هيتسجل الاشتراك والرصيد هيبقى بالسالب. ضيف مبلغ من "محفظة الاشتراكات".</p>}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* STEP 4: Payment System & Details (فيزا أو محفظة) */}
              {step === 4 && (
                <div className="space-y-5">
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                      اختر طريقة الدفع وأدخل بياناتها:
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      عند اختيار بطاقة فيزا تفتح صفحة بيانات الكارت، وعند اختيار المحفظة أدخل رقم المحفظة الإلكترونية.
                    </p>
                  </div>

                  {/* Payment Method Selector */}
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMethodType('visa')}
                      className={`p-3.5 rounded-2xl border flex flex-col items-center text-center gap-1.5 transition-all ${
                        paymentMethodType === 'visa'
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 ring-2 ring-indigo-600/30'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60'
                      }`}
                    >
                      <CreditCard className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white">بطاقة فيزا / كارت</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethodType('wallet')}
                      className={`p-3.5 rounded-2xl border flex flex-col items-center text-center gap-1.5 transition-all ${
                        paymentMethodType === 'wallet'
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 ring-2 ring-indigo-600/30'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60'
                      }`}
                    >
                      <WalletIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white">محفظة إلكترونية</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethodType('transfer')}
                      className={`p-3.5 rounded-2xl border flex flex-col items-center text-center gap-1.5 transition-all ${
                        paymentMethodType === 'transfer'
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 ring-2 ring-indigo-600/30'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60'
                      }`}
                    >
                      <ShieldCheck className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white">تحويل مباشر</span>
                    </button>
                  </div>

                  {/* Visa Card Details Form */}
                  {paymentMethodType === 'visa' && (
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 animate-in fade-in">
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white block">إضافة بيانات الكارت والفيزا:</span>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">رقم بطاقة الفيزا</label>
                        <input
                          type="text"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          placeholder="4242 •••• •••• 4242"
                          className="w-full px-3.5 py-2 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl font-mono focus:outline-none focus:border-indigo-600"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">تاريخ الانتهاء (MM/YY)</label>
                          <input
                            type="text"
                            value={cardExpiry}
                            onChange={(e) => setCardExpiry(e.target.value)}
                            placeholder="12/28"
                            className="w-full px-3.5 py-2 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl font-mono focus:outline-none focus:border-indigo-600"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">رمز الأمان (CVC)</label>
                          <input
                            type="password"
                            value={cardCvc}
                            onChange={(e) => setCardCvc(e.target.value)}
                            placeholder="•••"
                            className="w-full px-3.5 py-2 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl font-mono focus:outline-none focus:border-indigo-600"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Wallet Number Form */}
                  {paymentMethodType === 'wallet' && (
                    <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800 space-y-3 animate-in fade-in">
                      <span className="text-xs font-extrabold text-emerald-900 dark:text-emerald-200 block">بيانات المحفظة الإلكترونية:</span>
                      <div>
                        <label className="block text-[11px] font-bold text-emerald-800 dark:text-emerald-300 mb-1">رقم المحفظة (فودافون كاش / StcPay / Instapay)</label>
                        <input
                          type="tel"
                          value={walletPhone}
                          onChange={(e) => setWalletPhone(e.target.value)}
                          placeholder="01012345678"
                          className="w-full px-3.5 py-2 text-xs border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl font-mono font-bold focus:outline-none focus:border-emerald-600"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 5: Registered Account Email & Target Audience Role */}
              {step === 5 && (
                <div className="space-y-5">
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                      الأكونت المسجل واختيار الفئة المستهدفة للاشتراك:
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      حدد بريد الحساب المسجل عليه الخدمة والتخصص الموجه له هذا الاشتراك.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">الأكونت/البريد المسجل عليه الاشتراك *</label>
                    <input
                      type="email"
                      required
                      autoFocus
                      dir="ltr"
                      list="known-subscription-accounts"
                      value={accountEmail}
                      onChange={(e) => {
                        setAccountEmail(e.target.value);
                        if (accountError) setAccountError('');
                      }}
                      placeholder="اكتب إيميل الأكونت، مثال: openai-sales@sabergroup.ai"
                      aria-invalid={!!accountError}
                      className={`w-full px-3.5 py-2.5 text-xs border bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:outline-none font-bold font-mono ${
                        accountError ? 'border-red-500 focus:border-red-500' : 'border-slate-300 dark:border-slate-700 focus:border-indigo-600'
                      }`}
                    />
                    <datalist id="known-subscription-accounts">
                      {knownAccounts.map((acc) => (
                        <option key={acc} value={acc} />
                      ))}
                    </datalist>
                    {accountError && (
                      <p className="text-[11px] font-bold text-red-600 mt-1">{accountError}</p>
                    )}
                    {knownAccounts.length > 0 && (
                      <div className="mt-2">
                        <span className="text-[10px] text-slate-400 block mb-1">أو اختر أكونت مسجل قبل كده:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {knownAccounts.slice(0, 6).map((acc) => (
                            <button
                              key={acc}
                              type="button"
                              onClick={() => {
                                setAccountEmail(acc);
                                setAccountError('');
                              }}
                              className={`px-2 py-1 text-[10px] font-mono font-bold rounded-lg border transition-colors ${
                                accountEmail === acc
                                  ? 'bg-indigo-600 border-indigo-600 text-white'
                                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-400'
                              }`}
                            >
                              {acc}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Target Audience Roles (Manager, Sales, Developer, Trainer, Designer - English & Multi-select) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        الفئات / الأدوار المستهدفة (يمكن اختيار أكثر من فئة) *
                      </label>
                      <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                        تم تحديد {targetRoles.length} فئات
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                      {[
                        { role: 'Manager', icon: '👔' },
                        { role: 'Sales', icon: '💼' },
                        { role: 'Developer', icon: '💻' },
                        { role: 'Trainer', icon: '🎓' },
                        { role: 'Designer', icon: '🎨' }
                      ].map((item) => {
                        const isSelected = targetRoles.includes(item.role);
                        return (
                          <button
                            key={item.role}
                            type="button"
                            onClick={() => toggleTargetRole(item.role)}
                            className={`p-3 rounded-2xl border text-center transition-all relative ${
                              isSelected
                                ? 'border-indigo-600 bg-indigo-600 text-white font-extrabold shadow-md ring-2 ring-indigo-600/30'
                                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-bold hover:border-slate-300'
                            }`}
                          >
                            <span className="text-base block mb-0.5">{item.icon}</span>
                            <span className="text-xs block">{item.role}</span>
                            {isSelected && (
                              <div className="absolute top-1.5 end-1.5 w-4 h-4 bg-white text-indigo-600 rounded-full flex items-center justify-center">
                                <Check className="w-3 h-3 stroke-[3]" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">الفريق المسؤول بالشركة</label>
                    <select
                      value={selectedTeamId}
                      onChange={(e) => setSelectedTeamId(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl font-bold"
                    >
                      {teams.map((tm) => (
                        <option key={tm.id} value={tm.id}>
                          {tm.name} ({tm.memberCount} أعضاء)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer Controls */}
        {!isSuccess && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors flex items-center gap-1"
              >
                {dir === 'rtl' ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                <span>السابق</span>
              </button>
            ) : (
              <div />
            )}

            <button
              type="button"
              onClick={handleNextStep}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <span>{step === 5 ? 'حفظ وتأكيد الاشتراك النهائي' : 'التالي'}</span>
              {dir === 'rtl' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
