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
function add(ch, front, back, gens, extra){ const it = Object.assign({id: ch+':'+items.filter(i=>i.ch===ch).length, ch, front, back, gens}, extra||{}); items.push(it); return it; }

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

// ---------- build: dishes ----------
const dishes = L.dishes;
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
    gens.push(()=>mcq(T(`Quand « ${d.n} » est-il à la carte ?`,`When is "${d.n}" on the menu?`), svcLabel(d), [SVC.f,SVC.b,SVC.d,SVC.l], ''));
    if(/noisette|jambon|cochon|thon|calamars|loup|Saint-Pierre|maigre|pêche suivant/i.test(d.n+' '+d.d)) gens.push(()=>{
      const A = [T('Fruits à coque (noisette)','Nuts (hazelnut)'), T('Porc','Pork'), T('Poisson / produits de la mer','Fish / seafood'), T('Rien de tout cela','None of these')];
      const t = /noisette/i.test(d.n+d.d)?A[0]:/jambon|cochon/i.test(d.n+d.d)?A[1]:A[2];
      return mcq(T(`D'après la carte, que contient « ${d.n} » ?`,`According to the menu, what does "${d.n}" contain?`), t, A, ALLERGY);
    });
    const desc = EN ? (dEn(d)?esc(dEn(d))+'<br><small>'+esc(d.d)+'</small><br>':'') : `${d.d?d.d+'<br>':''}${d.en?'<i>'+esc(d.en)+'</i><br>':''}`;
    add(c, d.n + (EN&&dEn(d)?'':'' ), `${desc}<b>${W(d.s)}</b> · ${svcLabel(d)}${d.p!==null?' · '+dishPrice(d):''}${d.p2?' / '+eur(d.p2)+' '+p2lab(d):''}`, gens, {info: infoDish(d)});
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
  add('cock', c.n, `${desc}<b>${recipeTxt(c)}</b>${c.batch?'<br>'+T('Préparation','Batch')+' : '+cBatch(c):''}<br>${T('Verre','Glass')} : ${W(c.glass)} · ${T('Garniture','Garnish')} : ${W(c.garnish)}<br>${esc(cMethod(c))}<br>${T('Prix','Price')} : ${eur(c.p)}${c.note?'<br><span class="warn">⚠ '+esc(cNote(c))+'</span>':''}`, gens, {cocktail:c, info: infoCock(c)});
});
const sD = s => EN&&(LE.softs||{})[s.n] ? LE.softs[s.n] : s.d;
L.softs.forEach(s=> add('cock', s.n, `${sD(s)} · ${eur(s.p)}`, [()=>mcq(T(`Prix de « ${s.n} » (${s.d}) ?`,`Price of "${s.n}" (${sD(s)})?`), eur(s.p), L.softs.map(x=>eur(x.p)).concat(['9 €','12 €']), '')], {info: infoSoft(s)}));

// Coffee & teas
const coffeeNote = EN && LE.coffeeNote ? LE.coffeeNote : L.coffeeNote;
const cfN = c => EN&&(LE.coffee||{})[c.n] ? LE.coffee[c.n] : c.n;
L.coffee.forEach(c=>{
  const gens=[]; ['dej','diner'].forEach(sv=>{ if(c[sv]!==null) gens.push(()=>mcq(EN?`At ${sv==='dej'?'LUNCH':'DINNER'}, how much is: ${cfN(c)}?`:`${sv==='dej'?'Au DÉJEUNER':'Au DÎNER'}, combien coûte : ${c.n} ?`, eur(c[sv]), ['5 €','6 €','7 €','8 €','9 €'], T('Attention : les prix des cafés diffèrent entre la carte du déjeuner et celle du dîner.','Careful: coffee prices differ between the lunch and dinner menus.'))); });
  add('cafe', cfN(c), `${T('Déjeuner','Lunch')} : ${eur(c.dej)} · ${T('Dîner','Dinner')} : ${c.diner===null?'—':eur(c.diner)}<br><small>${coffeeNote}</small>`, gens, {info: infoCoffee(c)});
});
const tE = t => (LE.teas||{})[t.n] || [t.n, t.i];
const tI = t => EN ? tE(t)[1] : t.i;
L.teas.forEach(t=> add('cafe', t.n, (EN?'<i>'+esc(tE(t)[0])+'</i><br>':'')+tI(t)+' · 8 €', [
  ()=>mcq(T(`Quelle infusion contient : ${t.i} ?`,`Which tea contains: ${tI(t)}?`), t.n, L.teas.map(x=>x.n), 'Maison Père Blaize — 8 €'),
  ()=>mcq(T(`Que contient « ${t.n} » ?`,`What is in "${t.n}"?`), tI(t), L.teas.map(tI), '')
], {info: infoTea(t)}));

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
  add('vins', `${w.a}<br><small>${W(w.c)} · ${W(w.f)}</small>`, `${w.w} ${w.v}<br>${W(w.r)} · ${wprice(w)}`, gens, {info: infoWine(w)});
});

// Champagnes
const C = L.champagnes;
C.forEach(c=> add('champ', `${c.n}<br><small>${W(c.t)}</small>`, eur(c.p), [
  ()=>mcq(T(`Prix de ${c.n} — ${c.t} ?`,`Price of ${c.n} — ${W(c.t)}?`), eur(c.p), C.map(x=>eur(x.p)), ''),
  ()=>mcq(T(`Dans quelle catégorie est ${c.n} à ${eur(c.p)} ?`,`Which category is ${c.n} at ${eur(c.p)}?`), W(c.t), uniq(C.map(x=>W(x.t))), '')
], {info: infoChamp(c)}));

// Digestifs
const D = L.digestifs;
const dgD = d => EN&&(LE.digestifs||{})[d.n] ? LE.digestifs[d.n] : d.d;
D.forEach(d=> add('dig', d.n, `${W(d.h)} · ${d.cl} cl · ${eur(d.p)}${d.d?'<br>'+dgD(d):''}`, [
  ()=>mcq(T(`Qui produit « ${d.n} » ?`,`Who makes "${d.n}"?`), W(d.h), uniq(D.map(x=>W(x.h))), ''),
  ()=>mcq(T(`Prix de « ${d.n} » (${d.cl} cl) ?`,`Price of "${d.n}" (${d.cl} cl)?`), eur(d.p), D.map(x=>eur(x.p)).concat(['11 €','20 €']), ''),
  ()=>mcq(T(`Quelle dose sert-on pour « ${d.n} » ?`,`What measure do we pour for "${d.n}"?`), d.cl+' cl', ['2 cl','4 cl','7 cl','10 cl'], T('Ferroni et digestifs classiques : 4 cl · Lachanenche et Liquoristerie de Provence : 7 cl.','Ferroni and classic digestifs: 4 cl · Lachanenche and Liquoristerie de Provence: 7 cl.'))
], {info: infoDig(d)}));

// Pairing
const PW = L.pairing.flatMap(p=>p.wines.map(w=>Object.assign({course:p.course},w)));
const pe = w => (LE.pairing||{})[w.n] || {};
const pG = w => EN&&pe(w).g ? pe(w).g : w.g, pT = w => EN&&pe(w).t ? pe(w).t : w.t;
PW.forEach(w=> add('acc', w.n, `<b>${W(w.course)}</b><br>${pG(w)}<br><i>${pT(w)}</i>`, [
  ()=>mcq(T(`Dans l'accord mets-vins, « ${w.n} » accompagne…`,`In the wine pairing, "${w.n}" goes with…`), W(w.course), L.pairing.map(p=>W(p.course)), pT(w)),
  ()=>mcq(T(`Cépages / composition de « ${w.n} » ?`,`Grapes / make-up of "${w.n}"?`), pG(w), PW.map(pG), pT(w)),
  ()=>{ const others = PW.filter(x=>x.course!==w.course).map(x=>x.n); return mcq(EN?`Which wine can go with the ${W(w.course).toLowerCase()} of the Tasting Menu?`:`Quel vin peut accompagner le ${w.course.toLowerCase()} du Menu Dégustation ?`, w.n, others, pT(w)); },
  ()=>mcq(T(`Comment décrire « ${w.n} » au client ?`,`How do you describe "${w.n}" to the guest?`), pT(w), PW.map(pT), '')
], {info: infoPair(w)}));

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

// ---------- ⓘ modal ----------
const ib = it => it && it.info ? `<button class="ib" onclick="event.stopPropagation();LTFinfo('${it.id}')" aria-label="info">ⓘ</button>` : '';
window.LTFinfo = id => { const it = items.find(i=>i.id===id); if(!it||!it.info) return; const old=$('#imodal'); if(old) old.remove();
  const d = document.createElement('div'); d.id='imodal'; d.className='imodal';
  d.innerHTML = `<div class="ibox"><button class="ghost iclose" onclick="document.getElementById('imodal').remove()">✕</button><h2>${it.front}</h2>${it.info}</div>`;
  d.onclick = e => { if(e.target===d) d.remove(); }; document.body.appendChild(d); };

// ---------- UI ----------
function header(title, back){ return `<div class="top"><button class="ghost" onclick="LTFgo('${back||'hub'}')">‹</button><div class="ttl">${title}</div><div class="xp">${S.xp} XP</div></div>`; }
const go = window.LTFgo = (where, arg) => { clearInterval(timer); const m=$('#imodal'); if(m) m.remove(); ({hub, chapter, study, quiz:()=>quiz(arg,10), chrono, exam, review, carte, settings, bar, planFind, cert}[where] || hub)(arg); window.scrollTo(0,0); };
let curCh = null, timer = null;
const langBtn = () => `<button class="ghost lang" onclick="LTFlang('${EN?'fr':'en'}')">${EN?'🇫🇷 FR':'🇬🇧 EN'}</button>`;

function hub(){
  const lvl = S.xp%300;
  app.innerHTML = `
  <div class="hero" style="background-image:url('${window.HERO||''}')">${langBtn()}<div class="heroin"><div class="kicker">Sofitel Marseille Vieux-Port</div><h1>Les Trois Forts</h1><div class="sub">Service Academy</div></div></div>
  <div class="card stats"><div><b>${rank()}</b><div class="bar"><i style="width:${lvl/3}%"></i></div><small>${S.xp} XP · ${300-lvl} ${T('XP avant le prochain rang','XP to the next rank')}</small></div>
  <div class="pills"><span>🔥 ${S.streak} ${T('j','d')}</span><span>🎯 ${mastery()}%</span></div></div>
  <div class="row3"><button class="big" onclick="LTFgo('exam')">🎓 ${T('Examen final','Final exam')}</button><button class="big" onclick="LTFgo('review')">🔁 ${T('Mes erreurs','My mistakes')} (${S.review.length})</button><button class="big" onclick="LTFgo('carte')">📖 ${T('La Carte','The Menu')}</button></div>
  <div class="grid">${CH.map(c=>`<button class="tile" onclick="LTFgo('chapter','${c.id}')"><div class="ic">${c.icon}</div><div class="tn">${c.name}</div><div class="ts">${c.sub}</div><div class="ring"><i style="width:${mastery(c.id)}%"></i></div><small>${mastery(c.id)}% ${T('maîtrisé','mastered')}</small></button>`).join('')}</div>
  <div class="foot"><button class="ghost" onclick="LTFgo('settings')">⚙️ ${T('Réglages','Settings')}</button></div>`;
}

function chapter(id){ curCh = id || curCh; const c = CH.find(x=>x.id===curCh); const n = items.filter(i=>i.ch===curCh).length;
  app.innerHTML = header(c.icon+' '+c.name) + `<div class="card"><p>${c.sub}</p><p><b>${n}</b> ${T('éléments','items')} · ${mastery(curCh)}% ${T('maîtrisé','mastered')} · ${T('record chrono','chrono best')} : ${S.best[curCh]||0}</p></div>
  <div class="modes">
   <button class="big" onclick="LTFgo('study')">📚 ${T('Étudier','Study')}<small>${T('Cartes recto-verso','Flashcards')}</small></button>
   ${curCh==='plan' ? `<button class="big" onclick="LTFgo('planFind')">📍 ${T('Trouve la table','Find the table')}<small>${T('Touchez la table annoncée','Tap the table called out')}</small></button><button class="big" onclick="LTFgo('quiz')">🔢 ${T('Quel numéro ?','Which number?')}<small>${T('10 questions','10 questions')}</small></button>` : `<button class="big" onclick="LTFgo('quiz')">❓ Quiz<small>10 questions</small></button>`}
   <button class="big" onclick="LTFgo('chrono')">⏱️ Chrono<small>${T('60 secondes, combos','60 seconds, combos')}</small></button>
   ${curCh==='cock' ? `<button class="big" onclick="LTFgo('bar')">🍸 ${T('Le Bar','The Bar')}<small>${T('Montez le cocktail','Build the cocktail')}</small></button>`:''}
  </div>`;
}

// Study
function study(){ const pool = shuffle(items.filter(i=>i.ch===curCh)); let k=0;
  const show = () => { if(k>=pool.length){ toast(T('Paquet terminé ! 🎉','Deck done! 🎉')); return go('chapter'); } const it = pool[k];
    app.innerHTML = header(T('Étudier','Study'), 'chapter') + `<div class="prog">${k+1} / ${pool.length}</div>
    <div class="flip" onclick="this.classList.toggle('on')"><div class="face front">${it.ch==='plan'?planSVG({hl:it.front, labels:false}):it.front}<small class="hint">${T('Touchez pour retourner','Tap to flip')}</small></div><div class="face back">${it.ch==='plan'?'<b>'+it.front+'</b><br>'+it.back:it.back}${it.info?`<button class="ib ibk" onclick="event.stopPropagation();LTFinfo('${it.id}')">ⓘ ${T('Infos client','Guest info')}</button>`:''}</div></div>
    <div class="row2"><button class="bad" id="no">${T('À revoir','Review again')}</button><button class="good" id="yes">${T('Je savais','I knew it')}</button></div>`;
    $('#yes').onclick=()=>{record(it,true,2);k++;show();}; $('#no').onclick=()=>{record(it,false);k++;show();}; };
  show(); }

// Quiz / exam engine
const planQ = q => { const t=q.table; q.q=T('Quel est le numéro de la table en surbrillance ?','What is the number of the highlighted table?'); q.options=shuffle([t.id, ...shuffle(L.tables.filter(x=>x.id!==t.id).map(x=>x.id)).slice(0,3)]); q.answer=t.id; q.expl=''; q.svg=planSVG({hl:t.id, labels:false}); };
function runQuiz(title, qs, back, onEnd, xp){
  let k=0, score=0;
  const show = () => { if(k>=qs.length) return onEnd(score, qs.length); const q = qs[k];
    if(q.plan) planQ(q);
    app.innerHTML = header(title, back) + `<div class="prog">Question ${k+1} / ${qs.length} · ${score} ✓</div><div class="card q">${q.svg||''}<h2>${esc(q.q)}</h2></div>
    <div class="opts">${q.options.map((o,i)=>`<button class="opt" data-i="${i}">${esc(o)}</button>`).join('')}</div><div id="fb"></div>`;
    app.querySelectorAll('.opt').forEach(b=> b.onclick = () => { const ok = q.options[b.dataset.i]===q.answer; app.querySelectorAll('.opt').forEach(x=>{x.disabled=true; if(q.options[x.dataset.i]===q.answer) x.classList.add('right');}); if(!ok) b.classList.add('wrong'); if(ok) score++; beep(ok); record(q.item, ok, xp||10);
      $('#fb').innerHTML = `<div class="card fb ${ok?'okc':'koc'}"><b>${ok?T('Bravo !','Well done!'):T('Pas tout à fait.','Not quite.')}</b> ${ok?'':T('Réponse','Answer')+' : '+esc(q.answer)+'. '}${q.expl?'<br><small>'+esc(q.expl)+'</small>':''}${q.item&&q.item.info?'<br>'+`<button class="ib ibk" onclick="LTFinfo('${q.item.id}')">ⓘ ${T('Infos client','Guest info')}</button>`:''}</div><button class="big next" id="nx">${T('Suivant','Next')} ›</button>`; $('#nx').onclick=()=>{k++;show();}; });
  }; show(); }
function quiz(){ const qs=[]; for(let i=0;i<10;i++){ const q=randQ(curCh); if(q) qs.push(q);} runQuiz('Quiz', qs, 'chapter', (s,n)=>endScreen(s,n,'chapter')); }
function endScreen(s,n,back){ const pct=Math.round(100*s/n); if(pct===100) confetti(); app.innerHTML = header(T('Résultat','Result'), back) + `<div class="card center"><div class="score">${s} / ${n}</div><p>${pct>=90?T('Digne d\'un Maître d\'hôtel ! ⭐','Maître d\'hôtel material! ⭐'):pct>=70?T('Très bon service 👏','Great service 👏'):pct>=50?T('On y est presque — révisez vos erreurs.','Almost there — review your mistakes.'):T('À retravailler, courage ! 💪','Keep at it! 💪')}</p><p>${rank()} · ${S.xp} XP</p></div><div class="row2"><button class="big" onclick="LTFgo('${back}')">${T('Retour','Back')}</button><button class="big good" onclick="LTFgo('review')">${T('Mes erreurs','My mistakes')}</button></div>`; }

function exam(){ const qs=[]; CH.forEach(c=>{ for(let i=0;i<3;i++){ const q=randQ(c.id); if(q) qs.push(q);} }); runQuiz(T('Examen final','Final exam'), shuffle(qs), 'hub', (s,n)=>{ const pct=Math.round(100*s/n); if(pct>=80){ S.exam={score:pct,date:new Date().toLocaleDateString(EN?'en-GB':'fr-FR')}; save(); go('cert'); } else endScreen(s,n,'hub'); }, 15); }
function cert(){ confetti(); app.innerHTML = header(T('Certificat','Certificate')) + `<div class="cert"><div class="kicker">Les Trois Forts · Sofitel Marseille Vieux-Port</div><h1>${T('Certifié','Certified')}</h1><p>${T('a réussi l\'examen final de la Service Academy','passed the Service Academy final exam')}</p><div class="score">${S.exam.score}%</div><p>${S.exam.date} · ${rank()}</p></div><button class="big" onclick="LTFgo('hub')">${T('Retour','Back')}</button>`; }

function review(){ const its = S.review.map(id=>items.find(i=>i.id===id)).filter(Boolean); if(!its.length){ app.innerHTML = header(T('Mes erreurs','My mistakes'))+`<div class="card center"><p>${T('Aucune erreur à revoir. Impeccable ! ✨','No mistakes to review. Flawless! ✨')}</p></div>`; return; }
  const qs = shuffle(its).slice(0,15).map(qFor).filter(Boolean); runQuiz(T('Révision','Review'), qs, 'hub', (s,n)=>endScreen(s,n,'hub')); }

function chrono(){ let t=60, score=0, combo=1, best=S.best[curCh]||0;
  const next = () => { const q = randQ(curCh); if(!q) return;
    if(q.plan) planQ(q);
    $('#cq').innerHTML = `${q.svg||''}<h2>${esc(q.q)}</h2>`; $('#co').innerHTML = q.options.map((o,i)=>`<button class="opt" data-i="${i}">${esc(o)}</button>`).join('');
    app.querySelectorAll('#co .opt').forEach(b=> b.onclick=()=>{ const ok=q.options[b.dataset.i]===q.answer; beep(ok); record(q.item, ok, 0); if(ok){ score += 10*combo; combo=Math.min(combo+1,5); flash('okf'); } else { combo=1; flash('kof'); toast(T('Réponse','Answer')+' : '+q.answer); } $('#cs').textContent=score; $('#cc').textContent='×'+combo; next(); }); };
  app.innerHTML = header('Chrono', 'chapter') + `<div class="hud"><span>⏱️ <b id="ct">60</b>s</span><span>Score <b id="cs">0</b></span><span>Combo <b id="cc">×1</b></span></div><div class="card q" id="cq"></div><div class="opts" id="co"></div>`;
  next(); timer = setInterval(()=>{ t--; const el=$('#ct'); if(el) el.textContent=t; if(t<=0){ clearInterval(timer); S.xp += Math.round(score/5); if(score>best){S.best[curCh]=score;} save(); app.innerHTML = header('Chrono', 'chapter')+`<div class="card center"><div class="score">${score}</div><p>${score>best?T('Nouveau record ! 🏆','New record! 🏆'):T('Record','Best')+' : '+best}</p><p>+${Math.round(score/5)} XP</p></div><div class="row2"><button class="big" onclick="LTFgo('chrono')">${T('Rejouer','Play again')}</button><button class="big" onclick="LTFgo('chapter')">${T('Retour','Back')}</button></div>`; } },1000); }

// Bar: build the cocktail
function bar(){ const it = pick(items.filter(i=>i.cocktail)); const c = it.cocktail; const need = c.recipe.map(r=>W(r[0]));
  const shelf = shuffle(uniq(need.concat(shuffle(allIngr.filter(x=>!need.includes(x))).slice(0,Math.max(4,8-need.length)))));
  const glasses = uniq(L.cocktails.map(x=>W(x.glass))); const garn = uniq(L.cocktails.map(x=>W(x.garnish)));
  let sel = new Set(), g=null, gn=null;
  app.innerHTML = header(T('Le Bar','The Bar'), 'chapter') + `<div class="card barbg"><div class="kicker">${T('Commande','Order')}</div><h2>${c.n}</h2>${c.batch?'<small>'+T('Préparation','Batch')+' '+cBatch(c)+'</small>':''}</div>
  <h3>1. ${T('Les ingrédients','Ingredients')}</h3><div class="chips" id="sh">${shelf.map(s=>`<button class="chip" data-v="${esc(s)}">${esc(s)}</button>`).join('')}</div>
  <h3>2. ${T('Le verre','Glass')}</h3><div class="chips" id="gl">${glasses.map(s=>`<button class="chip" data-v="${esc(s)}">${esc(s)}</button>`).join('')}</div>
  <h3>3. ${T('La garniture','Garnish')}</h3><div class="chips" id="ga">${garn.map(s=>`<button class="chip" data-v="${esc(s)}">${esc(s)}</button>`).join('')}</div>
  <button class="big good" id="serve">${T('Servir','Serve')} 🍸</button><div id="res"></div>`;
  app.querySelectorAll('#sh .chip').forEach(b=>b.onclick=()=>{ b.classList.toggle('on'); sel.has(b.dataset.v)?sel.delete(b.dataset.v):sel.add(b.dataset.v); });
  const single=(id,setter)=>app.querySelectorAll(id+' .chip').forEach(b=>b.onclick=()=>{ app.querySelectorAll(id+' .chip').forEach(x=>x.classList.remove('on')); b.classList.add('on'); setter(b.dataset.v); });
  single('#gl',v=>g=v); single('#ga',v=>gn=v);
  $('#serve').onclick=()=>{ const okI = need.every(n=>sel.has(n)) && sel.size===need.length; const okG = g===W(c.glass), okN = gn===W(c.garnish); const pts=[okI,okG,okN].filter(Boolean).length; const ok = pts===3; beep(ok); record(it, ok, 10*pts); if(ok) confetti();
    $('#res').innerHTML = `<div class="card fb ${ok?'okc':'koc'}"><b>${pts}/3 ${ok?T('— Parfait, envoyé !','— Perfect, sent!'):''}</b><br>${okI?'✅':'❌'} ${T('Ingrédients','Ingredients')} · ${okG?'✅':'❌'} ${T('Verre','Glass')} · ${okN?'✅':'❌'} ${T('Garniture','Garnish')}<hr>${it.back} ${ib(it)}</div><div class="row2"><button class="big" onclick="LTFgo('bar')">${T('Cocktail suivant','Next cocktail')}</button><button class="big" onclick="LTFgo('chapter')">${T('Retour','Back')}</button></div>`; $('#serve').disabled=true; };
}

// Floor plan
function planSVG(o){ o=o||{}; const sz=5.2; let s=`<svg class="plan" viewBox="-3 -6 106 72" xmlns="http://www.w3.org/2000/svg"><rect x="-2" y="-2" width="104" height="66" rx="2" class="room"/><line x1="0" y1="-1" x2="100" y2="-1" class="win"/><text x="50" y="-3" class="wl">${T('Baies vitrées · Vieux-Port','Bay windows · Vieux-Port')}</text>`;
  L.counters.forEach(c=> s+=`<rect x="${c.x1}" y="${c.y}" width="${c.x2-c.x1}" height="3" class="ctr"/><text x="${(c.x1+c.x2)/2}" y="${c.y+6.5}" class="cl">${c.label}</text>`);
  L.tables.forEach(t=>{ const hl = o.hl===t.id; const cls = 'tb'+(hl?' hl':''); const lab = o.labels!==false || (o.reveal===t.id);
    const shape = t.sh==='round' ? `<circle cx="${t.x}" cy="${t.y}" r="${sz*0.65}" class="${cls}" data-id="${t.id}"/>` : t.sh==='long' ? `<rect x="${t.x-2.5}" y="${t.y-8}" width="5" height="12" rx="1" class="${cls}" data-id="${t.id}"/>` : `<rect x="${t.x-sz/2}" y="${t.y-sz/2}" width="${sz}" height="${sz}" rx="1" class="${cls}" data-id="${t.id}"/>`;
    s += shape + (lab?`<text x="${t.x}" y="${t.y+1.2}" class="tl">${t.id}</text>`:''); });
  return s+'</svg>'; }
function planFind(){ let k=0, score=0; const order = shuffle(L.tables).slice(0,10);
  const show=()=>{ if(k>=order.length) return endScreen(score, order.length, 'chapter'); const t = order[k]; const it = items.find(i=>i.ch==='plan'&&i.front===t.id);
    app.innerHTML = header(T('Trouve la table','Find the table'), 'chapter') + `<div class="prog">${k+1} / ${order.length} · ${score} ✓</div><div class="card center"><h2>${T('Touchez la table','Tap table')} <span class="gold">${t.id}</span></h2>${planSVG({labels:false})}</div><div id="fb"></div>`;
    app.querySelectorAll('svg [data-id]').forEach(el=> el.onclick=()=>{ const ok = el.dataset.id===t.id; beep(ok); record(it, ok, 10); if(ok) score++;
      $('.card.center').innerHTML = `<h2>${ok?T('Exact !','Correct!'):T('C\'était ici :','It was here:')} <span class="gold">${t.id}</span></h2>`+planSVG({labels:true, hl:t.id}); $('#fb').innerHTML=`<button class="big next" id="nx">${T('Suivant','Next')} ›</button>`; $('#nx').onclick=()=>{k++;show();}; }); };
  show(); }

// Carte
function carte(){ app.innerHTML = header(T('La Carte','The Menu')) + `<input id="srch" class="srch" placeholder="${T('Rechercher un plat, un vin, un cocktail…','Search a dish, a wine, a cocktail…')}"><div id="list"></div>`;
  const render = () => { const f = norm($('#srch').value); $('#list').innerHTML = CH.map(c=>{ const its = items.filter(i=>i.ch===c.id && !i.fact && norm(i.front+' '+i.back.replace(/<[^>]+>/g,' ')+' '+(i.info||'').replace(/<[^>]+>/g,' ')).includes(f)); if(!its.length) return ''; return `<h3>${c.icon} ${c.name}</h3>`+its.map(i=>`<div class="li"><div class="lirow"><b>${i.front}</b>${ib(i)}</div><div>${i.back}</div></div>`).join(''); }).join('') + `<h3>📌 ${T('À retenir','Key facts')}</h3>`+FACTS.map(x=>`<div class="li">${esc(x)}</div>`).join(''); };
  $('#srch').oninput = render; render(); }

function settings(){ app.innerHTML = header(T('Réglages','Settings')) + `<div class="card"><div class="sw">🌐 ${T('Langue','Language')} : <button class="chip ${EN?'':'on'}" onclick="LTFlang('fr')">Français</button><button class="chip ${EN?'on':''}" onclick="LTFlang('en')">English</button></div></div><div class="card"><label class="sw"><input type="checkbox" id="snd" ${S.sound?'checked':''}> ${T('Effets sonores','Sound effects')}</label></div><div class="card"><p>${T('Contenu transcrit des cartes réelles du restaurant (octobre 2026). La formule de la semaine change chaque semaine.','Content transcribed from the restaurant\'s real menus (October 2026). The weekly formula changes every week.')}</p><p>${T('Les fiches ⓘ donnent un texte court à dire au client (en français ; passez en English pour la version anglaise).','The ⓘ notes give a short line to tell the guest (switch to Français for the French version).')}</p><p class="warn">${ALLERGY}</p></div><button class="big bad" id="rst">${T('Réinitialiser la progression','Reset progress')}</button>`;
  $('#snd').onchange=e=>{S.sound=e.target.checked;save();}; $('#rst').onclick=()=>{ if(confirm(T('Effacer toute la progression ?','Erase all progress?'))){ S={xp:0,m:{},best:{},review:[],streak:1,last:S.last,sound:S.sound,exam:null,lang:S.lang}; save(); go('hub'); } }; }

// FX
function toast(t){ const d=document.createElement('div'); d.className='toast'; d.textContent=t; document.body.appendChild(d); setTimeout(()=>d.remove(),1800); }
function flash(c){ document.body.classList.add(c); setTimeout(()=>document.body.classList.remove(c),180); }
function confetti(){ const cv=document.createElement('canvas'); cv.className='conf'; cv.width=innerWidth; cv.height=innerHeight; document.body.appendChild(cv); const x=cv.getContext('2d'); const P=Array.from({length:120},()=>({x:Math.random()*cv.width,y:-20-Math.random()*cv.height*.5,v:2+Math.random()*4,r:Math.random()*6.28,c:pick(['#c9a24b','#f3e9d2','#2f5d8a','#e8c873','#ffffff'])})); let f=0; (function a(){ x.clearRect(0,0,cv.width,cv.height); P.forEach(p=>{p.y+=p.v;p.r+=.1;x.save();x.translate(p.x,p.y);x.rotate(p.r);x.fillStyle=p.c;x.fillRect(-4,-2,8,4);x.restore();}); if(++f<150) requestAnimationFrame(a); else cv.remove(); })(); }

// self-test
window.LTFtest = () => { let bad=0; items.forEach(it=>it.gens.forEach(g=>{ const q=g(); if(!q){return;} if(q.plan) return; if(!q.options.includes(q.answer)||new Set(q.options).size!==q.options.length) {bad++; console.warn('bad',it.id,q);} })); const noInfo = items.filter(i=>!i.fact&&i.ch!=='plan'&&(!i.info||!/💬/.test(i.info)||/💬[^<]*<\/div><div><\/div>/.test(i.info))).map(i=>i.id); return {items:items.length, bad, noInfo}; };
hub();
})();
