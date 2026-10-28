const S = "STRING";
const branch = { type: S, description: "اسم الفرع أو جزء منه (اختياري)" };
const agent = { type: S, description: "اسم موظف المبيعات أو جزء منه (اختياري)" };
const limit = { type: "INTEGER", description: "أقصى عدد صفوف (الافتراضي 10، الحد 50)" };
const from = { type: S, description: "من تاريخ YYYY-MM-DD" };
const to = { type: S, description: "إلى تاريخ YYYY-MM-DD" };
const department = {
  type: S,
  description: "القسم: construction (الإنشائي والمقاولات) | decor (إدارة المبيعات) | garden (البستان واللاندسكيب) | general (خدمات أخرى)",
};
const obj = (properties: Record<string, unknown>, required: string[] = []) => ({ type: "OBJECT", properties, required });

/** Function declarations Zaki can call. Each one is executed in the browser against the user's own, live data. */
export const zakiTools = [
  { name: "overview", description: "أرقام عامة سريعة: عدد العملاء والمشترين، إجمالي المشتريات وتوزيعها على الأقسام، ونسبة الوسطاء، وحالة المتابعات.", parameters: obj({ branch }) },
  { name: "period_stats", description: "أرقام فترة محددة: عملاء جدد، زيارات، عمليات شراء وقيمتها حسب القسم، متابعات مكتملة، وأسباب عدم الشراء المسجلة. للمقارنة بين فترتين استدعها مرتين.", parameters: obj({ from, to, branch, agent }) },
  { name: "find_customers", description: "بحث وتصفية العملاء (بالاسم أو الهاتف أو الفرع أو الموظف أو الوسيط أو الحالة أو المصدر أو اشترى/لم يشترِ أو القسم) مع إجمالي مشترياتهم.", parameters: obj({ query: { type: S, description: "جزء من الاسم أو الهاتف" }, branch, agent, broker: { type: S, description: "اسم الوسيط" }, status: { type: S, description: "new|uncontacted|contacted|interested|prospect|needs_followup|not_interested|booked" }, source: { type: S, description: "facebook|instagram|google|walk_in|referral|phone_inquiry|whatsapp|exhibition|other" }, bought: { type: "BOOLEAN", description: "true = اشتروا، false = لم يشتروا" }, department, sortBy: { type: S, description: "total (الافتراضي) أو name" }, limit }) },
  { name: "get_customer", description: "ملف عميل واحد كامل: بياناته ومشترياته بالأقسام ومتابعاته وتقييمه وأسباب عدم الشراء وزياراته.", parameters: obj({ name: { type: S, description: "اسم العميل أو جزء منه" }, id: { type: S, description: "معرّف العميل لو معروف" } }) },
  { name: "top_customers", description: "ترتيب العملاء بإجمالي المشتريات، أو بالمشتريات من قسم معين (مثلاً أكتر ناس بتشتري بستان).", parameters: obj({ department, branch, limit }) },
  { name: "top_brokers", description: "ترتيب الوسطاء بإجمالي مشتريات العملاء اللي جابوهم، أو بقسم معين.", parameters: obj({ department, limit }) },
  { name: "get_broker", description: "ملف وسيط واحد: عملاؤه ومشترياتهم وتقسيمها بالأقسام.", parameters: obj({ name: { type: S, description: "اسم الوسيط أو جزء منه" } }, ["name"]) },
  { name: "list_followups", description: "المتابعات (المتأخرة أولًا) مع تصفية بالحالة overdue|due|upcoming|completed أو النوع sales|post_sale أو الموظف أو الفرع.", parameters: obj({ status: { type: S, description: "overdue|due|upcoming|completed" }, kind: { type: S, description: "sales أو post_sale" }, agent, branch, limit }) },
  { name: "list_purchases", description: "عمليات الشراء في فترة أو لعميل أو لقسم، مع الإجمالي وتوزيع الأقسام.", parameters: obj({ from, to, branch, department, customer: { type: S, description: "اسم العميل" }, limit }) },
  { name: "not_bought", description: "أسباب عدم الشراء المسجلة (عدد كل سبب، ونسبة «مش عارف»، وآخر الحالات) مع تصفية بفترة أو فرع أو موظف.", parameters: obj({ from, to, branch, agent, reason: { type: S, description: "price|comparing|competitor|unavailable|postponed|needs_approval|service|just_asking|other|unknown" } }) },
  { name: "feedback", description: "رأي العملاء: متوسط التقييم (عام والمكان والمعاملة والسعر) وتوزيع النجوم والتعليقات، مع إمكانية جلب التقييمات المنخفضة فقط.", parameters: obj({ branch, agent, maxStars: { type: "INTEGER", description: "أقصى عدد نجوم للتعليقات المعروضة (مثلاً 3 للتقييمات المنخفضة)" } }) },
  { name: "reviews", description: "تقييمات العملاء من لينك التقييم والشكاوى: نسبة الرد، المتوسط، عدد الشكاوى (جديدة/تحت المتابعة/اتحلّت/متأخرة +24 ساعة)، متوسط وقت الحل بالساعات، وقائمة التقييمات بتعليقاتها وآخر متابعة لكل شكوى.", parameters: obj({ only: { type: S, description: "all (كل التقييمات) | complaints | open_complaints | late (شكاوى من غير متابعة أكتر من 24 ساعة) | low (3 نجوم أو أقل)" }, branch, agent, from, to, limit }) },
  { name: "employee_ratings", description: "تقييم كل موظف من عملائه: التقييم (من 5)، عدد التقييمات، المستوى (ممتاز/كويس/محتاج تحسين/لسه بدري)، الشكاوى، نسبة رد العملاء، آخر 30 يوم والاتجاه. مرتّبين من الأعلى.", parameters: obj({ branch, agent, onlyRated: { type: "BOOLEAN", description: "true = الموظفين اللي لهم تقييمات فقط" }, limit }) },
  { name: "referrals", description: "العملاء اللي رشّحوا ناس لينا: كام واحد رشّحوا، كام اتواصلنا معاه، كام اشترى وبكام، وترشيحات لسه ما اتسجلتش.", parameters: obj({ branch, limit }) },
  { name: "performance", description: "مقارنة أداء الفروع أو الموظفين: العملاء والمشترين وإجمالي المشتريات والمتابعات المتأخرة والمكتملة.", parameters: obj({ group_by: { type: S, description: "branch (الافتراضي) أو agent" }, from, to, limit }) },
];

const month = { type: S, description: "الشهر YYYY-MM (الافتراضي الشهر الحالي)" };

/** Only offered to people who may see targets (their own are always visible to them through the same tool). */
export const targetsTool = {
  name: "employee_targets",
  description: "أهداف الموظفين الشهرية والإنجاز الفعلي: الهدف، المُنجَز، النسبة، المتبقي، النسبة المفروض يوصلها لحد النهارده، والحالة (حقّق/ماشي كويس/متأخر/ما حققش)، وعدد المتابعات المتأخرة عند كل موظف. للموظف العادي بترجع هدفه هو بس.",
  parameters: obj({ month, agent, branch, only: { type: S, description: "behind لعرض المتأخرين عن الهدف بس" }, limit }),
};

/** Only offered to people who may see the books. */
export const accountingTool = {
  name: "accounting",
  description: "الحسابات: إجمالي الإيرادات والمصروفات والصافي لفترة، وأرصدة الحسابات، وتوزيع الحركات على التصنيفات والمسؤولين. أرقام مسجّلة في دفتر الحسابات بس، وده مش نفس مشتريات العملاء.",
  parameters: obj({ from, to, type: { type: S, description: "income أو expense (اختياري)" }, category: { type: S, description: "اسم تصنيف أو جزء منه (اختياري)" }, limit }),
};

/** One employee in depth: the evidence behind "how is X doing and why". */
export const performanceTool = {
  name: "employee_performance",
  description: "أداء موظف واحد بالتفصيل: هدفه وإنجازه الشهر ده وآخر شهور (للمقارنة والاتجاه)، متابعاته (مفتوحة، متأخرة وبكام يوم، اتعملت آخر 30 يوم، اتأجلت كام مرة)، عملاؤه، مشترياته، وأسباب عدم الشراء المسجلة. استخدمها لأسئلة «أداء فلان» و«ليه أداءه نازل».",
  parameters: obj({ agent: { type: S, description: "اسم الموظف أو جزء منه" }, months: { type: "INTEGER", description: "عدد الشهور السابقة للمقارنة (الافتراضي 3، الحد 6)" } }, ["agent"]),
};

/** Who needs attention now: overdue follow-ups and interested customers nobody is following. */
export const attentionTool = {
  name: "attention_needed",
  description: "العملاء اللي محتاجين تدخل دلوقتي: متابعات متأخرة (بأيام التأخير والأولوية والمسؤول)، متابعات النهارده، وعملاء مهتمين مالهمش متابعة مفتوحة ومحدش كلمهم من 14 يوم أو أكتر. استخدمها لأسئلة «أركز على إيه النهارده» و«مين محتاج متابعة».",
  parameters: obj({ agent, limit }),
};

/** Tools for screens that were taken out of the simplified CRM: kept in code, no longer offered to the model. */
export const retiredTools = new Set(["top_brokers", "get_broker", "feedback", "reviews", "employee_ratings", "referrals"]);

/** The tool list for one user: the general tools, plus the ones their permissions open. */
export const zakiToolsFor = (access: { targets: boolean; accounts: boolean }) => [
  ...zakiTools.filter((t) => !retiredTools.has(t.name)),
  performanceTool,
  attentionTool,
  // Every salesperson may ask about their own target; managers get the team's.
  ...(access.targets ? [targetsTool] : []),
  ...(access.accounts ? [accountingTool] : []),
];

/** What Zaki "studied" about the system: the parts, the vocabulary and how to look things up. */
export const zakiGuide = `
خريطة النظام (اللي مذاكره شلبي):
- النظام مركّز على 4 حاجات: العملاء، المتابعات، أهداف الموظفين وأداءهم، وشلبي نفسه.
- العملاء: كل عميل له حالة (جديد، مهتم، فرصة بيع، اشترى...) وموظف مسؤول، وتاريخ آخر تواصل وملاحظات.
- المتابعات: لكل متابعة عميل وموظف مسؤول وموعد (تاريخ وساعة اختيارية) وأولوية (عالية/عادية/منخفضة) وحالة: متأخرة، النهارده، قادمة، اتعملت. التأجيل بيتسجل بسببه.
- المبيعات: كل عملية بيع لها قيمة بالجنيه وتاريخ وموظف. دي اللي بيتحسب منها إنجاز التارجت.
- الأهداف: كل موظف له هدف شهري بالجنيه. الإنجاز = قيمة مبيعاته في الشهر (من غير الملغي والمسترجع). الحالة: حقّق، ماشي كويس، متأخر (أقل من المفروض لحد النهارده حسب أيام الشهر)، ما حققش (الشهر خلص).
- أنت بتشوف نطاق صلاحيات اللي بيكلمك بس: المدير بيشوف فريقه، والموظف بيشوف نفسه وعملاءه.
طريقة الشغل:
- مش معاك بيانات جاهزة. لما تحتاج رقم أو اسم، استدعِ الأداة المناسبة (ممكن أكتر من أداة)، وبعد ما تاخد النتيجة جاوب.
- اختار أضيق أداة: التارجت والمتأخرين والأقرب للتحقيق ← employee_targets، أداء موظف وأسبابه ← employee_performance، أركز على إيه/مين محتاج متابعة ← attention_needed، قوائم المتابعات ← list_followups، عميل معين ← get_customer، بحث في العملاء ← find_customers، أسباب عدم الشراء ← not_bought، أرقام فترة ← period_stats، مقارنة الموظفين ← performance.
- لما تحلل أداء موظف: اربط الأرقام ببعض (الهدف، الإنجاز، المتابعات المتأخرة، التأجيل المتكرر، أسباب عدم الشراء). السبب المحتمل قوله بصيغة «ممكن» ووضّح إنه تفسير مش حقيقة، ومتفسرش لو البيانات ما تدعمش.
- أي توصية تتحط معاها الدليل (الأرقام والتواريخ من الأدوات) وخطوة عملية واحدة واضحة.
- لو الأداة رجّعت truncated=true قول إن فيه أكتر من اللي اتعرض. لو رجّعت ambiguous اسأل المستخدم يحدد مين المقصود. لو البيانات مش كفاية قول إيه اللي ناقص بالظبط.
- اللغة: رد بنفس لغة المستخدم. لو كتب إنجليزي رد إنجليزي، وإلا بالعامية المصرية المهذبة.
`;
