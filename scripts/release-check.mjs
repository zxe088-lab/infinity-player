import fs from 'node:fs';
const app = JSON.parse(fs.readFileSync('app.json','utf8')).expo;
const errors=[];
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(app.extra?.supportEmail || '')) errors.push('أضف بريد دعم حقيقيًا في expo.extra.supportEmail');
try {if(new URL(app.extra?.privacyPolicyUrl).protocol!=='https:')throw 0;} catch {errors.push('أضف رابط سياسة خصوصية منشورة عبر HTTPS في expo.extra.privacyPolicyUrl');}
if(!app.extra?.eas?.projectId)errors.push('اربط المشروع بحساب Expo باستخدام eas init');
if(errors.length){console.error('متطلبات لم تكتمل قبل التقديم:\n'+errors.map(e=>'• '+e).join('\n'));process.exitCode=1;}
else console.log('الإعدادات الأساسية موجودة. يلزم أيضًا اختبار جهاز حقيقي ومراجعة الحقوق وإفصاحات آبل.');
