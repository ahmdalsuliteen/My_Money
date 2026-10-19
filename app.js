/*
 =====================================================================
  فلوسي — تطبيق إدارة الأموال الشخصية (متعدد المستخدمين)
  ---------------------------------------------------------------------
  - كل شخص ينشئ حسابه (بريد/كلمة مرور أو Google) وتُحفظ بياناته في Firebase بمستند خاص فيه.
  - الخصوصية مضمونة بقواعد Firestore (لا تعتمد على الكود): ملف firestore.rules.

  إعداد Firebase (مرة واحدة):
   1) Authentication → Sign-in method → فعّل  Email/Password  و  Google
   2) Firestore Database → Create database
   3) Firestore → Rules → الصق محتوى ملف firestore.rules ثم Publish
   4) Authentication → Settings → Authorized domains → أضف:
        username.github.io   (لو GitHub Pages)   أو   your-app.vercel.app   (لو Vercel)
 =====================================================================
*/
(() => {
'use strict';
/* حماية من التضمين داخل إطار (Clickjacking) */
try{if(window.top!==window.self){document.documentElement.innerHTML='';window.top.location=window.self.location}}catch(e){document.documentElement.innerHTML=''}

/* ---------- إعدادات Firebase ---------- */
const firebaseConfig = {
  apiKey: "AIzaSyAPmC11T2NsaEne99I9H1NmgJCytl2Z2Ww",
  authDomain: "my-money-37f19.firebaseapp.com",
  projectId: "my-money-37f19",
  storageBucket: "my-money-37f19.firebasestorage.app",
  messagingSenderId: "702149546821",
  appId: "1:702149546821:web:197fa0b5b0d4402c5ca42c"
};

/* مفتاح reCAPTCHA v3 لـ Firebase App Check (اختياري — اتركه فاضي حتى تفعّله، راجع SECURITY.md) */
const APP_CHECK_SITE_KEY='';

/* ---------- ثوابت ---------- */
const TYPES = {
  income:{label:'دخل',icon:'💰',color:'var(--green)',sign:'+'},
  expense:{label:'مصروف',icon:'🛒',color:'var(--red)',sign:'-'},
  invest:{label:'استثمار',icon:'📈',color:'var(--blue)',sign:'-'},
  saving:{label:'ادخار',icon:'🏦',color:'var(--gold)',sign:'-'},
  debt:{label:'سداد دين',icon:'💳',color:'var(--orange)',sign:'-'}
};
const CATS = {
  income:[['راتب','💼'],['عمل حر','🧑‍💻'],['أرباح','📈'],['مكافأة','🏅'],['هدية','🎁'],['استرداد','↩️'],['أخرى','✨']],
  expense:[['طعام وشراب','🍔'],['مواصلات','🚗'],['فواتير','💡'],['إيجار','🏠'],['تسوق','🛍️'],['صحة','💊'],['ترفيه','🎮'],['تعليم','📚'],['عائلة','👨‍👩‍👧'],['اشتراكات','📱'],['ملابس','👕'],['بنزين','⛽'],['مصروف البيت','🧺'],['أخرى','📦']],
  invest:[['أسهم','📊'],['عقار','🏢'],['ذهب','🪙'],['عملات رقمية','₿'],['مشروع','🚀'],['صناديق','🧺'],['طويل الأجل','🌳'],['قصير الأجل','⚡'],['أخرى','📦']],
  saving:[['طوارئ','🛟'],['هدف','🎯'],['أمنيات','✨'],['عام','🏦']],
  debt:[['بطاقة ائتمانية','💳'],['قرض','🏛️'],['سلفة','🤝'],['تقسيط','🧾'],['دين بأقساط','📆'],['أخرى','📌']]
};
const FIXED_CATS=['إيجار','فواتير','اشتراكات'];
const NEEDS = ['إيجار','فواتير','مواصلات','صحة','تعليم','عائلة','طعام وشراب','بنزين','مصروف البيت'];
const KINDS={clothes:{l:'ملابس',type:'expense',cat:'ملابس'},fuel:{l:'بنزين',type:'expense',cat:'بنزين'},home:{l:'مصروف البيت',type:'expense',cat:'مصروف البيت'},emerg:{l:'طوارئ',type:'saving',cat:'طوارئ'},wishes:{l:'أمنيات',type:'saving',cat:'أمنيات'},long:{l:'استثمار طويل الأجل',type:'invest',cat:'طويل الأجل'},short:{l:'استثمار قصير الأجل',type:'invest',cat:'قصير الأجل'},other:{l:'مصروف آخر',type:'expense',cat:'أخرى'}};
const RULES = [[50,30,20],[60,20,20],[70,20,10],[50,20,30]];
const PAL = ['#8b6cff','#22d3ee','#2ee6a6','#ffc857','#ff5d7a','#ff9f5a','#4da3ff','#c084fc'];
const MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
const DAYS = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
const CURR = ['ر.س','د.إ','ر.ع','د.ك','ر.ق','د.ب','ج.م','$','€'];
const NAV = [['dash','🏠','الرئيسية'],['split','🧮','تقسيمتي'],['tx','🧾','المعاملات'],['bud','🎯','الميزانية'],['goal','🏆','الأهداف'],['inv','📈','الاستثمار'],['plan','🧠','الخطة'],['set','⚙️','الإعدادات']];
const TITLES = {dash:'لوحة التحكم',split:'تقسيمتي المالية',tx:'المعاملات',bud:'الميزانية والالتزامات',goal:'أهدافي',inv:'استثماراتي',plan:'خطتي المالية',set:'الإعدادات'};
const QUOTES = ['الادخار أولاً ثم الصرف — مو العكس 💡','اللي يتابع فلوسه، يملكها 💪','كل ريال تسجله هو قرار واعي 🎯','صندوق الطوارئ = ٣ إلى ٦ أشهر مصاريف 🛟','لا تستثمر في شي ما تفهمه 📚','الدين الصغير المتكرر أخطر من الكبير 👀','فرّق بين "أحتاج" و"أبغى" 🤔'];

/* ---------- أدوات ---------- */
const $ = (s,r=document)=>r.querySelector(s), $$ = (s,r=document)=>[...r.querySelectorAll(s)];
const esc = s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = ()=>Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-4);
const num = v=>{v=parseFloat(String(v??'').replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[٬,\s]/g,'').replace('٫','.'));return isFinite(v)?v:0};
const nf = new Intl.NumberFormat('en-US',{maximumFractionDigits:2});
const fmt = n=>nf.format(Math.round((n+Number.EPSILON)*100)/100);
const pad = n=>String(n).padStart(2,'0');
const todayISO = ()=>{const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`};
const mk = iso=>iso.slice(0,7);
const daysIn = k=>{const[y,m]=k.split('-').map(Number);return new Date(y,m,0).getDate()};
const mName = k=>{const[y,m]=k.split('-').map(Number);return MONTHS[m-1]+' '+y};
const nextKey = k=>{let[y,m]=k.split('-').map(Number);m++;if(m>12){m=1;y++}return `${y}-${pad(m)}`};
const prevKey = k=>{let[y,m]=k.split('-').map(Number);m--;if(m<1){m=12;y--}return `${y}-${pad(m)}`};
const fDate = iso=>{const[y,m,d]=iso.split('-').map(Number);return `${DAYS[new Date(y,m-1,d).getDay()]} ${d} ${MONTHS[m-1]}`};
const catList = type=>[...(CATS[type]||[]),...(((state.cats||{})[type])||[]).map(c=>[c.n,c.i])];
const catIcon = (type,cat)=>esc((catList(type).find(c=>c[0]===cat)||[0,TYPES[type]?.icon||'📌'])[1]);
const isNeed = c=>NEEDS.includes(c)||(((state.cats||{}).expense)||[]).some(k=>k.n===c&&k.need);
const EMOJIS=['🍕','☕','🛒','🧴','🐱','🎓','💄','🧸','🎁','🏋️','🎬','📱','💻','🚕','⛽','✈️','🏥','💊','🏠','🔧','👕','👟','🎮','📚','🍔','🥗','🛠️','💡','🌐','🎵','🧾','💍','🕌','🤝','🧳','🪙','📈','🏦','💳','🎯'];

/* ---------- الحالة ---------- */
const def = ()=>({v:2,updatedAt:0,settings:{name:'',currency:'ر.س',theme:(()=>{try{return matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'}catch(e){return'dark'}})(),expectedIncome:0,rule:0,onboarded:false,rem:{salaryDay:0,salaryLead:1,debtLead:2,notif:false}},months:{},budgets:{},recurring:[],goals:[],investments:[],cats:{expense:[],income:[],invest:[],saving:[],debt:[]},
  plan:{salary:0,deductDebt:false,allocs:[],utils:[],subs:[],
    rest:[],xsplit:[]},
  pm:{},debt:{name:'دين',total:0,inst:0,start:todayISO(),pay:[]},carry:[]});
function genDebt(total,inst,start,old){old=old||[];const out=[];let left=total,i=0;const [y,m,d]=start.split('-').map(Number);
  while(left>0.0001&&i<240){const a=Math.min(inst,left),dt=new Date(y,m-1+i,d);out.push({d:`${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}`,a,paid:!!(old[i]&&old[i].paid)});left-=a;i++}return out}
/* ---------- تنظيف وتحقق صارم من أي بيانات واردة (محلية / سحابية / ملف استيراد) ---------- */
const BAN=new Set(['__proto__','constructor','prototype','hasOwnProperty','toString','valueOf','__defineGetter__','__defineSetter__','__lookupGetter__','__lookupSetter__']);
const RE_ID=/^[A-Za-z0-9_-]{1,40}$/,RE_DATE=/^\d{4}-\d{2}-\d{2}$/,RE_MON=/^\d{4}-\d{2}$/,RE_PK=/^(?:salary|xin|(?:alloc|util|sub|rest|xs):[A-Za-z0-9_-]{1,40}|debt:\d{1,3})$/;
const cT=(v,n=60,fb='')=>{v=typeof v==='string'?v:typeof v==='number'?String(v):'';v=v.replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029<>`\\]/g,'').trim().slice(0,n);return v||fb};
const cN=(t,fb='أخرى')=>{const v=cT(t,40,fb);return BAN.has(v)?'_'+v:v};
const cNum=(v,lo=0,hi=1e12,fb=0)=>{v=+v;return Number.isFinite(v)?Math.min(hi,Math.max(lo,v)):fb};
const cId=v=>typeof v==='string'&&RE_ID.test(v)&&!BAN.has(v)?v:uid();
const cIcon=(v,fb)=>{v=typeof v==='string'?v.trim():'';return v&&v.length<=8&&/^[^\u0000-\u007f]+$/u.test(v)&&!/[<>&"'`]/.test(v)?v:fb};
const cDate=(v,fb='')=>{if(typeof v!=='string'||!RE_DATE.test(v))return fb;const [y,m,d]=v.split('-').map(Number),t=new Date(y,m-1,d);return t.getFullYear()===y&&t.getMonth()===m-1&&t.getDate()===d?v:fb};
const cArr=(a,max)=>Array.isArray(a)?a.slice(0,max):[];
const isObj=x=>x&&typeof x==='object'&&!Array.isArray(x);
function normalize(o){
  const d=def();o=isObj(o)?o:{};
  const S=isObj(o.settings)?o.settings:{},R=isObj(S.rem)?S.rem:{},out={v:2,updatedAt:cNum(o.updatedAt,0,8.64e15,0)};
  out.settings={name:cT(S.name,30),currency:CURR.includes(S.currency)?S.currency:d.settings.currency,theme:S.theme==='light'?'light':S.theme==='dark'?'dark':d.settings.theme,
    expectedIncome:cNum(S.expectedIncome),rule:Math.round(cNum(S.rule,0,RULES.length-1)),onboarded:!!S.onboarded,
    rem:{salaryDay:Math.round(cNum(R.salaryDay,0,31)),salaryLead:Math.round(cNum(R.salaryLead,0,7,1)),debtLead:Math.round(cNum(R.debtLead,0,30,2)),notif:!!R.notif}};
  out.months={};
  Object.entries(isObj(o.months)?o.months:{}).slice(0,240).forEach(([k,m])=>{
    if(!RE_MON.test(k)||!isObj(m))return;
    out.months[k]={opening:cNum(m.opening,-1e12,1e12),tx:cArr(m.tx,6000).filter(x=>isObj(x)&&typeof x.type==='string'&&Object.prototype.hasOwnProperty.call(TYPES,x.type)&&cDate(x.date)).map(x=>{
      const t={id:cId(x.id),type:x.type,cat:cN(x.cat),amount:cNum(x.amount),date:cDate(x.date),note:cT(x.note,200),ts:cNum(x.ts,0,8.64e15,Date.now())};
      if(typeof x.planKey==='string'&&RE_PK.test(x.planKey))t.planKey=x.planKey;if(x.rec)t.rec=1;if(typeof x.goalId==='string'&&RE_ID.test(x.goalId))t.goalId=x.goalId;return t})}});
  out.budgets={};Object.entries(isObj(o.budgets)?o.budgets:{}).slice(0,200).forEach(([k,v])=>{const n=cN(k,'');if(n){const x=cNum(v);if(x>0)out.budgets[n]=x}});
  out.recurring=cArr(o.recurring,200).filter(x=>isObj(x)&&Object.prototype.hasOwnProperty.call(TYPES,x.type)).map(x=>({id:cId(x.id),type:x.type,cat:cN(x.cat),amount:cNum(x.amount),note:cT(x.note,200),day:Math.round(cNum(x.day,1,31,1))}));
  out.goals=cArr(o.goals,100).filter(isObj).map(x=>({id:cId(x.id),emoji:cIcon(x.emoji,'🎯'),name:cT(x.name,60,'هدف'),target:cNum(x.target),saved:cNum(x.saved),deadline:cDate(x.deadline,'')}));
  out.investments=cArr(o.investments,200).filter(isObj).map(x=>({id:cId(x.id),name:cT(x.name,60,'استثمار'),type:cN(x.type),invested:cNum(x.invested),value:cNum(x.value),date:cDate(x.date,todayISO())}));
  out.cats={};Object.keys(TYPES).forEach(t=>{const src=isObj(o.cats)&&Array.isArray(o.cats[t])?o.cats[t]:[];out.cats[t]=src.slice(0,100).filter(c=>isObj(c)&&cT(c.n,40)).map(c=>({n:cN(c.n),i:cIcon(c.i,'🏷️'),need:t==='expense'&&!!c.need}))});
  const P=isObj(o.plan)?o.plan:{},kind=k=>typeof k==='string'&&Object.prototype.hasOwnProperty.call(KINDS,k)?k:'other';
  out.plan={salary:cNum(P.salary),deductDebt:!!P.deductDebt,
    allocs:cArr(P.allocs,100).filter(isObj).map(x=>({id:cId(x.id),name:cT(x.name,40,'بند'),bank:cT(x.bank,40,'—'),amount:cNum(x.amount),kind:kind(x.kind)})),
    utils:cArr(P.utils,50).filter(isObj).map(x=>({id:cId(x.id),name:cT(x.name,40,'فاتورة'),ic:cIcon(x.ic,'🧾')})),
    subs:cArr(P.subs,200).filter(isObj).map(x=>({id:cId(x.id),name:cT(x.name,40,'اشتراك'),amount:cNum(x.amount),barq:!!x.barq,ic:cIcon(x.ic,'🔁')})),
    rest:cArr(P.rest,50).filter(isObj).map(x=>({id:cId(x.id),name:cT(x.name,40,'بند'),pct:cNum(x.pct,0,100),kind:kind(x.kind)})),
    xsplit:cArr(P.xsplit,50).filter(isObj).map(x=>({id:cId(x.id),name:cT(x.name,40,'بند'),pct:cNum(x.pct,0,100),kind:kind(x.kind)}))};
  out.pm={};Object.entries(isObj(o.pm)?o.pm:{}).slice(0,240).forEach(([k,m])=>{if(!RE_MON.test(k)||!isObj(m))return;
    const r={done:{},util:{},extra:cNum(m.extra)};Object.keys(isObj(m.done)?m.done:{}).slice(0,300).forEach(x=>{if(RE_PK.test(x))r.done[x]=1});
    Object.entries(isObj(m.util)?m.util:{}).slice(0,60).forEach(([u,v])=>{if(RE_ID.test(u)&&!BAN.has(u))r.util[u]=cNum(v)});if(+m.restActual>0)r.restActual=cNum(m.restActual);out.pm[k]=r});
  const D=isObj(o.debt)?o.debt:{};
  out.debt={name:cT(D.name,40,'دين'),total:cNum(D.total),inst:cNum(D.inst),start:cDate(D.start,todayISO()),pay:cArr(D.pay,360).filter(x=>isObj(x)&&cDate(x.d)).map(x=>({d:cDate(x.d),a:cNum(x.a),paid:!!x.paid}))};
  out.carry=cArr(o.carry,100).filter(isObj).map(x=>({id:cId(x.id),name:cT(x.name,40,'جهة'),amount:cNum(x.amount)}));
  return out}
const migrate=normalize;
function sanitize(o){return o}
const keyFor = u=>'flousi_v2_'+u;
function loadLocal(u){try{const s=localStorage.getItem(keyFor(u));if(s)return migrate(JSON.parse(s))}catch(e){}return def()}
let state = def();
let view='dash', cur=mk(todayISO()), flt={type:'all',q:'',cat:''}, draft={}, pending=null, syncMode='local', cloudMsg='';
const peek = k=>state.months[k]||{opening:0,tx:[]};
const getM = k=>{if(!state.months[k])state.months[k]={opening:0,tx:[]};return state.months[k]};
getM(cur);
const money = n=>(n<0?'-':'')+fmt(Math.abs(n))+' '+state.settings.currency;

function persist(){if(!uidNow)return;try{localStorage.setItem(keyFor(uidNow),JSON.stringify(state))}catch(e){}}
let pushT,dirty=false; function save(){state.updatedAt=Date.now();persist();dirty=true;clearTimeout(pushT);pushT=setTimeout(()=>pushCloud(),900)}

/* ---------- الحسابات ---------- */
function totals(k){const m=peek(k),t={income:0,expense:0,invest:0,saving:0,debt:0};m.tx.forEach(x=>t[x.type]+=x.amount);
  t.out=t.expense+t.invest+t.saving+t.debt;t.opening=m.opening;t.avail=m.opening+t.income-t.out;return t}
function byCat(k,type='expense'){const o={};peek(k).tx.filter(x=>x.type===type).forEach(x=>o[x.cat]=(o[x.cat]||0)+x.amount);return Object.entries(o).sort((a,b)=>b[1]-a[1])}
function groups(k){let needs=0,wants=0,future=0;peek(k).tx.forEach(x=>{if(x.type==='expense')isNeed(x.cat)?needs+=x.amount:wants+=x.amount;else if(x.type==='debt')needs+=x.amount;else if(x.type==='invest'||x.type==='saving')future+=x.amount});return{needs,wants,future}}
function forecast(k){const t=totals(k),real=mk(todayISO()),dim=daysIn(k);let el=dim,left=0;
  if(k===real){el=+todayISO().slice(8);left=dim-el}else if(k>real){el=1;left=dim-1}
  const fx=peek(k).tx.filter(x=>x.type==='expense'&&(FIXED_CATS.includes(x.cat)||x.rec||(x.planKey&&/^(util|sub):/.test(x.planKey)))).reduce((a,x)=>a+x.amount,0);
  const daily=(t.expense-fx)/Math.max(el,1);return{daily,proj:k===real?t.expense+daily*left:t.expense,left,allow:left>0?Math.max(0,t.avail)/left:0,el,dim}}
function baseIncome(k){const t=totals(k);return t.income>0?t.income:(+state.settings.expectedIncome||0)}
function score(t){const inc=t.income||0;if(inc<=0)return null;let s=0;
  s+=Math.min(40,((t.saving+t.invest)/inc*100)/20*40);
  const r=t.expense/inc;s+=30*(1-Math.min(1,Math.max(0,(r-.8)/.4)));
  const b=Object.entries(state.budgets).filter(([,v])=>v>0);
  if(b.length){const sp=Object.fromEntries(byCat(cur));s+=20*b.filter(([c,v])=>(sp[c]||0)<=v).length/b.length}else s+=12;
  if(t.avail>=0)s+=10;return Math.round(Math.min(100,Math.max(0,s)))}
function tips(t){const inc=t.income,o=[];
  if(inc<=0)o.push(['💡','سجّل دخلك هذا الشهر عشان أعطيك تحليل دقيق لوضعك.']);
  else{const rate=(t.saving+t.invest)/inc*100;
    if(t.expense>inc*.8)o.push(['🚨','مصروفاتك تعدّت 80% من دخلك — راجع التسوق والترفيه.']);
    if(rate<10)o.push(['🎯',`معدل ادخارك ${rate.toFixed(0)}% — حاول توصل 20% (${money(inc*.2)}).`]);
    else if(rate>=20)o.push(['🏆',`ممتاز! تدّخر وتستثمر ${rate.toFixed(0)}% من دخلك.`]);}
  const sp=Object.fromEntries(byCat(cur));
  Object.entries(state.budgets).forEach(([c,v])=>{if(v>0&&(sp[c]||0)>v)o.push(['⚠️',`تجاوزت ميزانية "${c}" بمقدار ${money(sp[c]-v)}.`])});
  const top=byCat(cur)[0];if(top&&t.expense>0&&top[1]/t.expense>.4)o.push(['🔍',`"${top[0]}" تاخذ ${(top[1]/t.expense*100).toFixed(0)}% من مصروفاتك.`]);
  if(!Object.keys(state.budgets).length)o.push(['🎯','حدد ميزانية لكل تصنيف من تبويب "الميزانية" عشان أنبهك قبل ما تتجاوز.']);
  if(t.avail<0)o.push(['🚨','رصيدك المتاح بالسالب — صرفت أكثر من اللي عندك!']);
  if(!o.length)o.push(['✅','وضعك المالي ممتاز، استمر على نفس الخط.']);return o.slice(0,4)}

/* ---------- تقسيمتي: نفس تقسيمة الشيت ---------- */
const getPM=k=>{if(!state.pm[k])state.pm[k]={done:{},util:{},extra:0};return state.pm[k]};
function planCalc(){const p=state.plan,pm=getPM(cur);
  const allocT=p.allocs.reduce((a,x)=>a+x.amount,0),net=p.salary-allocT,utilT=p.utils.reduce((a,u)=>a+(pm.util[u.id]||0),0),subT=p.subs.reduce((a,x)=>a+x.amount,0),debtD=p.deductDebt?state.debt.inst:0,rest=net-utilT-subT-debtD,
  barq=p.subs.filter(x=>x.barq).reduce((a,x)=>a+x.amount,0)+p.allocs.filter(x=>/برق|بطاقة/.test(x.bank||'')).reduce((a,x)=>a+x.amount,0);
  const hasActual=pm.restActual>0;return{allocT,net,utilT,subT,debtD,rest,barq,salary:p.salary,hasActual,restUse:hasActual?pm.restActual:rest}}
function debtCalc(){const d=state.debt,paid=d.pay.filter(x=>x.paid).reduce((a,x)=>a+x.a,0);return{paid,left:Math.max(0,d.total-paid),pct:d.total>0?paid/d.total*100:0,next:d.pay.findIndex(x=>!x.paid)}}
function planKeys(){const p=state.plan,pm=getPM(cur);return['salary',...p.allocs.map(a=>'alloc:'+a.id),...p.utils.filter(u=>(pm.util[u.id]||0)>0).map(u=>'util:'+u.id),...p.subs.map(x=>'sub:'+x.id),...p.rest.map(r=>'rest:'+r.id)]}
function planItem(k){const p=state.plan,pm=getPM(cur),c=planCalc(),[t,id]=k.split(':'),KI=x=>KINDS[x]||KINDS.other;
  if(k==='salary')return{type:'income',cat:'راتب',amount:p.salary,note:'الراتب الإجمالي'};
  if(k==='xin')return{type:'income',cat:'أخرى',amount:pm.extra||0,note:'مبلغ إضافي'};
  if(t==='alloc'){const a=p.allocs.find(x=>x.id===id);if(!a)return null;const K=KI(a.kind);return{type:K.type,cat:K.cat,amount:a.amount,note:a.name+(a.bank&&a.bank!=='—'?' — '+a.bank:'')}}
  if(t==='util'){const u=p.utils.find(x=>x.id===id);if(!u)return null;return{type:'expense',cat:'فواتير',amount:pm.util[id]||0,note:u.name}}
  if(t==='sub'){const x=p.subs.find(y=>y.id===id);if(!x)return null;return{type:'expense',cat:'اشتراكات',amount:x.amount,note:x.name}}
  if(t==='rest'){const r=p.rest.find(x=>x.id===id);if(!r)return null;const K=KI(r.kind);return{type:K.type,cat:K.cat,amount:Math.max(0,c.restUse)*r.pct/100,note:r.name+' (توزيع الباقي)'}}
  if(t==='xs'){const r=p.xsplit.find(x=>x.id===id);if(!r)return null;const K=KI(r.kind);return{type:K.type,cat:K.cat,amount:(pm.extra||0)*r.pct/100,note:r.name+' (من المبلغ الإضافي)'}}
  if(t==='debt'){const pay=state.debt.pay[+id];if(!pay)return null;return{type:'debt',cat:'دين بأقساط',amount:pay.a,note:state.debt.name+' — قسط '+(+id+1)}}
  return null}
function removePlanTx(k){if(k.startsWith('debt:'))Object.values(state.months).forEach(m=>{m.tx=m.tx.filter(x=>x.planKey!==k)});else{const m=getM(cur);m.tx=m.tx.filter(x=>x.planKey!==k)}}
function togglePlan(k){const pm=getPM(cur),m=getM(cur),[t,id]=k.split(':'),isDebt=t==='debt',on=isDebt?state.debt.pay[+id].paid:!!pm.done[k];
  if(on){if(isDebt)state.debt.pay[+id].paid=false;else delete pm.done[k];removePlanTx(k);save();render(true);return}
  const it=planItem(k);if(!it||!(it.amount>0))return toast('حدد المبلغ أولاً 🙂');
  if(isDebt)state.debt.pay[+id].paid=true;else pm.done[k]=1;
  m.tx.push({id:uid(),type:it.type,cat:it.cat,amount:it.amount,date:defDate(),note:it.note,ts:Date.now(),planKey:k});
  save();render(true);toast(`✅ ${it.note} — ${money(it.amount)}`)}
function planUnmark(x,restore){if(!x.planKey)return;const k=x.planKey;if(k.startsWith('debt:')){const pay=state.debt.pay[+k.split(':')[1]];if(pay)pay.paid=restore}else{const pm=getPM(cur);if(restore)pm.done[k]=1;else delete pm.done[k]}}
function splitCard(){const p0=state.plan;if(!p0.salary&&!p0.allocs.length&&!p0.subs.length&&!p0.rest.length&&!p0.utils.length)
  return `<div class="card tilt" data-act="nav" data-v="split" style="cursor:pointer;margin-bottom:16px;display:flex;align-items:center;gap:14px;flex-wrap:wrap"><span style="font-size:30px">🧮</span><div style="flex:1;min-width:190px"><b>جهّز تقسيمتك الشهرية</b><div style="color:var(--mut);font-size:13px">حدّد راتبك وتحويلاتك الثابتة وكيف توزع الباقي — اختياري.</div></div><span class="btn">ابدأ ←</span></div>`;
 const pm=getPM(cur),keys=planKeys(),dn=keys.filter(k=>pm.done[k]).length,pc=keys.length?dn/keys.length*100:0,c=planCalc();
  return `<div class="card tilt" data-act="nav" data-v="split" style="cursor:pointer;margin-bottom:16px;display:flex;align-items:center;gap:18px;flex-wrap:wrap"><div class="ringbox">${ring(pc,'var(--acc2)',84,10)}<div class="rc"><b style="font-size:18px">${dn}/${keys.length}</b></div></div><div style="flex:1;min-width:200px"><h3 style="margin-bottom:4px;justify-content:flex-start">🧮 تقسيمة ${mName(cur)}</h3><div style="color:var(--mut);font-size:14px">نفّذت ${dn} من ${keys.length} بند · الباقي نهاية الشهر المتوقع <b style="color:var(--green)">${money(c.rest)}</b></div></div><span class="btn">فتح التقسيمة ←</span></div>`}

/* ---------- رسوم ---------- */
function ring(pct,col,size=130,w=11){const r=52,c=2*Math.PI*r;
  return `<svg viewBox="0 0 120 120" width="${size}" height="${size}"><circle cx="60" cy="60" r="${r}" fill="none" style="stroke:var(--track)" stroke-width="${w}"/><circle class="seg" cx="60" cy="60" r="${r}" fill="none" stroke-width="${w}" stroke-linecap="round" style="stroke:${col};stroke-dasharray:${c*Math.min(100,pct)/100} ${c}" transform="rotate(-90 60 60)"/></svg>`}
function donut(data,total){const r=70,c=2*Math.PI*r;let off=0;
  const segs=data.map(([,v,col])=>{const len=v/total*c;const s=`<circle class="seg" cx="90" cy="90" r="${r}" fill="none" stroke="${col}" stroke-width="24" style="stroke-dasharray:${Math.max(len-3,.5)} ${c}" stroke-dashoffset="${-off}" transform="rotate(-90 90 90)"/>`;off+=len;return s}).join('');
  return `<div class="ringbox"><svg viewBox="0 0 180 180" width="190" height="190"><circle cx="90" cy="90" r="${r}" fill="none" style="stroke:var(--track)" stroke-width="24"/>${segs}</svg><div class="rc"><b data-count="${total}">0</b><small>${state.settings.currency}</small></div></div>`}

/* ============================================================
   العروض
   ============================================================ */
function txRow(x,i=0){const T=TYPES[x.type];
  return `<div class="tx" data-act="edit-tx" data-id="${x.id}" style="--c:${T.color};animation-delay:${Math.min(i,12)*40}ms"><span class="ic">${catIcon(x.type,x.cat)}</span>
  <div class="tx-m"><b>${esc(x.cat)} <small style="display:inline;color:${T.color}">· ${T.label}</small></b><small>${esc(x.note||fDate(x.date))}</small></div>
  <div class="amt" style="color:${T.color}">${T.sign}${money(x.amount)}</div>
  <div class="tx-a"><button data-act="edit-tx" data-id="${x.id}" title="تعديل">✏️</button><button data-act="del-tx" data-id="${x.id}" title="حذف">🗑️</button></div></div>`}
const emptyBox=(e,t,btn)=>`<div class="empty"><span class="e">${e}</span><p>${t}</p>${btn||''}</div>`;

function vDash(){
  const t=totals(cur),f=forecast(cur),sc=score(t),inc=t.income;
  const cats=byCat(cur);let top=cats.slice(0,6);const rest=cats.slice(6).reduce((a,[,v])=>a+v,0);if(rest>0)top.push(['متفرقات',rest]);
  const dd=top.map(([l,v],i)=>[l,v,PAL[i%PAL.length]]);
  const dim=daysIn(cur),days=Array(dim).fill(0);peek(cur).tx.filter(x=>x.type==='expense').forEach(x=>days[+x.date.slice(8)-1]+=x.amount);
  const mx=Math.max(...days,1);
  const recent=[...peek(cur).tx].sort((a,b)=>b.date.localeCompare(a.date)||b.ts-a.ts).slice(0,6);
  const sCol=sc===null?'#9aa4cc':sc>=80?'var(--green)':sc>=60?'var(--blue)':sc>=40?'var(--gold)':'var(--red)';
  const sLbl=sc===null?'—':sc>=80?'ممتاز':sc>=60?'جيد':sc>=40?'متوسط':'يحتاج انتباه';
  const stat=(ic,l,v,c,sub,cls='')=>`<div class="card tilt stat ${cls}" style="--c:${c}"><div class="si">${ic}</div><span>${l}</span><div class="v"><b data-count="${v}">0</b><small>${state.settings.currency}</small></div><em>${sub}</em></div>`;
  return `
  <div class="grid stats">
    ${stat('💎','الرصيد المتاح',t.avail,t.avail>=0?'var(--green)':'var(--red)',`رصيد بداية الشهر: ${money(t.opening)}`,'hero')}
    ${stat('💰','إجمالي الدخل',t.income,'var(--green)',inc>0?'هذا الشهر':'لم تسجل دخلاً بعد')}
    ${stat('🛒','المصروفات',t.expense,'var(--red)',t.debt>0?`+ سداد ديون ${money(t.debt)}`:inc>0?`${(t.expense/inc*100).toFixed(0)}% من الدخل`:'—')}
    ${stat('🏦','ادخار واستثمار',t.saving+t.invest,'var(--gold)',inc>0?`${((t.saving+t.invest)/inc*100).toFixed(0)}% من الدخل`:'—')}
  </div>
  ${installBanner()}
  ${remindersCard()}
  ${splitCard()}
  <div class="grid g21">
    <div class="card"><h3>🍩 توزيع المصروفات</h3>
      ${total0(t.expense)?`<div class="donut">${donut(dd,t.expense)}<div class="legend">${dd.map(([l,v,c])=>`<div><i style="background:${c}"></i>${esc(l)}<span>${fmt(v)}</span></div>`).join('')}</div></div>`:emptyBox('🪙','ما فيه مصروفات هذا الشهر بعد','')}
    </div>
    <div class="card" style="text-align:center"><h3>❤️ الصحة المالية</h3>
      <div class="ringbox" style="margin:auto;width:fit-content">${ring(sc||0,sCol,150,12)}<div class="rc"><b style="color:${sCol}" ${sc!==null?`data-count="${sc}"`:''}>${sc===null?'—':0}</b><small>${sLbl}</small></div></div>
      <div style="margin-top:14px;text-align:right">${tips(t).map(([i,x],k)=>`<div class="tip" style="animation-delay:${k*90}ms"><span>${i}</span><span>${x}</span></div>`).join('')}</div>
    </div>
  </div>
  <div class="grid g21">
    <div class="card"><h3>📊 صرفك اليومي <small style="color:var(--mut);font-weight:600">أعلى يوم: ${money(mx>1?mx:0)}</small></h3>
      <div class="bars">${days.map((v,i)=>`<div data-t="${i+1}: ${fmt(v)}"><i style="height:${v/mx*100}%;--k:${i};${v===0?'opacity:.25':''}"></i></div>`).join('')}</div>
      <div class="barlbl"><span>1</span><span>${Math.round(dim/2)}</span><span>${dim}</span></div>
      <div class="grid g3" style="margin:16px 0 0;gap:10px">
        <div class="tip" style="margin:0;flex-direction:column;gap:0"><small style="color:var(--mut)">متوسط الصرف اليومي (بدون الثوابت)</small><b>${money(f.daily)}</b></div>
        <div class="tip" style="margin:0;flex-direction:column;gap:0"><small style="color:var(--mut)">توقع مصروف الشهر</small><b>${money(f.proj)}</b></div>
        <div class="tip" style="margin:0;flex-direction:column;gap:0"><small style="color:var(--mut)">${f.left>0?`تقدر تصرف يومياً (${f.left} يوم)`:'الشهر خلص'}</small><b style="color:var(--green)">${f.left>0?money(f.allow):'—'}</b></div>
      </div>
    </div>
    <div class="card"><h3>🕒 آخر المعاملات <button class="btn sm" data-act="nav" data-v="tx">عرض الكل</button></h3>
      ${recent.length?recent.map(txRow).join(''):emptyBox('📝','ابدأ بتسجيل أول معاملة','<button class="btn pri" data-act="add-tx">＋ إضافة معاملة</button>')}
    </div>
  </div>`}
const total0=v=>v>0;

function txListHTML(){
  const m=peek(cur);
  const l=m.tx.filter(x=>(flt.type==='all'||x.type===flt.type)&&(!flt.cat||x.cat===flt.cat)&&(!flt.q||(x.cat+' '+(x.note||'')).includes(flt.q))).sort((a,b)=>b.date.localeCompare(a.date)||b.ts-a.ts);
  if(!l.length)return emptyBox('🔎','ما لقيت معاملات','<button class="btn pri" data-act="add-tx">＋ إضافة معاملة</button>');
  let h='',last='',i=0;l.forEach(x=>{if(x.date!==last){last=x.date;const dayT=l.filter(y=>y.date===x.date).reduce((a,y)=>a+(y.type==='income'?y.amount:-y.amount),0);
    h+=`<div class="dayh">${fDate(x.date)} <span style="float:left">${dayT>=0?'+':''}${fmt(dayT)}</span></div>`}h+=txRow(x,i++)});
  return h}
function vTx(){
  const m=peek(cur),cnt=t=>t==='all'?m.tx.length:m.tx.filter(x=>x.type===t).length;
  const allCats=[...new Set(m.tx.map(x=>x.cat))];
  return `<div class="card"><div class="filters">
    ${['all',...Object.keys(TYPES)].map(t=>`<button class="fc ${flt.type===t?'on':''}" data-act="filt" data-t="${t}">${t==='all'?'الكل':TYPES[t].icon+' '+TYPES[t].label} (${cnt(t)})</button>`).join('')}
  </div><div class="row" style="margin-bottom:12px"><input id="q" placeholder="🔍 ابحث بالتصنيف أو الملاحظة..." value="${esc(flt.q)}">
  <select data-change="fcat"><option value="">كل التصنيفات</option>${allCats.map(c=>`<option ${flt.cat===c?'selected':''}>${esc(c)}</option>`).join('')}</select></div>
  <div id="txlist">${txListHTML()}</div></div>`}

function vBud(){
  const sp=Object.fromEntries(byCat(cur)),exp=catList('expense');
  const tb=Object.values(state.budgets).reduce((a,b)=>a+b,0),ts=Object.entries(state.budgets).filter(([,v])=>v>0).reduce((a,[c])=>a+(sp[c]||0),0);
  const card=([c,ic],i)=>{const lim=state.budgets[c]||0,s=sp[c]||0,p=lim>0?s/lim*100:0,col=p>=100?'var(--red)':p>=70?'var(--gold)':'var(--green)';
    return `<div class="card bud tilt" data-act="edit-budget" data-c="${esc(c)}" style="--c:${col}"><div class="top"><span class="ic">${esc(ic)}</span><b style="flex:1">${c}</b>
      ${lim>0?`<span class="badge">${p.toFixed(0)}%</span>`:'<span class="badge" style="--c:#9aa4cc">حدد ميزانية</span>'}</div>
      <div class="prog"><b style="width:${lim>0?Math.min(100,p):0}%"></b></div>
      <div class="meta"><span>صرفت ${money(s)}</span><span>${lim>0?(lim-s>=0?'باقي '+money(lim-s):'تجاوز '+money(s-lim)):'—'}</span></div></div>`};
  const rec=state.recurring;
  return `<div class="card hero" style="margin-bottom:16px"><h3>🎯 ملخص الميزانية</h3>
    <div class="grid g3 hs" style="margin:0"><div class="stat" style="--c:var(--acc)"><span>إجمالي الميزانيات</span><div class="v"><b data-count="${tb}">0</b><small>${state.settings.currency}</small></div></div>
    <div class="stat" style="--c:var(--red)"><span>المصروف منها</span><div class="v"><b data-count="${ts}">0</b><small>${state.settings.currency}</small></div></div>
    <div class="stat" style="--c:var(--green)"><span>المتبقي</span><div class="v"><b data-count="${Math.max(0,tb-ts)}">0</b><small>${state.settings.currency}</small></div></div></div></div>
  <div class="grid g3">${exp.map(card).join('')}</div>
  <div class="card"><h3>🔁 الالتزامات الثابتة (تضاف تلقائياً كل شهر جديد) <button class="btn sm pri" data-act="add-rec">＋ إضافة</button></h3>
    ${rec.length?rec.map(r=>`<div class="tx" style="--c:${TYPES[r.type].color}"><span class="ic">${catIcon(r.type,r.cat)}</span><div class="tx-m"><b>${esc(r.cat)} <small style="display:inline">· ${TYPES[r.type].label}</small></b><small>${esc(r.note||'')} · يوم ${r.day} من الشهر</small></div>
      <div class="amt" style="color:${TYPES[r.type].color}">${TYPES[r.type].sign}${money(r.amount)}</div><div class="tx-a" style="opacity:1"><button data-act="del-rec" data-id="${r.id}">🗑️</button></div></div>`).join(''):emptyBox('🔁','أضف راتبك وإيجارك واشتراكاتك مرة وحدة، وتنزل لك تلقائياً كل شهر.','')}
  </div>`}

function vGoal(){
  const g=state.goals;
  return `<div style="margin-bottom:16px"><button class="btn pri" data-act="add-goal">＋ هدف جديد</button></div>
  ${g.length?`<div class="grid g3">${g.map(x=>{const p=x.target>0?x.saved/x.target*100:0,done=p>=100;let need='';
    if(x.deadline&&!done){const d=new Date(x.deadline),n=new Date(),ml=Math.max(1,(d.getFullYear()-n.getFullYear())*12+d.getMonth()-n.getMonth());need=`تحتاج ${money((x.target-x.saved)/ml)} شهرياً (${ml} شهر)`}
    return `<div class="card tilt" style="text-align:center"><div class="ringbox" style="margin:0 auto 10px;width:fit-content">${ring(p,done?'var(--green)':'var(--acc)',140,12)}<div class="rc"><b style="font-size:38px">${esc(x.emoji)}</b><small>${p.toFixed(0)}%</small></div></div>
    <h3 style="justify-content:center;margin-bottom:6px">${esc(x.name)} ${done?'✅':''}</h3><div style="color:var(--mut);font-size:14px">${money(x.saved)} من ${money(x.target)}</div>
    <div style="color:var(--gold);font-size:13px;min-height:20px;margin-top:4px">${need||(done?'🎉 تم تحقيق الهدف!':'')}</div>
    <div style="display:flex;gap:6px;justify-content:center;margin-top:12px"><button class="btn pri sm" data-act="fund-goal" data-id="${x.id}">＋ إضافة مبلغ</button><button class="btn sm" data-act="edit-goal" data-id="${x.id}">✏️</button><button class="btn sm red" data-act="del-goal" data-id="${x.id}">🗑️</button></div></div>`}).join('')}</div>`
  :`<div class="card">${emptyBox('🏆','حدد أهدافك: سيارة، سفر، صندوق طوارئ... وأنا أحسب لك كم تحتاج تدخر كل شهر.','')}</div>`}`}

function vInv(){
  const l=state.investments,ti=l.reduce((a,x)=>a+x.invested,0),tv=l.reduce((a,x)=>a+x.value,0),pl=tv-ti,pp=ti>0?pl/ti*100:0;
  const al={};l.forEach(x=>al[x.type]=(al[x.type]||0)+x.value);const ae=Object.entries(al).sort((a,b)=>b[1]-a[1]);
  return `<div class="grid g3">
    <div class="card tilt stat" style="--c:var(--blue)"><div class="si">💼</div><span>رأس المال المستثمر</span><div class="v"><b data-count="${ti}">0</b><small>${state.settings.currency}</small></div></div>
    <div class="card tilt stat" style="--c:var(--acc)"><div class="si">💎</div><span>القيمة الحالية</span><div class="v"><b data-count="${tv}">0</b><small>${state.settings.currency}</small></div></div>
    <div class="card tilt stat" style="--c:${pl>=0?'var(--green)':'var(--red)'}"><div class="si">${pl>=0?'🚀':'📉'}</div><span>الربح / الخسارة</span><div class="v"><b data-count="${pl}">0</b><small>${state.settings.currency} (${pp.toFixed(1)}%)</small></div></div></div>
  ${ae.length?`<div class="card" style="margin-bottom:16px"><h3>🧩 توزيع المحفظة</h3><div class="stack">${ae.map(([,v],i)=>`<i style="flex:${v};background:${PAL[i%PAL.length]}"></i>`).join('')}</div>
    <div class="legend" style="flex-direction:row;flex-wrap:wrap;gap:14px">${ae.map(([k,v],i)=>`<div><i style="background:${PAL[i%PAL.length]}"></i>${catIcon('invest',k)} ${k} · ${(v/tv*100).toFixed(0)}%</div>`).join('')}</div></div>`:''}
  <div style="margin-bottom:16px"><button class="btn pri" data-act="add-inv">＋ استثمار جديد</button></div>
  ${l.length?`<div class="grid g2">${l.map(x=>{const p=x.value-x.invested,pc=x.invested>0?p/x.invested*100:0,c=p>=0?'var(--green)':'var(--red)';
    return `<div class="card tilt"><div style="display:flex;gap:12px;align-items:center"><span style="font-size:34px">${catIcon('invest',x.type)}</span><div style="flex:1"><b style="font-size:18px">${esc(x.name)}</b><div style="color:var(--mut);font-size:13px">${x.type}</div></div>
      <span class="badge" style="--c:${c}">${p>=0?'▲':'▼'} ${Math.abs(pc).toFixed(1)}%</span></div>
      <div class="kv"><span>المستثمر</span><b>${money(x.invested)}</b></div><div class="kv"><span>القيمة الحالية</span><b>${money(x.value)}</b></div><div class="kv"><span>الربح/الخسارة</span><b style="color:${c}">${p>=0?'+':''}${money(p)}</b></div>
      <div style="display:flex;gap:6px;margin-top:12px"><button class="btn pri sm" data-act="upd-inv" data-id="${x.id}">🔄 تحديث القيمة</button><button class="btn sm" data-act="edit-inv" data-id="${x.id}">✏️</button><button class="btn sm red" data-act="del-inv" data-id="${x.id}">🗑️</button></div></div>`}).join('')}</div>`
  :`<div class="card">${emptyBox('📈','سجل استثماراتك (أسهم، ذهب، عقار...) وتابع أرباحك لحظة بلحظة.','')}</div>`}`}

function yearCard(){
  const y=cur.slice(0,4),ks=Object.keys(state.months).filter(k=>k.startsWith(y)).sort();if(!ks.length)return '';
  let inc=0,exp=0,fut=0,best=null;
  ks.forEach(k=>{const t=totals(k);inc+=t.income;exp+=t.expense+t.debt;fut+=t.saving+t.invest;const r=t.income>0?(t.saving+t.invest)/t.income:0;if(t.income>0&&(!best||r>best.r))best={k,r}});
  const box=(l,v,c)=>`<div class="tip" style="margin:0;flex-direction:column;gap:0"><small style="color:var(--mut)">${l}</small><b style="color:${c}">${v}</b></div>`;
  return `<div class="card"><h3>🗓️ ملخص سنة ${y} <small style="color:var(--mut);font-weight:600">${ks.length} ${ks.length>10?'شهراً':'أشهر'}</small></h3>
    <div class="grid g2" style="margin:0;gap:10px">${box('إجمالي الدخل',money(inc),'var(--green)')}${box('إجمالي المصروفات',money(exp),'var(--red)')}${box('ادخار واستثمار',money(fut),'var(--gold)')}${box('معدل الادخار',inc>0?(fut/inc*100).toFixed(0)+'%':'—','var(--acc2)')}</div>
    ${best&&best.r>0?`<p style="margin-top:12px;color:var(--mut);font-size:14px">🏆 أفضل شهر ادخاراً: <b style="color:var(--txt)">${mName(best.k)}</b> (${(best.r*100).toFixed(0)}% من الدخل)</p>`:''}</div>`}
function vPlan(){
  const inc=baseIncome(cur),g=groups(cur),rule=RULES[state.settings.rule]||RULES[0],f=forecast(cur),t=totals(cur);
  const rows=[['🏠','الاحتياجات','إيجار، فواتير، طعام، مواصلات، ديون',rule[0],g.needs,'var(--blue)',true],['🎮','الرغبات','تسوق، ترفيه، وغيرها',rule[1],g.wants,'var(--orange)',true],['🌱','الادخار والاستثمار','مستقبلك المالي',rule[2],g.future,'var(--green)',false]];
  const keys=[];let k=cur;for(let i=0;i<6;i++){keys.unshift(k);k=prevKey(k)}
  const tr=keys.map(k=>({k,...totals(k)})),mx=Math.max(...tr.flatMap(x=>[x.income,x.expense]),1);
  const goalNeed=state.goals.filter(x=>x.saved<x.target&&x.deadline).reduce((a,x)=>{const d=new Date(x.deadline),n=new Date(),ml=Math.max(1,(d.getFullYear()-n.getFullYear())*12+d.getMonth()-n.getMonth());return a+(x.target-x.saved)/ml},0);
  return `<div class="card" style="margin-bottom:16px"><h3>🧠 قاعدة التوزيع الذكية <small style="color:var(--mut);font-weight:600">الدخل المعتمد: ${money(inc)}</small></h3>
    <div class="filters">${RULES.map((r,i)=>`<button class="fc ${state.settings.rule===i?'on':''}" data-act="rule" data-i="${i}">${r[0]} / ${r[1]} / ${r[2]}</button>`).join('')}</div>
    ${inc<=0?emptyBox('💡','سجل دخلك أو حدد "الدخل الشهري المتوقع" من الإعدادات عشان أبني لك الخطة.',''):rows.map(([ic,n,d,pct,act,c,lim])=>{const target=inc*pct/100,p=target>0?act/target*100:0,bad=lim?p>100:p<100;
      return `<div style="margin-bottom:18px"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:8px"><b>${ic} ${n} <small style="color:var(--mut);font-weight:500">${pct}% · ${d}</small></b>
      <span style="font-size:13px">${money(act)} / ${money(target)}</span></div><div class="prog" style="--c:${bad&&lim?'var(--red)':c}"><b style="width:${Math.min(100,p)}%"></b></div>
      <small style="color:var(--mut)">${lim?(p>100?`⚠️ تجاوزت الحد بـ ${money(act-target)}`:`✅ باقي لك ${money(target-act)}`):(p>=100?'🏆 حققت هدف الادخار!':`🎯 ادخر ${money(target-act)} إضافية للوصول للهدف`)}</small></div>`}).join('')}</div>
  <div class="grid g2">
    <div class="card"><h3>🔮 التوقعات</h3>
      <div class="kv"><span>متوسط الصرف اليومي (بدون الثوابت)</span><b>${money(f.daily)}</b></div>
      <div class="kv"><span>المتوقع صرفه بنهاية الشهر</span><b>${money(f.proj)}</b></div>
      <div class="kv"><span>الأيام المتبقية</span><b>${f.left}</b></div>
      <div class="kv"><span>المسموح صرفه يومياً</span><b style="color:var(--green)">${f.left>0?money(f.allow):'—'}</b></div>
      <div class="kv"><span>المتوقع يتبقى آخر الشهر</span><b style="color:${t.avail-(f.proj-t.expense)>=0?'var(--green)':'var(--red)'}">${money(t.avail-(f.proj-t.expense))}</b></div></div>
    <div class="card"><h3>🏆 خطة الأهداف</h3>
      ${state.goals.length?`<div class="kv"><span>مطلوب شهرياً لكل الأهداف</span><b>${money(goalNeed)}</b></div><div class="kv"><span>المقترح للادخار (${rule[2]}%)</span><b>${money(inc*rule[2]/100)}</b></div>
      <p style="margin-top:12px;color:var(--mut);font-size:14px">${goalNeed>inc*rule[2]/100?'⚠️ أهدافك تحتاج أكثر من نسبة الادخار المقترحة. مدّد المواعيد أو ارفع الدخل.':'✅ نسبة ادخارك المقترحة تكفي لتحقيق أهدافك في مواعيدها.'}</p>`:emptyBox('🎯','أضف أهدافاً لأحسب لك الخطة.','')}</div>
  </div>
  ${yearCard()}
  <div class="card"><h3>📅 آخر 6 أشهر <span style="font-size:12px;font-weight:600;color:var(--mut)"><span style="color:var(--green)">■</span> دخل &nbsp; <span style="color:var(--red)">■</span> مصروف</span></h3>
    <div class="bars" style="height:170px;gap:14px">${tr.map((x,i)=>`<div data-t="${mName(x.k)}: +${fmt(x.income)} / -${fmt(x.expense)}"><div class="pair"><i style="height:${x.income/mx*100}%;--k:${i*3};background:linear-gradient(180deg,var(--green),#0fa97a)"></i><i style="height:${x.expense/mx*100}%;--k:${i*3+1};background:linear-gradient(180deg,var(--red),#c23a56)"></i></div></div>`).join('')}</div>
    <div class="barlbl" style="gap:14px">${tr.map(x=>`<span style="flex:1;text-align:center">${MONTHS[+x.k.slice(5)-1]}</span>`).join('')}</div></div>`}

function vSet(){
  const s=state.settings,m=getM(cur);
  return `<div class="grid g2">
  <div class="card"><h3>👤 الملف الشخصي</h3>
    <label>اسمك<input data-set="name" value="${esc(s.name)}" placeholder="مثال: خالد"></label>
    <label>العملة<select data-set="currency">${CURR.map(c=>`<option ${s.currency===c?'selected':''}>${c}</option>`).join('')}</select></label>
    <label>الدخل الشهري المتوقع<input data-set="expectedIncome" inputmode="decimal" value="${s.expectedIncome||''}" placeholder="0"></label>
    <label>الرصيد الافتتاحي لـ ${mName(cur)}<input data-set="opening" inputmode="decimal" value="${m.opening||''}" placeholder="0"></label>
    <button class="btn" data-act="theme">🌓 تبديل الوضع الليلي / النهاري</button></div>
  ${syncCard()}
  ${lockCard()}
  ${remCard()}
  ${catsCard()}
  ${installCard()}
  <div class="card"><h3>💾 البيانات</h3><div style="display:flex;flex-direction:column;gap:10px">
    <button class="btn pri" data-act="report">📄 تقرير الشهر (PDF)</button><button class="btn" data-act="export-json">⬇️ نسخة احتياطية (JSON)</button><button class="btn" data-act="export-csv">📊 تصدير المعاملات (CSV / Excel)</button>
    <button class="btn" data-act="import-json">⬆️ استيراد نسخة احتياطية</button></div></div>
  <div class="card"><h3>🔄 الأشهر</h3><p>عند بداية كل شهر اضغط "شهر جديد": يتم أرشفة الشهر الحالي، ترحيل الرصيد، وإضافة التزاماتك الثابتة تلقائياً.</p>
    <div style="display:flex;flex-direction:column;gap:10px"><button class="btn pri" data-act="new-month">🔄 بدء شهر جديد</button><button class="btn red" data-act="reset-all">🗑️ مسح كل البيانات</button></div></div></div>`}
const ckb=(k,on)=>`<button class="ck ${on?'on':''}" data-act="pk" data-k="${k}" aria-label="تأشير">✓</button>`;
function vSplit(){
  const p=state.plan,pm=getPM(cur),c=planCalc(),dc=debtCalc(),d=state.debt,keys=planKeys(),dn=keys.filter(k=>pm.done[k]).length,cu=state.settings.currency;
  const KI=k=>KINDS[k]||KINDS.other,kcol=k=>TYPES[KI(k).type].color,kic=k=>catIcon(KI(k).type,KI(k).cat);
  const segs=[...p.allocs.map((a,i)=>[a.name,a.amount,PAL[i%PAL.length]]),['فواتير واشتراكات',c.utilT+c.subT,'var(--red)'],['الباقي',Math.max(0,c.rest),'var(--green)']].filter(x=>x[1]>0);
  const st=(ic,l,v,col,sub)=>`<div class="stat" style="--c:${col}"><div class="si">${ic}</div><span>${l}</span><div class="v"><b data-count="${v}">0</b><small>${cu}</small></div><em>${sub}</em></div>`;
  const row=(key,done,ic,col,name,sub,amt,extra,edit)=>`<div class="tx ${done?'done':''}" style="--c:${col}">${ckb(key,done)}<span class="ic">${esc(ic)}</span><div class="tx-m"><b>${name}</b><small>${sub}</small></div>${extra||''}<div class="amt" style="color:${col}">${amt}</div>${edit?`<div class="tx-a" style="opacity:1">${edit}</div>`:''}</div>`;
  const allocDone=p.allocs.filter(a=>pm.done['alloc:'+a.id]).reduce((x,a)=>x+a.amount,0);
  const rs=p.rest.reduce((a,r)=>a+r.pct,0),xs=p.xsplit.reduce((a,r)=>a+r.pct,0),ex=pm.extra||0,rest0=Math.max(0,c.restUse);
  let cum=0;
  return `
  <div class="card hero"><h3>🧮 تقسيمة ${mName(cur)} <span class="badge" style="--c:var(--acc2)">${dn} / ${keys.length} منفّذ</span></h3>
    <div class="grid g3 hs" style="margin:0 0 14px">${st('💼','الراتب الإجمالي',c.salary,'var(--acc)','قبل التحويلات')}${st('🏦','الصافي بعد التحويلات',c.net,'var(--acc2)','بعد تحويلات '+money(c.allocT))}${st('💎','الباقي نهاية الشهر',c.rest,c.rest>=0?'var(--green)':'var(--red)','بعد الفواتير والاشتراكات')}</div>
    <div class="stack">${segs.map(([n,v,col])=>`<i style="flex:${v};background:${col}" title="${esc(n)}"></i>`).join('')}</div>
    <div class="legend" style="flex-direction:row;flex-wrap:wrap;gap:6px 14px">${segs.map(([n,v,col])=>`<div><i style="background:${col}"></i>${esc(n)} · ${fmt(v)}</div>`).join('')}</div>
    <div class="prog" style="margin-top:14px;--c:var(--acc2)"><b style="width:${keys.length?dn/keys.length*100:0}%"></b></div></div>
  <div class="grid g2" style="align-items:start">
   <div class="col">
    <div class="card"><h3>💸 التحويلات الشهرية الثابتة <button class="btn sm pri" data-act="add-alloc">＋ إضافة</button></h3>
      ${row('salary',pm.done.salary,'💼','var(--green)','الراتب الإجمالي','استلمت الراتب؟ التأشير يسجله كدخل',money(c.salary),'','<button data-act="edit-salary">✏️</button>')}
      ${p.allocs.length?'':'<div class="empty" style="padding:14px">أضف تحويلاتك الشهرية الثابتة (ادخار، استثمار، بنزين…) بزر ＋ إضافة.</div>'}
      ${p.allocs.map(a=>row('alloc:'+a.id,pm.done['alloc:'+a.id],kic(a.kind),kcol(a.kind),esc(a.name)+(a.bank&&a.bank!=='—'?`<span class="pill">${esc(a.bank)}</span>`:''),KI(a.kind).l,money(a.amount),'',`<button data-act="edit-alloc" data-id="${a.id}">✏️</button>`)).join('')}
      <div class="kv"><span>تم تحويل</span><b style="color:var(--green)">${money(allocDone)} من ${money(c.allocT)}</b></div>
      <div class="kv"><span>الصافي بعد التحويلات</span><b>${money(c.net)}</b></div></div>
    <div class="card"><h3>🎯 توزيع الباقي نهاية الشهر <span style="display:flex;gap:6px"><button class="btn sm pri" data-act="add-rest" data-w="rest">＋ إضافة</button>${p.rest.length?'<button class="btn sm" data-act="edit-pcts" data-w="rest">⚙️ النسب</button>':''}</span></h3>
      <div class="tip"><span>🧮</span><span>المتوقع من التقسيمة: <b>${money(c.rest)}</b></span></div>
      <div style="display:flex;gap:10px;align-items:center;margin:10px 0 4px;flex-wrap:wrap"><b style="flex:1;min-width:150px">💎 الباقي الفعلي في حسابك<br><small style="color:var(--mut);font-weight:500">أدخله قبل نزول الراتب بيوم — وإذا تركته فاضي يعتمد المتوقع</small></b><input class="mini" style="width:150px" data-pset="restActual" inputmode="decimal" placeholder="${fmt(Math.max(0,c.rest))}" value="${pm.restActual||''}"></div>
      <div class="kv"><span>المبلغ المعتمد للتوزيع</span><b style="color:var(--green)">${money(c.restUse)} ${c.hasActual?'':'(متوقع)'} ${p.rest.length&&rs!==100?`<span style="color:var(--red)">⚠️ النسب ${rs}%</span>`:''}</b></div>
      ${p.rest.length?'':'<div class="empty" style="padding:14px">وزّع الباقي من راتبك على أهدافك (طوارئ، استثمار، ترفيه…) بنسب مئوية، بزر ＋ إضافة.</div>'}
      ${p.rest.map(r=>row('rest:'+r.id,pm.done['rest:'+r.id],kic(r.kind),kcol(r.kind),esc(r.name),r.pct+'% من الباقي',money(rest0*r.pct/100),'',`<button data-act="edit-rest" data-w="rest" data-id="${r.id}">✏️</button>`)).join('')}
      ${d.total>0?`<label class="chk"><input type="checkbox" data-pdeduct ${p.deductDebt?'checked':''}>خصم قسط ${esc(d.name)} (${money(d.inst)}) من الباقي</label>`:''}</div>
    <div class="card"><h3>➕ مبلغ إضافي خلال الشهر <span style="display:flex;gap:6px"><button class="btn sm pri" data-act="add-rest" data-w="xs">＋ إضافة</button>${p.xsplit.length?'<button class="btn sm" data-act="edit-pcts" data-w="xs">⚙️ النسب</button>':''}</span></h3>
      <div style="display:flex;gap:10px;align-items:center;margin-bottom:10px"><b>المبلغ:</b><input class="mini" style="width:170px" data-pset="extra" inputmode="decimal" placeholder="0" value="${ex||''}"></div>
      ${ex>0?row('xin',pm.done.xin,'💰','var(--green)','تسجيله كدخل','مبلغ إضافي',money(ex))+(p.xsplit.length?'':'<div class="empty" style="padding:14px">أضف نسب توزيع المبالغ الإضافية بزر ＋ إضافة.</div>')+p.xsplit.map(r=>row('xs:'+r.id,pm.done['xs:'+r.id],kic(r.kind),kcol(r.kind),esc(r.name),r.pct+'% من المبلغ',money(ex*r.pct/100),'',`<button data-act="edit-rest" data-w="xs" data-id="${r.id}">✏️</button>`)).join('')+`<div class="kv"><span>الصافي من المبلغ</span><b>${money(ex-ex*xs/100)} ${p.xsplit.length&&xs!==100?`<span style="color:var(--red)">(النسب ${xs}%)</span>`:''}</b></div>`:'<div class="empty" style="padding:14px">اكتب أي مبلغ جاك خلال الشهر وأقسمه لك حسب نسبك.</div>'}</div>
   </div>
   <div class="col">
    <div class="card"><h3>🧾 الفواتير والاشتراكات <span style="display:flex;gap:6px"><button class="btn sm" data-act="add-util">＋ فاتورة</button><button class="btn sm pri" data-act="add-sub">＋ اشتراك</button></span></h3>
      ${p.utils.length||p.subs.length?'':'<div class="empty" style="padding:14px">أضف فواتيرك الشهرية (كهرباء، ماء…) واشتراكاتك (إنترنت، تطبيقات…).</div>'}
      ${p.utils.map(u=>`<div class="tx ${pm.done['util:'+u.id]?'done':''}" style="--c:var(--gold)">${ckb('util:'+u.id,pm.done['util:'+u.id])}<span class="ic">${esc(u.ic)}</span><div class="tx-m"><b>${esc(u.name)}</b><small>اكتب مبلغ فاتورة هذا الشهر</small></div><input class="mini" data-pset="util:${u.id}" inputmode="decimal" placeholder="0" value="${pm.util[u.id]||''}"><div class="tx-a" style="opacity:1"><button data-act="edit-util" data-id="${u.id}">✏️</button></div></div>`).join('')}
      ${p.subs.map(x=>row('sub:'+x.id,pm.done['sub:'+x.id],x.ic||'🔁','var(--red)',esc(x.name)+(x.barq?'<span class="pill">بطاقة</span>':''),x.barq?'تُدفع من البطاقة':'اشتراك شهري',money(x.amount),'',`<button data-act="edit-sub" data-id="${x.id}">✏️</button>`)).join('')}
      ${c.barq>0?`<div class="tip" style="background:rgba(77,163,255,.15);margin-top:10px"><span>💳</span><span>حوّل للبطاقة: <b>${money(c.barq)}</b> (اشتراكات البطاقة + التحويلات الموجّهة لها)</span></div>`:''}
      <div class="kv"><span>مجموع الاشتراكات</span><b>${money(c.subT)}</b></div><div class="kv"><span>الفواتير</span><b>${money(c.utilT)}</b></div>
      <div class="kv"><span>الباقي نهاية الشهر</span><b style="color:${c.rest>=0?'var(--green)':'var(--red)'}">${money(c.rest)}</b></div></div>
    ${d.total>0?`<div class="card"><h3>💳 ${esc(d.name)} <button class="btn sm" data-act="edit-debt">⚙️ تعديل</button></h3>
      <div style="display:flex;gap:18px;align-items:center;flex-wrap:wrap;margin-bottom:12px"><div class="ringbox">${ring(dc.pct,'var(--gold)',120,11)}<div class="rc"><b style="font-size:26px">${dc.pct.toFixed(0)}%</b><small>مسدد</small></div></div>
      <div style="flex:1;min-width:180px"><div class="kv"><span>إجمالي الدين</span><b>${money(d.total)}</b></div><div class="kv"><span>مسدد</span><b style="color:var(--green)">${money(dc.paid)}</b></div><div class="kv"><span>المتبقي</span><b style="color:var(--red)">${money(dc.left)}</b></div><div class="kv"><span>القسط الشهري</span><b>${money(d.inst)}</b></div><div class="kv"><span>آخر قسط</span><b>${d.pay.length?fDate(d.pay[d.pay.length-1].d):'—'}</b></div></div></div>
      <div class="scroll">${d.pay.map((x,i)=>{cum+=x.a;return `<div class="tx ${x.paid?'done':''} ${i===dc.next?'next':''}" style="--c:var(--gold)">${ckb('debt:'+i,x.paid)}<span class="ic">${i+1}</span><div class="tx-m"><b>${fDate(x.d)}${i===dc.next?'<span class="pill">القادم</span>':''}</b><small>المسدد بعده: ${money(cum)}</small></div><div class="amt" style="color:var(--gold)">${money(x.a)}</div></div>`}).join('')}</div></div>`:`<div class="card"><h3>💳 دين بأقساط <button class="btn sm pri" data-act="edit-debt">＋ إضافة</button></h3><div class="empty" style="padding:14px">عندك دين تسدده بأقساط؟ أضفه وأنا أجدول لك الأقساط وأتابع المتبقي.</div></div>`}
    <div class="card"><h3>↩️ مبالغ راجعة لك <button class="btn sm pri" data-act="add-carry">＋ إضافة</button></h3>
      ${state.carry.length?state.carry.map(x=>`<div class="tx" style="--c:var(--blue)"><span class="ic">🏦</span><div class="tx-m"><b>${esc(x.name)}</b><small>مبلغ راجع لك</small></div><div class="amt" style="color:var(--blue)">${money(x.amount)}</div><div class="tx-a" style="opacity:1"><button data-act="carry-back" data-id="${x.id}" title="رجعت — سجلها كدخل">✅</button><button data-act="edit-carry" data-id="${x.id}">✏️</button><button data-act="del-carry" data-id="${x.id}">🗑️</button></div></div>`).join('')+`<div class="kv"><span>المجموع</span><b>${money(state.carry.reduce((a,x)=>a+x.amount,0))}</b></div>`:'<div class="empty" style="padding:14px">ما فيه مبالغ راجعة.</div>'}</div>
   </div>
  </div>`}
function allocModal(id){const a=state.plan.allocs.find(x=>x.id===id)||{name:'',bank:'',amount:'',kind:'other'};
  modal(`<h3>${id?'✏️ تعديل التحويل':'➕ تحويل جديد'}</h3><form data-form="alloc" data-id="${id||''}"><label>الاسم<input name="name" value="${esc(a.name)}" placeholder="مثال: ملابس"></label>
  <div class="row"><label>الجهة / البنك<input name="bank" value="${esc(a.bank==='—'?'':a.bank)}" placeholder="مثال: اسم البنك أو المحفظة"></label><label>المبلغ<input name="amount" inputmode="decimal" value="${a.amount}"></label></div>
  <label>النوع (يحدد تصنيفه في المعاملات)<select name="kind">${Object.entries(KINDS).map(([k,v])=>`<option value="${k}" ${a.kind===k?'selected':''}>${v.l}</option>`).join('')}</select></label>
  <button class="btn pri wide">حفظ</button></form>${id?`<button class="btn red wide" style="margin-top:8px" data-act="del-alloc" data-id="${id}">🗑️ حذف</button>`:''}`)}
function subModal(id){const x=state.plan.subs.find(y=>y.id===id)||{name:'',amount:'',barq:false};
  modal(`<h3>${id?'✏️ تعديل الاشتراك':'➕ اشتراك جديد'}</h3><form data-form="sub" data-id="${id||''}"><label>الاسم<input name="name" value="${esc(x.name)}"></label><label>المبلغ الشهري<input name="amount" inputmode="decimal" value="${x.amount}"></label>
  <label class="chk"><input type="checkbox" name="barq" ${x.barq?'checked':''}>💳 يُدفع من بطاقة منفصلة (مثل بطاقة مسبقة الدفع)</label><button class="btn pri wide">حفظ</button></form>${id?`<button class="btn red wide" style="margin-top:8px" data-act="del-sub" data-id="${id}">🗑️ حذف</button>`:''}`)}
function pctModal(w){const l=w==='rest'?state.plan.rest:state.plan.xsplit;modal(`<h3>⚙️ نسب ${w==='rest'?'توزيع الباقي':'توزيع المبلغ الإضافي'}</h3><p>المجموع لازم يكون 100%.</p><form data-form="pcts" data-w="${w}">${l.map((r,i)=>`<label>${esc(r.name)} (%)<input name="p${i}" inputmode="decimal" value="${r.pct}"></label>`).join('')}<button class="btn pri wide">حفظ</button></form>`)}
function carryModal(id){const x=state.carry.find(y=>y.id===id)||{name:'',amount:''};modal(`<h3>${id?'✏️ تعديل':'➕ مبلغ راجع'}</h3><form data-form="carry" data-id="${id||''}"><label>الجهة<input name="name" value="${esc(x.name)}" placeholder="مثال: اسم الجهة أو الشخص"></label><label>المبلغ<input name="amount" inputmode="decimal" value="${x.amount}"></label><button class="btn pri wide">حفظ</button></form>`)}
function debtModal(){const d=state.debt;modal(`<h3>💳 تعديل الدين</h3><form data-form="debt"><label>الاسم<input name="name" value="${esc(d.name)}"></label><div class="row"><label>إجمالي الدين<input name="total" inputmode="decimal" value="${d.total||''}"></label><label>القسط الشهري<input name="inst" inputmode="decimal" value="${d.inst||''}"></label></div><label>تاريخ أول قسط<input type="date" name="start" value="${d.start}"></label><p style="font-size:13px">تغيير المبلغ أو القسط أو التاريخ يعيد بناء جدول الأقساط مع الحفاظ على المسدد.</p><button class="btn pri wide">حفظ</button></form>${d.total>0?`<button class="btn red wide" style="margin-top:8px" data-act="clear-debt">🗑️ حذف الدين</button>`:''}`)}
function utilModal(id){const u=state.plan.utils.find(x=>x.id===id)||{name:'',ic:'🧾'},IC=['⚡','💧','📞','🌐','🔥','🧾','🏠','🚗'];
  modal(`<h3>${id?'✏️ تعديل الفاتورة':'🧾 فاتورة شهرية جديدة'}</h3><form data-form="util" data-id="${id||''}"><label>الاسم<input name="name" value="${esc(u.name)}" placeholder="مثال: الكهرباء"></label><label>الأيقونة<select name="ic">${IC.map(e=>`<option ${u.ic===e?'selected':''}>${e}</option>`).join('')}</select></label><button class="btn pri wide">حفظ</button></form>${id?`<button class="btn red wide" style="margin-top:8px" data-act="del-util" data-id="${id}">🗑️ حذف</button>`:''}`)}
function restModal(w,id){const l=w==='rest'?state.plan.rest:state.plan.xsplit,r=l.find(x=>x.id===id)||{name:'',pct:'',kind:'emerg'};
  modal(`<h3>${id?'✏️ تعديل البند':'➕ بند توزيع جديد'}</h3><p>${w==='rest'?'نسبة من الباقي نهاية الشهر':'نسبة من المبلغ الإضافي'}</p><form data-form="restitem" data-w="${w}" data-id="${id||''}"><label>الاسم<input name="name" value="${esc(r.name)}" placeholder="مثال: طوارئ"></label><div class="row"><label>النسبة (%)<input name="pct" inputmode="decimal" value="${r.pct}"></label><label>النوع<select name="kind">${Object.entries(KINDS).map(([k,v])=>`<option value="${k}" ${r.kind===k?'selected':''}>${v.l}</option>`).join('')}</select></label></div><button class="btn pri wide">حفظ</button></form>${id?`<button class="btn red wide" style="margin-top:8px" data-act="del-rest" data-w="${w}" data-id="${id}">🗑️ حذف</button>`:''}`)}
const VIEWS={dash:vDash,split:vSplit,tx:vTx,bud:vBud,goal:vGoal,inv:vInv,plan:vPlan,set:vSet};

/* ---------- الرسم العام ---------- */
const NAV_MOBILE=['dash','split','tx','bud'];
const isMobileNav=()=>{try{return matchMedia('(max-width:860px)').matches}catch(e){return false}};
function renderNav(){
  const mob=isMobileNav(),items=mob?NAV.filter(n=>NAV_MOBILE.includes(n[0])):NAV;
  let h=items.map(([k,i,l])=>`<button class="${view===k?'on':''}" data-act="nav" data-v="${k}" aria-label="${l}" title="${l}"><span class="ni">${i}</span><span class="nl">${l}</span></button>`).join('');
  if(mob)h+=`<button class="${NAV_MOBILE.includes(view)?'':'on'}" data-act="more" aria-label="المزيد" title="المزيد"><span class="ni">☰</span><span class="nl">المزيد</span></button>`;
  $('#nav').innerHTML=h}
function renderTop(){
  const h=new Date().getHours(),g=h<5?'سهران؟ 🌙':h<12?'صباح الخير ☀️':h<17?'يعطيك العافية 🌤️':h<21?'مساء الخير 🌆':'ليلتك سعيدة 🌙';
  const keys=[...new Set([...Object.keys(state.months),cur])].sort().reverse();
  $('#topbar').innerHTML=`<div class="tb-t"><h1>${TITLES[view]}</h1><p>${g}${state.settings.name?' يا '+esc(state.settings.name):''} 👋</p></div>
  <div class="tb-i"><span class="chip ${syncMode}" id="sync" data-act="nav" data-v="set" title="${esc(cloudMsg)}">${chipH(syncMode)}</span><button class="btn ic" data-act="report" title="تقرير الشهر PDF">📄</button><button class="btn ic" data-act="theme" title="تبديل الوضع">🌓</button></div>
  <div class="tb-m"><div class="mnav"><button data-act="mprev" title="الشهر السابق">→</button><select data-change="month" aria-label="الشهر">${keys.map(k=>`<option value="${k}" ${k===cur?'selected':''}>${mName(k)}</option>`).join('')}</select><button data-act="mnext" title="الشهر التالي">←</button></div>
  <button class="btn" data-act="new-month" title="بدء شهر جديد">🔄<span class="hm"> شهر جديد</span></button></div>`}
function animateCounts(still){$$('[data-count]').forEach(el=>{const to=+el.dataset.count||0;if(still){el.textContent=fmt(to);return}const t0=performance.now();(function f(t){const p=Math.min(1,(t-t0)/950),e=1-Math.pow(1-p,4);el.textContent=fmt(to*e);if(p<1)requestAnimationFrame(f)})(t0)})}
function render(still){
  if(locked)return;
  document.documentElement.dataset.theme=state.settings.theme;
  const tc=document.querySelector('meta[name=theme-color]');if(tc)tc.content=state.settings.theme==='light'?'#eef1ff':'#080b1a';
  getM(cur);renderNav();renderTop();
  const old=$('#view .scroll'),sc=old?old.scrollTop:0;
  $('#view').classList.toggle('still',!!still);
  $('#view').innerHTML=VIEWS[view]();
  const nw=$('#view .scroll');if(nw)nw.scrollTop=sc;
  $$('#view > *').forEach((el,i)=>el.style.setProperty('--i',i));
  a11y($('#topbar'));a11y($('#view'));a11y($('#nav'));
  animateCounts(still)}

/* ---------- النوافذ ---------- */
let lastFocus=null;
const A11Y={'✏️':'تعديل','🗑️':'حذف','✅':'تم','✓':'تأشير كمنفّذ','→':'الشهر السابق','←':'الشهر التالي','👁':'إظهار كلمة المرور','✕':'إغلاق','🔄':'مزامنة','📄':'تقرير PDF','🌓':'تبديل الوضع','＋':'إضافة معاملة','☰':'المزيد'};
function a11y(root){(root||document).querySelectorAll('button:not([aria-label])').forEach(b=>{const t=b.textContent.trim();if(A11Y[t])b.setAttribute('aria-label',A11Y[t]);else if(!t&&b.title)b.setAttribute('aria-label',b.title)})}
const buzz=()=>{try{navigator.vibrate&&navigator.vibrate(12)}catch(e){}};
function modal(html){if(!$('.ov'))lastFocus=document.activeElement;closeModal(true);const el=document.createElement('div');el.className='ov';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.innerHTML=`<div class="md"><button class="x" data-act="close">✕</button>${html}</div>`;
  const hh=el.querySelector('h3');if(hh)el.setAttribute('aria-label',hh.textContent.trim());a11y(el);
  el.querySelectorAll('input:not([type]),input[type=text]').forEach(i=>{if(i.maxLength<0)i.maxLength=200});
  document.body.appendChild(el);requestAnimationFrame(()=>el.classList.add('show'));const f=$('input:not([type=checkbox]):not([type=hidden]),select',el);setTimeout(()=>f&&f.focus(),300)}
function closeModal(now){const had=$('.ov');$$('.ov').forEach(o=>{if(now)o.remove();else{o.classList.remove('show');setTimeout(()=>o.remove(),280)}});if(!now&&had&&lastFocus&&lastFocus.focus){try{lastFocus.focus()}catch(e){}}}
function toast(msg,undo){const el=document.createElement('div');el.className='toast';const sp=document.createElement('span');sp.textContent=String(msg);el.appendChild(sp);
  if(undo){const bt=document.createElement('button');bt.textContent=undo.label;bt.onclick=()=>{undo.fn();el.remove()};el.appendChild(bt)}
  $('#toasts').appendChild(el);setTimeout(()=>el.classList.add('out'),undo?5000:2600);setTimeout(()=>el.remove(),undo?5400:3000)}
function ask(title,text,ok,fn){pending=fn;modal(`<h3>${title}</h3><p>${text}</p><div class="row"><button class="btn red" data-act="ask-ok">${ok}</button><button class="btn" data-act="close">إلغاء</button></div>`)}
const shakeModal=()=>{const m=$('.md');if(m){m.classList.remove('shake');void m.offsetWidth;m.classList.add('shake')}};
const defDate=()=>cur===mk(todayISO())?todayISO():cur+'-01';

const emoGrid=()=>EMOJIS.map(e=>`<button type="button" class="eb ${draft.emo===e?'on':''}" data-act="pick-emo" data-e="${e}">${e}</button>`).join('');
function chipsHTML(){return catList(draft.type).map(([c,i])=>`<button type="button" class="chp ${draft.cat===c?'on':''}" data-act="pick-cat" data-c="${esc(c)}">${i} ${esc(c)}</button>`).join('')+'<button type="button" class="chp add" data-act="show-newcat">＋ تصنيف</button>'}
const newCatBox=()=>`<div class="newcat" id="newCat" hidden><input id="ncName" maxlength="18" placeholder="اسم التصنيف الجديد"><div class="emo" id="ncEmo">${emoGrid()}</div><label class="chk" id="ncNeedWrap" hidden><input type="checkbox" id="ncNeed">من الاحتياجات الأساسية</label><button type="button" class="btn pri sm" data-act="save-cat" style="width:100%;margin-top:8px">إضافة التصنيف</button></div>`;
function catModal(){draft={emo:'🏷️'};modal(`<h3>🏷️ تصنيف جديد</h3><form data-form="cat"><label>النوع<select name="type">${Object.entries(TYPES).map(([k,v])=>`<option value="${k}" ${k==='expense'?'selected':''}>${v.icon} ${v.label}</option>`).join('')}</select></label><label>الاسم<input name="name" maxlength="18" placeholder="مثال: قهوة"></label><div class="lbl">الأيقونة</div><div class="emo" id="ncEmo">${emoGrid()}</div><label class="chk"><input type="checkbox" name="need">للمصروفات: من الاحتياجات الأساسية</label><button class="btn pri wide">إضافة</button></form>`)}
function txModal(id,preType,asRec){
  const ex=id?peek(cur).tx.find(x=>x.id===id):null;
  draft={type:ex?ex.type:(preType||'expense'),cat:ex?ex.cat:null,rec:!!asRec};
  const recent=ex||asRec?[]:(()=>{const seen=new Set(),out=[];[...peek(cur).tx,...peek(prevKey(cur)).tx].sort((a,b)=>(b.ts||0)-(a.ts||0)).forEach(x=>{const k=x.type+'|'+x.cat+'|'+(x.note||'');if(out.length<5&&!seen.has(k)&&!x.planKey&&!x.rec){seen.add(k);out.push(x)}});return out})();
  draft.recent=recent;
  modal(`<h3>${ex?'✏️ تعديل معاملة':asRec?'🔁 التزام ثابت جديد':'✨ معاملة جديدة'}</h3>
  <form data-form="tx" data-id="${id||''}">
    <div class="seg-types">${Object.entries(TYPES).map(([k,v])=>`<button type="button" class="st ${k===draft.type?'on':''}" data-act="pick-type" data-k="${k}" style="--c:${v.color}">${v.icon}<span>${v.label}</span></button>`).join('')}</div>
    ${recent.length?`<div class="lbl">تكرار سريع</div><div class="chips">${recent.map((x,i)=>`<button type="button" class="chp" data-act="quick-tx" data-i="${i}">${catIcon(x.type,x.cat)} ${esc(x.cat)}${x.note?' · '+esc(x.note.slice(0,14)):''} · ${fmt(x.amount)}</button>`).join('')}</div>`:''}
    <label class="big"><input name="amount" inputmode="decimal" placeholder="0" autocomplete="off" value="${ex?ex.amount:''}"><span>${state.settings.currency}</span></label>
    <div class="lbl">التصنيف</div><div class="chips" id="catChips">${chipsHTML()}</div>${newCatBox()}
    <div class="row" style="margin-top:14px"><label>${asRec?'يوم الشهر':'التاريخ'}<input type="date" name="date" min="${cur}-01" max="${cur}-${daysIn(cur)}" value="${ex?ex.date:defDate()}"></label><label>ملاحظة<input name="note" placeholder="اختياري" value="${esc(ex?.note||'')}"></label></div>
    ${ex||asRec?'':'<label class="chk"><input type="checkbox" name="rec">🔁 كرّر هذه المعاملة كل شهر تلقائياً</label>'}
    <button class="btn pri wide">${ex?'حفظ التعديلات':'حفظ ✓'}</button></form>${ex?`<button type="button" class="btn red wide" style="margin-top:8px" data-act="del-tx" data-id="${id}">🗑️ حذف المعاملة</button>`:''}`)}

/* ---------- الإجراءات ---------- */
function addTx(f,id){
  const amount=num(f.amount.value);if(amount<=0){shakeModal();f.amount.focus();return toast('اكتب مبلغاً صحيحاً 🙂')}
  const cat=draft.cat||CATS[draft.type][0][0];const x={id:id||uid(),type:draft.type,cat,amount,date:f.date.value||defDate(),note:f.note.value.trim(),ts:Date.now()};
  const m=getM(cur);
  if(id){const i=m.tx.findIndex(y=>y.id===id);if(i>-1){x.ts=m.tx[i].ts;x.goalId=m.tx[i].goalId;x.planKey=m.tx[i].planKey;m.tx[i]=x}}else m.tx.push(x);
  if(draft.rec||(f.rec&&f.rec.checked))state.recurring.push({id:uid(),type:x.type,cat:x.cat,amount:x.amount,note:x.note,day:+x.date.slice(8)});
  if(draft.rec&&!id){const i=m.tx.findIndex(y=>y.id===x.id);if(i>-1&&!(f.rec&&f.rec.checked)){m.tx.splice(i,1)}}
  save();closeModal();render();
  toast(draft.rec?'تم إضافة الالتزام الثابت 🔁':id?'تم التعديل ✅':`${TYPES[x.type].icon} تمت إضافة ${money(amount)}`);
  if(x.type==='expense'){const lim=state.budgets[x.cat],sp=Object.fromEntries(byCat(cur))[x.cat]||0;if(lim>0&&sp>lim)setTimeout(()=>toast(`⚠️ تجاوزت ميزانية "${x.cat}"!`),700);else if(lim>0&&sp>lim*.85)setTimeout(()=>toast(`🔔 وصلت 85% من ميزانية "${x.cat}"`),700)}}

function budgetModal(c){modal(`<h3>🎯 ميزانية ${catIcon('expense',c)} ${esc(c)}</h3><p>أقصى مبلغ تبغى تصرفه على هذا التصنيف شهرياً. اتركه 0 للإلغاء.</p>
  <form data-form="budget" data-c="${esc(c)}"><label class="big"><input name="v" inputmode="decimal" value="${state.budgets[c]||''}" placeholder="0"><span>${state.settings.currency}</span></label><button class="btn pri wide">حفظ</button></form>`)}
const EMO=['🎯','🚗','🏠','✈️','💍','🎓','💻','🛟','🏖️','📱','👶','🕋'];
function goalModal(id){const g=state.goals.find(x=>x.id===id)||{emoji:'🎯',name:'',target:'',saved:'',deadline:''};
  modal(`<h3>${id?'✏️ تعديل الهدف':'🏆 هدف جديد'}</h3><form data-form="goal" data-id="${id||''}">
  <label>الأيقونة<select name="emoji">${EMO.map(e=>`<option ${g.emoji===e?'selected':''}>${e}</option>`).join('')}</select></label>
  <label>اسم الهدف<input name="name" value="${esc(g.name)}" placeholder="مثال: سيارة جديدة"></label>
  <div class="row"><label>المبلغ المستهدف<input name="target" inputmode="decimal" value="${g.target}"></label><label>المدخر حالياً<input name="saved" inputmode="decimal" value="${g.saved}" placeholder="0"></label></div>
  <label>الموعد المستهدف (اختياري)<input type="date" name="deadline" value="${g.deadline||''}"></label><button class="btn pri wide">حفظ</button></form>`)}
function invModal(id){const x=state.investments.find(y=>y.id===id)||{name:'',type:'أسهم',invested:'',value:''};
  modal(`<h3>${id?'✏️ تعديل الاستثمار':'📈 استثمار جديد'}</h3><form data-form="inv" data-id="${id||''}">
  <label>الاسم<input name="name" value="${esc(x.name)}" placeholder="مثال: أسهم أرامكو"></label>
  <label>النوع<select name="type">${catList('invest').map(([c,i])=>`<option ${x.type===c?'selected':''}>${c}</option>`).join('')}</select></label>
  <div class="row"><label>المبلغ المستثمر<input name="invested" inputmode="decimal" value="${x.invested}"></label><label>القيمة الحالية<input name="value" inputmode="decimal" value="${x.value}"></label></div>
  ${id?'':'<label class="chk"><input type="checkbox" name="logtx" checked>سجّلها كمعاملة استثمار في هذا الشهر</label>'}<button class="btn pri wide">حفظ</button></form>`)}

function newMonthModal(){
  const latest=Object.keys(state.months).sort().pop()||cur,real=mk(todayISO()),target=latest<real?real:nextKey(latest),t=totals(latest);
  modal(`<h3>🔄 بدء ${mName(target)}</h3><p>سيتم حفظ <b>${mName(latest)}</b> في الأرشيف (تقدر ترجع له من قائمة الأشهر)، وتبدأ شهر جديد نظيف.</p>
  <div class="tip"><span>💎</span><span>الرصيد المتبقي من ${mName(latest)}: <b>${money(t.avail)}</b></span></div>
  <label class="chk"><input type="checkbox" id="carry" checked>ترحيل الرصيد المتبقي للشهر الجديد</label>
  <label class="chk"><input type="checkbox" id="addrec" checked>إضافة الالتزامات الثابتة (${state.recurring.length})</label>
  <button class="btn pri wide" data-act="do-newmonth" data-t="${target}" data-l="${latest}">ابدأ الشهر الجديد 🚀</button>`)}

function exportFile(name,content,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([content],{type}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)}

/* ---------- الأحداث ---------- */
document.addEventListener('click',e=>{
  const ov=e.target;if(ov.classList&&ov.classList.contains('ov')&&ov===e.target){closeModal();return}
  const b=e.target.closest('.btn');if(b){const r=b.getBoundingClientRect(),s=Math.max(r.width,r.height),sp=document.createElement('span');sp.className='rp';sp.style.cssText=`width:${s}px;height:${s}px;left:${e.clientX-r.left-s/2}px;top:${e.clientY-r.top-s/2}px`;b.appendChild(sp);setTimeout(()=>sp.remove(),600)}
  const el=e.target.closest('[data-act]');if(!el)return;const a=el.dataset.act,d=el.dataset;
  const m=getM(cur);
  switch(a){
    case 'nav':closeModal(true);view=d.v;flt={type:'all',q:'',cat:''};render();scrollTo({top:0,behavior:'smooth'});break;
    case 'close':closeModal();break;
    case 'add-tx':buzz();txModal();break;
    case 'add-rec':txModal(null,'expense',true);break;
    case 'edit-tx':txModal(d.id);break;
    case 'del-tx':{closeModal(true);const i=m.tx.findIndex(x=>x.id===d.id);if(i<0)break;const[x]=m.tx.splice(i,1);planUnmark(x,false);save();render();toast('تم حذف المعاملة 🗑️',{label:'تراجع',fn:()=>{getM(cur).tx.splice(i,0,x);planUnmark(x,true);save();render()}});break}
    case 'pick-type':draft.type=d.k;draft.cat=null;$$('.st').forEach(s=>s.classList.toggle('on',s.dataset.k===d.k));$('#catChips').innerHTML=chipsHTML();{const nc=$('#newCat');if(nc)nc.hidden=true}break;
    case 'pick-cat':draft.cat=d.c;$$('.chp').forEach(s=>s.classList.toggle('on',s.dataset.c===d.c));break;
    case 'filt':flt.type=d.t;render();break;
    case 'mprev':case 'mnext':{const ks=[...new Set([...Object.keys(state.months),cur])].sort(),i=ks.indexOf(cur),n=ks[i+(a==='mprev'?-1:1)];if(n){cur=n;render()}else toast(a==='mprev'?'ما فيه أشهر أقدم':'هذا آخر شهر — استخدم "شهر جديد"');break}
    case 'new-month':newMonthModal();break;
    case 'do-newmonth':{const t=d.t,l=d.l,carry=$('#carry').checked,addrec=$('#addrec').checked;
      if(state.months[t]){cur=t;closeModal();render();return toast('هذا الشهر موجود مسبقاً')}
      const av=totals(l).avail;state.months[t]={opening:carry?av:0,tx:[]};
      if(addrec)state.recurring.forEach(r=>state.months[t].tx.push({id:uid(),type:r.type,cat:r.cat,amount:r.amount,note:r.note,date:`${t}-${pad(Math.min(r.day,daysIn(t)))}`,ts:Date.now(),rec:1}));
      cur=t;view='dash';save();closeModal();render();confetti();toast(`🚀 بدأ ${mName(t)} — بالتوفيق!`);break}
    case 'theme':state.settings.theme=state.settings.theme==='dark'?'light':'dark';save();render();break;
    case 'edit-budget':budgetModal(d.c);break;
    case 'del-rec':state.recurring=state.recurring.filter(x=>x.id!==d.id);save();render();toast('تم حذف الالتزام');break;
    case 'add-goal':goalModal();break;case 'edit-goal':goalModal(d.id);break;
    case 'del-goal':ask('حذف الهدف؟','سيتم حذف الهدف نهائياً.','حذف',()=>{state.goals=state.goals.filter(x=>x.id!==d.id);save();render()});break;
    case 'fund-goal':{const g=state.goals.find(x=>x.id===d.id);modal(`<h3>${esc(g.emoji)} إضافة مبلغ إلى "${esc(g.name)}"</h3><p>باقي لك ${money(Math.max(0,g.target-g.saved))} للوصول للهدف.</p><form data-form="fund" data-id="${g.id}"><label class="big"><input name="a" inputmode="decimal" placeholder="0"><span>${state.settings.currency}</span></label><button class="btn pri wide">إضافة (تسجل كادخار)</button></form>`);break}
    case 'add-inv':invModal();break;case 'edit-inv':invModal(d.id);break;
    case 'del-inv':ask('حذف الاستثمار؟','سيتم حذفه من محفظتك.','حذف',()=>{state.investments=state.investments.filter(x=>x.id!==d.id);save();render()});break;
    case 'upd-inv':{const x=state.investments.find(y=>y.id===d.id);modal(`<h3>🔄 تحديث قيمة ${esc(x.name)}</h3><form data-form="invval" data-id="${x.id}"><label class="big"><input name="v" inputmode="decimal" value="${x.value}"><span>${state.settings.currency}</span></label><button class="btn pri wide">تحديث</button></form>`);break}
    case 'rule':state.settings.rule=+d.i;save();render();break;
    case 'export-json':exportFile(`flousi-${todayISO()}.json`,JSON.stringify(state,null,2),'application/json');toast('تم تنزيل النسخة الاحتياطية 💾');break;
    case 'export-csv':{exportFile(`flousi-${todayISO()}.csv`,buildCSV(),'text/csv');toast('تم تصدير الملف 📊');break}
    case 'import-json':$('#imp').click();break;
    case 'reset-all':ask('⚠️ مسح كل البيانات؟','سيتم حذف كل المعاملات والأهداف والاستثمارات. (يُنصح بعمل نسخة احتياطية أولاً)','نعم، امسح كل شيء',()=>{const s=state.settings;state=def();state.settings={...s};cur=mk(todayISO());getM(cur);save();view='dash';render();toast('تم المسح')});break;
    case 'ask-ok':{const f=pending;pending=null;closeModal();f&&f();break}
    case 'resync':if(uidNow&&FB){setSync('busy');startSync();pushCloud(true)}break;
    case 'logout':ask('تسجيل الخروج؟','سيتم تسجيل خروجك ومسح نسخة هذا الجهاز — بياناتك محفوظة في حسابك وترجع لك عند الدخول.','خروج',doLogout);break;
    case 'del-account':ask('⚠️ حذف الحساب نهائياً؟','سيتم حذف حسابك وكل بياناتك المالية بشكل لا رجعة فيه.','احذف حسابي',delAccount);break;
    case 'clear-debt':state.debt={name:'دين',total:0,inst:0,start:todayISO(),pay:[]};save();closeModal();render(true);toast('تم حذف الدين');break;
    case 'atab':setAmode(d.m);break;
    case 'forgot':forgotPw();break;
    case 'auth-google':googleLogin();break;
    case 'auth-retry':initAuth();break;
    case 'eye':{const i=el.parentElement.querySelector('input');i.type=i.type==='password'?'text':'password';break}
    case 'show-newcat':{const b=$('#newCat');b.hidden=!b.hidden;$('#ncNeedWrap').hidden=draft.type!=='expense';if(!b.hidden)$('#ncName').focus();break}
    case 'pick-emo':draft.emo=d.e;$$('#ncEmo .eb').forEach(b=>b.classList.toggle('on',b.dataset.e===d.e));break;
    case 'save-cat':{const n=cN($('#ncName').value,'');if(!n){shakeModal();return toast('اكتب اسم التصنيف')}
      if(catList(draft.type).some(c=>c[0]===n))return toast('التصنيف موجود مسبقاً');
      (state.cats[draft.type]=state.cats[draft.type]||[]).push({n,i:draft.emo||'🏷️',need:draft.type==='expense'&&$('#ncNeed').checked});
      draft.cat=n;save();$('#catChips').innerHTML=chipsHTML();$('#newCat').hidden=true;$('#ncName').value='';toast('تمت إضافة التصنيف ✓');break}
    case 'add-cat':catModal();break;
    case 'del-cat':ask('حذف التصنيف؟','المعاملات القديمة تبقى كما هي.','حذف',()=>{state.cats[d.t]=(state.cats[d.t]||[]).filter(c=>c.n!==d.n);save();render(true)});break;
    case 'enable-notif':enableNotif();break;
    case 'export-ics':exportICS();break;
    case 'install':(async()=>{if(!deferredInstall)return;deferredInstall.prompt();try{await deferredInstall.userChoice}catch(e){}deferredInstall=null;render(true)})();break;
    case 'dismiss-inst':try{localStorage.setItem('flousi_noinst','1')}catch(e){}render(true);break;
    case 'report':reportModal();break;
    case 'rep-share':shareReport();break;
    case 'rep-print':printReport();break;
    case 'add-util':utilModal();break;case 'edit-util':utilModal(d.id);break;
    case 'del-util':ask('حذف الفاتورة؟','تُحذف من قائمتك (المعاملات المسجلة تبقى).','حذف',()=>{state.plan.utils=state.plan.utils.filter(x=>x.id!==d.id);save();render(true)});break;
    case 'add-rest':restModal(d.w);break;case 'edit-rest':restModal(d.w,d.id);break;
    case 'del-rest':ask('حذف البند؟','يُحذف من التوزيع (المعاملات المسجلة تبقى).','حذف',()=>{const k=d.w==='rest'?'rest':'xsplit';state.plan[k]=state.plan[k].filter(x=>x.id!==d.id);save();render(true)});break;
    case 'more':modal(`<h3>القائمة</h3><div class="more-grid">${NAV.filter(n=>!NAV_MOBILE.includes(n[0])).map(([k,i,l])=>`<button class="mg ${view===k?'on':''}" data-act="nav" data-v="${k}"><span>${i}</span><b>${l}</b></button>`).join('')}</div><div class="more-extra"><button class="btn" data-act="new-month">🔄 شهر جديد</button><button class="btn" data-act="report">📄 تقرير PDF</button></div>`);break;
    case 'quick-tx':{const r=(draft.recent||[])[+d.i];if(!r)break;draft.type=r.type;draft.cat=r.cat;$$('.st').forEach(b=>b.classList.toggle('on',b.dataset.k===r.type));$('#catChips').innerHTML=chipsHTML();const fm=$('form[data-form="tx"]');fm.amount.value=r.amount;fm.note.value=r.note||'';break}
    case 'lock-setup':lockSetupModal();break;
    case 'lock-now':lockNow();break;
    case 'lock-off':modal(`<h3>🔓 إيقاف القفل</h3><form data-form="lockoff"><label>اكتب الرمز الحالي<input name="p" type="password" inputmode="numeric" maxlength="6" dir="ltr" autocomplete="off"></label><div class="aerr" id="lserr"></div><button class="btn red wide">إيقاف القفل</button></form>`);break;
    case 'lock-open':unlockTry();break;
    case 'lock-out':doLogout();break;
    case 'v-check':checkVerified();break;
    case 'v-resend':resendVerify();break;
    case 'v-logout':if(FB)FB.Au.signOut(FB.auth);break;
    case 'pk':buzz();togglePlan(d.k);break;
    case 'edit-salary':modal(`<h3>💼 الراتب الإجمالي</h3><form data-form="salary"><label class="big"><input name="v" inputmode="decimal" value="${state.plan.salary}"><span>${state.settings.currency}</span></label><button class="btn pri wide">حفظ</button></form>`);break;
    case 'add-alloc':allocModal();break;case 'edit-alloc':allocModal(d.id);break;
    case 'del-alloc':ask('حذف التحويل؟','سيُحذف من تقسيمتك (المعاملات المسجلة تبقى).','حذف',()=>{state.plan.allocs=state.plan.allocs.filter(x=>x.id!==d.id);save();render(true)});break;
    case 'add-sub':subModal();break;case 'edit-sub':subModal(d.id);break;
    case 'del-sub':ask('حذف الاشتراك؟','سيُحذف من قائمة الاشتراكات.','حذف',()=>{state.plan.subs=state.plan.subs.filter(x=>x.id!==d.id);save();render(true)});break;
    case 'edit-pcts':pctModal(d.w);break;
    case 'add-carry':carryModal();break;case 'edit-carry':carryModal(d.id);break;
    case 'del-carry':state.carry=state.carry.filter(x=>x.id!==d.id);save();render(true);toast('تم الحذف');break;
    case 'carry-back':{const x=state.carry.find(y=>y.id===d.id);if(!x)break;getM(cur).tx.push({id:uid(),type:'income',cat:'استرداد',amount:x.amount,date:defDate(),note:x.name,ts:Date.now()});state.carry=state.carry.filter(y=>y.id!==d.id);save();render(true);toast('↩️ تم تسجيل المبلغ الراجع كدخل');break}
    case 'edit-debt':debtModal();break;
    case 'onb-go':break;
  }
});
document.addEventListener('submit',e=>{
  const f=e.target.closest('[data-form]');if(!f)return;e.preventDefault();const k=f.dataset.form,id=f.dataset.id;
  if(k==='lockset'){(async()=>{const err=t=>{const e=$('#lserr');if(e)e.textContent=t},c=lockCfg();
    if(c&&!(await checkPin(f.old.value)))return err('الرمز الحالي غير صحيح');
    const p1=f.p1.value,p2=f.p2.value;if(!/^\d{4,6}$/.test(p1))return err('الرمز لازم يكون 4 إلى 6 أرقام');if(p1!==p2)return err('الرمزان غير متطابقين');
    if(/^(\d)\1+$/.test(p1)||['1234','12345','123456','4321','0123','1122'].includes(p1))return err('الرمز سهل التخمين — اختر رمزاً آخر');
    await setPin(p1,+f.mins.value||5);closeModal();render(true);resetIdle();toast('تم تفعيل القفل 🔐')})();return}
  if(k==='lockoff'){(async()=>{if(await checkPin(f.p.value)){localStorage.removeItem('flousi_lock_'+uidNow);clearTimeout(idleT);closeModal();render(true);toast('تم إيقاف القفل')}else{const e=$('#lserr');if(e)e.textContent='الرمز غير صحيح'}})();return}
  if(k==='auth')return doAuth(f);
  if(k==='util'){const n=f.name.value.trim();if(!n){shakeModal();return toast('اكتب اسم الفاتورة')}
    if(id)Object.assign(state.plan.utils.find(x=>x.id===id),{name:n,ic:f.ic.value});else state.plan.utils.push({id:uid(),name:n,ic:f.ic.value});save();closeModal();render(true);toast('تم الحفظ ✓');return}
  if(k==='restitem'){const l=f.dataset.w==='rest'?state.plan.rest:state.plan.xsplit,n=f.name.value.trim(),pc=num(f.pct.value);if(!n||pc<=0||pc>100){shakeModal();return toast('اكتب الاسم ونسبة بين 1 و 100')}
    const o={name:n,pct:pc,kind:f.kind.value};if(id)Object.assign(l.find(x=>x.id===id),o);else l.push({id:uid(),...o});save();closeModal();render(true);toast('تم الحفظ ✓');return}
  if(k==='cat'){const t=f.type.value,n=cN(f.name.value,'');if(!n){shakeModal();return toast('اكتب اسم التصنيف')}if(catList(t).some(c=>c[0]===n))return toast('التصنيف موجود مسبقاً');
    (state.cats[t]=state.cats[t]||[]).push({n,i:draft.emo||'🏷️',need:t==='expense'&&f.need.checked});save();closeModal();render(true);toast('تمت إضافة التصنيف ✓');return}
  if(k==='tx')return addTx(f,id||null);
  if(k==='budget'){const v=num(f.v.value);if(v>0)state.budgets[f.dataset.c]=v;else delete state.budgets[f.dataset.c];save();closeModal();render();toast('تم حفظ الميزانية 🎯')}
  if(k==='goal'){const n=f.name.value.trim(),t=num(f.target.value);if(!n||t<=0){shakeModal();return toast('اكتب الاسم والمبلغ المستهدف')}
    const o={emoji:f.emoji.value,name:n,target:t,saved:num(f.saved.value),deadline:f.deadline.value};
    if(id){Object.assign(state.goals.find(x=>x.id===id),o)}else state.goals.push({id:uid(),...o});save();closeModal();render();toast('تم حفظ الهدف 🏆')}
  if(k==='fund'){const a=num(f.a.value);if(a<=0){shakeModal();return}const g=state.goals.find(x=>x.id===id),was=g.saved;g.saved+=a;
    getM(cur).tx.push({id:uid(),type:'saving',cat:'هدف',amount:a,date:defDate(),note:g.name,ts:Date.now(),goalId:g.id});save();closeModal();render();
    if(was<g.target&&g.saved>=g.target){confetti();toast('🎉 مبروك! حققت هدف "'+g.name+'"')}else toast('تمت الإضافة 💪')}
  if(k==='inv'){const n=f.name.value.trim(),iv=num(f.invested.value);if(!n||iv<=0){shakeModal();return toast('اكتب الاسم والمبلغ')}
    const o={name:n,type:f.type.value,invested:iv,value:num(f.value.value)||iv};
    if(id)Object.assign(state.investments.find(x=>x.id===id),o);else{state.investments.push({id:uid(),date:todayISO(),...o});
      if(f.logtx&&f.logtx.checked)getM(cur).tx.push({id:uid(),type:'invest',cat:o.type,amount:iv,date:defDate(),note:n,ts:Date.now()})}
    save();closeModal();render();toast('تم حفظ الاستثمار 📈')}
  if(k==='invval'){const x=state.investments.find(y=>y.id===id);x.value=num(f.v.value);save();closeModal();render();toast('تم تحديث القيمة ✅')}
  if(k==='salary'){state.plan.salary=num(f.v.value);save();closeModal();render(true);toast('تم تحديث الراتب ✓')}
  if(k==='alloc'){const n=f.name.value.trim(),a=num(f.amount.value);if(!n||a<=0){shakeModal();return toast('اكتب الاسم والمبلغ')}
    const o={name:n,bank:f.bank.value.trim()||'—',amount:a,kind:f.kind.value};if(id)Object.assign(state.plan.allocs.find(x=>x.id===id),o);else state.plan.allocs.push({id:uid(),...o});save();closeModal();render(true);toast('تم الحفظ ✓')}
  if(k==='sub'){const n=f.name.value.trim(),a=num(f.amount.value);if(!n||a<=0){shakeModal();return toast('اكتب الاسم والمبلغ')}
    const o={name:n,amount:a,barq:f.barq.checked};if(id)Object.assign(state.plan.subs.find(x=>x.id===id),o);else state.plan.subs.push({id:uid(),ic:'🔁',...o});save();closeModal();render(true);toast('تم الحفظ ✓')}
  if(k==='pcts'){const l=f.dataset.w==='rest'?state.plan.rest:state.plan.xsplit;l.forEach((r,i)=>r.pct=num(f['p'+i].value));const sum=l.reduce((a,r)=>a+r.pct,0);save();closeModal();render(true);toast(sum===100?'تم حفظ النسب ✓':`⚠️ مجموع النسب ${sum}% وليس 100%`)}
  if(k==='carry'){const n=f.name.value.trim(),a=num(f.amount.value);if(!n||a<=0){shakeModal();return toast('اكتب الجهة والمبلغ')}
    if(id)Object.assign(state.carry.find(x=>x.id===id),{name:n,amount:a});else state.carry.push({id:uid(),name:n,amount:a});save();closeModal();render(true);toast('تم الحفظ ✓')}
  if(k==='debt'){const dd=state.debt,total=num(f.total.value),inst=num(f.inst.value),start=f.start.value||dd.start;if(total<=0||inst<=0){shakeModal();return toast('اكتب المبلغ والقسط')}
    const ch=total!==dd.total||inst!==dd.inst||start!==dd.start;dd.name=f.name.value.trim()||'دين';dd.total=total;dd.inst=inst;dd.start=start;if(ch)dd.pay=genDebt(total,inst,start,dd.pay);save();closeModal();render(true);toast('تم تحديث الدين ✓')}
  if(k==='onb'){const s=state.settings;s.name=f.name.value.trim();s.expectedIncome=num(f.inc.value);state.plan.salary=s.expectedIncome;s.onboarded=true;getM(cur).opening=num(f.bal.value);save();closeModal();render();confetti();toast('أهلاً بك في فلوسي 🎉')}
});
document.addEventListener('change',e=>{const t=e.target;
  if(t.dataset.change==='month'){cur=t.value;render()}
  if(t.dataset.change==='fcat'){flt.cat=t.value;$('#txlist').innerHTML=txListHTML()}
  if(t.dataset.rem){const k=t.dataset.rem;let v=Math.round(num(t.value));if(k==='salaryDay')v=Math.min(31,Math.max(0,v));state.settings.rem={...remCfg(),[k]:v};save();syncRemToSW();render(true);if(k==='salaryDay'&&v)toast('تم حفظ يوم الراتب ✓')}
  if(t.dataset.pset){const k=t.dataset.pset,pm=getPM(cur),v=num(t.value);if(k==='extra')pm.extra=v;else if(k==='restActual'){if(v>0)pm.restActual=v;else delete pm.restActual}else if(k.startsWith('util:'))pm.util[k.slice(5)]=v;save();render(true)}
  if(t.dataset.pdeduct!==undefined){state.plan.deductDebt=t.checked;save();render(true)}
  if(t.dataset.set){const k=t.dataset.set;if(k==='opening')getM(cur).opening=num(t.value);else if(k==='expectedIncome')state.settings.expectedIncome=num(t.value);else state.settings[k]=t.value;save();render();toast('تم الحفظ ✓')}
  if(t.id==='imp'&&t.files[0]){if(t.files[0].size>3e6){toast('الملف كبير جداً ❌');t.value='';return}const r=new FileReader();r.onload=()=>{try{const o=JSON.parse(r.result);if(!o.months)throw 0;state=migrate(sanitize(o));cur=mk(todayISO());getM(cur);save();render();toast('تم الاستيراد بنجاح ✅')}catch(err){toast('الملف غير صالح ❌')}t.value=''};r.readAsText(t.files[0])}
});
document.addEventListener('input',e=>{if(e.target.id==='q'){flt.q=e.target.value.trim();$('#txlist').innerHTML=txListHTML()}});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal();
  if(e.key==='Tab'){const ov=$('.ov');if(ov){const f=$$('button,input,select,a[href],[tabindex]:not([tabindex="-1"])',ov).filter(x=>!x.disabled&&x.offsetParent!==null);if(f.length){const a=f[0],z=f[f.length-1];if(e.shiftKey&&document.activeElement===a){e.preventDefault();z.focus()}else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus()}}}}
  if((e.key==='n'||e.key==='N'||e.key==='ى')&&!/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)&&!$('.ov')){e.preventDefault();txModal()}});
/* توهج وإمالة البطاقات */
document.addEventListener('mousemove',e=>{const c=e.target.closest&&e.target.closest('.card');if(!c)return;const r=c.getBoundingClientRect(),px=(e.clientX-r.left)/r.width,py=(e.clientY-r.top)/r.height;
  c.style.setProperty('--mx',px*100+'%');c.style.setProperty('--my',py*100+'%');
  if(c.classList.contains('tilt')&&matchMedia('(hover:hover)').matches)c.style.transform=`perspective(900px) rotateY(${(px-.5)*-7}deg) rotateX(${(py-.5)*7}deg) translateY(-4px)`});
document.addEventListener('mouseout',e=>{const c=e.target.closest&&e.target.closest('.card.tilt');if(c&&!c.contains(e.relatedTarget))c.style.transform=''});

/* ============================================================
   الخلفية التفاعلية المتحركة + الكونفيتي
   ============================================================ */
(function bg(){
  const cv=$('#bg'),x=cv.getContext('2d');let W,H,D;let running=true,lastT=0;const minDt=(matchMedia('(pointer:coarse)').matches||(navigator.hardwareConcurrency||8)<=4)?33:0;const mouse={x:-999,y:-999,px:0,py:0};
  const orbs=[{c:'139,108,255',x:.2,y:.2,r:.42,s:.00022,a:.32},{c:'34,211,238',x:.85,y:.3,r:.36,s:.00028,a:.22},{c:'46,230,166',x:.6,y:.9,r:.4,s:.00019,a:.2},{c:'255,93,122',x:.1,y:.85,r:.3,s:.00025,a:.16}];
  let coins=[];
  function size(){D=Math.min(innerWidth<700?1.5:2,devicePixelRatio||1);W=innerWidth;H=innerHeight;cv.width=W*D;cv.height=H*D;x.setTransform(D,0,0,D,0,0);
    const n=Math.round(Math.min(minDt?26:46,W*H/32000));coins=Array.from({length:n},()=>({x:Math.random()*W,y:Math.random()*H,r:5+Math.random()*13,vy:-(.12+Math.random()*.4),ph:Math.random()*6.28,sw:.3+Math.random()*.7,rot:Math.random()*6.28,g:Math.random()>.35}))}
  addEventListener('resize',size);size();
  addEventListener('mousemove',e=>{mouse.x=e.clientX;mouse.y=e.clientY});
  addEventListener('touchmove',e=>{const t=e.touches[0];mouse.x=t.clientX;mouse.y=t.clientY},{passive:true});
  addEventListener('mouseout',()=>{mouse.x=mouse.y=-999});
  function draw(t){
    if(document.hidden){running=false;return}
    if(minDt&&t-lastT<minDt){requestAnimationFrame(draw);return}lastT=t;
    const light=document.documentElement.dataset.theme==='light',k=light?.55:1;
    x.clearRect(0,0,W,H);
    mouse.px+=((mouse.x>0?mouse.x/W-.5:0)-mouse.px)*.04;mouse.py+=((mouse.y>0?mouse.y/H-.5:0)-mouse.py)*.04;
    orbs.forEach((o,i)=>{const cx=(o.x+Math.sin(t*o.s+i*2)*.12-mouse.px*.06*(i+1))*W,cy=(o.y+Math.cos(t*o.s*1.3+i)*.12-mouse.py*.06*(i+1))*H,r=o.r*Math.max(W,H)*(1+Math.sin(t*o.s*2+i)*.08);
      const g=x.createRadialGradient(cx,cy,0,cx,cy,r);g.addColorStop(0,`rgba(${o.c},${o.a*k})`);g.addColorStop(1,`rgba(${o.c},0)`);x.fillStyle=g;x.fillRect(0,0,W,H)});
    coins.forEach(c=>{c.y+=c.vy;c.ph+=.012*c.sw;c.rot+=.01;let px=c.x+Math.sin(c.ph)*26;
      const dx=px-mouse.x,dy=c.y-mouse.y,d=Math.hypot(dx,dy);if(d<140){const f=(140-d)/140;c.x+=dx/d*f*3.2;c.y+=dy/d*f*3.2;px=c.x+Math.sin(c.ph)*26}
      if(c.y<-30){c.y=H+30;c.x=Math.random()*W}if(c.x<-40)c.x=W+30;if(c.x>W+40)c.x=-30;
      const sq=Math.abs(Math.cos(c.rot));x.save();x.translate(px,c.y);x.scale(Math.max(.18,sq),1);
      const g=x.createRadialGradient(-c.r*.3,-c.r*.3,1,0,0,c.r);
      if(c.g){g.addColorStop(0,`rgba(255,235,160,${.55*k})`);g.addColorStop(1,`rgba(255,184,40,${.28*k})`)}else{g.addColorStop(0,`rgba(190,170,255,${.5*k})`);g.addColorStop(1,`rgba(100,80,230,${.22*k})`)}
      x.beginPath();x.arc(0,0,c.r,0,6.283);x.fillStyle=g;x.fill();x.lineWidth=1.2;x.strokeStyle=c.g?`rgba(255,215,100,${.5*k})`:`rgba(170,150,255,${.45*k})`;x.stroke();
      x.beginPath();x.arc(0,0,c.r*.62,0,6.283);x.stroke();x.restore()});
    if(mouse.x>0){const g=x.createRadialGradient(mouse.x,mouse.y,0,mouse.x,mouse.y,170);g.addColorStop(0,`rgba(139,108,255,${.16*k})`);g.addColorStop(1,'rgba(139,108,255,0)');x.fillStyle=g;x.fillRect(mouse.x-170,mouse.y-170,340,340)}
    if(!matchMedia('(prefers-reduced-motion:reduce)').matches)requestAnimationFrame(draw)}
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!running&&!matchMedia('(prefers-reduced-motion:reduce)').matches){running=true;requestAnimationFrame(draw)}});
  requestAnimationFrame(draw)})();

function confetti(){const c=$('#fx'),x=c.getContext('2d');c.width=innerWidth;c.height=innerHeight;const cols=['#8b6cff','#22d3ee','#2ee6a6','#ffc857','#ff5d7a','#ff9f5a'];
  const ps=Array.from({length:150},()=>({x:innerWidth/2+(Math.random()-.5)*160,y:innerHeight*.62,vx:(Math.random()-.5)*18,vy:-Math.random()*17-5,s:Math.random()*8+4,r:Math.random()*6,vr:(Math.random()-.5)*.4,c:cols[Math.random()*6|0]}));let n=0;
  (function f(){x.clearRect(0,0,c.width,c.height);let alive=0;ps.forEach(p=>{p.vy+=.38;p.vx*=.992;p.x+=p.vx;p.y+=p.vy;p.r+=p.vr;if(p.y<c.height+30){alive++;x.save();x.translate(p.x,p.y);x.rotate(p.r);x.fillStyle=p.c;x.fillRect(-p.s/2,-p.s/4,p.s,p.s/2);x.restore()}});
    if(alive&&++n<260)requestAnimationFrame(f);else x.clearRect(0,0,c.width,c.height)})()}

/* اقتباسات متغيرة */
(function(){const q=$('#quote');let i=0;const set=()=>{q.style.opacity=0;setTimeout(()=>{q.textContent=QUOTES[i++%QUOTES.length];q.style.opacity=1},500)};set();setInterval(set,7500)})();

/* ============================================================
   Firebase — مزامنة سحابية (اختيارية، تعمل تلقائياً عند الاستضافة)
   ============================================================ */
/* ============================================================
   تسجيل الدخول + Firebase (كل مستخدم له مستنده الخاص)
   ============================================================ */
let FB=null,uidNow=null,cloudUser={email:'',name:''},unsub=null,retryT=null,lastSync='',amode='in',pendingName='',deleting=false;
const SYNC={cloud:['☁️','متزامن'],local:['💾','محلي'],busy:['⏳','جاري الاتصال'],err:['⚠️','تعذرت المزامنة']};
const chipH=m=>`${SYNC[m][0]}<span class="hm"> ${SYNC[m][1]}</span>`;
function setSync(m,msg){const key=m+'|'+(msg||''),changed=key!==lastSync;lastSync=key;syncMode=m;cloudMsg=msg||'';
  const e=$('#sync');if(e){e.className='chip '+m;e.innerHTML=chipH(m);e.title=cloudMsg}
  if(changed&&uidNow&&view==='set'&&!$('.ov')&&!/INPUT|SELECT/.test(document.activeElement.tagName))render(true)}
function explain(e){const c=(e&&e.code)||'',m=String((e&&e.message)||e||'');
  if(c==='permission-denied'||/insufficient permissions/i.test(m))return 'تعذّر الحفظ: تأكد أن بريدك مُفعّل، وأن توقيت جهازك صحيح، وأن قواعد Firestore (ملف firestore.rules) منشورة.';
  if(c==='not-found'||/NOT_FOUND|does not exist/i.test(m))return 'أنشئ قاعدة Firestore من: Firebase ← Firestore Database ← Create database.';
  if(c==='unavailable'||c==='auth/network-request-failed'||!navigator.onLine)return 'ما فيه اتصال — بياناتك محفوظة على جهازك وتتزامن أول ما يرجع الإنترنت.';
  return authErr(e)||('خطأ: '+(c||m).slice(0,90))}
function authErr(e){const c=(e&&e.code)||'';
  const M={'auth/invalid-email':'صيغة البريد الإلكتروني غير صحيحة','auth/missing-password':'اكتب كلمة المرور','auth/user-not-found':'البريد أو كلمة المرور غير صحيحة','auth/wrong-password':'البريد أو كلمة المرور غير صحيحة',
  'auth/invalid-credential':'البريد أو كلمة المرور غير صحيحة','auth/invalid-login-credentials':'البريد أو كلمة المرور غير صحيحة','auth/email-already-in-use':'هذا البريد مسجل مسبقاً — جرّب تسجيل الدخول',
  'auth/weak-password':'كلمة المرور ضعيفة (6 أحرف على الأقل)','auth/too-many-requests':'محاولات كثيرة — انتظر قليلاً ثم جرّب من جديد','auth/network-request-failed':'تحقق من اتصال الإنترنت',
  'auth/operation-not-allowed':'طريقة الدخول غير مفعّلة: فعّل Email/Password و Google من Firebase ← Authentication ← Sign-in method','auth/unauthorized-domain':'هذا الدومين غير مضاف: أضفه في Firebase ← Authentication ← Settings ← Authorized domains',
  'auth/configuration-not-found':'خدمة تسجيل الدخول غير مفعّلة في مشروع Firebase — افتح Authentication واضغط "Get started" ثم فعّل Email/Password و Google','auth/user-disabled':'هذا الحساب موقوف','auth/popup-closed-by-user':'','auth/cancelled-popup-request':'','auth/invalid-api-key':'مفتاح Firebase غير صحيح','auth/api-key-not-valid':'مفتاح Firebase غير صحيح'};
  return c in M?M[c]:(c.startsWith('auth/')?'تعذر تنفيذ العملية ('+c.slice(5)+')':'')}
/* ---- واجهة شاشة الدخول ---- */
function authView(v,msg){$('#averify').hidden=v!=='verify';$('#aload').hidden=v!=='loading';$('#aform').hidden=v!=='form';$('#aerrbox').hidden=v!=='error';if(v==='error')$('#aerrtxt').textContent=msg||''}
function aerr(t,ok){const e=$('#aerr');e.textContent=t||'';e.className='aerr'+(ok?' ok':'')}
function setAmode(m){amode=m;{const ph=$('#pwhint');if(ph)ph.hidden=m!=='up'}$$('.atabs button').forEach(b=>b.classList.toggle('on',b.dataset.m===m));$('#aname').hidden=m!=='up';$('#asubmit').textContent=m==='up'?'إنشاء حساب جديد':'دخول';
  const pw=$('#authform [name=pass]');if(pw)pw.autocomplete=m==='up'?'new-password':'current-password';aerr('')}
const strongPw=p=>p.length>=8&&p.length<=128&&/[A-Za-z\u0600-\u06FF]/.test(p)&&/\d/.test(p);
async function doAuth(f){
  if(!FB)return aerr('جاري الاتصال… جرّب بعد لحظة');
  const {Au,auth}=FB,email=f.email.value.trim(),pass=f.pass.value,btn=$('#asubmit');
  if(!email||!pass)return aerr('اكتب البريد وكلمة المرور');
  if(amode==='up'&&!strongPw(pass))return aerr('كلمة المرور لازم تكون 8 أحرف على الأقل وفيها حروف وأرقام');
  btn.disabled=true;aerr('');
  try{
    if(amode==='up'){const n=cT(f.name.value,30);pendingName=n;const cr=await Au.createUserWithEmailAndPassword(auth,email,pass);if(n){try{await Au.updateProfile(cr.user,{displayName:n})}catch(e){}}await sendVerify(cr.user)}
    else await Au.signInWithEmailAndPassword(auth,email,pass);
  }catch(e){aerr(authErr(e)||'تعذر تنفيذ العملية')}
  btn.disabled=false}
/* ---- تفعيل البريد الإلكتروني قبل استخدام التطبيق ---- */
let lastVerifyAt=0;
const needsVerify=u=>!u.emailVerified&&(u.providerData||[]).some(p=>p.providerId==='password');
function aerrV(t,ok){const e=$('#averr');if(e){e.textContent=t||'';e.className='aerr'+(ok?' ok':'')}}
async function sendVerify(u){try{await FB.Au.sendEmailVerification(u);lastVerifyAt=Date.now();return true}catch(e){return false}}
async function resendVerify(){const u=FB&&FB.auth.currentUser;if(!u)return;if(Date.now()-lastVerifyAt<60000)return aerrV('انتظر دقيقة قبل إعادة الإرسال');aerrV(await sendVerify(u)?'✅ أرسلنا الرابط من جديد — تفقد بريدك والـ Spam':'تعذر الإرسال، جرّب بعد قليل',true)}
async function checkVerified(){const a=FB&&FB.auth;if(!a||!a.currentUser)return;
  try{await a.currentUser.reload();if(a.currentUser.emailVerified){await a.currentUser.getIdToken(true);enterApp(a.currentUser)}else aerrV('لسه ما انفعّل — افتح الرابط اللي وصلك على بريدك ثم اضغط مرة ثانية')}catch(e){aerrV(authErr(e)||'تعذر التحقق')}}
function showVerify(u){
  uidNow=null;if(unsub){unsub();unsub=null}state=def();document.body.dataset.auth='0';closeModal(true);$('#view').innerHTML='';$('#topbar').innerHTML='';$('#nav').innerHTML='';
  $('#vmail').textContent=u.email||'';aerrV('');authView('verify')}
async function forgotPw(){
  if(!FB)return;const em=$('#authform [name=email]').value.trim();
  if(!em)return aerr('اكتب بريدك أولاً ثم اضغط "نسيت كلمة المرور"');
  try{await FB.Au.sendPasswordResetEmail(FB.auth,em);aerr('✅ أرسلنا رابط إعادة التعيين لبريدك — تفقد البريد والـ Spam',true)}catch(e){aerr(authErr(e)||'تعذر الإرسال')}}
async function googleLogin(){
  if(!FB)return aerr('جاري الاتصال… جرّب بعد لحظة');
  const {Au,auth}=FB,prov=new Au.GoogleAuthProvider();prov.setCustomParameters({prompt:'select_account'});
  try{await Au.signInWithPopup(auth,prov)}
  catch(e){
    if(e.code==='auth/popup-blocked'||e.code==='auth/operation-not-supported-in-this-environment'){try{await Au.signInWithRedirect(auth,prov)}catch(er){aerr(authErr(er))}}
    else{const m=authErr(e);if(m)aerr(m)}}}
/* ---- تحميل Firebase والتحقق من الجلسة ---- */
async function loadFirebase(){
  if(FB)return FB;
  const base='https://www.gstatic.com/firebasejs/10.12.2/';
  const [A,Au,F]=await Promise.all([import(base+'firebase-app.js'),import(base+'firebase-auth.js'),import(base+'firebase-firestore.js')]);
  const app=A.getApps().length?A.getApp():A.initializeApp(firebaseConfig);
  if(APP_CHECK_SITE_KEY){const AC=await import(base+'firebase-app-check.js');AC.initializeAppCheck(app,{provider:new AC.ReCaptchaV3Provider(APP_CHECK_SITE_KEY),isTokenAutoRefreshEnabled:true})}
  const auth=Au.getAuth(app);
  let db;try{db=F.initializeFirestore(app,{localCache:F.persistentLocalCache({tabManager:F.persistentMultipleTabManager()})})}catch(e){db=F.getFirestore(app)}
  FB={Au,F,auth,db};return FB}
async function initAuth(){
  authView('loading');
  if(location.protocol==='file:')return authView('error','افتح الموقع من رابط الاستضافة (https) — لا يعمل بالفتح المباشر من الملف.');
  try{await loadFirebase()}catch(e){console.warn(e);return authView('error','تعذر تحميل خدمة الحسابات — تأكد من اتصالك بالإنترنت ثم أعد المحاولة.')}
  const {Au,auth}=FB;
  try{await Au.getRedirectResult(auth)}catch(e){console.warn(e)}
  Au.onAuthStateChanged(auth,u=>{if(!u)return leaveApp();if(needsVerify(u))return showVerify(u);enterApp(u)})}
function enterApp(u){
  if(uidNow===u.uid)return;
  uidNow=u.uid;cloudUser={email:u.email||'',name:u.displayName||pendingName||''};
  state=loadLocal(uidNow);cur=mk(todayISO());getM(cur);view='dash';flt={type:'all',q:'',cat:''};
  if(!state.settings.name&&cloudUser.name)state.settings.name=cloudUser.name.split(' ')[0];
  locked=false;document.body.dataset.lock='0';$('#lock').hidden=true;
  document.body.dataset.auth='1';closeModal(true);setSync('busy');if(lockCfg())lockNow();else{render();resetIdle()}startSync();scrollTo(0,0);
  if(new URLSearchParams(location.search).get('add')){history.replaceState(null,'',location.pathname);setTimeout(()=>{if(state.settings.onboarded&&!$('.ov'))txModal()},1200)}}
function leaveApp(){
  uidNow=null;if(unsub){unsub();unsub=null}state=def();deleting=false;locked=false;clearTimeout(idleT);$('#lock').hidden=true;document.body.dataset.lock='0';
  document.body.dataset.auth='0';closeModal(true);$('#view').innerHTML='';$('#topbar').innerHTML='';$('#nav').innerHTML='';
  const f=$('#authform');if(f)f.reset();authView('form');setAmode('in')}
/* ---- المزامنة اللحظية مع مستند المستخدم فقط ---- */
function startSync(){
  const {F,db}=FB;if(!uidNow)return;if(unsub){unsub();unsub=null}
  let first=true;const me=uidNow;
  unsub=F.onSnapshot(F.doc(db,'users',me),snap=>{
    if(uidNow!==me||deleting)return;
    try{
      if(!snap.exists()){if(snap.metadata.fromCache)return;pushCloud(true)}
      else{const r=normalize(JSON.parse(snap.data().json)),ru=r.updatedAt||0,lu=state.updatedAt||0;
        if(ru>lu){state=migrate(r);persist();getM(cur);render(true);toast(first?'☁️ تمت مزامنة بياناتك':'☁️ وصلك تحديث من جهاز آخر')}
        else if(first&&ru<lu)pushCloud(true)}
      setSync('cloud',cloudUser.email);
      if(first){first=false;if(!state.settings.onboarded)setTimeout(onboarding,350);setTimeout(()=>{syncRemToSW();notifyDue();if(view==='dash'&&!$('.ov'))render(true)},700)}
    }catch(e){console.warn(e)}
  },err=>{console.warn(err);setSync('err',explain(err))})}
async function pushCloud(force){
  if(!FB||!uidNow||deleting||(!dirty&&!force))return;
  try{dirty=false;const {F,db}=FB,ts=state.updatedAt||(state.updatedAt=Date.now());
    const js=JSON.stringify(state);if(js.length>400000)toast('⚠️ حجم بياناتك كبير — خذ نسخة احتياطية من الإعدادات');await F.setDoc(F.doc(db,'users',uidNow),{json:js,updatedAt:ts});setSync('cloud',cloudUser.email)}
  catch(e){dirty=true;console.warn(e);setSync('err',explain(e));clearTimeout(retryT);retryT=setTimeout(()=>pushCloud(true),15000)}}
async function doLogout(){
  try{if(dirty)await pushCloud(true);if(unsub){unsub();unsub=null}const {Au,F,auth,db}=FB;
    try{localStorage.removeItem(keyFor(uidNow));localStorage.removeItem('flousi_lock_'+uidNow);localStorage.removeItem('flousi_lockfail_'+uidNow)}catch(e){}
    try{await caches.delete('flousi-meta')}catch(e){}
    try{await F.terminate(db);await F.clearIndexedDbPersistence(db)}catch(e){}
    await Au.signOut(auth);location.reload()}catch(e){toast(explain(e))}}
async function delAccount(){
  deleting=true;
  try{const {Au,F,auth,db}=FB,u=auth.currentUser;await F.deleteDoc(F.doc(db,'users',u.uid));await Au.deleteUser(u);try{localStorage.removeItem(keyFor(u.uid));localStorage.removeItem('flousi_lock_'+u.uid)}catch(e){}toast('تم حذف حسابك وبياناتك')}
  catch(e){deleting=false;dirty=true;pushCloud(true);toast(e.code==='auth/requires-recent-login'?'لأسباب أمنية: سجّل خروج ثم ادخل من جديد وحاول مرة ثانية':explain(e))}}
function syncCard(){
  const ic={cloud:'✅',local:'💾',busy:'⏳',err:'⚠️'}[syncMode],
  txt=syncMode==='cloud'?'متصل — بياناتك تتزامن لحظياً بين أجهزتك':syncMode==='busy'?'جاري الاتصال بقاعدة البيانات…':syncMode==='err'?esc(cloudMsg):'غير متصل';
  return `<div class="card"><h3>👤 حسابي</h3>
    <div class="tip"><span>📧</span><span style="direction:ltr;unicode-bidi:plaintext;word-break:break-all">${esc(cloudUser.email)}</span></div>
    <div class="tip"><span>${ic}</span><span>${txt}</span></div>
    <div class="tip"><span>🔒</span><span>بياناتك خاصة بحسابك وحدك — لا أحد يقدر يشوفها غيرك.</span></div>
    <div style="display:flex;flex-direction:column;gap:10px;margin-top:6px"><button class="btn" data-act="resync">🔄 مزامنة الآن</button><button class="btn red" data-act="logout">🚪 تسجيل الخروج</button>
    <button class="btn" data-act="del-account" style="opacity:.7">🗑️ حذف حسابي وبياناتي نهائياً</button></div></div>`}
document.addEventListener('visibilitychange',()=>{if(document.hidden&&FB&&dirty){clearTimeout(pushT);pushCloud()}});
addEventListener('pagehide',()=>{if(FB&&dirty)pushCloud()});
addEventListener('online',()=>{if(FB&&uidNow)pushCloud(true)});

/* ============================================================
   تصنيفات مخصصة · تذكيرات · تثبيت التطبيق · تقرير PDF
   ============================================================ */
function catsCard(){
  const rows=Object.keys(TYPES).flatMap(t=>(state.cats[t]||[]).map(c=>`<div class="catrow"><span style="font-size:22px">${esc(c.i)}</span><div style="flex:1"><b>${esc(c.n)}</b><div style="color:var(--mut);font-size:12px">${TYPES[t].label}${c.need?' · احتياج أساسي':''}</div></div><button class="btn sm red" data-act="del-cat" data-t="${t}" data-n="${esc(c.n)}">🗑️</button></div>`));
  return `<div class="card"><h3>🏷️ تصنيفاتي <button class="btn sm pri" data-act="add-cat">＋ إضافة</button></h3>${rows.length?rows.join(''):'<div class="empty" style="padding:14px">أضف تصنيفاتك الخاصة (قهوة، حيوان أليف، نادي رياضي…). تظهر في المعاملات والميزانية والتقارير.</div>'}</div>`}
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='ncName'){e.preventDefault();const b=$('[data-act="save-cat"]');if(b)b.click()}});

/* ---- التذكيرات ---- */
const remCfg=()=>({salaryDay:0,salaryLead:1,debtLead:2,notif:false,...((state.settings&&state.settings.rem)||{})});
const isoD=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const parseD=iso=>{const[y,m,d]=iso.split('-').map(Number);return new Date(y,m-1,d)};
const salaryOn=(y,m,day)=>new Date(y,m,Math.min(day,new Date(y,m+1,0).getDate()));
function dueReminders(){
  const out=[],t0=new Date();t0.setHours(0,0,0,0);const r=remCfg(),DAY=864e5;
  if(r.salaryDay>0){let d=salaryOn(t0.getFullYear(),t0.getMonth(),r.salaryDay);if(d<t0)d=salaryOn(t0.getFullYear(),t0.getMonth()+1,r.salaryDay);
    const left=Math.round((d-t0)/DAY);
    if(left<=r.salaryLead)out.push({k:'sal:'+isoD(d),ic:'💰',left,text:left===0?'اليوم نزول الراتب 🎉 وزّع الباقي':left===1?'غداً نزول الراتب — أدخل الباقي الفعلي':`باقي ${left} أيام على نزول الراتب`})}
  const dp=state.debt.pay,i=dp.findIndex(x=>!x.paid);
  if(state.debt.total>0&&i>-1){const left=Math.round((parseD(dp[i].d)-t0)/DAY);
    if(left<=r.debtLead)out.push({k:'debt:'+dp[i].d,ic:'💳',left,text:left<0?`قسط ${state.debt.name} متأخر ${-left} يوم (${money(dp[i].a)})`:left===0?`اليوم موعد قسط ${state.debt.name} (${money(dp[i].a)})`:`قسط ${state.debt.name} بعد ${left} ${left===1?'يوم':left<=10?'أيام':'يوماً'} (${money(dp[i].a)})`})}
  return out}
function remindersCard(){const due=dueReminders();if(!due.length)return '';
  return `<div class="card" style="margin-bottom:16px;border-color:rgba(255,200,87,.45)"><h3>🔔 تذكيرات</h3>${due.map(x=>`<div class="rmd"><span style="font-size:26px">${x.ic}</span><b style="flex:1">${esc(x.text)}</b><button class="btn sm pri" data-act="nav" data-v="split">افتح التقسيمة</button></div>`).join('')}</div>`}
async function metaGet(n){try{const c=await caches.open('flousi-meta'),r=await c.match(n);return r?await r.json():null}catch(e){return null}}
async function metaPut(n,o){try{const c=await caches.open('flousi-meta');await c.put(n,new Response(JSON.stringify(o)))}catch(e){}}
async function syncRemToSW(){
  const r=remCfg(),dp=state.debt.total>0?state.debt.pay.filter(x=>!x.paid).slice(0,3).map(x=>({d:x.d,a:x.a})):[];
  await metaPut('cfg',{salaryDay:r.salaryDay,salaryLead:r.salaryLead,debtLead:r.debtLead,debtName:state.debt.name,debt:dp,notif:!!r.notif});
  try{const reg=await navigator.serviceWorker.ready;if(r.notif&&reg.periodicSync&&Notification.permission==='granted')await reg.periodicSync.register('flousi-reminders',{minInterval:12*36e5})}catch(e){}}
async function showNote(body,tag){
  const o={body,icon:'icons/icon-192.png',badge:'icons/icon-192.png',tag,dir:'rtl',lang:'ar'};
  try{const reg=navigator.serviceWorker&&await navigator.serviceWorker.getRegistration();if(reg)await reg.showNotification('فلوسي',o);else new Notification('فلوسي',o)}catch(e){}}
async function notifyDue(){
  if(!('Notification' in window)||Notification.permission!=='granted'||!remCfg().notif)return;
  const due=dueReminders();if(!due.length)return;const seen=(await metaGet('seen'))||{},today=todayISO();let ch=false;
  for(const x of due){if(seen[x.k]===today)continue;seen[x.k]=today;ch=true;await showNote(x.text,x.k)}
  if(ch)await metaPut('seen',seen)}
async function enableNotif(){
  if(!('Notification' in window))return toast('متصفحك لا يدعم الإشعارات — استخدم تذكير التقويم 📅');
  let pm=Notification.permission;if(pm==='default')pm=await Notification.requestPermission();
  if(pm!=='granted')return toast('تم رفض الإذن — فعّله من إعدادات المتصفح');
  state.settings.rem={...remCfg(),notif:true};save();await syncRemToSW();await showNote('تم تفعيل التذكيرات ✅','test');render(true);toast('تم تفعيل الإشعارات 🔔')}
function buildICS(){
  const r=remCfg(),L=[],E=t=>String(t).replace(/\r/g,'').replace(/[\\;,]/g,'\\$&').replace(/\n/g,'\\n'),stamp=new Date().toISOString().replace(/[-:]/g,'').split('.')[0]+'Z',cu=state.settings.currency;
  const ev=(id,date,title,desc,rrule,leads)=>{const d=date.replace(/-/g,'');
    L.push('BEGIN:VEVENT','UID:'+id+'@flousi','DTSTAMP:'+stamp,'DTSTART:'+d+'T090000','DTEND:'+d+'T093000','SUMMARY:'+E(title),'DESCRIPTION:'+E(desc));
    if(rrule)L.push(rrule);leads.forEach(m=>L.push('BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:'+E(title),'TRIGGER:-PT'+m+'M','END:VALARM'));L.push('END:VEVENT')};
  L.push('BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Flousi//AR//EN','CALSCALE:GREGORIAN','X-WR-CALNAME:فلوسي');
  if(r.salaryDay>0){const t0=new Date();t0.setHours(0,0,0,0);let d=salaryOn(t0.getFullYear(),t0.getMonth(),r.salaryDay);if(d<t0)d=salaryOn(t0.getFullYear(),t0.getMonth()+1,r.salaryDay);
    const days=r.salaryDay>28?Array.from({length:r.salaryDay-27},(_,i)=>28+i).join(','):String(r.salaryDay);
    const rr='RRULE:FREQ=MONTHLY;BYMONTHDAY='+days+(r.salaryDay>28?';BYSETPOS=-1':'');
    ev('salary',isoD(d),'💰 نزول الراتب — أدخل الباقي الفعلي في فلوسي','وزّع الباقي حسب تقسيمتك',rr,r.salaryLead>0?[0,r.salaryLead*1440]:[0])}
  if(state.debt.total>0)state.debt.pay.filter(x=>!x.paid).slice(0,36).forEach((x,i)=>ev('debt-'+x.d,x.d,`💳 قسط ${state.debt.name} — ${fmt(x.a)} ${cu}`,'موعد سداد القسط',null,r.debtLead>0?[0,r.debtLead*1440]:[0]));
  L.push('END:VCALENDAR');return L.join('\r\n')}
function exportICS(){
  if(!(remCfg().salaryDay>0)&&!(state.debt.total>0))return toast('حدد يوم نزول الراتب أو أضف دين أولاً');
  const blob=new Blob([buildICS()],{type:'text/calendar;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='flousi-reminders.ics';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1500);
  toast('📅 افتح الملف وأضفه لتقويمك')}
function remCard(){
  const r=remCfg(),perm='Notification' in window?Notification.permission:'unsupported',lead=(k,arr)=>arr.map(n=>`<option value="${n}" ${r[k]===n?'selected':''}>${n===0?'نفس اليوم':n+(n===1?' يوم':' أيام')}</option>`).join('');
  return `<div class="card"><h3>🔔 التذكيرات</h3>
    <div class="rem-row"><span>يوم نزول الراتب (من الشهر)</span><input data-rem="salaryDay" inputmode="numeric" placeholder="مثال 29" value="${r.salaryDay||''}"></div>
    <div class="rem-row"><span>ذكّرني قبل الراتب بـ</span><select data-rem="salaryLead">${lead('salaryLead',[0,1,2,3])}</select></div>
    <div class="rem-row"><span>ذكّرني بقسط الدين قبل</span><select data-rem="debtLead">${lead('debtLead',[0,1,2,3,5,7])}</select></div>
    <div style="display:flex;flex-direction:column;gap:10px;margin-top:12px"><button class="btn pri" data-act="enable-notif">${r.notif&&perm==='granted'?'✅ الإشعارات مفعّلة':'🔔 تفعيل الإشعارات'}</button>
    <button class="btn" data-act="export-ics">📅 إضافة التذكيرات للتقويم</button></div>
    <p style="margin-top:10px;color:var(--mut);font-size:12px">التذكير يظهر داخل التطبيق وكإشعار عند فتحه. أضمن طريقة للتنبيه والموقع مغلق هي <b>التقويم</b>. ${isIOS()&&!isStandalone()?'في آيفون: ثبّت التطبيق أولاً عشان تشتغل الإشعارات.':''}</p></div>`}

/* ---- تثبيت التطبيق (PWA) ---- */
let deferredInstall=null;
const isStandalone=()=>{try{return matchMedia('(display-mode: standalone)').matches||navigator.standalone===true}catch(e){return false}};
const isIOS=()=>/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstall=e;if(uidNow&&(view==='set'||view==='dash')&&!$('.ov'))render(true)});
addEventListener('appinstalled',()=>{deferredInstall=null;toast('تم تثبيت فلوسي 🎉');if(uidNow)render(true)});
if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol))addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(e=>console.warn('SW',e)));
function installCard(){
  let body;
  if(isStandalone())body='<div class="tip"><span>✅</span><span>التطبيق مثبّت على جهازك.</span></div>';
  else if(deferredInstall)body='<p>أيقونة على شاشتك الرئيسية، ويفتح بملء الشاشة وبدون شريط المتصفح.</p><button class="btn pri" data-act="install">📲 تثبيت التطبيق</button>';
  else if(isIOS())body='<div class="tip"><span>📲</span><span>في آيفون: اضغط زر المشاركة <b>⬆️</b> في Safari ثم <b>"إضافة إلى الشاشة الرئيسية"</b>.</span></div>';
  else body='<div class="tip"><span>📲</span><span>من قائمة المتصفح ⋮ اختر <b>"تثبيت التطبيق"</b> أو <b>"إضافة إلى الشاشة الرئيسية"</b>.</span></div>';
  return `<div class="card"><h3>📲 تثبيت التطبيق</h3>${body}</div>`}
function installBanner(){let off=false;try{off=!!localStorage.getItem('flousi_noinst')}catch(e){}
  if(isStandalone()||!deferredInstall||off)return '';
  return `<div class="card" style="margin-bottom:16px;display:flex;gap:14px;align-items:center;flex-wrap:wrap"><span style="font-size:30px">📲</span><div style="flex:1;min-width:190px"><b>ثبّت فلوسي على جوالك</b><div style="color:var(--mut);font-size:13px">أيقونة على الشاشة ويفتح بملء الشاشة.</div></div><button class="btn pri sm" data-act="install">تثبيت</button><button class="btn sm" data-act="dismiss-inst">لاحقاً</button></div>`}

/* ---- تقرير الشهر PDF ---- */
function reportHTML(){
  const RC={income:'#0f9d73',expense:'#d6334f',invest:'#1f6fd1',saving:'#b27300',debt:'#c2570f'};
  const key=cur,t=totals(key),m=peek(key),inc=t.income,f=forecast(key),sc=score(t),g=groups(key),rule=RULES[state.settings.rule]||RULES[0];
  const P='padding:0 34px;margin-bottom:20px',H=(ic,tx)=>`<div style="font-size:17px;font-weight:900;margin-bottom:10px;color:#2a2f6b">${ic} ${tx}</div>`;
  const bar=(p,c)=>`<div style="height:9px;border-radius:9px;background:#e9ecf9;overflow:hidden"><div style="width:${Math.min(100,Math.max(0,p))}%;height:100%;border-radius:9px;background:${c}"></div></div>`;
  const kpi=(ic,l,v,c)=>`<div style="flex:0 0 calc(33.33% - 8px);box-sizing:border-box;border:1px solid #e3e6f5;border-radius:16px;padding:14px;background:#fafbff"><div style="font-size:20px">${ic}</div><div style="color:#6b7399;font-size:12px;font-weight:700;margin-top:4px">${l}</div><div style="font-size:20px;font-weight:900;color:${c};margin-top:2px">${money(v)}</div></div>`;
  const S=(inner,st)=>`<div class="rsec" style="${P};${st||''}">${inner}</div>`,mini=(l,v)=>`<div style="flex:1;border-radius:14px;background:#f1efff;padding:12px;text-align:center"><div style="font-size:11px;color:#6b7399;font-weight:700">${l}</div><div style="font-size:16px;font-weight:900;color:#3a2f9e;margin-top:3px">${v}</div></div>`;
  let h=`<div class="rsec" style="background:linear-gradient(135deg,#7c5cff,#22d3ee);color:#fff;padding:30px 34px;margin-bottom:22px;display:flex;justify-content:space-between;align-items:center"><div><div style="font-size:15px;opacity:.9;font-weight:700">💸 فلوسي — تقرير شهري</div><div style="font-size:34px;font-weight:900;margin-top:4px">${mName(key)}</div>${state.settings.name?`<div style="opacity:.9;margin-top:2px">${esc(state.settings.name)}</div>`:''}</div><div style="text-align:left;font-size:12px;opacity:.9">تاريخ الإصدار<br><b>${fDate(todayISO())}</b></div></div>`;
  h+=S(`<div style="display:flex;flex-wrap:wrap;gap:12px">${kpi('💰','إجمالي الدخل',t.income,'#12a67a')}${kpi('🛒','المصروفات',t.expense,'#e0455f')}${kpi('🏦','الادخار',t.saving,'#d99a1a')}${kpi('📈','الاستثمار',t.invest,'#2f7fe0')}${kpi('💳','سداد الديون',t.debt,'#e07a2f')}${kpi('💎','الرصيد المتاح',t.avail,t.avail>=0?'#12a67a':'#e0455f')}</div>`);
  h+=S(`<div style="display:flex;gap:12px">${mini('نسبة الادخار والاستثمار',inc>0?((t.saving+t.invest)/inc*100).toFixed(0)+'%':'—')}${mini('الصحة المالية',sc===null?'—':sc+' / 100')}${mini('متوسط الصرف اليومي',money(f.daily))}${mini('رصيد بداية الشهر',money(t.opening))}</div>`);
  const cats=byCat(key);
  if(cats.length){const mx=cats[0][1];h+=S(H('🍩','المصروفات حسب التصنيف')+cats.map(([c,v],i)=>{const lim=state.budgets[c]||0;
    return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:${lim>0?3:9}px"><div style="width:150px;font-weight:700">${catIcon('expense',c)} ${esc(c)}</div><div style="flex:1">${bar(v/mx*100,PAL[i%PAL.length])}</div><div style="width:110px;text-align:left;font-weight:800">${money(v)}</div><div style="width:42px;text-align:left;color:#6b7399;font-size:12px">${t.expense>0?(v/t.expense*100).toFixed(0):0}%</div></div>${lim>0?`<div style="margin:0 160px 9px 0;font-size:11px;color:#6b7399">الميزانية: ${money(lim)} · ${v>lim?`<span style="color:#e0455f;font-weight:800">تجاوز ${money(v-lim)}</span>`:'<span style="color:#12a67a;font-weight:800">ضمن الميزانية</span>'}</div>`:''}`}).join(''))}
  if(inc>0){const rows=[['🏠','الاحتياجات',g.needs,rule[0],'#2f7fe0',true],['🎮','الرغبات',g.wants,rule[1],'#e07a2f',true],['🌱','الادخار والاستثمار',g.future,rule[2],'#12a67a',false]];
    h+=S(H('🧠',`توزيع الدخل (قاعدة ${rule.join('/')})`)+rows.map(([ic,n,a,pct,c,lim])=>{const tg=inc*pct/100,p=tg>0?a/tg*100:0;return `<div style="margin-bottom:11px"><div style="display:flex;justify-content:space-between;font-weight:700;margin-bottom:5px"><span>${ic} ${n} <span style="color:#6b7399;font-weight:500;font-size:12px">(${pct}% = ${money(tg)})</span></span><span>${money(a)} · ${p.toFixed(0)}%</span></div>${bar(p,lim&&p>100?'#e0455f':c)}</div>`}).join(''))}
  if(state.goals.length)h+=S(H('🏆','الأهداف')+state.goals.map(x=>{const p=x.target>0?x.saved/x.target*100:0;return `<div style="margin-bottom:11px"><div style="display:flex;justify-content:space-between;font-weight:700;margin-bottom:5px"><span>${esc(x.emoji)} ${esc(x.name)}</span><span>${money(x.saved)} / ${money(x.target)} · ${p.toFixed(0)}%</span></div>${bar(p,p>=100?'#12a67a':'#7c5cff')}</div>`}).join(''));
  const iv=state.investments;if(iv.length){const ti=iv.reduce((a,x)=>a+x.invested,0),tv=iv.reduce((a,x)=>a+x.value,0),pl=tv-ti;
    h+=S(H('📈','المحفظة الاستثمارية')+`<div style="display:flex;gap:12px;margin-bottom:10px">${mini('المستثمر',money(ti))}${mini('القيمة الحالية',money(tv))}${mini('الربح / الخسارة',(pl>=0?'+':'')+money(pl))}</div>`+iv.map(x=>{const p=x.value-x.invested;return `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eef0fa;font-weight:700"><span>${catIcon('invest',x.type)} ${esc(x.name)}</span><span style="color:${p>=0?'#12a67a':'#e0455f'}">${money(x.value)} (${p>=0?'+':''}${fmt(p)})</span></div>`}).join(''))}
  if(state.debt.total>0){const dc=debtCalc();h+=S(H('💳',esc(state.debt.name))+bar(dc.pct,'#d99a1a')+`<div style="display:flex;justify-content:space-between;margin-top:8px;font-weight:700"><span>مسدد ${money(dc.paid)}</span><span>المتبقي ${money(dc.left)}</span><span>${dc.pct.toFixed(0)}%</span></div>`+(dc.next>-1?`<div style="color:#6b7399;font-size:12px;margin-top:6px">القسط القادم: ${fDate(state.debt.pay[dc.next].d)} — ${money(state.debt.pay[dc.next].a)}</div>`:''))}
  const tx=[...m.tx].sort((a,b)=>a.date.localeCompare(b.date)||a.ts-b.ts),cell='padding:7px 8px',th=`<tr style="background:#f1efff;color:#3a2f9e;font-size:12px"><th style="${cell};text-align:right">التاريخ</th><th style="${cell};text-align:right">النوع</th><th style="${cell};text-align:right">التصنيف</th><th style="${cell};text-align:right">ملاحظة</th><th style="${cell};text-align:left">المبلغ</th></tr>`;
  if(!tx.length)h+=S(H('🧾','المعاملات')+'<div style="color:#6b7399">لا توجد معاملات هذا الشهر.</div>');
  for(let i=0;i<tx.length;i+=15){h+=S((i===0?H('🧾',`كل المعاملات (${tx.length})`):'')+`<table style="width:100%;border-collapse:collapse;font-size:12.5px"><thead>${th}</thead><tbody>${tx.slice(i,i+15).map((x,j)=>`<tr style="background:${j%2?'#fafbff':'#fff'}"><td style="${cell}">${x.date.slice(8)}/${x.date.slice(5,7)}</td><td style="${cell};color:${RC[x.type]};font-weight:800">${TYPES[x.type].label}</td><td style="${cell}">${catIcon(x.type,x.cat)} ${esc(x.cat)}</td><td style="${cell};color:#6b7399">${esc(x.note||'')}</td><td style="${cell};text-align:left;font-weight:800;color:${RC[x.type]}">${TYPES[x.type].sign}${fmt(x.amount)}</td></tr>`).join('')}</tbody></table>`)}
  h+=`<div class="rsec" style="text-align:center;color:#8a90b3;font-size:11px;padding:6px 34px 24px">تم إنشاؤه بواسطة فلوسي 💸 — بياناتك خاصة بحسابك وحدك</div>`;
  return `<div class="rpt" dir="rtl" style="width:794px;position:relative;background:#fff;color:#1a2048;font-family:'Tajawal','Segoe UI',Tahoma,sans-serif;line-height:1.6;padding-bottom:10px;text-align:right">${h}</div>`}
function reportModal(){
  modal(`<h3>📄 تقرير ${mName(cur)}</h3><p>ملخص كامل للشهر: الدخل والمصروفات والتصنيفات والميزانية والأهداف والاستثمارات والدين وكل المعاملات.</p>
  <div class="rpv" id="rpv"><div id="rpin" style="width:794px">${reportHTML()}</div></div>
  <div style="display:flex;flex-direction:column;gap:10px"><button class="btn pri" data-act="rep-print">🖨️ حفظ كـ PDF / طباعة</button><button class="btn" data-act="rep-share">📤 مشاركة ملخص نصي</button></div>
  <p style="font-size:12px;color:var(--mut);margin-top:10px">لحفظ PDF اختر «حفظ بصيغة PDF» من نافذة الطباعة.</p>`);
  requestAnimationFrame(()=>{const w=$('#rpv'),i=$('#rpin');if(!w||!i)return;const k=Math.min(1,w.clientWidth/794);i.style.transform=`scale(${k})`;i.style.transformOrigin='top right';w.style.height=Math.min(340,i.offsetHeight*k)+'px'})}
function reportText(){
  const t=totals(cur),cats=byCat(cur).slice(0,6),L=[`📊 تقرير ${mName(cur)} — فلوسي`,'',`💰 الدخل: ${money(t.income)}`,`🛒 المصروفات: ${money(t.expense)}`,`🏦 الادخار: ${money(t.saving)}`,`📈 الاستثمار: ${money(t.invest)}`,`💳 سداد الديون: ${money(t.debt)}`,`💎 الرصيد المتاح: ${money(t.avail)}`];
  if(cats.length){L.push('','أعلى المصروفات:');cats.forEach(([c,v])=>L.push(`• ${c}: ${money(v)}`))}return L.join('\n')}
async function shareReport(){
  const text=reportText();
  try{if(navigator.share){await navigator.share({title:'تقرير فلوسي — '+mName(cur),text});return}}catch(e){if(e&&e.name==='AbortError')return}
  try{await navigator.clipboard.writeText(text);toast('تم نسخ الملخص 📋')}catch(e){toast('تعذرت المشاركة')}}
function printReport(){
  const fr=document.createElement('iframe');fr.style.cssText='position:fixed;right:0;bottom:0;width:0;height:0;border:0';document.body.appendChild(fr);
  const d=fr.contentWindow.document;d.open();d.write(`<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>تقرير فلوسي ${cur}</title><link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap" rel="stylesheet"><style>@page{size:A4;margin:0}body{margin:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}.rsec{break-inside:avoid}<\/style><\/head><body>${reportHTML()}<\/body><\/html>`);d.close();
  setTimeout(()=>{try{fr.contentWindow.focus();fr.contentWindow.print()}catch(e){toast('تعذرت الطباعة')}setTimeout(()=>fr.remove(),60000)},800)}
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&uidNow)notifyDue()});

/* ============================================================
   قفل التطبيق برمز (PIN) + حماية التصدير
   ============================================================ */
let locked=false,idleT=null,hiddenAt=0;
const b64=a=>btoa(String.fromCharCode(...new Uint8Array(a))),ub64=t=>Uint8Array.from(atob(t),c=>c.charCodeAt(0));
async function pinHash(pin,salt,iter){const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(pin),'PBKDF2',false,['deriveBits']);return new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt,iterations:iter},k,256))}
const eqb=(a,b)=>{if(a.length!==b.length)return false;let d=0;for(let i=0;i<a.length;i++)d|=a[i]^b[i];return d===0};
function lockCfg(){try{const c=JSON.parse(localStorage.getItem('flousi_lock_'+uidNow)||'null');return c&&typeof c.s==='string'&&typeof c.h==='string'&&c.n>=1e5&&[1,5,15,30].includes(c.m)?c:null}catch(e){return null}}
async function setPin(pin,mins){const salt=crypto.getRandomValues(new Uint8Array(16)),iter=150000,hh=await pinHash(pin,salt,iter);localStorage.setItem('flousi_lock_'+uidNow,JSON.stringify({s:b64(salt),h:b64(hh),n:iter,m:mins}))}
async function checkPin(pin){const c=lockCfg();if(!c)return true;if(!/^\d{4,6}$/.test(String(pin)))return false;return eqb(await pinHash(String(pin),ub64(c.s),c.n),ub64(c.h))}
const lerr=t=>{const e=$('#lerr');if(e)e.textContent=t||''};
function lockNow(){if(!uidNow||!lockCfg()||locked)return;locked=true;clearTimeout(idleT);closeModal(true);$('#view').innerHTML='';$('#topbar').innerHTML='';$('#nav').innerHTML='';
  document.body.dataset.lock='1';$('#lock').hidden=false;lerr('');$('#lpin').value='';setTimeout(()=>{const p=$('#lpin');if(p&&p.focus)p.focus()},60)}
function resetIdle(){clearTimeout(idleT);const c=lockCfg();if(!uidNow||!c||locked)return;idleT=setTimeout(lockNow,c.m*60000)}
async function unlockTry(){
  const pin=$('#lpin').value,fk='flousi_lockfail_'+uidNow;let f={};try{f=JSON.parse(localStorage.getItem(fk)||'{}')}catch(e){}
  const now=Date.now();if(f.until&&now<f.until)return lerr('انتظر '+Math.ceil((f.until-now)/1000)+' ثانية');
  if(!/^\d{4,6}$/.test(pin))return lerr('الرمز من 4 إلى 6 أرقام');
  if(await checkPin(pin)){localStorage.removeItem(fk);locked=false;document.body.dataset.lock='0';$('#lock').hidden=true;$('#lpin').value='';render();resetIdle()}
  else{f.n=(f.n||0)+1;if(f.n>=5){localStorage.removeItem(fk);lerr('محاولات كثيرة — تم تسجيل خروجك');return doLogout()}f.until=now+Math.min(30000,1000*2**f.n);localStorage.setItem(fk,JSON.stringify(f));lerr('الرمز غير صحيح ('+f.n+'/5)')}}
function lockSetupModal(){const c=lockCfg();
  modal(`<h3>🔐 ${c?'تغيير القفل':'تفعيل قفل التطبيق'}</h3><form data-form="lockset" autocomplete="off">
  ${c?'<label>الرمز الحالي<input name="old" type="password" inputmode="numeric" maxlength="6" dir="ltr" autocomplete="off"></label>':''}
  <label>الرمز الجديد (4–6 أرقام)<input name="p1" type="password" inputmode="numeric" maxlength="6" dir="ltr" autocomplete="new-password"></label>
  <label>أعد كتابة الرمز<input name="p2" type="password" inputmode="numeric" maxlength="6" dir="ltr" autocomplete="new-password"></label>
  <label>يقفل بعد<select name="mins">${[1,5,15,30].map(m=>`<option value="${m}" ${(c?c.m===m:m===5)?'selected':''}>${m===1?'دقيقة':m+' دقائق'}</option>`).join('')}</select></label>
  <div class="aerr" id="lserr" style="margin-top:4px"></div><button class="btn pri wide">حفظ</button></form>`)}
function lockCard(){const c=lockCfg();
  return `<div class="card"><h3>🔐 قفل التطبيق</h3>
    <div class="tip"><span>${c?'✅':'🔓'}</span><span>${c?`القفل مفعّل — يقفل بعد ${c.m===1?'دقيقة':c.m+' دقائق'} من الخمول أو عند الرجوع للتطبيق.`:'احمِ أرقامك برمز من 4–6 أرقام يُطلب عند فتح التطبيق وبعد فترة خمول.'}</span></div>
    <div style="display:flex;flex-direction:column;gap:10px;margin-top:6px">${c?'<button class="btn pri" data-act="lock-now">🔒 اقفل الآن</button><button class="btn" data-act="lock-setup">✏️ تغيير الرمز / المدة</button><button class="btn red" data-act="lock-off">🔓 إيقاف القفل</button>':'<button class="btn pri" data-act="lock-setup">🔐 تفعيل قفل التطبيق</button>'}</div>
    <p style="margin-top:10px;color:var(--mut);font-size:12px">القفل يحمي من اطلاع شخص يستخدم جهازك وهو مفتوح. لحماية أقوى فعّل قفل شاشة جهازك.</p></div>`}
['pointerdown','keydown','touchstart'].forEach(ev=>addEventListener(ev,()=>{if(!locked)resetIdle()},{passive:true,capture:true}));
document.addEventListener('visibilitychange',()=>{if(document.hidden){hiddenAt=Date.now()}else{const c=lockCfg();if(uidNow&&c&&!locked&&hiddenAt&&Date.now()-hiddenAt>c.m*60000)lockNow();hiddenAt=0}});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target&&e.target.id==='lpin'){e.preventDefault();unlockTry()}});
/* تصدير CSV آمن (يمنع حقن الصيغ في Excel/Sheets) */
const csvc=v=>{v=String(v==null?'':v).replace(/[\r\n]+/g,' ');if(/^[=+\-@\t]/.test(v))v="'"+v;return '"'+v.replace(/"/g,'""')+'"'};
function buildCSV(){let c='\uFEFFالشهر,التاريخ,النوع,التصنيف,المبلغ,ملاحظة\n';Object.keys(state.months).sort().forEach(k=>state.months[k].tx.forEach(x=>{c+=[k,x.date,csvc(TYPES[x.type].label),csvc(x.cat),Number(x.amount)||0,csvc(x.note||'')].join(',')+'\n'}));return c}

/* ---------- ترحيب أول مرة ---------- */
function onboarding(){modal(`<h3>👋 أهلاً بك في فلوسي</h3><p>خلنا نبدأ بثلاث معلومات سريعة، وتقدر تغيّرها بعدين.</p>
  <form data-form="onb"><label>وش اسمك؟<input name="name" placeholder="مثال: خالد" value="${esc(state.settings.name)}"></label>
  <label>دخلك الشهري المتوقع<input name="inc" inputmode="decimal" placeholder="0" value="${state.settings.expectedIncome||''}"></label>
  <label>رصيدك الحالي (اللي معك الحين)<input name="bal" inputmode="decimal" placeholder="0"></label>
  <button class="btn pri wide">يلا نبدأ 🚀</button></form>`)}

/* ---------- تشغيل ---------- */
/* ---- جاهزية الأجهزة: لوحة المفاتيح، تغيّر المقاس، الاتصال ---- */
document.addEventListener('focusin',e=>{if(innerWidth<=860&&e.target.matches&&e.target.matches('input:not([type=checkbox]):not([type=radio]),select,textarea'))document.body.classList.add('kb')});
document.addEventListener('focusout',()=>setTimeout(()=>{const a=document.activeElement;if(!a||!a.matches||!a.matches('input:not([type=checkbox]):not([type=radio]),select,textarea'))document.body.classList.remove('kb')},120));
try{matchMedia('(max-width:860px)').addEventListener('change',()=>{if(uidNow){renderNav();renderTop()}})}catch(e){}
addEventListener('error',e=>console.warn('App error:',e.message));
addEventListener('unhandledrejection',e=>console.warn('Unhandled:',e.reason));
addEventListener('offline',()=>{if(uidNow)toast('📴 أنت غير متصل — بياناتك تُحفظ على جهازك وتتزامن لاحقاً')});
addEventListener('online',()=>{if(uidNow)toast('✅ رجع الاتصال')});
try{if(matchMedia('(prefers-color-scheme: light)').matches)document.documentElement.dataset.theme='light'}catch(e){}
a11y();
let _lastY=0;addEventListener('scroll',()=>{const y=scrollY,f=document.querySelector('.fab');if(!f||innerWidth>860){_lastY=y;return}
  if(y>_lastY+6&&y>160)f.classList.add('away');else if(y<_lastY-6||y<160)f.classList.remove('away');_lastY=y},{passive:true});
initAuth();
})();
