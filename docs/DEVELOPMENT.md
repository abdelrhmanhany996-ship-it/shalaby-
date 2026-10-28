# دليل التطوير والنشر

| الفرع | الرابط | الغرض |
|---|---|---|
| `main` | https://shalaby.engsaber.space | النسخة المعتمدة (Production). لا يُدفع عليها مباشرة. |
| `dev` | https://dev-shalaby.engsaber.space | بيئة التطوير والتجربة. كل شغل جديد يمر منها. |
| `test` | https://test-shalaby.engsaber.space | بيئة تجريبية بمشروع Firebase منفصل `shalaby-test` (قاعدة بيانات وحسابات دخول منفصلة). |

## قاعدة الشغل
1. اشتغل على `dev` (أو على فرع قصير يتفرع منها مثل `feature/اسم-الميزة`).
2. أي `push` على `dev` يبني المشروع ويرفعه تلقائيًا على موقع dev بعد نجاح `lint` و`test` و`build`.
3. جرّب على موقع dev، واتفقوا إن التعديل تمام.
4. افتح Pull Request من `dev` إلى `main`، وبعد المراجعة اعمل Merge.
5. الـ Merge على `main` يرفع تلقائيًا على موقع الإنتاج.

لا تدفع مباشرة على `main`، ولا تعمل `force push` على أي من الفرعين.

## الأوامر
```bash
bun install --frozen-lockfile   # التثبيت (الملف المرجعي bun.lock)
bun run dev                     # تشغيل محلي على :3000
bun run lint                    # فحص الأنواع
bun run test                    # الاختبارات
bun run build                   # بناء dist
```

## النشر التلقائي (GitHub Actions)
الملف: `.github/workflows/deploy.yml`. الـ Pull Request يشغّل الفحوصات فقط ولا ينشر.

يحتاج هذه الـ Secrets في GitHub (Settings ← Secrets and variables ← Actions):
`FTP_SERVER` و`FTP_USERNAME` و`FTP_PASSWORD` (حساب FTP من لوحة Hostinger).

مسار كل موقع على الاستضافة يُضبط في `deploy.yml` (`SERVER_DIR_MAIN` و`SERVER_DIR_DEV`).

## ملاحظات
- Firebase: بيئتا dev وmain تستخدمان نفس مشروع `shalaby-group` حاليًا، فأي بيانات تُدخل من dev تظهر في الإنتاج. يُفضّل مشروع Firebase منفصل لـ dev.
- قواعد Firestore في `firestore.rules` تُنشر يدويًا من Firebase Console.
- راجع `docs/roles-and-permissions.md` قبل أي تغيير في الصلاحيات.

## بيئة التجربة (test)
- مشروع Firebase مستقل `shalaby-test` (Firestore + Auth). السبب: قاعدة ثانية داخل `shalaby-group` تتطلب خطة Blaze.
- الإعداد في `firebase-applet-config.test.json`، ويُختار وقت البناء عبر `VITE_APP_ENV=test` (يضبطها `deploy.yml` لفرع `test` فقط). `main` و`dev` يبقيان على الإعداد الأصلي.
- القاعدة تبدأ فارغة: أول دخول على موقع test يعرض شاشة «الإعداد لأول مرة» لإنشاء حساب المطوّر.
- قواعد Firestore تُنشر على المشروعين بشكل منفصل (`firebase deploy --only firestore --project shalaby-test`).
- خدمة `api/admin.php` تحتاج `crm-firebase-admin.json` خاص بمشروع test إن أردت استخدامها هناك.

## ترتيب الرفع (test ← dev ← main)
1. ارفع على `test` وجرّب على https://test-shalaby.engsaber.space.
2. بعد التأكد، ادمج `test` في `dev`: لن يُنشر `dev` إلا إذا كان الكود مطابقًا لـ`test`.
3. بعد التأكد على dev، افتح PR من `dev` إلى `main`: لن يُنشر `main` إلا إذا كان مطابقًا لـ`dev`، وينتظر موافقتك على بيئة `production` (فعّل Required reviewers من GitHub ← Settings ← Environments ← production).
النطاقات تبقى على `engsaber.space`، و`dev` و`main` على قاعدة البيانات الأصلية.

## لوحات «إزاي الصفحة دي بتشتغل؟»
كل صفحة فيها شرح لقواعدها (قابل للطي) مصدره ملف واحد: `src/lib/pageGuides.ts`. الأرقام فيه (أيام المتابعة، ساعات التذكير، حدود الباقة…) مقروءة من نفس الثوابت اللي النظام شغال بيها، فبتتحدّث لوحدها.
- **أي تغيير في سلوك تلقائي** (متابعة جديدة بتتجدول، قاعدة تقييم، حد جديد) لازم يتحدّث في `pageGuides.ts` في نفس التعديل، وفي `tests/pageGuides.test.ts` لو ضفت رقم جديد.
- الثوابت المشتركة: `postSale.ts` و`notBought.ts` و`reviews.ts` و`referrals.ts` و`employeeRating.ts` و`reminders.ts` و`aiSuggestions.ts` و`license.ts`.
