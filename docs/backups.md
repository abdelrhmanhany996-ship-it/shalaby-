# النسخ الاحتياطي اليومي (Google Cloud / Firebase)

المشروع: `shalaby-group`. الهدف: ألا تضيع أي بيانات.

## 1) المتطلب
فعّل فاتورة **Blaze** (Firebase Console ← Usage and billing). الجداول والاسترجاع ميزات مدفوعة، والتكلفة صغيرة لحجم البيانات هنا.

## 2) جدول نسخ يومي
Firebase Console ← Firestore Database ← **Disaster recovery** ← **Backup schedules** ← Create:
- Frequency: **Daily**
- Retention: **14 days** (أقصاه 14 أسبوع للجداول الأسبوعية)

أو بسطر واحد:
```
gcloud firestore backups schedules create --database='(default)' --recurrence=daily --retention=14d --project=shalaby-group
```

## 3) استرجاع لأي لحظة (PITR) وحماية الحذف
```
gcloud firestore databases update --database='(default)' --enable-pitr --delete-protection --project=shalaby-group
```
PITR يحفظ آخر 7 أيام بدقة الدقيقة.

## 4) تصدير إضافي للأمان (اختياري)
Bucket منفصل ثم تصدير أسبوعي:
```
gcloud firestore export gs://shalaby-group-backups/$(date +%F) --project=shalaby-group
```
ويمكن جدولته بـ Cloud Scheduler.

## 5) ما لا يغطيه Firestore
- **حسابات الدخول (Auth):** `firebase auth:export users.json --project shalaby-group` شهريًا.
- **Storage:** فعّل Object Versioning على الـ bucket.
- **الأسرار على السيرفر** (`crm-ai-secrets.php`, `crm-firebase-admin.json`): نسخة آمنة خارج Git.

## 6) تجربة الاسترجاع (مرة واحدة)
```
gcloud firestore databases restore --source-backup=<BACKUP_NAME> --destination-database=restore-test --project=shalaby-group
```
تأكد من العدّ، ثم احذف `restore-test`.

## 7) تنبيه تكلفة
Google Cloud ← Billing ← Budgets & alerts: حد شهري مناسب مع تنبيه عند 50% و90%.


## نقاط الاسترجاع واللقطة اللحظية
- **استرجاع لأي دقيقة خلال آخر 7 أيام (PITR):** فعّله مرة واحدة (الأمر في القسم 3). بعدها تقدر تعمل نسخة من قاعدة البيانات زي ما كانت في أي دقيقة:
  ```
  gcloud firestore databases clone --source-database='projects/shalaby-group/databases/(default)' --snapshot-time='2026-10-22T14:30:00Z' --destination-database='restore-2026-10-22-1430' --project=shalaby-group
  ```
  النتيجة قاعدة بيانات **جديدة** جنب الأصلية (مش بتكتب فوقها). تراجعها وتنقل منها اللي محتاجه، أو تحوّل التطبيق عليها.
- **لقطة لحظية قبل شغل خطر (تصدير):**
  ```
  gcloud firestore export gs://shalaby-group-backups/manual-$(date +%F-%H%M) --project=shalaby-group
  ```
  وبترجّعها بـ `gcloud firestore import`. اعملها قبل أي تحديث كبير أو حذف جماعي.
- **التكلفة التقريبية** (أسعار منطقة us-central1، والأسعار بتتغير وبتختلف حسب المنطقة، فراجع صفحة التسعير):
  - PITR: حوالي 0.15 دولار لكل جيجابايت في الشهر.
  - لقطات الجدول اليومي: حوالي 0.03 دولار لكل جيجابايت في الشهر.
  - الاستنساخ أو الاسترجاع: 0.20 دولار لكل جيجابايت، وقت ما تعمله بس.
  - التصدير: تكلفة قراءة المستندات (حوالي 0.06 دولار لكل 100 ألف مستند) + تخزين الملف.
  - لقاعدة بيانات CRM بحجم جيجابايت أو اتنين: مجموع ده كله في حدود دولار أو اتنين في الشهر.

## تفعيل زرار «نقطة استرجاع الآن» (قسم المطورين)
الزرار بيعمل تصدير كامل للبيانات في Cloud Storage عن طريق السيرفر (`api/admin.php`) بنفس مفتاح الخدمة `crm-firebase-admin.json`. للتفعيل مرة واحدة:
1. فعّل فاتورة **Blaze** على `shalaby-group`.
2. اعرف منطقة Firestore: `gcloud firestore databases describe --database='(default)' --project=shalaby-group --format='value(locationId)'`
3. اعمل bucket في **نفس المنطقة**: `gcloud storage buckets create gs://shalaby-group-backups --location=<المنطقة> --project=shalaby-group`
4. افتح `crm-firebase-admin.json` وخد قيمة `client_email` (إيميل مفتاح الخدمة، مش سر). بعدين:
   - `gcloud projects add-iam-policy-binding shalaby-group --member=serviceAccount:<client_email> --role=roles/datastore.importExportAdmin`
   - `gcloud storage buckets add-iam-policy-binding gs://shalaby-group-backups --member=serviceAccount:<client_email> --role=roles/storage.objectAdmin`
   - ولو التصدير رجّع «no_permission» جرّب كمان نفس صلاحية الـ bucket لحساب `shalaby-group@appspot.gserviceaccount.com`.
5. لو عايز bucket باسم تاني: ملف `crm-backup.json` جنب `crm-firebase-admin.json` فيه `{"bucket": "اسم-الـbucket"}`.
6. فعّل الاسترجاع لأي دقيقة: `gcloud firestore databases update --database='(default)' --enable-pitr --project=shalaby-group`
7. افتح قسم المطورين ← «نقاط الاسترجاع» ← «نقطة استرجاع الآن».
مفاتيح الخدمة بتفضل على السيرفر بس ومبتتبعتش لأي حد.
