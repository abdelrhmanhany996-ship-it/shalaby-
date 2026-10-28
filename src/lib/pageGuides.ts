import { postSaleMilestones, milestoneSpan } from "./postSale";
import { unknownReasonFollowUpDays } from "./notBought";
import { REVIEW_REMINDER_HOURS, COMPLAINT_ESCALATION_HOURS } from "./reviews";
import { REFERRAL_FOLLOWUP_DAYS, REFERRAL_MIN_STARS } from "./referrals";
import { MIN_RATINGS_FOR_LEVEL, PRIOR_STARS, PRIOR_WEIGHT } from "./employeeRating";
import { REMINDER_WINDOW_DAYS } from "./reminders";
import { MAX_CHECKS_PER_DAY, NEARBY_FOLLOWUP_DAYS, RECENT_DAYS } from "./aiSuggestions";
import { DEFAULT_SUGGESTIONS_PER_DAY, type License } from "./license";

/**
 * The "how does this page work?" panels. Every number and every rule is read from the same constants the system
 * itself runs on, so these texts cannot drift away from what really happens.
 */
export type PageGuideId = "followups" | "visits" | "customers" | "addCustomer" | "purchases" | "feedback" | "brokers" | "reports" | "branches" | "staff";

export interface GuideItem {
  when: string;
  what: string;
  after?: string;
}
export interface PageGuideContent {
  title: string;
  items: GuideItem[];
}

const spans = () => postSaleMilestones.map(milestoneSpan).join("، ");
const days = (n: number) => (n === 1 ? "يوم" : n === 2 ? "يومين" : `${n} أيام`);

export function pageGuide(id: PageGuideId, license?: License): PageGuideContent {
  const perDay = license?.suggestionsPerDay ?? DEFAULT_SUGGESTIONS_PER_DAY;
  const maxBranches = license?.maxBranches;
  const maxUsers = license?.maxUsers;
  switch (id) {
    case "followups":
      return {
        title: "قواعد المتابعة التلقائية: السيستم بيجدول إيه لوحده؟",
        items: [
          { when: "أي عملية شراء (من زيارة أو من ملف العميل)", what: "متابعات بعد البيع: رضا العميل وترشيح. الشراء معناه إنه استلم", after: `بعد ${spans()} من الشراء` },
          { when: "«لسه ما اشترى» بسبب «مش عارف»", what: "سؤاله: إيه اللي خلاك ما كملتش؟", after: `بعد ${days(unknownReasonFollowUpDays)}` },
          { when: `عميل رشّح حد (بعد ${REFERRAL_MIN_STARS} أو 5 نجوم)`, what: "اتصال بالمرشَّح ومعاه اسم اللي رشّحه", after: `بعد ${days(REFERRAL_FOLLOWUP_DAYS)}` },
          { when: "زيارة اتسجلت", what: `تذكير تبعت طلب تقييم (يختفي لما يتبعت). بنحسب زيارات آخر ${REMINDER_WINDOW_DAYS} يوم`, after: "بعد الزيارة" },
          { when: "طلب تقييم ما اترد عليه", what: "تذكير واحد تبعته للعميل", after: `بعد ${REVIEW_REMINDER_HOURS} ساعة` },
          { when: "ملاحظة عميل فيها نية أو موعد مستقبلي ومفيش متابعة", what: `زكي بيقترح متابعة وأنت تقبلها أو تعدّلها أو ترفضها. بحد أقصى ${perDay} اقتراح في اليوم، بيقرا آخر ${RECENT_DAYS} يوم، وما بيقترحش لو عندك متابعة قريبة (${NEARBY_FOLLOWUP_DAYS} أيام)`, after: "حسب الاقتراح" },
        ],
      };
    case "visits":
      return {
        title: "إزاي بتتسجل الزيارة؟ وإيه اللي بيحصل بعدها",
        items: [
          { when: "تبدأ بالبحث", what: "بتدوّر على العميل أو الوسيط باسمه أو رقمه الأول. لو مش موجود بتسجله جديد، ولو الرقم موجود بيفتح الملف القديم" },
          { when: "نتيجة الزيارة (إجبارية)", what: "اشترى: بيتسجل الشراء بالقسم والمبلغ. لسه: بيتسجل السبب. استفسار فقط: من غير سبب" },
          { when: "اشترى", what: "بتتجدول لوحدها متابعات بعد البيع", after: `بعد ${spans()} من الشراء` },
          { when: "لسه بسبب «مش عارف»", what: "بتتجدول متابعة بسؤال للعميل", after: `بعد ${days(unknownReasonFollowUpDays)}` },
          { when: "بعد حفظ الزيارة", what: "زرار «إرسال التقييم» للعميل وللوسيط لو جه معاه: كل واحد بلينك خاص بيتسجل في ملفه" },
          { when: "ما بعتش التقييم", what: "بيطلع في «تذكيرات» في المتابعات لحد ما تبعته أو تدوس «تمت»" },
        ],
      };
    case "customers":
      return {
        title: "حالة العميل ومسؤوله: إيه اللي بيتغير لوحده؟",
        items: [
          { when: "تسجيل شراء", what: "حالة العميل بتبقى «اشترى» وبتفضل كده حتى لو زار تاني ولسه" },
          { when: "تحديد متابعة", what: "الحالة بتبقى «يحتاج متابعة» لو العميل لسه ما اشتراش" },
          { when: "تسجيل عميل جديد", what: "بيتنسب لمدير مبيعات الفرع، أو لك لو انت اللي بتسجل وبتبيع في الفرع ده" },
          { when: "رقم هاتف مسجل قبل كده", what: "النظام ما بيكررش العميل: بيفتح الملف الموجود" },
          { when: "ملف العميل", what: "فيه ملخص زكي: آخر تحديث وإزاي تتعامل معاه، وسجل كل التعاملات بالترتيب" },
          { when: "طلب تقييم اتبعت قبل كده", what: "الملف بيقولك، والزرار بيبقى «طلب تقييم جديد؟» عشان ما نبعتش مرتين" },
        ],
      };
    case "addCustomer":
      return {
        title: "إضافة عميل: إيه اللي بيحصل لوحده؟",
        items: [
          { when: "الرقم موجود", what: "النظام بيوقفك ويقولك تفتح الملف الموجود بدل التكرار" },
          { when: "اخترت وسيط", what: "بتبحث في المسجلين الأول، ولو مش موجود بتضيفه من نفس الخانة. مبيعات العميل بتتحسب للوسيط" },
          { when: "سجلت نتيجة (اشترى / لسه)", what: "الشراء بيتسجل ومعاه متابعات بعد البيع، والسبب بيتحفظ مع العميل" },
          { when: "بعد الحفظ", what: "تقدر تبعت لينك تقييم أو تحدد أول متابعة من نفس الشاشة" },
        ],
      };
    case "purchases":
      return {
        title: "المشتريات: إزاي بتشتغل؟",
        items: [
          { when: "أي شراء", what: "الشراء معناه إن العميل استلم، فمفيش خطوة «تسليم»" },
          { when: "أول ما الشراء يتسجل", what: "بتتجدول لوحدها متابعات بعد البيع", after: `بعد ${spans()} من الشراء` },
          { when: "شراء اتسجل متأخر", what: "المواعيد اللي فاتت بتتخطى، واللي قدام بس بيتجدول" },
          { when: "الأرقام فوق", what: "بتتبع الفلاتر اللي مختارها، وما بتحسبش العمليات الملغاة" },
        ],
      };
    case "feedback":
      return {
        title: "التقييمات والشكاوى: القواعد",
        items: [
          { when: "طلب تقييم", what: "لينك خاص بالعميل (أو الوسيط) على واتساب. التقييم من 1 لـ 5 والموظف اللي خدمه هو اللي بيتنسب له" },
          { when: `عدّت ${REVIEW_REMINDER_HOURS} ساعة ومفيش رد`, what: "بيظهر «محتاج تذكير» مرة واحدة، وبعد ما العميل يرد التذكير بيختفي" },
          { when: `${REFERRAL_MIN_STARS} أو 5 نجوم`, what: "العميل بيشوف خانة الترشيح. اللي أقل مش بنسأله عن ترشيح" },
          { when: "تقييم منخفض أو العميل قال إنها شكوى", what: "بتتحول لشكوى بتظهر لمدير الفرع", after: `لو عدّى ${COMPLAINT_ESCALATION_HOURS} ساعة من غير متابعة بتتصعّد للمدير العام` },
          { when: "تقييم الموظف", what: `كل موظف بيبدأ بـ ${PRIOR_WEIGHT} تقييمات افتراضية بـ ${PRIOR_STARS} نجوم بتتلاشى مع الحقيقية، وتحت ${MIN_RATINGS_FOR_LEVEL} تقييمات بيظهر «لسه بدري»` },
        ],
      };
    case "brokers":
      return {
        title: "الوسطاء: إزاي بيتحسبوا؟",
        items: [
          { when: "عميل جاي من وسيط", what: "كل مشترياته بتتحسب للوسيط في «حجم المبيعات»" },
          { when: "زيارة وسيط", what: "بتدوّر على الوسيط المسجل الأول، وتقدر تسجل زيارته من غير عميل" },
          { when: "بعد زيارة الوسيط", what: "تقدر تبعتله لينك تقييم، وتقييمه بيظهر على كارته هنا" },
          { when: "كل سيلز", what: "بيشوف وسطاء فرعه بس" },
        ],
      };
    case "reports":
      return {
        title: "تحميل التقارير: إزاي؟",
        items: [
          { when: "الفلاتر", what: "اختار الفترة والفرع، والأرقام داخل نطاق صلاحياتك بس" },
          { when: "التقارير الأساسية", what: "مرتبة بالأهمية: أداء الفروع، المتابعات المتأخرة، أسباب «لسه»، المبيعات حسب القسم، جهد السيلز، واقتراحات زكي" },
          { when: "التقارير الإضافية", what: "ملخص للطباعة وPDF، الوسطاء، تقييمات الموظفين، الشكاوى، الترشيحات، العملاء، وسجل العمليات" },
          { when: "الصيغة", what: "ملفات CSV بتتفتح في Excel بالعربي سليم" },
        ],
      };
    case "branches":
      return {
        title: "الفروع والباقة",
        items: [
          { when: "الباقة الحالية", what: maxBranches ? `بتسمح بـ ${maxBranches} فرع فعلي. الفروع التجريبية والمتوقفة مش بتتحسب` : "حد الفروع بيحدده المطوّر" },
          { when: "وصلت للحد", what: "زرار إضافة فرع بيتقفل برسالة، وللتوسعة كلّم المطوّر" },
          { when: "مدير المبيعات العام", what: "بيشوف كل الفروع، وأي فرع جديد بيدخل عنده لوحده" },
        ],
      };
    case "staff":
      return {
        title: "الموظفون والباقة",
        items: [
          { when: "الباقة الحالية", what: maxUsers ? `بتسمح بـ ${maxUsers} مستخدم. حساب المطوّر والتجريبيين والموقوفين مش بيتحسبوا` : "حد المستخدمين بيحدده المطوّر" },
          { when: "وصلت للحد", what: "زرار إضافة موظف بيتقفل، وتفعيل موقوف بيحتاج مكان فاضي" },
          { when: "كلمة المرور", what: "مؤقتة (8 حروف على الأقل) والموظف بيغيّرها في أول دخول، وإعادة التعيين من نفس الصفحة" },
        ],
      };
  }
}
