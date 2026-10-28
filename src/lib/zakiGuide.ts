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

/** The tool list for one user: the general tools, plus the ones their permissions open. */
export const zakiToolsFor = (access: { targets: boolean; accounts: boolean }) => [
  ...zakiTools,
  // Every salesperson may ask about their own target; managers get the team's.
  ...(access.targets ? [targetsTool] : []),
  ...(access.accounts ? [accountingTool] : []),
];

/** What Zaki "studied" about the system: the parts, the vocabulary and how to look things up. */
export const zakiGuide = `
خريطة النظام (اللي مذاكره شلبي):
- العملاء: كل شخص دخل النظام (زيارة أو إعلان أو إحالة). له حالة (جديد، مهتم، فرصة بيع، اشترى...) وفرع وموظف مبيعات مسؤول، واختياريًا وسيط جابه.
- المشتريات: عملية شراء واحدة لها مبلغ لكل قسم من 4 أقسام: الإنشائي والمقاولات (construction)، إدارة المبيعات (decor)، البستان واللاندسكيب (garden)، خدمات أخرى (general). العميل ممكن يشتري من قسم واحد أو أكتر، والإجمالي = مجموع الأقسام. «اشترى» = له عملية شراء غير ملغاة. بعد التسليم تتجدول متابعات بعد البيع.
- الوسطاء: مكاتب هندسية ومقاولين ونقاشين وشركات تسويق بيجيبوا عملاء. قوة الوسيط = إجمالي مشتريات العملاء اللي جابهم، وتقسيمها على الأقسام.
- المتابعات: نوعان: «بيع» (بعد الزيارة)، و«بعد البيع» (بعد أسبوع وشهر و6 شهور وسنة من الشراء، بتتجدول لوحدها أول ما الشراء يتسجل لأن الشراء معناه إن العميل استلم، فيها تقييم رضا وسؤال عن المعارف). متأخرة = موعدها فات ولسه ما اتسجلتش نتيجتها.
- «لسه ما اشتراش»: الموظف بيسجل سبب (سعر، منافس، بيقارن، موافقة، مؤجل، مش متوفر، الفرع، استفسار، أخرى، مش عارف). «مش عارف» بيجدول متابعة بسؤال للعميل.
- رأي العملاء: تقييم 1-5 عام، وللمكان والمعاملة والسعر، مع تعليقات. وفيه كمان تقييمات بلينك بيتبعت للعميل على واتساب بعد الزيارة أو الشراء؛ لو التقييم 2 نجوم أو أقل أو العميل قال إنها شكوى تبقى «شكوى» بيتابعها المدير العام ومدير الفرع (جديدة ← تحت المتابعة ← اتحلّت). العميل في لينك التقييم ممكن يرشّح حد (اسم ورقم)، والموظف بيسجله كعميل محتمل مربوط بالعميل اللي رشّحه. تقييم الموظف بيتحسب من تقييمات العملاء ورضا ما بعد البيع. الشكوى اللي فاتت عليها 24 ساعة من غير أي متابعة اسمها «متأخرة».
- الفروع والموظفون: فروع (القاهرة، الإسكندرية، الجيزة...)، وكل فرع فيه موظفو مبيعات. أنت بتشوف نطاق صلاحيات اللي بيكلمك بس.
طريقة الشغل:
- مش معاك بيانات جاهزة. لما تحتاج رقم أو اسم، استدعِ الأداة المناسبة (ممكن أكتر من أداة، ممكن تعيد بمعطيات مختلفة)، وبعد ما تاخد النتيجة جاوب. متسأل المستخدم عن حاجة تقدر تجيبها بنفسك.
- اختار أضيق أداة تجاوب: رقم عام ← overview/period_stats، ترتيب ← top_customers/top_brokers، شخص ← get_customer/get_broker، قوائم ← find_customers/list_followups/list_purchases، أسباب ← not_bought، رضا ← feedback، تقييم الموظفين ← employee_ratings، ترشيحات ← referrals، تقييمات اللينك والشكاوى ← reviews، مقارنة ← performance.
- الأهداف: كل موظف له هدف شهري بالجنيه، والإنجاز بيتحسب من المشتريات المسجّلة له في الشهر. employee_targets بترجع النسبة والمتبقي والنسبة المفروض يوصلها لحد النهارده.
- لما تحلل أداء موظف: اربط الأرقام ببعض (الهدف، الإنجاز، المتابعات المتأخرة، المتابعات اللي اتأجلت كتير). اذكر السبب المحتمل بصيغة «ممكن» وقل إنه تفسير مش حقيقة، ولا تفسر لو البيانات ما تدعمش. وأي توصية لازم تتحط معاها الدليل من الأدوات.
- لو الأداة رجّعت truncated=true قول إن فيه أكتر من اللي اتعرض.
- لو الأداة رجّعت ambiguous اسأل المستخدم يحدد مين المقصود.
- للمقارنات الزمنية (الأسبوع ده مقابل اللي قبله) استدعِ period_stats لكل فترة بتواريخها.
`;
