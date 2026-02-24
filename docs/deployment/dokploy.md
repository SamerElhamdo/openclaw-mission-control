# تشغيل المشروع على Dokploy / Deploying on Dokploy

يمكنك تشغيل **openclaw-mission-control** بالكامل على [Dokploy](https://docs.dokploy.com) باستخدام Docker Compose. هذا الدليل يوضح الخطوات والإعداد المطلوب.

You can run **openclaw-mission-control** on [Dokploy](https://docs.dokploy.com) using Docker Compose. This guide covers the steps and required configuration.

---

## المتطلبات / Requirements

- خادم Dokploy يعمل مع إمكانية البناء من مصدر (Docker Compose mode، وليس Stack).
- مستودع Git للمشروع (GitHub / GitLab / Gitea / Bitbucket).
- دومين (اختياري) للواجهة الأمامية والـ API، أو استخدام العناوين التي يوفرها Dokploy.

---

## 1. إنشاء مشروع Docker Compose في Dokploy

1. في Dokploy: **Project** → إنشاء مشروع جديد أو اختيار مشروع موجود.
2. داخل المشروع: **Environment** → إضافة بيئة (مثلاً `production`).
3. داخل البيئة: **Docker Compose** → **Create Docker Compose**.
4. إعداد المصدر:
   - **Source**: Git (GitHub / GitLab / Gitea / Bitbucket).
   - **Repository**: رابط المستودع.
   - **Branch**: الفرع المراد نشره (مثلاً `main` أو `master`).
5. **Compose path**: استخدم `compose-dokploy.yaml` (مخصّص لـ Dokploy مع شبكة Traefik وتسميات الدومين) أو `compose.yml` (النسخة الأساسية).
6. اختر وضع **Docker Compose** (وليس Stack) لأن المشروع يستخدم `build` لـ backend و frontend.

---

## 2. متغيرات البيئة (Environment)

في تبويب **Environment** في Dokploy، أضف المتغيرات التالية. قيم الإنتاج يجب أن تُعيّن هنا (لا تعتمد على `.env.example` فقط).

انسخ من `.env.dokploy.example` أو `.env.example` وعدّل القيم حسب البيئة:

| Variable | وصف / Description | مثال إنتاج / Production example |
|----------|-------------------|----------------------------------|
| `POSTGRES_DB` | اسم قاعدة البيانات | `mission_control` |
| `POSTGRES_USER` | مستخدم PostgreSQL | `postgres` (أو مستخدم آمن) |
| `POSTGRES_PASSWORD` | كلمة مرور قوية | **يجب تغييرها** |
| `CORS_ORIGINS` | مصدر الواجهة الأمامية (لـ CORS) | `https://your-frontend-domain.com` |
| `NEXT_PUBLIC_API_URL` | عنوان الـ API الذي يتصل به المتصفح | `https://api.your-domain.com` أو عنوان الـ backend |
| `AUTH_MODE` | `local` أو `clerk` | `local` |
| `LOCAL_AUTH_TOKEN` | مطلوب عند `AUTH_MODE=local` (≥50 حرف) | سلسلة سرية قوية |
| `DB_AUTO_MIGRATE` | تشغيل migrations تلقائياً | `true` |

متغيرات اختيارية (لها قيم افتراضية في `compose.yml`):

- `FRONTEND_PORT`, `BACKEND_PORT`, `POSTGRES_PORT`, `REDIS_PORT`
- `RQ_QUEUE_NAME`, `RQ_DISPATCH_THROTTLE_SECONDS`, `RQ_DISPATCH_MAX_RETRIES`

**مهم:**  
- `NEXT_PUBLIC_API_URL` و `CORS_ORIGINS` يُستخدمان أثناء **بناء** الواجهة والاتصال من المتصفح؛ تأكد من تعيينهما قبل أول نشر.
- لا تضع أسراراً حقيقية في المستودع؛ استخدم فقط متغيرات البيئة في Dokploy.

---

## 3. النطاقات (Domains)

إذا استخدمت `compose-dokploy.yaml` مع إعداد الدومينات يدوياً، استبدل في ملف الـ Compose:
- `your-frontend-domain.com` → دومين الواجهة الأمامية
- `your-backend-domain.com` → دومين الـ API

بدلاً من ذلك، يمكنك استخدام **Dokploy Domains** من الواجهة (أبسط):

1. تبويب **Domains** لخدمة الـ Docker Compose.
2. إضافة دومين لخدمة **frontend** (المنفذ 3000).
3. إضافة دومين لخدمة **backend** (المنفذ 8000).

بعد ذلك حدّث في Environment:

- `NEXT_PUBLIC_API_URL` = عنوان الـ backend العام (مثلاً `https://api.yourdomain.com`).
- `CORS_ORIGINS` = عنوان الواجهة الأمامية (مثلاً `https://app.yourdomain.com`).

---

## 4. النشر (Deploy)

1. احفظ الإعدادات ثم **Deploy**.
2. Dokploy سيقوم بـ `git clone` ثم بناء الصور من ملف الـ Compose (`compose-dokploy.yaml` أو `compose.yml`):
   - **backend** و **webhook-worker** من `backend/Dockerfile` (context: جذر المستودع).
   - **frontend** من `frontend/Dockerfile`.
3. الخدمات: **db** (PostgreSQL)، **redis**، **backend**، **frontend**، **webhook-worker** ستعمل معاً.
4. البيانات: حجم `postgres_data` (named volume) يُحفظ بين عمليات النشر.

للنشرات التالية: استخدم **Redeploy** أو Webhook من Git عند الدفع إلى الفرع المحدد.

---

## 5. ملاحظات إضافية

- **البناء:** المشروع يستخدم `build` مع سياق من جذر المستودع لـ backend؛ لا تستخدم وضع Docker Stack إذا كان يدعم فقط الصور الجاهزة بدون بناء.
- **الأسرار:** لا ترفع ملف `.env` الحقيقي إلى Git؛ استخدم دائماً متغيرات البيئة في واجهة Dokploy.
- **السجلات والمراقبة:** يمكنك استخدام تبويبات Logs و Monitoring في Dokploy لكل خدمة على حدة.
- **النسخ الاحتياطي:** لحفظ بيانات PostgreSQL استخدم ميزة Volume Backups في Dokploy (تعمل مع named volumes مثل `postgres_data`).

---

## ملخص سريع (Quick checklist)

- [ ] مشروع Docker Compose في Dokploy مع مصدر Git ومسار `compose-dokploy.yaml` أو `compose.yml`.
- [ ] وضع Docker Compose (وليس Stack).
- [ ] تعيين جميع متغيرات البيئة المطلوبة (خصوصاً `POSTGRES_PASSWORD`, `LOCAL_AUTH_TOKEN`, `NEXT_PUBLIC_API_URL`, `CORS_ORIGINS`).
- [ ] (اختياري) إعداد Domains لـ frontend و backend وتحديث عناوين الـ API و CORS.
- [ ] تنفيذ Deploy والتحقق من عمل الواجهة والـ API والـ worker.

بعد ذلك يكون المشروع قابلاً للتشغيل بالكامل على Dokploy.
