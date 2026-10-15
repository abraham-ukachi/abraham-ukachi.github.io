(function(){
const L = window.LTF, LE = window.LTF_EN || {words:{}};
const $ = s => document.querySelector(s);
const app = $('#app');
const shuffle = a => { a=a.slice(); for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; };
const pick = a => a[Math.floor(Math.random()*a.length)];
const uniq = a => [...new Set(a)];
const esc = s => String(s).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const norm = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();

// ---------- storage ----------
let mem = null;
function load(){ try{ const s = localStorage.getItem('ltf_v1'); if(s) return JSON.parse(s);}catch(e){} return mem || {xp:0,m:{},best:{},review:[],streak:0,last:null,sound:true,exam:null,lang:'fr'}; }
let S = load();
function save(){ mem = S; try{ localStorage.setItem('ltf_v1', JSON.stringify(S)); }catch(e){} }
(function streak(){ const today = new Date().toISOString().slice(0,10); if(S.last!==today){ const y = new Date(Date.now()-864e5).toISOString().slice(0,10); S.streak = (S.last===y)? S.streak+1 : 1; S.last = today; save(); } })();

// ---------- language ----------
const EN = S.lang==='en';
const LI = (!EN && window.LTF_INFO_FR) ? window.LTF_INFO_FR : (window.LTF_INFO || {});
const T = (fr,en) => EN ? en : fr;
const W = s => (EN && LE.words && LE.words[s]) || s;
const eur = p => (p===null||p===undefined) ? '—' : (String(p).replace('.', EN?'.':',')+' €');
const ALLERGY = T("Toujours confirmer les allergènes avec la cuisine.","Always confirm allergens with the kitchen.");
try{ document.documentElement.lang = EN?'en':'fr'; }catch(e){}
window.LTFlang = l => { S.lang = l; save(); try{ location.reload(); }catch(e){} };

// ---------- sound ----------
let ac=null;
function beep(ok){ if(!S.sound) return; try{ ac = ac || new (window.AudioContext||window.webkitAudioContext)(); const o=ac.createOscillator(), g=ac.createGain(); o.connect(g); g.connect(ac.destination); o.type='sine'; const t=ac.currentTime; if(ok){o.frequency.setValueAtTime(660,t);o.frequency.setValueAtTime(990,t+.08);} else {o.frequency.setValueAtTime(220,t);o.frequency.setValueAtTime(160,t+.1);} g.gain.setValueAtTime(.15,t); g.gain.exponentialRampToValueAtTime(.001,t+.25); o.start(t); o.stop(t+.26);}catch(e){} }

// ---------- MCQ helper ----------
function mcq(q, correct, pool, expl, extra){
  correct = String(correct);
  const opts = shuffle(uniq(pool.map(String)).filter(x=>x!==correct && x)).slice(0,3);
  if(opts.length<1) return null;
  return Object.assign({q, options: shuffle([correct, ...opts]), answer: correct, expl: expl||''}, extra||{});
}

// ---------- chapters ----------
const CH = [
 {id:'dej', name:T('Déjeuner','Lunch'), icon:'☀️', sub:T('Carte du midi & formule 49 €','Lunch menu & 49 € formula')},
 {id:'diner', name:T('Dîner & Dégustation','Dinner & Tasting Menu'), icon:'🌙', sub:T('Carte du soir, Menu Dégustation 89 €','Evening menu, 89 € Tasting Menu')},
 {id:'dess', name:T('Desserts & Fromages','Desserts & Cheese'), icon:'🍮', sub:T('Douceurs et plateau Lemarié','Sweets and the Lemarié cheese board')},
 {id:'cock', name:T('Cocktails & Softs','Cocktails & Soft drinks'), icon:'🍸', sub:T('Signatures, fiches techniques, softs, eaux','Signatures, recipe cards, softs, waters')},
 {id:'cafe', name:T('Cafés & Thés','Coffee & Tea'), icon:'☕', sub:'Illy & Maison Père Blaize'},
 {id:'vins', name:T('Vins','Wines'), icon:'🍷', sub:T('Au verre, Provence, Méditerranée, France','By the glass, Provence, Mediterranean, France')},
 {id:'champ', name:'Champagnes', icon:'🥂', sub:T('Coupes, bruts, rosés, prestige','Glasses, bruts, rosés, prestige')},
 {id:'dig', name:'Digestifs', icon:'🥃', sub:'Ferroni, Lachanenche, Liquoristerie'},
 {id:'acc', name:T('Accords mets-vins','Wine pairing'), icon:'🍇', sub:T('L\'accord du Menu Dégustation (+55 €)','The Tasting Menu pairing (+55 €)')},
 {id:'plan', name:T('Plan de salle','Floor plan'), icon:'🗺️', sub:T('Numéros de tables','Table numbers')}
];

// ---------- items ----------
const items = [];

// ---------- pronunciation (device voices) ----------
const ORIG = [
 [/(?<![\wÀ-ÿ])(?:spritz|negroni|bellini|limoncello|amaretto|campari|aperol|prosecco|pellegrino|panna|grappa|espresso|ristretto|macchiato|cappuccino|tiramis|risotto|burrata|carpaccio|stracciatella|parmigiano|disaronno|sambuca|martini|orezza|lavazza|negroni|vermouth|amaro|averna|fernet)(?![\wÀ-ÿ])/i,'it-IT','Italiano'],
 [/(?<![\wÀ-ÿ])(?:mojito|margarita|tequila|mezcal|sangria|chorizo|jerez|rioja|patron|bacardi|havana)(?![\wÀ-ÿ])/i,'es-ES','Español'],
 [/(?<![\wÀ-ÿ])(?:gin|fever|schweppes|coca|cola|whisky|whiskey|bourbon|scotch|ginger beer|london|hendrick|tanqueray|johnnie|jameson|glenfiddich|macallan|lagavulin|talisker|earl grey|english|breakfast|darjeeling|assam|sprite|red bull|old fashioned|mule|sour|bloody|cosmopolitan|tea)(?![\wÀ-ÿ])/i,'en-GB','English'],
 [/(?<![\wÀ-ÿ])(?:sencha|matcha|genmaicha|yuzu|sake|hojicha|gyokuro|nikka|suntory|hibiki|yamazaki)(?![\wÀ-ÿ])/i,'ja-JP','日本語'],
 [/(?<![\wÀ-ÿ])(?:riesling|gewurz|gewürz|weizen|kirsch|jägermeister|jagermeister|schnaps)(?![\wÀ-ÿ])/i,'de-DE','Deutsch'],
 [/(?<![\wÀ-ÿ])(?:porto|port|vinho|madeira|caipirinha|cachaça|cachaca)(?![\wÀ-ÿ])/i,'pt-PT','Português'],
 [/(?<![\wÀ-ÿ])(?:rooibos)(?![\wÀ-ÿ])/i,'af-ZA','Afrikaans'],
 [/(?<![\wÀ-ÿ])(?:vodka|beluga|grey goose)(?![\wÀ-ÿ])/i,'ru-RU','Русский']
];
function nameIt(it){ const raw = String(it.front).split('<br>')[0]; const sN = x=>String(x||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim(); const fr = sN(raw); if(!fr) return;
  let en = (LE.dishes||{})[fr] || (LE.words||{})[fr] || '';
  if(it.ch==='vins'){ const sub = sN((String(it.front).split('<br>')[1]||'')); const col = sub.split('·')[0].trim(); en = fr+(col?', '+(((LE.words||{})[col])||col)+' wine':''); }
  if(!en) en = fr;
  const frenchy = /(?<![\wÀ-ÿ])(de|du|des|la|le|les|au|aux|maison|château|noir|supérieur|provence|juillet)(?![\wÀ-ÿ])|[éèêàçùôî]/i.test(fr); const o = frenchy ? null : ORIG.find(([re])=>re.test(fr)); it.say = {fr, en, ol: o?o[1]:null, on: o?o[2]:null}; }
let VOICES = []; const loadV = () => { try{ VOICES = speechSynthesis.getVoices()||[]; }catch(e){} };
if(window.speechSynthesis){ loadV(); speechSynthesis.onvoiceschanged = loadV; }
const QUAL = /google|enhanced|premium|natural|neural|siri/i;
function voiceFor(lang){ const p = lang.slice(0,2); const vs = VOICES.filter(v=>v.lang && v.lang.replace('_','-').toLowerCase().startsWith(p));
  const exact = vs.filter(v=>v.lang.replace('_','-').toLowerCase()===lang.toLowerCase());
  const pool = exact.length?exact:vs; return pool.find(v=>QUAL.test(v.name)) || pool.find(v=>v.localService) || pool[0] || null; }
function speakSeq(parts){ if(!window.speechSynthesis){ toast(T('Audio non disponible sur cet appareil','Audio not available on this device')); return; }
  speechSynthesis.cancel(); loadV();
  parts.forEach(([txt,lang])=>{ const u = new SpeechSynthesisUtterance(txt); u.lang = lang; const v = voiceFor(lang); if(v) u.voice = v; u.rate = 0.88; speechSynthesis.speak(u); }); }
// tap = original (if not French) + French + English (order follows app language)
window.LTFsay = (id, which) => { const it = items.find(i=>i.id===id); if(!it||!it.say) return; const s = it.say;
  const FR=[s.fr,'fr-FR'], ENp=[s.en,'en-GB'], OR = s.ol?[s.fr,s.ol]:null;
  if(which==='fr') return speakSeq([FR]); if(which==='en') return speakSeq([ENp]); if(which==='or') return speakSeq([OR||FR]);
  const seq = EN ? [ENp, FR] : [FR, ENp]; if(OR) seq.unshift(OR); speakSeq(seq); };
window.LTFitems = () => items;
const sayBtn = it => it && it.say ? `<button class="sayb" onclick="event.stopPropagation();LTFsay('${it.id}')" aria-label="${T('Écouter','Listen')}">${ic('sound',18)}</button>` : '';
const sayRow = it => !it||!it.say ? '' : `<div class="sayrow">${it.say.ol?`<button class="chip" onclick="LTFsay('${it.id}','or')">${ic('sound',16)} ${it.say.on}</button>`:''}<button class="chip" onclick="LTFsay('${it.id}','fr')">${ic('sound',16)} Français</button><button class="chip" onclick="LTFsay('${it.id}','en')">${ic('sound',16)} English</button></div>`;

function add(ch, front, back, gens, extra){ const it = Object.assign({id: ch+':'+items.filter(i=>i.ch===ch).length, ch, front, back, gens}, extra||{}); if(!it.fact && ch!=='plan') nameIt(it); items.push(it); return it; }

// ---------- ⓘ info builders ----------
const sec = (ic, title, txt) => txt ? `<div class="isec"><div class="ih">${ic} ${title}</div><div>${txt}</div></div>` : '';
const SAY = '💬', ttlSay = T('À dire au client','What to tell the guest');
function infoDish(d){ const n = (LI.dish||{})[d.n] || {}; const en = d.en || (LE.dishes||{})[d.n] || '';
  return sec('🇬🇧', T('En anglais','In English'), esc(en)) + sec(SAY, ttlSay, esc(n.say||'')) + sec('📖', T('Mots à connaître','Words to know'), esc(n.words||'')) + `<p class="warn">⚠ ${ALLERGY}</p>`; }
const RICHW = /Meursault|Condrieu|Châteauneuf|Bandol|Beaune|Saint-Joseph|Pibarnon|Cardillone|Leoube|Minuty, Blanc/;
const BIGR = /Bandol|Châteauneuf|Gigondas|Saint-Estèphe|Saint-Émilion|Crozes|Saint-Joseph|Nuits|Palette|Penedès|Sartène/;
function infoWine(w){ const app = (LI.wineApp||{})[w.a] || '';
  const prodKey = Object.keys(LI.wineProd||{}).find(k=>w.w.indexOf(k)===0 || w.w.indexOf(k)>=0);
  const prod = prodKey ? LI.wineProd[prodKey] : '';
  const colour = {Blanc:'white',Rosé:'rosé',Rouge:'red'}[w.c];
  const say = EN ? `A ${colour} ${w.a} from ${W(w.r)}, ${w.v}, by ${w.w}.` : `Un ${w.c==='Blanc'?'blanc':w.c==='Rosé'?'rosé':'rouge'} ${w.a} (${w.r}), millésime ${w.v}, de ${w.w}.`;
  const pk = w.c==='Blanc' ? (RICHW.test(w.a+' '+w.w)?'BlancRich':'Blanc') : w.c==='Rosé' ? 'Rosé' : (BIGR.test(w.a)?'RougeBig':'Rouge');
  return sec(SAY, ttlSay, esc(say)) + sec('🍇', T('L\'appellation','The appellation'), esc(app)) + sec('🏡', T('Le domaine','The producer'), esc(prod)) + sec('🍽', T('Accord suggéré','Pairing idea'), esc((LI.pairWith||{})[pk]||'')); }
function infoChamp(c){ const hk = Object.keys(LI.champagne||{}).find(k=>c.n.indexOf(k)>=0); const terms = Object.keys(LI.champagneTerms||{}).filter(k=>(c.n+' '+c.t).indexOf(k)>=0).map(k=>LI.champagneTerms[k]);
  return sec(SAY, ttlSay, esc(hk?LI.champagne[hk]:'')) + sec('📖', T('Mots à connaître','Words to know'), esc(terms.join(' '))) + sec('🇬🇧', T('Format','Serving'), esc((LE.words||{})[c.t]||c.t)); }
function infoCock(c){ const e=(LE.cocktails||{})[c.n]||{}; return sec('🇬🇧', T('En anglais','In English'), esc(e.desc||'')) + sec(SAY, ttlSay, esc((LI.cocktail||{})[c.n]||'')) + (c.note?`<p class="warn">⚠ ${esc(EN&&e.note?e.note:c.note)}</p>`:''); }
function infoSoft(s){ return sec('🇬🇧', T('En anglais','In English'), esc((LE.softs||{})[s.n]||'')) + sec(SAY, ttlSay, esc((LI.soft||{})[s.n]||(LI.cocktail||{})[s.n]||'')); }
function infoTea(t){ const e=(LE.teas||{})[t.n]||[]; return sec('🇬🇧', T('En anglais','In English'), esc(e.length?e[0]+' — '+e[1]:'')) + sec(SAY, ttlSay, esc((LI.tea||{})[t.n]||'')); }
function infoCoffee(c){ return sec('🇬🇧', T('En anglais','In English'), esc((LE.coffee||{})[c.n]||c.n)) + sec(SAY, ttlSay, esc(c.n==='Thé / infusion'?(!EN&&LI.teaCoffee?LI.teaCoffee:'Teas and herbal teas from Maison Père Blaize, Marseille\'s historic herbalist (founded 1815). Eight choices — see the tea list.'):(LI.coffee||''))); }
function infoDig(d){ return sec('🇬🇧', T('En anglais','In English'), esc((LE.digestifs||{})[d.n]||'')) + sec(SAY, ttlSay, esc((LI.digestif||{})[d.n]||'')); }
function infoPair(w){ const e=(LE.pairing||{})[w.n]||{}; const say = EN ? `The ${({'Entrée':'starter','Plat poisson':'fish course','Plat viande':'meat course','Dessert':'dessert'})[w.course]} pairing of the Tasting Menu (+55 € per person). ${e.t||''}.` : `L'accord ${({'Entrée':'de l\'entrée','Plat poisson':'du plat poisson','Plat viande':'du plat viande','Dessert':'du dessert'})[w.course]} du Menu Dégustation (+55 € par personne). ${w.t}.`; return sec(SAY, ttlSay, esc(say)) + sec('🍇', T('Cépages','Grapes'), esc(EN?(e.g||w.g):w.g)); }

// ---------- photos ----------
const IMG = window.LTF_IMG || {};
const PAIRKEY = {"Susucaru Rosato — Sicile":"w:Frank Cornelissen, Susucaru Rosato|Rosé","Indigena Blanc — Espagne":"w:Domaine Parés Baltà, Cuvée Indigena|Blanc","Octave Blanc — Grèce":"w:Sous le Végétal, Cuvée Octave|Blanc","Pero Longo Rouge — Corse":"w:Domaine Pero Longo, Cuvée Équilibre|Rouge","Indigena Rouge — Espagne":"w:Domaine Parés Baltà, Cuvée Indigena|Rouge","Câlin Polisson — Provence":"g:Câlin Polisson"};
const firstKey = (...ks) => ks.find(k=>k && IMG[k]) || ks[0];
const PH = {}; // custom photos taken by the user: ikey -> dataURL
const PHDEF = {Blanc:'img/_ph-blanc.jpg',Rosé:'img/_ph-rose.jpg',Rouge:'img/_ph-rouge.jpg'};
function photoOf(it){ if(!it||!it.ikey) return null; return PH[it.ikey] || IMG[it.ikey] || it.phdef || null; }
let idb=null;
function idbOpen(){ return new Promise(res=>{ try{ if(!window.indexedDB) return res(null); const r=indexedDB.open('ltf_photos',1); r.onupgradeneeded=()=>r.result.createObjectStore('p'); r.onsuccess=()=>{idb=r.result;res(idb);}; r.onerror=()=>res(null);}catch(e){res(null);} }); }
function idbAll(){ return new Promise(res=>{ if(!idb) return res(); const tx=idb.transaction('p'); const st=tx.objectStore('p'); const rq=st.openCursor(); rq.onsuccess=()=>{ const c=rq.result; if(c){ PH[c.key]=c.value; c.continue(); } else res(); }; rq.onerror=()=>res(); }); }
function idbPut(k,v){ return new Promise(res=>{ if(!idb) return res(); const tx=idb.transaction('p','readwrite'); v===null?tx.objectStore('p').delete(k):tx.objectStore('p').put(v,k); tx.oncomplete=()=>res(); tx.onerror=()=>res(); }); }
function shrink(file){ return new Promise((res,rej)=>{ const fr=new FileReader(); fr.onload=()=>{ const im=new Image(); im.onload=()=>{ const M=900, sc=Math.min(1,M/Math.max(im.width,im.height)); const cv=document.createElement('canvas'); cv.width=Math.round(im.width*sc); cv.height=Math.round(im.height*sc); cv.getContext('2d').drawImage(im,0,0,cv.width,cv.height); res(cv.toDataURL('image/jpeg',0.8)); }; im.onerror=rej; im.src=fr.result; }; fr.onerror=rej; fr.readAsDataURL(file); }); }

// ---------- build: dishes ----------
const dishes = L.dishes;
const COURSE = {'Pour commencer':'app','Entrée':'start','Entrées':'start','Plat':'main','De la mer':'main','De la terre':'main','Fromages':'cheese','Dessert':'dess','Desserts':'dess'};
const CORDER = ['app','start','main','cheese','dess'];
const CLAB = {app:['Pour commencer','Appetizer'], start:['Entrée','Starter'], main:['Plat principal','Main course'], cheese:['Fromage','Cheese'], dess:['Dessert','Dessert']};
const cLab = k => EN ? CLAB[k][1] : CLAB[k][0];
const cBoth = k => EN ? CLAB[k][1]+' · '+CLAB[k][0] : CLAB[k][0]+' · '+CLAB[k][1];
const cSub = d => d.s==='De la mer'?T('poisson','fish'):d.s==='De la terre'?T('viande','meat'):'';
window.LTFcourseOf = it => it.course;
const sections = uniq(dishes.map(d=>d.s));
const SVC = {f:T('Formule de la semaine (49 €)','Weekly formula (49 €)'), b:T('Déjeuner et dîner','Lunch and dinner'), d:T('Dîner uniquement','Dinner only'), l:T('Déjeuner uniquement','Lunch only')};
const svcLabel = d => d.svc.includes('formule') ? SVC.f : (d.svc.includes('dej') && d.svc.includes('diner')) ? SVC.b : d.svc.includes('diner') ? SVC.d : SVC.l;
const unitTxt = u => EN ? (u==='les 100 g'?'per 100 g':u) : u;
const dishPrice = d => d.p===null ? null : eur(d.p) + (d.unit?(' '+unitTxt(d.unit)):'');
const dEn = d => d.en || (LE.dishes||{})[d.n] || '';
const dDesc = d => EN ? (dEn(d) || d.d) : d.d;     // what the "accompaniment" means in each language
const p2lab = d => EN ? 'as a main' : d.p2label;
dishes.forEach(d=>{
  const chs = (d.s==='Desserts'||d.s==='Fromages') ? ['dess'] : d.svc.includes('formule') ? ['dej'] : d.svc.includes('dej') ? ['dej','diner'] : ['diner'];
  chs.forEach(c=>{
    const gens = [];
    if(d.p!==null) gens.push(()=>mcq(T(`Combien coûte « ${d.n} » ?`,`How much is "${d.n}"?`), dishPrice(d), dishes.filter(x=>x.p!==null).map(dishPrice), `${d.n} : ${dishPrice(d)}${d.p2?` (${eur(d.p2)} ${p2lab(d)})`:''}.`));
    if(d.d) gens.push(()=>mcq(EN?`Which dish is this: "${dDesc(d)}"?`:`Quel plat est servi avec : « ${d.d} » ?`, d.n, dishes.map(x=>x.n), `${d.n} — ${d.d}.`));
    if(d.d) gens.push(()=>mcq(T(`Comment est accompagné(e) « ${d.n} » ?`,`What comes with "${d.n}"?`), d.d, dishes.filter(x=>x.d).map(x=>x.d), dEn(d)));
    gens.push(()=>mcq(T(`Dans quelle section de la carte se trouve « ${d.n} » ?`,`Which section of the menu is "${d.n}" in?`), W(d.s), (d.svc.includes('formule')?['Entrée','Plat','Dessert']:sections.filter(s=>!['Entrée','Plat','Dessert'].includes(s))).map(W), ''));
    if(dEn(d)) gens.push(()=>mcq(T(`Comment présenter « ${d.n} » à un client anglophone ?`,`How do you describe "${d.n}" to an English-speaking guest?`), dEn(d), dishes.map(dEn).filter(Boolean), ''));
    if(COURSE[d.s]) gens.push(()=>mcq(T(`« ${d.n} » : c'est quoi ?`,`"${d.n}": what kind of course is it?`), cBoth(COURSE[d.s]), CORDER.map(cBoth), T('Pour commencer = petites choses à partager en attendant ; Entrée = premier plat (≠ « entrée » américaine, qui veut dire plat principal !) ; Plat = plat principal.','Appetizer = small bites to share first; Starter (French "entrée") = first course (careful: in American English "entrée" means main course!); Main course = the "plat".')));
    gens.push(()=>mcq(T(`Quand « ${d.n} » est-il à la carte ?`,`When is "${d.n}" on the menu?`), svcLabel(d), [SVC.f,SVC.b,SVC.d,SVC.l], ''));
    if(/noisette|jambon|cochon|thon|calamars|loup|Saint-Pierre|maigre|pêche suivant/i.test(d.n+' '+d.d)) gens.push(()=>{
      const A = [T('Fruits à coque (noisette)','Nuts (hazelnut)'), T('Porc','Pork'), T('Poisson / produits de la mer','Fish / seafood'), T('Rien de tout cela','None of these')];
      const t = /noisette/i.test(d.n+d.d)?A[0]:/jambon|cochon/i.test(d.n+d.d)?A[1]:A[2];
      return mcq(T(`D'après la carte, que contient « ${d.n} » ?`,`According to the menu, what does "${d.n}" contain?`), t, A, ALLERGY);
    });
    const desc = EN ? (dEn(d)?esc(dEn(d))+'<br><small>'+esc(d.d)+'</small><br>':'') : `${d.d?d.d+'<br>':''}${d.en?'<i>'+esc(d.en)+'</i><br>':''}`;
    add(c, d.n + (EN&&dEn(d)?'':'' ), `${COURSE[d.s]?`<span class="cb cb-${COURSE[d.s]}">${cLab(COURSE[d.s])}${cSub(d)?' · '+cSub(d):''}</span> `:''}${desc}<b>${W(d.s)}</b> · ${svcLabel(d)}${d.p!==null?' · '+dishPrice(d):''}${d.p2?' / '+eur(d.p2)+' '+p2lab(d):''}`, gens, {info: infoDish(d), ikey:'d:'+d.n, course: COURSE[d.s], csub: cSub(d), as2: d.p2?p2lab(d):''});
  });
});

// Facts (dîner)
const factQs = EN ? [
 ['Price of the Tasting Menu "Voyage en Méditerranée"?','89 €',['79 €','95 €','99 €','109 €']],
 ['Price of the Tasting Menu wine pairing?','+ 55 €',['+ 45 €','+ 49 €','+ 65 €','+ 75 €']],
 ['How many courses in the Tasting Menu?','4 courses (after the amuse-bouche: starter, fish, meat, dessert)',['3 courses (starter, main, dessert)','5 courses with cheese','6 courses with cheese and pre-dessert']],
 ['When is the Tasting Menu served at lunch?','Only on weekends and public holidays',['Every day','Never','Only on Fridays']],
 ['Can just one guest at the table take the Tasting Menu?','No, it is for the whole table',['Yes, no conditions','Yes, with a 10 € supplement','Only at lunch']],
 ['Total for 2: Tasting Menu + wine pairing?','288 €',['178 €','244 €','298 €','310 €']],
 ['Price of the weekly lunch formula (starter / main / dessert)?','49 €',['39 €','45 €','55 €','59 €']],
 ['Origin of the meat stated on the menu?','France',['Spain','European Union','Italy']],
 ['Foyot sauce, served with the ribeye, is…','A béarnaise mounted with meat glaze',['A green peppercorn sauce','A maître d\'hôtel butter','A Provençal sauce vierge']],
 ['A guest asks for tap water. What do you offer?','Eau de Marseille, available on request',['Bottled water only','A free Vittel','It\'s not possible']],
 ['Menu prices are…','Net, service and taxes included',['Before tax','Service not included (+10%)','Tax included, service extra']],
 ['The "Retour de pêche suivant la Criée" is charged…','14 € per 100 g',['42 € each','14 € per portion','24 € per 100 g']]
] : [
 ['Prix du Menu Dégustation « Voyage en Méditerranée » ?','89 €',['79 €','95 €','99 €','109 €']],
 ['Prix de l\'accord mets et vins du Menu Dégustation ?','+ 55 €',['+ 45 €','+ 49 €','+ 65 €','+ 75 €']],
 ['Combien d\'étapes compte le Menu Dégustation ?','4 étapes (après l\'amuse-bouche : entrée, poisson, viande, dessert)',['3 étapes (entrée, plat, dessert)','5 étapes avec fromage','6 étapes avec fromage et pré-dessert']],
 ['Quand le Menu Dégustation est-il servi au déjeuner ?','Uniquement le week-end et les jours fériés',['Tous les jours','Jamais','Uniquement le vendredi']],
 ['Un seul convive peut-il prendre le Menu Dégustation ?','Non, il est destiné à l\'ensemble de la table',['Oui, sans condition','Oui, avec un supplément de 10 €','Seulement au déjeuner']],
 ['Total pour 2 personnes : Menu Dégustation + accord mets et vins ?','288 €',['178 €','244 €','298 €','310 €']],
 ['Prix de la formule déjeuner de la semaine (entrée / plat / dessert) ?','49 €',['39 €','45 €','55 €','59 €']],
 ['Origine des viandes indiquée sur la carte ?','France',['Espagne','Union européenne','Italie']],
 ['La sauce Foyot, servie avec l\'entrecôte, c\'est…','Une béarnaise montée avec de la glace de viande',['Une sauce au poivre vert','Un beurre maître d\'hôtel','Une sauce vierge provençale']],
 ['Un client demande de l\'eau du robinet. Que proposer ?','L\'Eau de Marseille, disponible sur demande',['Uniquement de l\'eau en bouteille','Une Vittel offerte','Ce n\'est pas possible']],
 ['Les prix de la carte sont…','Nets, service et taxes compris',['Hors taxes','Hors service (+10 %)','TTC hors service']],
 ['Le « Retour de pêche suivant la Criée » est facturé…','14 € les 100 g',['42 € la pièce','14 € la portion','24 € les 100 g']]
];
factQs.forEach(([q,a,o])=> add('diner', q, a, [()=>mcq(q,a,o,'')], {fact:true}));
const FACTS = EN && LE.facts ? LE.facts : L.facts;

// Cocktails
const ce = c => (LE.cocktails||{})[c.n] || {};
const allIngr = uniq(L.cocktails.flatMap(c=>c.recipe.map(r=>W(r[0]))));
const doses = [0.5,1,2,3,4,6,8,9,12,14,24,25,30,35,40].map(x=>String(x).replace('.', EN?'.':',')+' cl');
const dose = v => String(v).replace('.', EN?'.':',')+' cl';
const recipeTxt = c => c.recipe.map(r=>`${typeof r[1]==='number'?dose(r[1])+' ':W(r[1])+' '}${W(r[0])}`).join(', ');
const cMethod = c => EN&&ce(c).method ? ce(c).method : c.method;
const cBatch = c => EN&&ce(c).batch ? ce(c).batch : c.batch;
const cNote = c => c.note ? (EN&&ce(c).note ? ce(c).note : c.note) : '';
L.cocktails.forEach(c=>{
  const gens = [
    ()=>mcq(T(`Quels ingrédients composent « ${c.n} » ?`,`What goes into "${c.n}"?`), c.recipe.map(r=>W(r[0])).join(' + '), L.cocktails.map(x=>x.recipe.map(r=>W(r[0])).join(' + ')), recipeTxt(c)),
    ()=>mcq(T(`Dans quel verre sert-on « ${c.n} » ?`,`Which glass is "${c.n}" served in?`), W(c.glass), uniq(L.cocktails.map(x=>W(x.glass))).concat([T('Coupe Martini','Martini glass'),'Tumbler']), cMethod(c)),
    ()=>mcq(T(`Prix de « ${c.n} » à la carte ?`,`Menu price of "${c.n}"?`), eur(c.p), ['7 €','10 €','13 €','14 €','22 €','24 €','26 €'], ''),
    ()=>mcq(T(`Comment prépare-t-on « ${c.n} » ?`,`How is "${c.n}" made?`), cMethod(c), L.cocktails.map(cMethod), cNote(c))
  ];
  if(c.garnish && c.garnish!=='—') gens.push(()=>mcq(T(`Garniture de « ${c.n} » ?`,`Garnish for "${c.n}"?`), W(c.garnish), uniq(L.cocktails.map(x=>W(x.garnish))).filter(g=>g!=='—'), ''));
  c.recipe.filter(r=>typeof r[1]==='number').forEach(r=> gens.push(()=>mcq(EN?`How much ${W(r[0])} in "${c.n}"${c.batch?' (batch: '+cBatch(c)+')':''}?`:`Combien de ${r[0]} dans « ${c.n} »${c.batch?' (préparation '+c.batch+')':''} ?`, dose(r[1]), doses, recipeTxt(c)+(c.note?' — '+cNote(c):''))));
  const desc = EN ? `<i>${esc(ce(c).desc||c.desc)}</i><br>` : '';
  add('cock', c.n, `${desc}<b>${recipeTxt(c)}</b>${c.batch?'<br>'+T('Préparation','Batch')+' : '+cBatch(c):''}<br>${T('Verre','Glass')} : ${W(c.glass)} · ${T('Garniture','Garnish')} : ${W(c.garnish)}<br>${esc(cMethod(c))}<br>${T('Prix','Price')} : ${eur(c.p)}${c.note?'<br><span class="warn">⚠ '+esc(cNote(c))+'</span>':''}`, gens, {cocktail:c, info: infoCock(c), ikey:'k:'+c.n, phdef:'img/_ph-soft.jpg'});
});
const sD = s => EN&&(LE.softs||{})[s.n] ? LE.softs[s.n] : s.d;
L.softs.forEach(s=> add('cock', s.n, `${sD(s)} · ${eur(s.p)}`, [()=>mcq(T(`Prix de « ${s.n} » (${s.d}) ?`,`Price of "${s.n}" (${sD(s)})?`), eur(s.p), L.softs.map(x=>eur(x.p)).concat(['9 €','12 €']), '')], {info: infoSoft(s), ikey: firstKey('s:'+s.n,'k:'+s.n), phdef:'img/_ph-soft.jpg'}));

// Coffee & teas
const coffeeNote = EN && LE.coffeeNote ? LE.coffeeNote : L.coffeeNote;
const cfN = c => EN&&(LE.coffee||{})[c.n] ? LE.coffee[c.n] : c.n;
L.coffee.forEach(c=>{
  const gens=[]; ['dej','diner'].forEach(sv=>{ if(c[sv]!==null) gens.push(()=>mcq(EN?`At ${sv==='dej'?'LUNCH':'DINNER'}, how much is: ${cfN(c)}?`:`${sv==='dej'?'Au DÉJEUNER':'Au DÎNER'}, combien coûte : ${c.n} ?`, eur(c[sv]), ['5 €','6 €','7 €','8 €','9 €'], T('Attention : les prix des cafés diffèrent entre la carte du déjeuner et celle du dîner.','Careful: coffee prices differ between the lunch and dinner menus.'))); });
  add('cafe', cfN(c), `${T('Déjeuner','Lunch')} : ${eur(c.dej)} · ${T('Dîner','Dinner')} : ${c.diner===null?'—':eur(c.diner)}<br><small>${coffeeNote}</small>`, gens, {info: infoCoffee(c), ikey: c.n==='Thé / infusion'?'t:_tisane':'f:_coffee'});
});
const tE = t => (LE.teas||{})[t.n] || [t.n, t.i];
const tI = t => EN ? tE(t)[1] : t.i;
L.teas.forEach(t=> add('cafe', t.n, (EN?'<i>'+esc(tE(t)[0])+'</i><br>':'')+tI(t)+' · 8 €', [
  ()=>mcq(T(`Quelle infusion contient : ${t.i} ?`,`Which tea contains: ${tI(t)}?`), t.n, L.teas.map(x=>x.n), 'Maison Père Blaize — 8 €'),
  ()=>mcq(T(`Que contient « ${t.n} » ?`,`What is in "${t.n}"?`), tI(t), L.teas.map(tI), '')
], {info: infoTea(t), ikey: firstKey('t:'+t.n,'t:_tisane')}));

// Wines
const WN = L.wines;
const wlabel = w => `${w.a} — ${w.w} ${w.v} (${W(w.c).toLowerCase()})`;
const wprice = w => w.p2 ? (EN?`${eur(w.p)} a glass / ${eur(w.p2)} a bottle`:`${eur(w.p)} le verre / ${eur(w.p2)} la bouteille`) : eur(w.p);
const regions = uniq(WN.map(w=>W(w.r)));
WN.forEach(w=>{
  const gens = [
    ()=>mcq(T(`De quelle région vient : ${w.a}, ${w.w} ${w.v} ?`,`Which region is this from: ${w.a}, ${w.w} ${w.v}?`), W(w.r), regions, ''),
    ()=>mcq(T(`Prix de ${wlabel(w)} — ${w.f} ?`,`Price of ${wlabel(w)} — ${W(w.f)}?`), wprice(w), WN.filter(x=>!!x.p2===!!w.p2).map(wprice), ''),
    ()=>mcq(T(`Quel millésime pour ${w.a}, ${w.w} (${w.c.toLowerCase()}, ${w.f}) ?`,`Which vintage: ${w.a}, ${w.w} (${W(w.c).toLowerCase()}, ${W(w.f)})?`), String(w.v), WN.map(x=>String(x.v)), ''),
    ()=>mcq(T(`Couleur de ${w.a}, ${w.w} ${w.v} ?`,`Colour of ${w.a}, ${w.w} ${w.v}?`), W(w.c), ['Blanc','Rosé','Rouge'].map(W), ''),
    ()=>{ const bad = WN.filter(x=>!(x.a===w.a)).map(x=>x.w).filter(n=>!WN.some(y=>y.a===w.a && y.w===n)); return mcq(T(`Quel domaine/maison propose le ${w.a} ${w.c.toLowerCase()} ${w.v} (${w.f}) ?`,`Which producer makes the ${W(w.c).toLowerCase()} ${w.a} ${w.v} (${W(w.f)})?`), w.w, bad, ''); }
  ];
  add('vins', `${w.a}<br><small>${W(w.c)} · ${W(w.f)}</small>`, `${w.w} ${w.v}<br>${W(w.r)} · ${wprice(w)}`, gens, {info: infoWine(w), ikey: firstKey(`w:${w.w}|${w.c}@${w.a}`,`w:${w.w}|${w.c}`), phdef: PHDEF[w.c]});
});

// Champagnes
const C = L.champagnes;
C.forEach(c=> add('champ', `${c.n}<br><small>${W(c.t)}</small>`, eur(c.p), [
  ()=>mcq(T(`Prix de ${c.n} — ${c.t} ?`,`Price of ${c.n} — ${W(c.t)}?`), eur(c.p), C.map(x=>eur(x.p)), ''),
  ()=>mcq(T(`Dans quelle catégorie est ${c.n} à ${eur(c.p)} ?`,`Which category is ${c.n} at ${eur(c.p)}?`), W(c.t), uniq(C.map(x=>W(x.t))), '')
], {info: infoChamp(c), ikey:'c:'+c.n}));

// Digestifs
const D = L.digestifs;
const dgD = d => EN&&(LE.digestifs||{})[d.n] ? LE.digestifs[d.n] : d.d;
D.forEach(d=> add('dig', d.n, `${W(d.h)} · ${d.cl} cl · ${eur(d.p)}${d.d?'<br>'+dgD(d):''}`, [
  ()=>mcq(T(`Qui produit « ${d.n} » ?`,`Who makes "${d.n}"?`), W(d.h), uniq(D.map(x=>W(x.h))), ''),
  ()=>mcq(T(`Prix de « ${d.n} » (${d.cl} cl) ?`,`Price of "${d.n}" (${d.cl} cl)?`), eur(d.p), D.map(x=>eur(x.p)).concat(['11 €','20 €']), ''),
  ()=>mcq(T(`Quelle dose sert-on pour « ${d.n} » ?`,`What measure do we pour for "${d.n}"?`), d.cl+' cl', ['2 cl','4 cl','7 cl','10 cl'], T('Ferroni et digestifs classiques : 4 cl · Lachanenche et Liquoristerie de Provence : 7 cl.','Ferroni and classic digestifs: 4 cl · Lachanenche and Liquoristerie de Provence: 7 cl.'))
], {info: infoDig(d), ikey:'g:'+d.n, phdef:'img/_ph-soft.jpg'}));

// Pairing
const PW = L.pairing.flatMap(p=>p.wines.map(w=>Object.assign({course:p.course},w)));
const pe = w => (LE.pairing||{})[w.n] || {};
const pG = w => EN&&pe(w).g ? pe(w).g : w.g, pT = w => EN&&pe(w).t ? pe(w).t : w.t;
PW.forEach(w=> add('acc', w.n, `<b>${W(w.course)}</b><br>${pG(w)}<br><i>${pT(w)}</i>`, [
  ()=>mcq(T(`Dans l'accord mets-vins, « ${w.n} » accompagne…`,`In the wine pairing, "${w.n}" goes with…`), W(w.course), L.pairing.map(p=>W(p.course)), pT(w)),
  ()=>mcq(T(`Cépages / composition de « ${w.n} » ?`,`Grapes / make-up of "${w.n}"?`), pG(w), PW.map(pG), pT(w)),
  ()=>{ const others = PW.filter(x=>x.course!==w.course).map(x=>x.n); return mcq(EN?`Which wine can go with the ${W(w.course).toLowerCase()} of the Tasting Menu?`:`Quel vin peut accompagner le ${w.course.toLowerCase()} du Menu Dégustation ?`, w.n, others, pT(w)); },
  ()=>mcq(T(`Comment décrire « ${w.n} » au client ?`,`How do you describe "${w.n}" to the guest?`), pT(w), PW.map(pT), '')
], {info: infoPair(w), ikey: PAIRKEY[w.n]||('p:'+w.n)}));

// Tables
L.tables.forEach(t=> add('plan', t.id, `${t.sh==='round'?T('Table ronde','Round table'):t.sh==='long'?T('Grande table','Long table'):T('Table carrée','Square table')}${t.cap?' · '+t.cap:''}`, [()=>({plan:true, table:t})]));

// ---------- question for item ----------
function qFor(it){ for(let k=0;k<6;k++){ const g = pick(it.gens); const q = g(); if(q){ q.item = it; return q; } } return null; }
function randQ(ch){ const pool = ch ? items.filter(i=>i.ch===ch) : items;
  const weighted = pool.flatMap(i=>{ const m=S.m[i.id]; const w = !m?2:(m.s>=3?1:3); return Array(w).fill(i); });
  for(let k=0;k<10;k++){ const q=qFor(pick(weighted)); if(q) return q; } return null; }

// ---------- progress ----------
const RANKS = EN ? ['Commis','Junior waiter','Head waiter','Maître d\'hôtel','Restaurant manager'] : ['Commis','Demi-chef de rang','Chef de rang','Maître d\'hôtel','Directeur de salle'];
const rank = () => RANKS[Math.min(RANKS.length-1, Math.floor(S.xp/300))];
const mastery = ch => { const p = items.filter(i=>!ch||i.ch===ch); return Math.round(100*p.filter(i=>(S.m[i.id]||{}).s>=3).length/p.length); };
function record(it, ok, xp){ const m = S.m[it.id] || {s:0,c:0,w:0}; if(ok){m.s++;m.c++; S.xp += xp||10; S.review = S.review.filter(x=>x!==it.id);} else {m.s=0;m.w++; if(!S.review.includes(it.id)) S.review.push(it.id);} S.m[it.id]=m; save(); }

// ---------- icons ----------
const IC = {
 home:'<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
 book:'<path d="M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zM20 4h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7z"/>',
 redo:'<path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v5h-5"/>',
 user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
 back:'<path d="M15 5l-7 7 7 7"/>', chev:'<path d="M9 5l7 7-7 7"/>', x:'<path d="M6 6l12 12M18 6L6 18"/>',
 search:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
 cam:'<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
 flame:'<path d="M12 3c1 4 5 6 5 11a5 5 0 0 1-10 0c0-3 2-4 2-7 2 1 3 3 3 5 0-3 0-6 0-9z"/>',
 target:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/>',
 cap:'<path d="M2 9l10-5 10 5-10 5zM6 11v5c3 2 9 2 12 0v-5"/>',
 timer:'<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/>',
 cards:'<rect x="3" y="6" width="13" height="15" rx="2"/><path d="M8 3h11a2 2 0 0 1 2 2v13"/>',
 quiz:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .8-1 1.7M12 17h.01"/>',
 glass:'<path d="M5 4h14l-7 8zM12 12v8M8 20h8"/>', check:'<path d="M5 12l5 5 9-10"/>',
 reset:'<path d="M4 12a8 8 0 1 0 2.3-5.6M4 4v5h5"/>', info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>',
 pin:'<path d="M12 21s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
 moon:'<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>',
 cake:'<path d="M4 20h16v-7H4zM4 15c2 1.5 4-1 6 0s4 1.5 6 0 4-1 4 0M12 9v4M12 5.5v.5"/>',
 cup:'<path d="M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM16 10h2a2 2 0 0 1 0 4h-2M8 3v3M12 3v3"/>',
 wine:'<path d="M8 3h8l-1 6a3 3 0 0 1-6 0zM12 12v8M8 21h8"/>',
 flute:'<path d="M10 3h4l-.5 8a1.5 1.5 0 0 1-3 0zM12 13v7M9 21h6"/>',
 tumbler:'<path d="M6 5h12l-1.5 14h-9zM6.7 11h10.6"/>',
 grape:'<circle cx="9" cy="10" r="2.2"/><circle cx="15" cy="10" r="2.2"/><circle cx="12" cy="14" r="2.2"/><circle cx="9" cy="18" r="2.2"/><circle cx="15" cy="18" r="2.2"/><path d="M12 8V4l3-1"/>',
 map:'<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14"/>',
 globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
 sound:'<path d="M4 9h4l5-4v14l-5-4H4zM17 9a4 4 0 0 1 0 6"/>',
 palette:'<path d="M12 3a9 9 0 1 0 0 18c1 0 1.5-.8 1.5-1.5 0-1.5-1.5-1.5-1.5-3S13 14 14.5 14H17a4 4 0 0 0 4-4c0-4-4-7-9-7z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="7.5" r="1"/>',
 trash:'<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>', star:'<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
 award:'<circle cx="12" cy="9" r="6"/><path d="M8.5 14l-1.5 7 5-3 5 3-1.5-7"/>'
};
const ic = (n, s) => `<svg class="i" width="${s||22}" height="${s||22}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n]||''}</svg>`;
const CHIC = {dej:'sun', diner:'moon', dess:'cake', cock:'glass', cafe:'cup', vins:'wine', champ:'flute', dig:'tumbler', acc:'grape', plan:'map'};

// ---------- theme ----------
const THEMES = ['auto','light','dark','black'];
const mq = window.matchMedia ? matchMedia('(prefers-color-scheme: light)') : null;
function applyTheme(){ const t = S.theme||'auto'; const eff = t==='auto' ? (mq&&mq.matches?'light':'dark') : t; document.documentElement.setAttribute('data-theme', eff);
  const m = document.querySelector('meta[name=theme-color]'); if(m) m.setAttribute('content', eff==='light'?'#ffffff':eff==='black'?'#000000':'#0d1a2e'); }
applyTheme(); if(mq){ try{ mq.addEventListener('change', applyTheme); }catch(e){ try{ mq.addListener(applyTheme); }catch(_){} } }
window.LTFtheme = t => { S.theme = t; save(); applyTheme(); settings(); };

// ---------- overlays: sheet + dialog ----------
const strip = s => String(s||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
function closeOverlays(){ document.querySelectorAll('.ov').forEach(o=>o.remove()); }
function sheet(html, opts){ opts=opts||{}; const old=$('#sheet'); if(old) old.remove(); const d=document.createElement('div'); d.id='sheet'; d.className='ov scrim';
  d.innerHTML = `<div class="sheet${opts.cls?' '+opts.cls:''}"><div class="grab"></div><div class="sbody">${html}</div>${opts.bar?`<div class="abar">${opts.bar}</div>`:''}</div>`;
  d.onclick = e => { if(e.target===d) closeSheet(); }; document.body.appendChild(d); return d; }
window.LTFcloseSheet = closeSheet;
function closeSheet(){ const d=$('#sheet'); if(!d) return; d.classList.add('out'); setTimeout(()=>d.remove(),180); }
function dialog(html, dismiss){ const old=$('#dlg'); if(old) old.remove(); const d=document.createElement('div'); d.id='dlg'; d.className='ov scrim center'; d.innerHTML=`<div class="dialog">${html}</div>`; if(dismiss!==false) d.onclick=e=>{ if(e.target===d) d.remove(); }; document.body.appendChild(d); return d; }
function confirmDlg(title, text, okLbl, onOk, danger){ const d = dialog(`<div class="dt">${title}</div><p class="muted">${text}</p><div class="dbtns"><button class="btn sec" id="dno">${T('Annuler','Cancel')}</button><button class="btn ${danger?'danger':''}" id="dok">${okLbl}</button></div>`);
  d.querySelector('#dno').onclick=()=>d.remove(); d.querySelector('#dok').onclick=()=>{ d.remove(); onOk(); }; }


// ---------- photo viewer (pinch / double-tap zoom, pan) ----------
window.LTFzoom = (id, ev) => { if(ev) ev.stopPropagation(); const it = items.find(i=>i.id===id); const src = it && photoOf(it); if(!src) return;
  const d = document.createElement('div'); d.className='ov zoomv'; d.innerHTML = `<div class="zt"><div class="zn">${it.front}</div><button class="zx" aria-label="close">${ic('x',22)}</button></div><div class="zs"><img src="${src}" alt="" draggable="false"></div><div class="zh">${T('Pincez ou touchez deux fois pour zoomer','Pinch or double-tap to zoom')}</div>`;
  document.body.appendChild(d); const img = d.querySelector('img'), st = d.querySelector('.zs');
  let sc=1, x=0, y=0, pts=new Map(), start=null, lastTap=0, moved=false;
  const apply = (anim) => { img.style.transition = anim?'transform .2s':'none'; img.style.transform = `translate(${x}px,${y}px) scale(${sc})`; };
  const clampP = () => { if(sc<=1){ sc=1; x=0; y=0; return; } const r = st.getBoundingClientRect(); const w=img.offsetWidth*sc, h=img.offsetHeight*sc; const mx=Math.max(0,(w-r.width)/2), my=Math.max(0,(h-r.height)/2); x=Math.min(mx,Math.max(-mx,x)); y=Math.min(my,Math.max(-my,y)); };
  const close = () => d.remove(); d.querySelector('.zx').onclick = close;
  st.addEventListener('pointerdown', e => { st.setPointerCapture(e.pointerId); pts.set(e.pointerId,{x:e.clientX,y:e.clientY}); moved=false;
    if(pts.size===2){ const [a,b]=[...pts.values()]; start={dist:Math.hypot(a.x-b.x,a.y-b.y), sc, x, y, cx:(a.x+b.x)/2, cy:(a.y+b.y)/2}; } else start={px:e.clientX, py:e.clientY, x, y}; });
  st.addEventListener('pointermove', e => { if(!pts.has(e.pointerId)) return; pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pts.size===2 && start && start.dist){ const [a,b]=[...pts.values()]; sc=Math.min(5,Math.max(1,start.sc*Math.hypot(a.x-b.x,a.y-b.y)/start.dist)); const cx=(a.x+b.x)/2, cy=(a.y+b.y)/2; x=start.x+(cx-start.cx); y=start.y+(cy-start.cy); moved=true; apply(); }
    else if(pts.size===1 && start && start.px!==undefined){ const dx=e.clientX-start.px, dy=e.clientY-start.py; if(Math.abs(dx)+Math.abs(dy)>6) moved=true; if(sc>1){ x=start.x+dx; y=start.y+dy; apply(); } else { img.style.transition='none'; img.style.transform=`translateY(${Math.max(0,dy)}px)`; d.style.background=`rgba(0,0,0,${Math.max(.4,.94-dy/500)})`; } } });
  const up = e => { const was = pts.size; pts.delete(e.pointerId);
    if(was===1 && sc<=1 && start && start.py!==undefined && e.clientY-start.py>120){ return close(); }
    if(was===1 && !moved){ const now=Date.now(); if(now-lastTap<300){ if(sc>1){ sc=1; x=0; y=0; } else { const r=st.getBoundingClientRect(); sc=2.5; x=(r.width/2-(e.clientX-r.left))*1.5; y=(r.height/2-(e.clientY-r.top))*1.5; } clampP(); apply(true); lastTap=0; return; } lastTap=now; }
    if(pts.size===1){ const [a]=[...pts.values()]; start={px:a.x, py:a.y, x, y}; } else start=null;
    d.style.background=''; clampP(); apply(true); };
  st.addEventListener('pointerup', up); st.addEventListener('pointercancel', up);
  st.addEventListener('wheel', e => { e.preventDefault(); sc=Math.min(5,Math.max(1,sc*(e.deltaY<0?1.15:0.87))); clampP(); apply(); }, {passive:false});
};

// ---------- ⓘ sheet ----------
const ib = it => it && it.info ? `<button class="ib" onclick="event.stopPropagation();LTFinfo('${it.id}')" aria-label="info">${ic('info',20)}</button>` : '';
window.LTFinfo = id => { const it = items.find(i=>i.id===id); if(!it||!it.info) return;
  const ph = photoOf(it), mine = !!PH[it.ikey];
  const html = `${it.ikey&&ph?`<div class="hphoto"><img src="${ph}" alt="" onclick="LTFzoom('${it.id}',event)"><span class="ptag">${mine?T('Votre photo','Your photo'):T('Photo d\'illustration','Sample photo')}</span><button class="pclose" onclick="LTFcloseSheet()">${ic('x',18)}</button></div>`:`<button class="pclose solo" onclick="LTFcloseSheet()">${ic('x',18)}</button>`}
   <div class="stitle tl2"><span>${it.front}</span>${sayBtn(it)}</div>${sayRow(it)}<div class="sdesc">${it.back}</div><div class="sinfo">${it.info}</div>`;
  const bar = it.ikey ? `${mine?`<button class="btn sec sq" id="phrst" aria-label="reset">${ic('reset',20)}</button>`:''}<label class="btn grow">${ic('cam',20)} ${mine?T('Changer la photo','Change photo'):T('Prendre ma photo','Take my photo')}<input type="file" accept="image/*" capture="environment" id="phin" hidden></label>` : '';
  const d = sheet(html, {bar});
  const inp = d.querySelector('#phin'); if(inp) inp.onchange = async () => { const f = inp.files && inp.files[0]; if(!f) return; try{ const url = await shrink(f); PH[it.ikey]=url; await idbPut(it.ikey,url); toast(T('Photo enregistrée','Photo saved')); LTFinfo(id); refresh(); }catch(e){ toast(T('Photo impossible à lire','Could not read photo')); } };
  const rs = d.querySelector('#phrst'); if(rs) rs.onclick = () => confirmDlg(T('Photo par défaut ?','Default photo?'), T('Votre photo sera supprimée de ce téléphone.','Your photo will be removed from this phone.'), T('Rétablir','Restore'), async()=>{ delete PH[it.ikey]; await idbPut(it.ikey,null); LTFinfo(id); refresh(); }, true); };
let lastView = ['hub'];
function refresh(){ const v=lastView; if(v[0]==='carte') { const q=$('#srch'); const val=q?q.value:''; carte(); if($('#srch')){ $('#srch').value=val; $('#srch').oninput(); } } }

// ---------- navigation ----------
const TABS = [['hub','home',T('Accueil','Home')],['carte','book',T('La Carte','Menu')],['revise','redo',T('Réviser','Review')],['settings','user',T('Profil','Profile')]];
const TABOF = {hub:'hub', chapter:'hub', carte:'carte', revise:'revise', settings:'settings', cert:'revise'};
const PARENT = {chapter:'hub', study:'chapter', quiz:'chapter', chrono:'chapter', bar:'chapter', planFind:'chapter', review:'revise', exam:'revise', cert:'revise', carte:'hub', revise:'hub', settings:'hub'};
function tabbar(where){ let tb=$('#tabbar'); if(!tb){ tb=document.createElement('nav'); tb.id='tabbar'; document.body.appendChild(tb); }
  const cur = TABOF[where]; tb.style.display = cur ? '' : 'none'; document.body.classList.toggle('notabs', !cur);
  tb.innerHTML = TABS.map(([v,i,l])=>`<button class="${v===cur?'on':''}" onclick="LTFgo('${v}')"><span class="pill">${ic(i,22)}</span>${l}</button>`).join(''); }
function appbar(title, back, right, big){ return `<header class="appbar${big?' big':''}">${back?`<button class="ibtn" onclick="LTFgo('${back}')" aria-label="back">${ic('back')}</button>`:''}<div class="abt">${title||''}</div>${right||''}</header>`; }
function header(title, back){ return appbar(title, back||'hub'); }
function flowbar(pct, label, onX){ return `<header class="appbar flow"><button class="ibtn" id="fx" aria-label="close">${ic('x')}</button><div class="pbar"><i style="width:${pct}%"></i></div><div class="pl">${label}</div></header>`; }
function bindX(back, ask){ const b=$('#fx'); if(b) b.onclick=()=>{ if(ask) confirmDlg(T('Quitter ?','Leave?'), T('Votre progression dans cette partie sera perdue.','Your progress in this round will be lost.'), T('Quitter','Leave'), ()=>go(back), true); else go(back); }; }
let navPop = false;
const go = window.LTFgo = (where, arg) => { clearInterval(timer); closeOverlays(); lastView=[where,arg];
  if(!navPop){ try{ history.pushState({v:where}, ''); }catch(e){} } navPop=false;
  tabbar(where); app.className = 'scr scr-'+where;
  ({hub, chapter, study, quiz:()=>quiz(arg,10), chrono, exam, review, revise, carte, settings, bar, planFind, cert}[where] || hub)(arg);
  window.scrollTo(0,0); app.classList.remove('enter'); void app.offsetWidth; app.classList.add('enter'); };
addEventListener('popstate', () => { if(document.querySelector('.ov')){ closeOverlays(); try{ history.pushState({}, ''); }catch(e){} return; } const p = PARENT[lastView[0]]; if(p){ navPop=true; go(p); } });
let curCh = null, timer = null;
const langBtn = () => `<button class="hlang" onclick="LTFlang('${EN?'fr':'en'}')">${EN?'FR':'EN'}</button>`;
const ring = (p, big) => `<div class="ring${big?' big':''}" style="--p:${p}"><span>${p}%</span></div>`;

// ---------- screens ----------
function hub(){
  const lvl = S.xp%300;
  app.innerHTML = `<div class="hero" style="background-image:url('${window.HERO||''}')">${langBtn()}<div class="heroin"><div class="kicker">Sofitel Marseille Vieux-Port</div><h1>Les Trois Forts</h1><div class="sub">Service Academy</div></div></div>
  <div class="pad">
  <div class="card rankc"><div class="row"><div class="grow"><div class="muted">${T('Votre rang','Your rank')}</div><div class="rk">${rank()}</div></div>
   <div class="stat st1">${ic('flame',20)}<span>${S.streak} ${T('j','d')}</span></div><div class="stat st2">${ic('target',20)}<span>${mastery()}%</span></div></div>
   <div class="bar"><i style="width:${lvl/3}%"></i></div><div class="muted sm">${S.xp} XP · ${300-lvl} ${T('XP avant le prochain rang','XP to the next rank')}</div></div>
  <div class="qa"><button class="card" onclick="LTFgo('exam')">${ic('cap',24)}<span>${T('Examen','Exam')}</span></button><button class="card" onclick="LTFgo('review')">${ic('redo',24)}<span>${T('Erreurs','Mistakes')} · ${S.review.length}</span></button><button class="card" onclick="LTFgo('carte')">${ic('book',24)}<span>${T('La Carte','Menu')}</span></button></div>
  <div class="sh">${T('Chapitres','Chapters')}</div>
  ${CH.map(c=>`<button class="li" onclick="LTFgo('chapter','${c.id}')"><div class="av">${ic(CHIC[c.id]||'star',22)}</div><div class="tx"><div class="n">${c.name}</div><div class="muted">${c.sub}</div></div>${ring(mastery(c.id))}</button>`).join('')}
  </div>`;
}

function chapter(id){ curCh = id || curCh; const c = CH.find(x=>x.id===curCh); const its = items.filter(i=>i.ch===curCh); const n = its.length; const mast = its.filter(i=>(S.m[i.id]||{}).s>=3).length;
  const idx = CH.indexOf(c)+1;
  const modes = [['study','cards',T('Étudier','Study'),T('Cartes recto-verso avec photos','Flashcards with photos'),n+' '+T('cartes','cards')]];
  if(curCh==='plan'){ modes.push(['planFind','pin',T('Trouve la table','Find the table'),T('Touchez la table annoncée','Tap the table called out'),'10 tables']); modes.push(['quiz','quiz',T('Quel numéro ?','Which number?'),T('10 questions','10 questions'),'']); }
  else modes.push(['quiz','quiz','Quiz',T('10 questions, explications','10 questions with explanations'),'']);
  modes.push(['chrono','timer','Chrono',T('60 secondes, combos','60 seconds, combos'),T('Record','Best')+' '+(S.best[curCh]||0)]);
  if(curCh==='cock') modes.push(['bar','glass',T('Le Bar','The Bar'),T('Montez le cocktail','Build the cocktail'),'']);
  app.innerHTML = appbar('', 'hub') + `<div class="pad"><div class="kick2">${T('Chapitre','Chapter')} ${idx}</div><h1 class="ptitle">${c.name}</h1><div class="muted">${c.sub}</div>
  <div class="card row mt">${ring(mastery(curCh), true)}<div><div class="b">${mast} / ${n} ${T('maîtrisés','mastered')}</div><div class="muted sm">${T('Une carte est maîtrisée après 3 bonnes réponses de suite.','A card is mastered after 3 correct answers in a row.')}</div></div></div>
  <div class="sh">${T('Modes de jeu','Game modes')}</div>
  ${modes.map(([v,i,t,s,r])=>`<button class="li tall" onclick="LTFgo('${v}')"><div class="av">${ic(i,22)}</div><div class="tx"><div class="n">${t}</div><div class="muted">${s}</div></div><div class="rt">${r?`<span class="muted sm">${r}</span>`:''}${ic('chev',18)}</div></button>`).join('')}
  </div><div class="cta"><button class="btn" onclick="LTFgo('quiz')">${ic('quiz',20)} ${T('Lancer un quiz','Start a quiz')}</button></div>`;
}

function study(){ const pool = shuffle(items.filter(i=>i.ch===curCh)); let k=0;
  const show = () => { if(k>=pool.length){ toast(T('Paquet terminé !','Deck done!')); return go('chapter'); } const it = pool[k]; const ph = photoOf(it);
    app.innerHTML = flowbar(100*k/pool.length, `${k+1}/${pool.length}`) + `<div class="pad">
    <div class="flip" id="flip"><div class="face front">${it.ch==='plan'?planSVG({hl:it.front, labels:false}):`<div class="fq">${it.front}</div>${sayBtn(it)}`}<small class="hint">${T('Touchez pour retourner','Tap to flip')}</small></div><div class="face back">${ph?`<img class="bimg" src="${ph}" alt="">`:''}<div class="btxt">${it.ch==='plan'?'<b>'+it.front+'</b><br>'+it.back:it.back}</div>${it.info?`<button class="chip gold" onclick="event.stopPropagation();LTFinfo('${it.id}')">${ic('info',16)} ${T('Infos client','Guest info')}</button>`:''}</div></div></div>
    <div class="abar fixed"><button class="btn sec grow" id="no">${T('À revoir','Review again')}</button><button class="btn grow ok" id="yes">${ic('check',20)} ${T('Je savais','I knew it')}</button></div>`;
    bindX('chapter'); $('#flip').onclick=function(){ this.classList.toggle('on'); };
    $('#yes').onclick=()=>{record(it,true,2);k++;show();}; $('#no').onclick=()=>{record(it,false);k++;show();}; };
  show(); }

// Quiz / exam engine
const planQ = q => { const t=q.table; q.q=T('Quel est le numéro de la table en surbrillance ?','What is the number of the highlighted table?'); q.options=shuffle([t.id, ...shuffle(L.tables.filter(x=>x.id!==t.id).map(x=>x.id)).slice(0,3)]); q.answer=t.id; q.expl=''; q.svg=planSVG({hl:t.id, labels:false}); };
const qPhoto = q => { const it=q.item; if(!it||q.svg) return ''; const ph=photoOf(it); if(!ph) return ''; const nm = norm(strip(it.front)); return nm && norm(q.q).includes(nm) ? `<img class="qimg" src="${ph}" alt="">` : ''; };
const chName = id => { const c=CH.find(x=>x.id===id); return c?c.name:''; };
function runQuiz(title, qs, back, onEnd, xp){
  let k=0, score=0; const t0=Date.now();
  const show = () => { closeOverlays(); if(k>=qs.length) return onEnd(score, qs.length, Math.round((Date.now()-t0)/1000)); const q = qs[k];
    if(q.plan) planQ(q);
    app.innerHTML = flowbar(100*k/qs.length, `${k+1}/${qs.length}`) + `<div class="pad">${q.svg?`<div class="card">${q.svg}</div>`:qPhoto(q)}<div class="muted sm">${title}${q.item?' · '+chName(q.item.ch):''}</div><h2 class="qq">${esc(q.q)}</h2>
    <div class="opts">${q.options.map((o,i)=>`<button class="opt" data-i="${i}"><span class="k">${'ABCDEF'[i]}</span><span>${esc(o)}</span></button>`).join('')}</div></div>`;
    bindX(back, k>0);
    app.querySelectorAll('.opt').forEach(b=> b.onclick = () => { const ok = q.options[b.dataset.i]===q.answer; app.querySelectorAll('.opt').forEach(x=>{x.disabled=true; if(q.options[x.dataset.i]===q.answer){ x.classList.add('right'); x.querySelector('.k').innerHTML=ic('check',16);} }); if(!ok) b.classList.add('wrong'); if(ok) score++; beep(ok); record(q.item, ok, xp||10);
      const d = document.createElement('div'); d.id='fb'; d.className='ov fbsheet '+(ok?'okc':'koc');
      d.innerHTML = `<div class="fbt">${ic(ok?'check':'x',22)} ${ok?T('Bonne réponse !','Correct!')+` +${xp||10} XP`:T('Pas tout à fait','Not quite')}</div><div class="fbx">${ok?'':T('Réponse','Answer')+' : <b>'+esc(q.answer)+'</b>. '}${q.expl?esc(q.expl):''}</div><div class="fbb">${q.item&&q.item.info?`<button class="btn sec sq" onclick="LTFinfo('${q.item.id}')" aria-label="info">${ic('info',20)}</button>`:''}<button class="btn grow" id="nx">${T('Continuer','Continue')}</button></div>`;
      document.body.appendChild(d); d.querySelector('#nx').onclick=()=>{k++;show();}; });
  }; show(); }
function quiz(){ const qs=[]; for(let i=0;i<10;i++){ const q=randQ(curCh); if(q) qs.push(q);} runQuiz('Quiz', qs, 'chapter', (s,n,t)=>endScreen(s,n,'chapter','quiz',t)); }
const fmtT = t => t ? Math.floor(t/60)+':'+String(t%60).padStart(2,'0') : '';
function endScreen(s,n,back,again,secs){ const pct=Math.round(100*s/n); if(pct===100) confetti();
  const msg = pct>=90?T('Digne d\'un Maître d\'hôtel','Maître d\'hôtel material'):pct>=70?T('Très bon service','Great service'):pct>=50?T('On y est presque','Almost there'):T('À retravailler, courage','Keep at it');
  app.innerHTML = flowbar(100, `${n}/${n}`); bindX(back);
  const d = dialog(`<div class="dic">${ic(pct>=70?'award':'cap',40)}</div><div class="dscore">${s} / ${n}</div><div class="dt">${msg}</div><div class="muted">${rank()} · ${S.xp} XP</div>
   <div class="dstats"><div><b>${pct}%</b><span>Score</span></div><div><b>${n-s}</b><span>${T('Erreurs','Mistakes')}</span></div>${secs?`<div><b>${fmtT(secs)}</b><span>${T('Temps','Time')}</span></div>`:''}</div>
   <button class="btn" id="dag">${T('Rejouer','Play again')}</button>${n-s>0?`<button class="btn sec" id="drv">${T('Revoir mes erreurs','Review my mistakes')}</button>`:''}<button class="btn txt" id="dbk">${T('Terminer','Done')}</button>`, false);
  d.querySelector('#dag').onclick=()=>go(again||back); const rv=d.querySelector('#drv'); if(rv) rv.onclick=()=>go('review'); d.querySelector('#dbk').onclick=()=>go(back); }

function exam(){ const qs=[]; CH.forEach(c=>{ for(let i=0;i<3;i++){ const q=randQ(c.id); if(q) qs.push(q);} }); runQuiz(T('Examen final','Final exam'), shuffle(qs), 'revise', (s,n,t)=>{ const pct=Math.round(100*s/n); if(pct>=80){ S.exam={score:pct,date:new Date().toLocaleDateString(EN?'en-GB':'fr-FR')}; save(); go('cert'); } else endScreen(s,n,'revise','exam',t); }, 15); }
function cert(){ if(!S.exam) return revise(); confetti(); app.innerHTML = appbar(T('Certificat','Certificate'), 'revise') + `<div class="pad"><div class="cert"><div class="kicker">Les Trois Forts · Sofitel Marseille Vieux-Port</div><h1>${T('Certifié','Certified')}</h1><p>${T('a réussi l\'examen final de la Service Academy','passed the Service Academy final exam')}</p><div class="score">${S.exam.score}%</div><p>${S.exam.date} · ${rank()}</p></div></div>`; }

function revise(){ const its = S.review.map(id=>items.find(i=>i.id===id)).filter(Boolean);
  app.innerHTML = appbar(T('Réviser','Review'), null, '', true) + `<div class="pad">
  <button class="card hero2" onclick="LTFgo('review')" ${its.length?'':'disabled'}><div class="av big">${ic('redo',26)}</div><div class="tx"><div class="n">${T('Mes erreurs','My mistakes')}</div><div class="muted">${its.length?its.length+' '+T('à revoir · quiz de 15 max','to review · up to 15 questions'):T('Aucune erreur à revoir. Impeccable !','No mistakes to review. Flawless!')}</div></div>${its.length?ic('chev',18):''}</button>
  <button class="card hero2" onclick="LTFgo('exam')"><div class="av big">${ic('cap',26)}</div><div class="tx"><div class="n">${T('Examen final','Final exam')}</div><div class="muted">${T('3 questions par chapitre · 80 % pour le certificat','3 questions per chapter · 80% for the certificate')}</div></div>${ic('chev',18)}</button>
  ${S.exam?`<button class="card hero2" onclick="LTFgo('cert')"><div class="av big">${ic('award',26)}</div><div class="tx"><div class="n">${T('Mon certificat','My certificate')}</div><div class="muted">${S.exam.score}% · ${S.exam.date}</div></div>${ic('chev',18)}</button>`:''}
  ${its.length?`<div class="sh">${T('À revoir','To review')}</div>`+its.slice(0,40).map(i=>{ const ph=photoOf(i); return `<div class="li" ${i.info?`onclick="LTFinfo('${i.id}')"`:''}>${ph?`<img class="thumb" src="${ph}" loading="lazy" alt="">`:`<div class="av">${ic(CHIC[i.ch]||'star',20)}</div>`}<div class="tx"><div class="n">${i.ch==='plan'?T('Table','Table')+' '+i.front:i.front}</div><div class="muted sm">${chName(i.ch)}</div></div></div>`; }).join(''):''}
  </div>`; }
function review(){ const its = S.review.map(id=>items.find(i=>i.id===id)).filter(Boolean); if(!its.length) return go('revise');
  const qs = shuffle(its).slice(0,15).map(qFor).filter(Boolean); runQuiz(T('Révision','Review'), qs, 'revise', (s,n,t)=>endScreen(s,n,'revise','review',t)); }

function chrono(){ let t=60, score=0, combo=1, best=S.best[curCh]||0;
  const next = () => { const q = randQ(curCh); if(!q) return;
    if(q.plan) planQ(q);
    $('#cq').innerHTML = `${q.svg?`<div class="card">${q.svg}</div>`:''}<h2 class="qq">${esc(q.q)}</h2>`; $('#co').innerHTML = q.options.map((o,i)=>`<button class="opt" data-i="${i}"><span class="k">${'ABCDEF'[i]}</span><span>${esc(o)}</span></button>`).join('');
    app.querySelectorAll('#co .opt').forEach(b=> b.onclick=()=>{ const ok=q.options[b.dataset.i]===q.answer; beep(ok); record(q.item, ok, 0); if(ok){ score += 10*combo; combo=Math.min(combo+1,5); flash('okf'); } else { combo=1; flash('kof'); toast(T('Réponse','Answer')+' : '+q.answer); } $('#cs').textContent=score; $('#cc').textContent='×'+combo; next(); }); };
  app.innerHTML = flowbar(100, '') + `<div class="pad"><div class="hud"><div>${ic('timer',18)}<b id="ct">60</b>s</div><div>Score <b id="cs">0</b></div><div>Combo <b id="cc">×1</b></div></div><div id="cq"></div><div class="opts" id="co"></div></div>`;
  bindX('chapter', true); const pb = app.querySelector('.pbar i');
  next(); timer = setInterval(()=>{ t--; const el=$('#ct'); if(el) el.textContent=t; if(pb) pb.style.width=(100*t/60)+'%'; if(t<=0){ clearInterval(timer); closeOverlays(); S.xp += Math.round(score/5); const rec = score>best; if(rec){S.best[curCh]=score;} save(); if(rec) confetti();
    const d = dialog(`<div class="dic">${ic(rec?'award':'timer',40)}</div><div class="dscore">${score}</div><div class="dt">${rec?T('Nouveau record !','New record!'):T('Record','Best')+' : '+best}</div><div class="muted">+${Math.round(score/5)} XP</div><div class="dstats"></div><button class="btn" id="dag">${T('Rejouer','Play again')}</button><button class="btn txt" id="dbk">${T('Terminer','Done')}</button>`, false);
    d.querySelector('#dag').onclick=()=>go('chrono'); d.querySelector('#dbk').onclick=()=>go('chapter'); } },1000); }

// Bar: build the cocktail
function bar(){ const it = pick(items.filter(i=>i.cocktail)); const c = it.cocktail; const need = c.recipe.map(r=>W(r[0]));
  const shelf = shuffle(uniq(need.concat(shuffle(allIngr.filter(x=>!need.includes(x))).slice(0,Math.max(4,8-need.length)))));
  const glasses = uniq(L.cocktails.map(x=>W(x.glass))); const garn = uniq(L.cocktails.map(x=>W(x.garnish)));
  let sel = new Set(), g=null, gn=null; const ph = photoOf(it);
  app.innerHTML = appbar(T('Le Bar','The Bar'), 'chapter') + `<div class="pad"><div class="card order">${ph?`<img class="thumb" src="${ph}" alt="">`:''}<div><div class="kick2">${T('Commande','Order')}</div><div class="ptitle sm">${c.n}</div>${c.batch?'<div class="muted sm">'+T('Préparation','Batch')+' '+cBatch(c)+'</div>':''}</div></div>
  <div class="sh">1. ${T('Les ingrédients','Ingredients')}</div><div class="chips" id="sh">${shelf.map(s=>`<button class="chip" data-v="${esc(s)}">${esc(s)}</button>`).join('')}</div>
  <div class="sh">2. ${T('Le verre','Glass')}</div><div class="chips" id="gl">${glasses.map(s=>`<button class="chip" data-v="${esc(s)}">${esc(s)}</button>`).join('')}</div>
  <div class="sh">3. ${T('La garniture','Garnish')}</div><div class="chips" id="ga">${garn.map(s=>`<button class="chip" data-v="${esc(s)}">${esc(s)}</button>`).join('')}</div></div>
  <div class="abar fixed"><button class="btn grow" id="serve">${ic('glass',20)} ${T('Servir','Serve')}</button></div>`;
  app.querySelectorAll('#sh .chip').forEach(b=>b.onclick=()=>{ b.classList.toggle('on'); sel.has(b.dataset.v)?sel.delete(b.dataset.v):sel.add(b.dataset.v); });
  const single=(id,setter)=>app.querySelectorAll(id+' .chip').forEach(b=>b.onclick=()=>{ app.querySelectorAll(id+' .chip').forEach(x=>x.classList.remove('on')); b.classList.add('on'); setter(b.dataset.v); });
  single('#gl',v=>g=v); single('#ga',v=>gn=v);
  $('#serve').onclick=()=>{ const okI = need.every(n=>sel.has(n)) && sel.size===need.length; const okG = g===W(c.glass), okN = gn===W(c.garnish); const pts=[okI,okG,okN].filter(Boolean).length; const ok = pts===3; beep(ok); record(it, ok, 10*pts); if(ok) confetti();
    const mk = (o,l) => `<div class="ckr ${o?'y':'n'}">${ic(o?'check':'x',18)} ${l}</div>`;
    sheet(`<div class="stitle">${pts}/3 ${ok?T('· Parfait, envoyé !','· Perfect, sent!'):''}</div><div class="ckrow">${mk(okI,T('Ingrédients','Ingredients'))}${mk(okG,T('Verre','Glass'))}${mk(okN,T('Garniture','Garnish'))}</div><div class="sdesc">${it.back}</div>`,
      {bar:`${it.info?`<button class="btn sec sq" onclick="LTFinfo('${it.id}')">${ic('info',20)}</button>`:''}<button class="btn sec grow" onclick="LTFgo('chapter')">${T('Retour','Back')}</button><button class="btn grow" onclick="LTFgo('bar')">${T('Suivant','Next')}</button>`}); };
}

// Floor plan
function planSVG(o){ o=o||{}; const sz=5.2; let s=`<svg class="plan" viewBox="-3 -6 106 72" xmlns="http://www.w3.org/2000/svg"><rect x="-2" y="-2" width="104" height="66" rx="2" class="room"/><line x1="0" y1="-1" x2="100" y2="-1" class="win"/><text x="50" y="-3" class="wl">${T('Baies vitrées · Vieux-Port','Bay windows · Vieux-Port')}</text>`;
  L.counters.forEach(c=> s+=`<rect x="${c.x1}" y="${c.y}" width="${c.x2-c.x1}" height="3" class="ctr"/><text x="${(c.x1+c.x2)/2}" y="${c.y+6.5}" class="cl">${c.label}</text>`);
  L.tables.forEach(t=>{ const hl = o.hl===t.id; const cls = 'tb'+(hl?' hl':''); const lab = o.labels!==false || (o.reveal===t.id);
    const shape = t.sh==='round' ? `<circle cx="${t.x}" cy="${t.y}" r="${sz*0.65}" class="${cls}" data-id="${t.id}"/>` : t.sh==='long' ? `<rect x="${t.x-2.5}" y="${t.y-8}" width="5" height="12" rx="1" class="${cls}" data-id="${t.id}"/>` : `<rect x="${t.x-sz/2}" y="${t.y-sz/2}" width="${sz}" height="${sz}" rx="1" class="${cls}" data-id="${t.id}"/>`;
    s += shape + (lab?`<text x="${t.x}" y="${t.y+1.2}" class="tl">${t.id}</text>`:''); });
  return s+'</svg>'; }
function planFind(){ let k=0, score=0; const order = shuffle(L.tables).slice(0,10);
  const show=()=>{ closeOverlays(); if(k>=order.length) return endScreen(score, order.length, 'chapter', 'planFind'); const t = order[k]; const it = items.find(i=>i.ch==='plan'&&i.front===t.id);
    app.innerHTML = flowbar(100*k/order.length, `${k+1}/${order.length}`) + `<div class="pad"><h2 class="qq">${T('Touchez la table','Tap table')} <span class="gold">${t.id}</span></h2><div class="card" id="pc">${planSVG({labels:false})}</div></div>`;
    bindX('chapter', k>0);
    app.querySelectorAll('svg [data-id]').forEach(el=> el.onclick=()=>{ const ok = el.dataset.id===t.id; beep(ok); record(it, ok, 10); if(ok) score++;
      $('#pc').innerHTML = planSVG({labels:true, hl:t.id});
      const d = document.createElement('div'); d.className='ov fbsheet '+(ok?'okc':'koc'); d.innerHTML=`<div class="fbt">${ic(ok?'check':'x',22)} ${ok?T('Exact !','Correct!'):T('C\'était ici','It was here')} · ${t.id}</div><div class="fbb"><button class="btn grow" id="nx">${T('Continuer','Continue')}</button></div>`; document.body.appendChild(d); d.querySelector('#nx').onclick=()=>{k++;show();}; }); };
  show(); }

// Carte
let carteCat = 'all', carteCourse = 'all';
window.LTFcourse = c => { carteCourse = c; const v=$('#srch')?$('#srch').value:''; carte(); $('#srch').value=v; $('#srch').oninput(); };
window.LTFcat = c => { carteCat = c; const v=$('#srch')?$('#srch').value:''; carte(); $('#srch').value=v; $('#srch').oninput(); };

window.LTFcourseHelp = () => sheet(`<div class="stitle">${T('Pour commencer, entrée ou plat ?','Appetizer, starter or main?')}</div>
 <div class="cexp"><span class="cb cb-app">${cBoth('app')}</span><p>${T('Petites choses à partager en début de repas, en attendant l\'entrée (ex. tapenade, charcuterie, beignets). Ce n\'est pas un plat complet.','Small bites to share at the very start, while waiting for the starter (e.g. dips, cured meats, fritters). Not a full course.')}</p></div>
 <div class="cexp"><span class="cb cb-start">${cBoth('start')}</span><p>${T('Le premier vrai plat, une portion légère avant le plat principal. Attention : un client américain dit « entrée » pour le plat principal !','The first real course, a light plate before the main. Careful: American guests say "entrée" for the main course!')}</p></div>
 <div class="cexp"><span class="cb cb-main">${cBoth('main')}</span><p>${T('Le plat principal, la plus grosse portion. À la carte : « De la mer » = poisson, « De la terre » = viande. Au déjeuner, « Plat » de la formule.','The main course, the biggest plate. On the menu: "De la mer" = fish, "De la terre" = meat. At lunch, the formula\'s "Plat".')}</p></div>
 <div class="cexp"><span class="cb cb-cheese">${cBoth('cheese')}</span><p>${T('Après le plat, avant ou à la place du dessert.','After the main, before or instead of dessert.')}</p></div>
 <div class="cexp"><span class="cb cb-dess">${cBoth('dess')}</span><p>${T('La fin du repas.','The end of the meal.')}</p></div>
 <p class="muted">${T('Ordre du service : Pour commencer → Entrée → Plat → Fromage → Dessert.','Service order: Appetizer → Starter → Main → Cheese → Dessert.')}</p>`, {bar:`<button class="btn grow" onclick="LTFcloseSheet()">${T('Compris','Got it')}</button>`});
function carte(){ const cats = [['all',T('Tout','All')]].concat(CH.filter(c=>c.id!=='plan').map(c=>[c.id,c.name])).concat([['facts',T('À retenir','Key facts')]]);
  app.innerHTML = appbar(T('La Carte','The Menu'), null, '', true) + `<div class="sticky"><label class="srch">${ic('search',18)}<input id="srch" placeholder="${T('Plat, vin, cocktail…','Dish, wine, cocktail…')}" autocomplete="off"></label><div class="ctabs">${[['all',T('Tout','All')]].concat(CORDER.map(k=>[k,k==='app'?T('Pour commencer','Appetizers'):k==='start'?T('Entrées','Starters'):k==='main'?T('Plats','Mains'):k==='cheese'?T('Fromages','Cheese'):T('Desserts','Desserts')])).map(([v,l])=>`<button class="ctab ${v!=='all'?'cb-'+v:''} ${carteCourse===v?'on':''}" onclick="LTFcourse('${v}')">${l}</button>`).join('')}<button class="ctab q" onclick="LTFcourseHelp()" aria-label="?">${ic('info',18)}</button></div>
  ${carteCourse==='all'?'':'<!--'}<div class="chips scroll">${cats.map(([v,l])=>`<button class="chip ${carteCat===v?'on':''}" onclick="LTFcat('${v}')">${l}</button>`).join('')}</div>${carteCourse==='all'?'':'-->'}
</div><div class="pad" id="list"></div>`;
  const render = () => { const f = norm($('#srch').value);
    const blocks = CH.filter(c=>c.id!=='plan' && (carteCourse!=='all' ? ['dej','diner','dess'].includes(c.id) : (carteCat==='all'||carteCat===c.id))).map(c=>{ let its = items.filter(i=>i.ch===c.id && !i.fact && norm(i.front+' '+strip(i.back)+' '+strip(i.info)).includes(f)); if(carteCourse!=='all') its = its.filter(i=>i.course===carteCourse); if(its.some(i=>i.course)) its = its.slice().sort((a,b)=>CORDER.indexOf(a.course)-CORDER.indexOf(b.course)); if(!its.length) return ''; let lastC=null;
      return `<div class="sh">${c.name}</div>`+its.map(i=>{ const hd = i.course && i.course!==lastC ? `<div class="csh cb-${i.course}"><span class="dot"></span>${cBoth(i.course)}</div>` : ''; lastC = i.course||lastC; const ph=photoOf(i); return hd+`<div class="li menu" ${i.info?`onclick="LTFinfo('${i.id}')"`:''}>${ph?`<img class="thumb zoomable" src="${ph}" loading="lazy" alt="" onclick="LTFzoom('${i.id}',event)">`:`<div class="av">${ic(CHIC[c.id]||'star',20)}</div>`}<div class="tx">${i.course?`<span class="cb cb-${i.course}">${cLab(i.course)}${i.csub?' · '+i.csub:''}</span>`:''}<div class="n">${i.front}</div><div class="muted sm clamp">${esc(strip(i.back).replace(/^(Pour commencer|Entrée|Plat principal|Fromage|Dessert|Appetizer|Starter|Main course|Cheese)( · (poisson|viande|fish|meat))? /,''))}</div></div>${sayBtn(i)}${i.info?`<span class="rt">${ic('chev',18)}</span>`:''}</div>`; }).join(''); }).join('');
    const facts = ((carteCat==='all'&&carteCourse==='all')||carteCat==='facts') ? FACTS.filter(x=>norm(x).includes(f)) : [];
    $('#list').innerHTML = (blocks + (facts.length?`<div class="sh">${T('À retenir','Key facts')}</div><div class="card">`+facts.map(x=>`<p class="fact">${esc(x)}</p>`).join('')+'</div>':'')) || `<div class="empty muted">${T('Aucun résultat','No results')}</div>`; };
  $('#srch').oninput = render; render(); }

function settings(){ const lvl = S.xp%300; const th = S.theme||'auto';
  const seg = (opts, cur, fn) => `<div class="seg">${opts.map(([v,l])=>`<button class="${v===cur?'on':''}" onclick="${fn}('${v}')">${l}</button>`).join('')}</div>`;
  app.innerHTML = appbar(T('Profil','Profile'), null, '', true) + `<div class="pad">
  <div class="card row"><div class="av big">${ic('user',26)}</div><div class="grow"><div class="rk">${rank()}</div><div class="bar"><i style="width:${lvl/3}%"></i></div><div class="muted sm">${S.xp} XP · ${mastery()}% ${T('maîtrisé','mastered')} · ${S.streak} ${T('j de suite','day streak')}</div></div></div>
  <div class="sh">${T('Apparence','Appearance')}</div>
  <div class="card"><div class="lrow">${ic('palette',20)}<span>${T('Thème','Theme')}</span></div>${seg([['auto','Auto'],['light',T('Clair','Light')],['dark',T('Sombre','Dark')],['black',T('Noir','Black')]], th, 'LTFtheme')}
   <div class="lrow mt">${ic('globe',20)}<span>${T('Langue','Language')}</span></div>${seg([['fr','Français'],['en','English']], EN?'en':'fr', 'LTFlang')}</div>
  <div class="card"><label class="lrow sw">${ic('sound',20)}<span class="grow">${T('Effets sonores','Sound effects')}</span><input type="checkbox" id="snd" ${S.sound?'checked':''}><i class="tg"></i></label></div>
  <div class="sh">${T('À propos','About')}</div>
  <div class="card sm"><p>${T('Contenu transcrit des cartes réelles du restaurant (octobre 2026). La formule de la semaine change chaque semaine.','Content transcribed from the restaurant\'s real menus (October 2026). The weekly formula changes every week.')}</p><p>${T('Photos : ouvrez une fiche puis « Prendre ma photo » pour remplacer la photo d\'illustration. Vos photos restent sur ce téléphone.','Photos: open an item, then "Take my photo" to replace the sample picture. Your photos stay on this phone.')}</p><p class="warn">${ALLERGY}</p></div>
  <button class="btn danger wide" id="rst">${ic('trash',20)} ${T('Réinitialiser la progression','Reset progress')}</button></div>`;
  $('#snd').onchange=e=>{S.sound=e.target.checked;save();};
  $('#rst').onclick=()=>confirmDlg(T('Tout effacer ?','Erase everything?'), T('XP, rang, records et erreurs seront remis à zéro. Vos photos sont conservées.','XP, rank, records and mistakes will be reset. Your photos are kept.'), T('Effacer','Erase'), ()=>{ S={xp:0,m:{},best:{},review:[],streak:1,last:S.last,sound:S.sound,exam:null,lang:S.lang,theme:S.theme}; save(); go('hub'); }, true); }

// FX
function toast(t){ const d=document.createElement('div'); d.className='toast'; d.textContent=t; document.body.appendChild(d); setTimeout(()=>d.remove(),1800); }
function flash(c){ document.body.classList.add(c); setTimeout(()=>document.body.classList.remove(c),180); }
function confetti(){ const cv=document.createElement('canvas'); cv.className='conf'; cv.width=innerWidth; cv.height=innerHeight; document.body.appendChild(cv); const x=cv.getContext('2d'); const P=Array.from({length:120},()=>({x:Math.random()*cv.width,y:-20-Math.random()*cv.height*.5,v:2+Math.random()*4,r:Math.random()*6.28,c:pick(['#c9a24b','#f3e9d2','#2f5d8a','#e8c873','#ffffff'])})); let f=0; (function a(){ x.clearRect(0,0,cv.width,cv.height); P.forEach(p=>{p.y+=p.v;p.r+=.1;x.save();x.translate(p.x,p.y);x.rotate(p.r);x.fillStyle=p.c;x.fillRect(-4,-2,8,4);x.restore();}); if(++f<150) requestAnimationFrame(a); else cv.remove(); })(); }

// self-test
window.LTFtest = () => { let bad=0; items.forEach(it=>it.gens.forEach(g=>{ const q=g(); if(!q){return;} if(q.plan) return; if(!q.options.includes(q.answer)||new Set(q.options).size!==q.options.length) {bad++; console.warn('bad',it.id,q);} })); const noInfo = items.filter(i=>!i.fact&&i.ch!=='plan'&&(!i.info||!/💬/.test(i.info)||/💬[^<]*<\/div><div><\/div>/.test(i.info))).map(i=>i.id); return {items:items.length, bad, noInfo}; };
try{ history.replaceState({v:'hub'},''); }catch(e){} navPop=true; go('hub');
idbOpen().then(idbAll).then(()=>{ if(Object.keys(PH).length && lastView[0]==='carte') refresh(); });
})();
