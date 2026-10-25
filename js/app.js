// Lógica del test: inicio de sesión, preguntas, cálculo, informe y PDF
const $=id=>document.getElementById(id);
const TITULO='Test de fortalezas basado en método LIFO';
const MARCA='GARAND CONSULTING';
let sesion=null,acceso=null,guardado=null,saveTimer=null;
let ST,SHIFT,PAIRS,SECTORS,AREAS,AGES,ITEMS;
function cargarContenido(d){usarContenido(d);({ST,SHIFT,PAIRS,SECTORS,AREAS,AGES,ITEMS}=C)}
let state;
function shuffle(a){a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function getSel(){return {sector:$('sector').value,area:$('area').value,edad:$('edad').value,lead:$('lead').value}}
function ctxLabel(sel){return [(SECTORS[sel.sector]||SECTORS.otro).label,(AREAS[sel.area]||AREAS.otra).label,AGES[sel.edad]||'',sel.lead==='si'?'Con personas a cargo':'Sin personas a cargo'].filter(Boolean).join(' · ')}
function fresh(){return {sel:getSel(),name:$('nombre').value||'',step:0,ans:ITEMS.map(()=>({})),order:ITEMS.map(()=>[]),perm:ITEMS.map(()=>shuffle([0,1,2,3])),secs:ITEMS.map(()=>0),done:false,date:new Date().toISOString().slice(0,10)}}
// Progreso y resultados: solo en este dispositivo y cifrados con la clave de la persona
const claveLocal=()=>'tf-lifo:'+sesion.id.slice(0,24);
function save(){
  if(!state||state.sample||!sesion)return;guardado=JSON.parse(JSON.stringify(state));
  clearTimeout(saveTimer);saveTimer=setTimeout(async()=>{try{localStorage.setItem(claveLocal(),JSON.stringify(await CRIPTO.cifrar(sesion.local,guardado)))}catch(e){}},250);
}
function load(){const s=guardado;return s&&s.ans&&s.ans.length===N&&s.perm?JSON.parse(JSON.stringify(s)):null}
async function leerGuardado(){try{const raw=localStorage.getItem(claveLocal());guardado=raw?await CRIPTO.descifrar(sesion.local,JSON.parse(raw)):null}catch(e){guardado=null}}
function borrarGuardado(){clearTimeout(saveTimer);guardado=null;try{localStorage.removeItem(claveLocal())}catch(e){}}
function show(id){['login','intro','test','results'].forEach(s=>$(s).hidden=s!==id);$('footer').hidden=!(id==='login'||id==='intro');$('topbar').hidden=id==='login';window.scrollTo(0,0)}
let qStart=0;
function tick(){if(state&&!state.sample&&qStart){state.secs[state.step]+=(Date.now()-qStart)/1000}qStart=Date.now()}

function renderQ(){
  const i=state.step,it=ITEMS[i],ord=state.order[i];
  $('qcount').textContent=`Pregunta ${i+1} de ${N}`;
  $('bar').style.width=(i/N*100)+'%';
  const c=buildCtx(state.sel||{});
  $('stem').textContent=tx(it.q,c);
  const box=$('opts');box.innerHTML='';
  state.perm[i].forEach(idx=>{
    const k=it.o[idx][0],t=tx(it.o[idx][1],c);const pos=ord.indexOf(k);
    const b=document.createElement('button');
    b.type='button';b.className='opt'+(pos>=0?' on':'');b.setAttribute('aria-pressed',pos>=0);
    b.innerHTML=`<span class="rank">${pos>=0?4-pos:''}</span><span></span>`;
    b.lastChild.textContent=t.charAt(0).toUpperCase()+t.slice(1);
    b.onclick=()=>pick(k);box.appendChild(b);
  });
  const left=4-ord.length;
  $('hint').textContent=left===4?'Toca primero la respuesta que más se parece a lo que harías.':left===0?'Orden completo. Toca una respuesta para corregirla.':`Ahora la siguiente que más se parece a ti (${left===1?'queda 1':'quedan '+left}).`;
  $('next').disabled=ord.length<4;
  $('next').textContent=i===N-1?'Ver mis resultados':'Siguiente';
  $('prev').textContent=i===0?'Volver a la explicación':'Anterior';
}
function pick(k){
  const i=state.step;let ord=state.order[i];const pos=ord.indexOf(k);
  if(pos>=0)ord=ord.slice(0,pos);else{ord=[...ord,k];if(ord.length===3)ord.push(ORDER.find(x=>!ord.includes(x)))}
  state.order[i]=ord;const a={};ord.forEach((x,j)=>a[x]=4-j);state.ans[i]=a;save();renderQ();
}

function sumFor(st,p,filter){const t={ap:0,di:0,co:0,ad:0};let c=0;ITEMS.forEach((it,i)=>{if(it.p!==p)return;if(filter&&!filter(c++))return;ORDER.forEach(k=>t[k]+=st.ans[i][k]||0)});return t}
function pearson(a,b){const x=ORDER.map(k=>a[k]),y=ORDER.map(k=>b[k]);const mx=x.reduce((s,v)=>s+v,0)/4,my=y.reduce((s,v)=>s+v,0)/4;let sxy=0,sx=0,sy=0;for(let i=0;i<4;i++){sxy+=(x[i]-mx)*(y[i]-my);sx+=(x[i]-mx)**2;sy+=(y[i]-my)**2}return sx&&sy?sxy/Math.sqrt(sx*sy):0}
function level(v){const r=(v-MINS)/(MAXS-MINS);if(r>=.70)return['Muy alto','high'];if(r>=.56)return['Alto',''];if(r>=.44)return['Medio',''];return['Bajo','low']}
function rank(s){return [...ORDER].sort((a,b)=>s[b]-s[a]||ORDER.indexOf(a)-ORDER.indexOf(b))}
function pairKey(a,b){return [a,b].sort((x,y)=>ORDER.indexOf(x)-ORDER.indexOf(y)).join('-')}
function esc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}

function analyse(st){
  const n=sumFor(st,'n'),e=sumFor(st,'e');
  const rn=rank(n),re=rank(e);
  const dom=rn[0],back=rn[1],least=rn[3],domE=re[0];
  const spread=n[rn[0]]-n[rn[3]];
  const lim=Math.round(NN*0.33);
  const shifts=ORDER.map(k=>({k,d:e[k]-n[k]})).filter(x=>Math.abs(x.d)>=lim).sort((a,b)=>Math.abs(b.d)-Math.abs(a.d));
  // Coherencia: correlación media de cada respuesta con el perfil que forman las demás de su misma condición
  let cs=0,cc=0;['n','e'].forEach(p=>{const tot=p==='n'?n:e;ITEMS.forEach((it,i)=>{if(it.p!==p)return;const a=st.ans[i],rest={};ORDER.forEach(k=>rest[k]=tot[k]-(a[k]||0));cs+=pearson(a,rest);cc++})});
  const coh=cs/cc;
  const cohL=coh>=.45?['Alta','good','Tus respuestas a situaciones parecidas apuntan en la misma dirección. El perfil es estable y fiable como base de reflexión.']:coh>=.25?['Media','','Tus respuestas son razonablemente coherentes. Toma el perfil como orientativo, sobre todo en los estilos con puntuaciones cercanas.']:['Baja','high','Tus respuestas varían mucho entre situaciones parecidas. Puede deberse a responder deprisa o a un perfil muy equilibrado. Conviene repetir el test con calma dentro de unos días.'];
  const avgSecs=st.secs?st.secs.reduce((a,b)=>a+b,0)/N:0;
  const fast=!st.sample&&avgSecs>0&&avgSecs<5;
  const pair=PAIRS[pairKey(dom,back)];
  const close=n[rn[0]]-n[rn[1]]<=2;
  const recs=[];
  if(level(n[dom])[0]==='Muy alto')recs.push(['Modera tu estilo dominante',`Tu puntuación en ${ST[dom].short} (${n[dom]}) indica posible exceso. ${ST[dom].moderar}`]);
  else recs.push(['Capitaliza tu estilo dominante',`Busca tareas y conversaciones donde ${ST[dom].short.toLowerCase()} sea justo lo que hace falta: ahí rindes mejor con menos esfuerzo.`]);
  recs.push([`Amplía ${ST[least].short}`,ST[least].ampliar]);
  if(domE!==dom)recs.push(['Detecta tu cambio bajo presión',`En condiciones favorables lideras con ${ST[dom].short}, pero bajo presión pasas a ${ST[domE].short}. Identifica la señal que te avisa del cambio y, en ese momento, haz una pausa antes de reaccionar.`]);
  else if(level(e[domE])[0]==='Muy alto')recs.push(['Vigila tu estilo bajo presión',`Bajo presión refuerzas ${ST[domE].short} (${e[domE]}). Los demás pueden sentir que ${ST[domE].ven}. ${ST[domE].moderar}`]);
  else recs.push(['Tiende puentes con otros estilos','Con personas de estilo distinto al tuyo, empieza la conversación en su idioma: datos para quien conserva, resultados para quien dirige, propósito para quien apoya y relación para quien adapta.']);
  const flex=spread<=Math.round(NN*0.67)?['equilibrado','Usas los cuatro estilos con soltura y puedes adaptarte con facilidad, aunque a veces te cueste mostrar un rasgo claro.']:spread>=Math.round(NN*1.33)?['muy concentrado','Tienes una identidad clara, pero te costará conectar con personas que funcionan de forma muy distinta a ti.']:['con un estilo dominante claro','Tienes preferencias definidas sin descuidar los demás estilos.'];
  return {n,e,rn,re,dom,back,least,domE,spread,shifts,pair,recs,coh,cohL,fast,close,flex};
}

function renderResults(){
  const R=analyse(state);const name=(state.name||'').trim();
  const bars=ORDER.map(k=>`<div class="barrow"><span class="lab" style="color:var(--${k})">${ST[k].short}</span><div class="track"><span class="mid" style="left:${MIDS/MAXS*100}%"></span><div class="bar" style="width:${R.n[k]/MAXS*100}%;background:var(--${k})">${R.n[k]}</div><div class="bar st" style="width:${R.e[k]/MAXS*100}%;background:var(--${k})">${R.e[k]}</div></div></div>`).join('');
  const rows=ORDER.map(k=>{const ln=level(R.n[k]),le=level(R.e[k]),d=R.e[k]-R.n[k];return `<tr><td><b style="color:var(--${k})">${ST[k].name}</b></td><td class="n">${R.n[k]}</td><td><span class="pill ${ln[1]}">${ln[0]}</span></td><td class="n">${R.e[k]}</td><td><span class="pill ${le[1]}">${le[0]}</span></td><td class="n">${d>0?'+':''}${d}</td></tr>`}).join('');
  const shiftHtml=R.shifts.length?R.shifts.map(s=>`<li><b>${ST[s.k].short} ${s.d>0?'sube':'baja'} ${Math.abs(s.d)} puntos.</b> ${SHIFT[s.d>0?'up':'down'][s.k]}</li>`).join(''):'<li>Tu perfil se mantiene estable bajo presión: actúas de forma parecida en calma y en conflicto. Es una señal de coherencia; asegúrate de que tu estilo habitual también sirve en las situaciones tensas.</li>';
  const detail=k=>`<div class="detail t-${k}"><h3 style="color:var(--${k})">${ST[k].name}</h3><p class="muted">${ST[k].lema}</p><div class="cols"><div><b>Fortalezas</b><ul class="clean">${ST[k].fort.map(x=>`<li>${x}</li>`).join('')}</ul></div><div><b>En exceso</b><ul class="clean">${ST[k].exc.map(x=>`<li>${x}</li>`).join('')}</ul></div></div></div>`;
  $('results').innerHTML=`
  <div class="profile-head"><span class="eyebrow">Informe de resultados${name?' · '+esc(name):''}${state.sample?' · ejemplo':''}</span>
    <h1>Tu perfil: ${R.pair[0]}</h1>
    <p class="muted">${esc(ctxLabel(state.sel||{}))}</p>
    <p class="muted">Estilo dominante: <b>${ST[R.dom].name}</b>. Estilo de respaldo: <b>${ST[R.back].name}</b>. Estilo menos usado: <b>${ST[R.least].name}</b>.</p></div>
  <div class="card"><h2>Fiabilidad de tus respuestas</h2>
    <p>Coherencia interna: <span class="pill ${R.cohL[1]}">${R.cohL[0]}</span></p><p>${R.cohL[2]}</p>
    ${R.fast?'<p class="note">Has respondido muy deprisa (menos de 5 segundos por pregunta de media). Si fue así, repite el test con más calma para obtener un perfil más fiable.</p>':''}
    ${R.close?`<p class="note">Tus dos estilos principales están muy igualados (${R.n[R.dom]} y ${R.n[R.back]}). Léelos como un estilo combinado más que como uno dominante y otro de respaldo.</p>`:''}
  </div>
  <div class="card"><h2>Tus puntuaciones</h2>
    <div class="legend"><span><i class="sw" style="background:var(--muted)"></i>Condiciones favorables</span><span><i class="sw" style="background:var(--muted);opacity:.45"></i>Presión o conflicto</span><span>Línea discontinua: punto medio (${MIDS})</span></div>
    <div class="bars">${bars}</div>
    <div class="scale"><span>0</span><span>${MAXS/4}</span><span>${MAXS/2}</span><span>${MAXS*3/4}</span><span>${MAXS}</span></div>
    <div class="tablewrap"><table><thead><tr><th>Estilo</th><th>Favorable</th><th>Nivel</th><th>Presión</th><th>Nivel</th><th>Cambio</th></tr></thead><tbody>${rows}<tr><td class="muted">Total</td><td class="n">${TOTAL}</td><td></td><td class="n">${TOTAL}</td><td></td><td></td></tr></tbody></table></div>
    <p class="note">Cada condición reparte ${TOTAL} puntos entre los cuatro estilos (mínimo ${MINS} y máximo ${MAXS} por estilo). Un nivel «Muy alto» puede indicar uso excesivo de esa fortaleza; un nivel «Bajo», un estilo poco desarrollado.</p>
  </div>
  <div class="card"><h2>Qué significa tu combinación</h2><p>${R.pair[1]}</p><p>Tu perfil es <b>${R.flex[0]}</b>. ${R.flex[1]}</p></div>
  <div class="card"><h2>Cómo cambias bajo presión</h2><p>En condiciones favorables tu estilo principal es <b>${ST[R.dom].short}</b>; bajo presión es <b>${ST[R.domE].short}</b>.${R.dom!==R.domE?' Este cambio es una de las claves de tu perfil: quienes solo te conocen en momentos tensos pueden tener una imagen de ti muy distinta a la que tú tienes.':''}</p><ul class="clean">${shiftHtml}</ul></div>
  <div class="card"><h2>Tu estilo dominante y tu estilo menos usado</h2>${detail(R.dom)}${detail(R.least)}</div>
  <div class="card"><h2>Tres palancas de desarrollo</h2><ol class="steps">${R.recs.map(r=>`<li><b>${r[0]}.</b> ${r[1]}</li>`).join('')}</ol></div>
  <div class="card"><h2>Guarda tus resultados</h2><p class="muted">Descarga el informe completo en PDF o repite el test.</p>
    <div class="btns"><button class="btn" id="pdf">Descargar informe en PDF</button><button class="btn ghost" id="again">Repetir el test</button><button class="btn ghost" id="back">Volver a la explicación</button></div><span class="toast" id="toast" aria-live="polite"></span></div>
  <p class="note">Este informe describe preferencias, no capacidades. Todos podemos usar los cuatro estilos y desarrollar los que menos usamos. No es el cuestionario oficial LIFO®.</p>`;
  $('pdf').onclick=()=>downloadPdf(R,name);
  $('again').onclick=()=>{state=fresh();save();updResume();show('intro')};
  $('back').onclick=()=>{show('intro');updResume()};
  show('results');
}

const dlReady=(window.claude&&window.claude.use)?window.claude.use('downloads').catch(()=>null):Promise.resolve(null);
function clean(s){return String(s).replace(/[–—]/g,'-').replace(/…/g,'...').replace(/[“”]/g,'"').replace(/[‘’]/g,"'")}
function buildPdf(R,name){
  const {jsPDF}=window.jspdf;const doc=new jsPDF({unit:'mm',format:'a4'});
  const W=210,M=18,CW=W-2*M;let y=20;
  const ink=[24,32,43],muted=[90,100,116];
  const need=h=>{if(y+h>282){doc.addPage();y=20}};
  const text=(s,{size=10.5,bold=false,color=ink,gap=1.5,indent=0}={})=>{doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(size);doc.setTextColor(...color);const lines=doc.splitTextToSize(clean(s),CW-indent);const lh=size*0.42;need(lines.length*lh);lines.forEach(l=>{doc.text(l,M+indent,y);y+=lh});y+=gap};
  const h2=s=>{y+=3;need(12);text(s,{size:14,bold:true,gap:2})};
  const bullet=(s,indent=4)=>{doc.setFontSize(10.5);need(5);doc.setTextColor(...ink);doc.text('-',M+indent-3.5,y);text(s,{indent,gap:1})};
  text('INFORME DE RESULTADOS'+(name?' · '+name:'')+(state.sample?' · EJEMPLO':''),{size:9,color:muted,gap:2});
  text(TITULO,{size:20,bold:true,gap:1});
  text('Contexto: '+ctxLabel(state.sel||{}),{size:9,color:muted,gap:.5});
  text('Fecha: '+(state.date||new Date().toISOString().slice(0,10)),{size:9,color:muted,gap:4});
  text('Tu perfil: '+R.pair[0],{size:16,bold:true,gap:1.5});
  text(`Estilo dominante: ${ST[R.dom].name}. Estilo de respaldo: ${ST[R.back].name}. Estilo menos usado: ${ST[R.least].name}.`,{gap:2});
  text(`Coherencia de las respuestas: ${R.cohL[0]}. ${R.cohL[2]}`,{size:9.5,color:muted,gap:2});
  h2('Puntuaciones');
  const lx=M+30,bw=CW-46;need(70);
  ORDER.forEach(k=>{
    doc.setFont('helvetica','bold');doc.setFontSize(10.5);doc.setTextColor(...HEX[k]);doc.text(ST[k].short,M,y+3.2);
    doc.setFillColor(...HEX[k]);doc.rect(lx,y,bw*R.n[k]/MAXS,4,'F');
    const lt=HEX[k].map(c=>Math.round(c+(255-c)*.6));doc.setFillColor(...lt);doc.rect(lx,y+5,bw*R.e[k]/MAXS,4,'F');
    doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(...ink);
    doc.text(String(R.n[k]),lx+bw*R.n[k]/MAXS+2,y+3.3);doc.text(String(R.e[k]),lx+bw*R.e[k]/MAXS+2,y+8.3);
    y+=14;
  });
  doc.setDrawColor(...muted);doc.setLineDashPattern([1,1],0);doc.line(lx+bw*MIDS/MAXS,y-58,lx+bw*MIDS/MAXS,y-2);doc.setLineDashPattern([],0);
  text(`Barra oscura: condiciones favorables. Barra clara: presión o conflicto. Línea discontinua: punto medio (${MIDS}). Escala de ${MINS} a ${MAXS} por estilo; cada condición suma ${TOTAL}.`,{size:8.5,color:muted,gap:3});
  // tabla
  const cols=[M,M+62,M+90,M+118,M+146];need(36);
  doc.setFont('helvetica','bold');doc.setFontSize(8.5);doc.setTextColor(...muted);
  ['ESTILO','FAVORABLE','PRESIÓN','CAMBIO','NIVEL FAV.'].forEach((h,i)=>doc.text(h,cols[i],y));y+=2;doc.setDrawColor(210,215,222);doc.line(M,y,W-M,y);y+=5;
  ORDER.forEach(k=>{const d=R.e[k]-R.n[k];doc.setFont('helvetica','normal');doc.setFontSize(10);doc.setTextColor(...ink);
    [ST[k].name,String(R.n[k]),String(R.e[k]),(d>0?'+':'')+d,level(R.n[k])[0]].forEach((v,i)=>doc.text(v,cols[i],y));y+=6});
  y+=2;
  h2('Qué significa tu combinación');text(R.pair[1]);text(`Tu perfil es ${R.flex[0]}. ${R.flex[1]}`);
  h2('Cómo cambias bajo presión');
  text(`En condiciones favorables tu estilo principal es ${ST[R.dom].short}; bajo presión es ${ST[R.domE].short}.`);
  if(R.shifts.length)R.shifts.forEach(s=>bullet(`${ST[s.k].short} ${s.d>0?'sube':'baja'} ${Math.abs(s.d)} puntos. ${SHIFT[s.d>0?'up':'down'][s.k]}`));
  else bullet('Tu perfil se mantiene estable bajo presión.');
  [R.dom,R.least].forEach((k,i)=>{h2((i?'Estilo menos usado: ':'Estilo dominante: ')+ST[k].name);text(ST[k].lema,{color:muted});text('Fortalezas',{bold:true,gap:.5});ST[k].fort.forEach(f=>bullet(f));text('En exceso',{bold:true,gap:.5});ST[k].exc.forEach(f=>bullet(f))});
  h2('Tres palancas de desarrollo');R.recs.forEach((r,i)=>text(`${i+1}. ${r[0]}. ${r[1]}`,{gap:2}));
  y+=4;text('Este informe describe preferencias, no capacidades. Es una herramienta original de desarrollo inspirada en el enfoque de orientaciones de vida de Atkins y Katcher; no es el cuestionario oficial LIFO®.',{size:8.5,color:muted});
  const total=doc.getNumberOfPages();
  for(let p=1;p<=total;p++){
    doc.setPage(p);doc.setDrawColor(210,215,222);doc.setLineDashPattern([],0);doc.line(M,284,W-M,284);
    doc.setFont('helvetica','bold');doc.setFontSize(9);doc.setTextColor(...ink);doc.text(MARCA,W/2,290,{align:'center',charSpace:1.2});
    doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(...muted);doc.text(`${p} / ${total}`,W-M,290,{align:'right'});
  }
  return doc;
}
async function downloadPdf(R,name){
  const t=$('toast');
  if(!window.jspdf){t.textContent='No se ha podido cargar el generador de PDF. Recarga la página e inténtalo de nuevo.';return}
  const dl=await dlReady;
  const fn0=n=>'informe-fortalezas-lifo'+(n?'-'+n.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''):'')+'.pdf';
  if(!dl){
    if(CRIPTO.enArtefacto()){t.textContent='La descarga de archivos no está disponible en esta vista.';return}
    try{buildPdf(R,name).save(fn0(name));t.textContent='Informe descargado.'}catch(e){t.textContent='No se ha podido generar el PDF. Inténtalo de nuevo.'}
    return;
  }
  try{
    const blob=buildPdf(R,name).output('blob');
    const fn=fn0(name);
    t.textContent='Confirma la descarga en el aviso que aparece.';
    await dl.save({filename:fn,data:blob});t.textContent='Informe descargado.';
  }catch(e){t.textContent=e&&e.code==='declined'?'Descarga cancelada.':e&&e.code==='rate_limited'?'Ya hay una descarga pendiente de confirmar.':'No se ha podido descargar el PDF. Inténtalo de nuevo.'}
}

function updResume(){const s=load();const has=s&&(s.done||s.order.some(o=>o.length));$('resume').hidden=!has;if(has)$('resume').textContent=s.done?'Ver mis últimos resultados':'Continuar donde lo dejé'}
$('start').onclick=()=>{const sel=getSel();if(!sel.sector||!sel.area||!sel.edad||!sel.lead){$('err').hidden=false;return}$('err').hidden=true;state=fresh();save();qStart=Date.now();renderQ();show('test')};
function fillSelect(id,obj){const el=$(id);Object.entries(obj).forEach(([k,v])=>{const o=document.createElement('option');o.value=k;o.textContent=v.label;el.appendChild(o)})}
function updPreview(){const sel=getSel();const ok=sel.sector&&sel.area&&sel.edad&&sel.lead;$('preview').hidden=!ok;if(ok){$('err').hidden=true;$('previewQ').textContent=tx(ITEMS[1].q,buildCtx(sel))}}
['sector','area','edad','lead'].forEach(id=>$(id).addEventListener('change',updPreview));
$('resume').onclick=()=>{const s=load();if(!s)return;state=s;if(s.done)renderResults();else{qStart=Date.now();renderQ();show('test')}};
$('sample').onclick=()=>{
  const pref={n:['ap','di','co','ad'],e:['co','di','ad','ap']};
  const s={sel:{sector:'seguros',area:'comercial',edad:'45-59',lead:'si'},name:'Perfil de ejemplo',step:N-1,sample:true,done:true,ans:[],order:[],perm:[],secs:[],date:new Date().toISOString().slice(0,10)};
  ITEMS.forEach((it,i)=>{let o=[...pref[it.p]];if(i%3===1)o=[o[1],o[0],o[2],o[3]];if(i%5===2)o=[o[0],o[2],o[1],o[3]];s.order.push(o);s.perm.push([0,1,2,3]);s.secs.push(8);const a={};o.forEach((x,j)=>a[x]=4-j);s.ans.push(a)});
  state=s;renderResults();
};
$('next').onclick=()=>{tick();if(state.step<N-1){state.step++;save();renderQ();window.scrollTo(0,0)}else{state.done=true;state.name=state.name||$('nombre').value;save();renderResults()}};
$('prev').onclick=()=>{tick();if(state.step===0){show('intro');updResume()}else{state.step--;save();renderQ()}};
$('nombre').oninput=e=>{if(state&&!state.sample){state.name=e.target.value;save()}};
function restore(){const s=load();['sector','area','edad','lead'].forEach(k=>$(k).value='');$('nombre').value='';if(s){if(s.name)$('nombre').value=s.name;if(s.sel)['sector','area','edad','lead'].forEach(k=>{if(s.sel[k])$(k).value=s.sel[k]})}else if(sesion&&sesion.nombre){$('nombre').value=sesion.nombre}updPreview();updResume()}
function llenarSelects(){[['sector',SECTORS,'Elige tu sector'],['area',AREAS,'Elige tu área']].forEach(([id,obj,ph])=>{const el=$(id);el.innerHTML='';const o0=document.createElement('option');o0.value='';o0.textContent=ph;el.appendChild(o0);Object.entries(obj).forEach(([k,v])=>{const o=document.createElement('option');o.value=k;o.textContent=v.label;el.appendChild(o)})})}
async function iniciarSesion(ses){
  const sobre=await CRIPTO.leerJSON(CRIPTO.RUTA_CONTENIDO);
  if(!sobre)throw new Error('sin-contenido');
  cargarContenido(await CRIPTO.descifrar(ses.ck,sobre));
  sesion=ses;await leerGuardado();
  $('who').textContent=ses.rol==='admin'?`Sesión de administración (${ses.usuario})`:`Sesión iniciada · usuario ${ses.usuario}`;
  $('adminLink').hidden=ses.rol!=='admin';
  llenarSelects();restore();show('intro');
}
$('loginForm').addEventListener('submit',async e=>{
  e.preventDefault();const msg=$('loginMsg'),btn=$('loginBtn');
  if(!acceso){msg.textContent='No se ha podido cargar la configuración de acceso. Abre el test desde su dirección web y vuelve a intentarlo.';msg.hidden=false;return}
  btn.disabled=true;btn.textContent='Comprobando…';msg.hidden=true;
  try{
    const ses=await CRIPTO.entrar(acceso,$('lu').value,$('lp').value);
    if(ses){$('lp').value='';await iniciarSesion(ses)}
    else{msg.textContent='Usuario o clave incorrectos. Revisa los datos que te han facilitado.';msg.hidden=false}
  }catch(err){msg.textContent=err&&err.message==='sin-contenido'?'El contenido del test todavía no está publicado. Avisa a la persona administradora.':'No se ha podido abrir el test en este navegador. Prueba con otro navegador actualizado.';msg.hidden=false}
  btn.disabled=false;btn.textContent='Entrar';
});
function salir(){clearTimeout(saveTimer);sesion=null;state=null;guardado=null;C=null;$('results').innerHTML='';$('opts').innerHTML='';$('stem').textContent='';['sector','area','edad','lead'].forEach(k=>$(k).value='');$('nombre').value='';$('lu').value='';show('login')}
$('logout').onclick=salir;
$('borrar').onclick=()=>{const b=$('borrar');if(!b.classList.contains('confirm')){b.classList.add('confirm');b.textContent='Pulsa otra vez para confirmar';setTimeout(()=>{b.classList.remove('confirm');b.textContent='Borrar mis datos de este dispositivo'},4000);return}borrarGuardado();state=null;b.classList.remove('confirm');b.textContent='Borrar mis datos de este dispositivo';restore();$('borradoMsg').textContent='Tus respuestas y resultados se han borrado de este dispositivo.'};
(async function init(){
  show('login');
  const m=$('loginMsg');
  try{acceso=await CRIPTO.leerJSON(CRIPTO.RUTA_ACCESO)}
  catch(e){m.textContent='No se ha podido cargar la configuración de acceso. Si has abierto el archivo directamente desde tu ordenador, ábrelo desde su dirección web (consulta el README).';m.hidden=false;return}
  if(!acceso||!acceso.admin){acceso=null;m.textContent='El acceso todavía no está configurado. La persona administradora debe entrar en el panel de administración para ponerlo en marcha.';m.hidden=false}
})();
