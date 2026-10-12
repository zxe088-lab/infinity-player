# تجهيز نسخة آبل للنشر

حالة هذه الحزمة: كود نسخة جوال أولية بميزات تشغيل فعلية. ليست موافقة آبل ولا ضمانًا لها.

## قرارات التصميم

- هوية Infinity Player مستقلة، وأيقونة أصلية؛ لا نستخدم أصول Ibo أو شعارات مزوّدي المحتوى.
- المستخدم يضيف مصادره الخاصة. لا توجد روابط قنوات مسبقة أو توصيات بمزوّدي اشتراكات.
- فيديو المراجعة المحلي من إنتاج المشروع، وليس محتوى طرف ثالث.
- الشروط لا تُعفي الناشر من متطلبات الحقوق. جهّز دليل حق استخدام أي مصدر تختبره أو تعرضه للمراجعة.
- لا توجد مدفوعات أو تفعيل تجاري في هذه النسخة. لا تنفّذ رموز فتح مدفوعة للميزات لتجاوز قواعد المتجر.
- لا توجد حسابات لدى Infinity Player. حذف المصدر يمسح بياناته محليًا، ولا يحذف حساب المزوّد.
- لا توجد وظيفة مخفية أو واجهة خاصة للاحتيال على المراجعة. جميع الميزات المرسلة يجب أن تكون قابلة للفحص.

## بيانات يجب إكمالها

1. الاسم القانوني للناشر، وبريد الدعم الفعلي، ووسيلة بلاغات حقوق النشر.
2. نشر سياسة خصوصية تطابق التنفيذ، وإضافة عنوانها في App Store Connect وفي app.json، وتحديث تاريخها وهوية الناشر.
3. App Privacy وAge Rating بناءً على المصادر والاستخدام الحقيقي ومكتبات النسخة النهائية. لا تنسخ إفصاح Ibo.
4. صور شاشة حقيقية من التطبيق، ووصف يوضح أن رسوم المشغّل إن أُضيفت لا تشمل المحتوى.
5. اختيار معرّف الحزمة الصحيح، ربط EAS، التوقيع، ثم اختبار TestFlight على جهازين إن أمكن، مع iPad والاتجاه الأفقي.
6. تحديد متطلبات التشفير والإفصاح عنها بناءً على ما يستخدمه التطبيق؛ لم نضبط ITSAppUsesNonExemptEncryption تلقائيًا بافتراض إعفاء.
7. التحقق من متطلبات SDK/Xcode الحالية عند البناء. SDK 54 هو أساس الحزمة لمواءمة المشروع المرفق؛ قد يلزم تحديثه قبل التقديم وفق متطلبات آبل وقتها.

## اختبار قبل التقديم

- فيديو التجربة يعمل دون شبكة.
- اختبار مصدر مصرّح HTTPS، ثم HTTP مع الموافقة: تسجيل دخول، قناة HLS، فيلم، مسلسل وحلقة، ومسارات الصوت والترجمة.
- شبكة ضعيفة، رابط خاطئ، كلمة مرور خاطئة، اشتراك منتهٍ، قائمة فارغة وكبيرة.
- فتح/غلق المشغّل، تبديل المصادر، تكرار الضغط، الاتجاه الأفقي، وتكبير الخط.
- المفضلة والاستئناف بعد إعادة التشغيل، وحذف بيانات المصدر وجميع البيانات.
- التأكد من أن أدوات السجلات والدعم لا تحتوي كلمات مرور أو روابط موقّعة.

## ملاحظات للمراجع (تُحدّث بعد اختبار النسخة)

Infinity Player is a standalone media player. It does not supply or sell channels, playlists, or content subscriptions. Users may add their own authorized HTTP/HTTPS media sources (HTTP requires explicit per-source consent). All app features are available for review. The Home screen provides an original bundled ten-second playback sample. No Infinity Player account or purchase is required in this version. Source details are stored locally using the operating system's secure storage and can be deleted in Settings. Access to third-party sources is subject to the user's rights and the provider's terms. Provide additional authorized test source credentials securely in App Review notes if needed; do not publish them in the source repository.

## مرجع

https://developer.apple.com/app-store/review/guidelines/

تُراجع السياسات مجددًا عند التقديم، ولا يضمن اتباع هذه القائمة الموافقة.

## استثناء الشبكة في 1.0.1

يستخدم التطبيق NSAllowsArbitraryLoads لدعم عناوين HTTP التي يدخلها المستخدم، مع android:usesCleartextTraffic. لا نضيف استثناءً لنطاق مزوّد بعينه أو بيانات اشتراك ثابتة. يجب ذكر السبب في ملاحظات App Review؛ آبل قد تطلب تبريرًا وقد ترفضه. لا يكفي قبول المستخدم للتنبيه لضمان موافقة المتجر.

Suggested review explanation: Users enter their own media source URLs, including legacy HTTP sources with domains unknown at build time. HTTPS remains the default in application validation. HTTP is enabled only after a visible warning and explicit per-source consent. The transport exception is needed for the source API, playlist retrieval, and media playback; the app supplies no content sources.

https://developer.apple.com/documentation/bundleresources/information-property-list/nsapptransportsecurity/nsallowsarbitraryloads

## وصف وظائف النسخة 1.0.2 للمراجع

Infinity Player مشغّل وسائط مستقل. يشغّل ملفات فيديو يستوردها المستخدم، وروابط فيديو مباشرة، وقوائم M3U وحسابات Xtream التي يضيفها المستخدم بنفسه. لا يقدم التطبيق قنوات أو اشتراكات محتوى أو مزودين أو مدفوعات. يتضمن فيديو تجريبيًا محليًا أصليًا لاختبار المشغّل. جميع وظائف الاستيراد والبث ظاهرة للمراجع والمستخدم؛ لا توجد وظائف مخفية أو تغييرات بعد المراجعة.

بيانات المصادر والمفضلة والسجل تُحفظ محليًا في SecureStore. الملفات المستوردة تُحفظ في مساحة مستندات التطبيق؛ لا ينبغي وصف ملفات الفيديو بأنها مخزنة في SecureStore. عند HTTP غير المشفّر يظهر تنبيه صريح. يظل إثبات حقوق أي محتوى خارجي وتقديم بيانات الناشر واختبار الجهاز مسؤولية التحضير قبل التقديم.
