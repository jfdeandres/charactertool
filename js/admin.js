// Panel de administración. Las claves solo existen en memoria mientras la página está abierta.
const $=id=>document.getElementById(id);
let acceso=null,sobreContenido=null,claves=null,registro=[],pendientes=[];
const cambiados=new Set();   // 'acceso' | 'contenido'
const hoy=()=>new Date().toISOString().slice(0,10);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fecha=d=>d?d.split('-').reverse().join('/'):'';
const ARCHIVOS={acceso:'acceso.json',contenido:'contenido.cifrado.json'};

function show(id){['cargando','setup','alogin','panel'].forEach(s=>$(s).hidden=s!==id);$('salir').hidden=id!=='panel';window.scrollTo(0,0)}
function err(id,t){const e=$(id);e.textContent=t||'';e.hidden=!t}
function marcar(...q){q.forEach(x=>cambiados.add(x));render()}
async function ocupado(btn,fn){const t=btn.textContent;btn.disabled=true;btn.textContent='Cifrando…';try{return await fn()}finally{btn.disabled=false;btn.textContent=t}}

async function leerArchivoContenido(input){
  const f=input.files&&input.files[0];if(!f)throw new Error('Elige el archivo de contenido.');
  let d;try{d=JSON.parse(await f.text())}catch(e){throw new Error('El archivo no es un JSON válido.')}
  const ok=d&&Array.isArray(d.ITEMS)&&d.ITEMS.length>0&&d.ST&&d.SHIFT&&d.PAIRS&&d.SECTORS&&d.AREAS&&d.AGES;
  if(!ok)throw new Error('El archivo no tiene el formato del contenido del test (contenido.privado.json).');
  return d;
}

function render(){
  const act=registro.filter(u=>u.activo).length;
  $('resumen').textContent=`${registro.length} ${registro.length===1?'usuario':'usuarios'} (${act} con acceso). Administración: ${claves?claves.usuario:''}.`;
  $('dirty').hidden=!cambiados.size;
  $('dirtyTxt').textContent=CRIPTO.enArtefacto()?'Pulsa «Guardar cambios» para que tengan efecto en el test.':'Descarga los archivos y súbelos a GitHub para que tengan efecto en el test.';
  $('noContenido').hidden=!!sobreContenido;
  const tb=$('tbody');tb.innerHTML='';$('vacio').hidden=registro.length>0;
  registro.slice().sort((a,b)=>a.usuario.localeCompare(b.usuario)).forEach(u=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`<td><b>${esc(u.usuario)}</b></td><td>${esc(u.nombre||'')}</td><td class="n">${fecha(u.creado)}</td><td><span class="pill ${u.activo?'good':'off'}">${u.activo?'Con acceso':'Revocado'}</span></td><td><div class="row-actions"><button type="button" class="btn ghost sm" data-a="clave">${u.activo?'Nueva clave':'Dar acceso'}</button>${u.activo?'<button type="button" class="btn ghost sm" data-a="revocar">Revocar acceso</button>':''}<button type="button" class="btn danger sm" data-a="borrar">Eliminar</button></div></td>`;
    tr.querySelectorAll('button').forEach(b=>b.onclick=()=>accion(b,u));tb.appendChild(tr);
  });
  $('credCard').hidden=!pendientes.length;
  $('creds').textContent=pendientes.map(p=>`Usuario: ${p.usuario}   Clave: ${p.clave}${p.nombre?'   ('+p.nombre+')':''}`).join('\n');
  const art=CRIPTO.enArtefacto();
  $('saveTxt').textContent=art?'Los cambios se publican en este test en cuanto los guardas.':'Esta web no tiene servidor, así que los cambios se guardan en archivos cifrados que debes subir a tu repositorio de GitHub:';
  $('ghSteps').hidden=art;$('ghFiles').textContent=[...cambiados].map(k=>ARCHIVOS[k]).join(' y ')||'ninguno por ahora';
  $('guardar').textContent=art?'Guardar cambios':'Descargar archivos';
}

async function nuevaEntrada(u,pass){acceso.usuarios[u.id]=await CRIPTO.entrada(pass,claves.ck)}
function anotarClave(u,clave){pendientes=pendientes.filter(p=>p.usuario!==u.usuario);pendientes.push({usuario:u.usuario,nombre:u.nombre||'',clave})}

async function accion(btn,u){
  const a=btn.dataset.a;
  if(a==='clave'){await ocupado(btn,async()=>{const c=CRIPTO.generarClave();await nuevaEntrada(u,c);u.activo=true;anotarClave(u,c)});marcar('acceso')}
  else if(a==='revocar'){delete acceso.usuarios[u.id];u.activo=false;pendientes=pendientes.filter(p=>p.usuario!==u.usuario);marcar('acceso')}
  else if(a==='borrar'){
    if(!btn.classList.contains('confirm')){btn.classList.add('confirm');btn.textContent='Confirmar';setTimeout(()=>{if(btn.isConnected){btn.classList.remove('confirm');btn.textContent='Eliminar'}},4000);return}
    delete acceso.usuarios[u.id];registro=registro.filter(x=>x!==u);pendientes=pendientes.filter(p=>p.usuario!==u.usuario);marcar('acceso');
  }
}

function entrarPanel(){$('nc').value=CRIPTO.generarClave();render();show('panel')}

$('setupForm').addEventListener('submit',async e=>{
  e.preventDefault();const u=CRIPTO.normUser($('su').value),p1=$('sp1').value,p2=$('sp2').value;
  if(!CRIPTO.validUser(u))return err('setupMsg','El usuario debe tener de 3 a 32 caracteres: letras minúsculas, números, punto, guion o guion bajo.');
  if(p1.length<12)return err('setupMsg','La clave debe tener al menos 12 caracteres.');
  if(p1!==p2)return err('setupMsg','Las dos claves no coinciden.');
  let datos;try{datos=await leerArchivoContenido($('sf'))}catch(x){return err('setupMsg',x.message)}
  err('setupMsg','');
  await ocupado($('setupBtn'),async()=>{
    const ck=await CRIPTO.nuevaClave(),ak=await CRIPTO.nuevaClave(),idSalt=CRIPTO.b64(CRIPTO.rnd(16));
    acceso={formato:CRIPTO.FORMATO,kdf:{alg:'PBKDF2-SHA256',iter:CRIPTO.ITER,idIter:CRIPTO.ID_ITER},idSalt,admin:null,usuarios:{},registro:null};
    acceso.admin={id:await CRIPTO.idUsuario(u,idSalt),...await CRIPTO.entrada(p1,ck,{ak})};
    sobreContenido=await CRIPTO.cifrar(ck,datos);
    claves={usuario:u,ck,ak};registro=[];
  });
  $('sp1').value=$('sp2').value='';$('sf').value='';cambiados.add('acceso');cambiados.add('contenido');entrarPanel();
  $('saveMsg').textContent='Cuenta creada y contenido cifrado. Guarda los cambios para activarlos.';
});

$('aloginForm').addEventListener('submit',async e=>{
  e.preventDefault();err('aloginMsg','');$('aloginBtn').disabled=true;$('aloginBtn').textContent='Comprobando…';
  try{
    const s=await CRIPTO.entrar(acceso,$('au').value,$('ap').value);
    if(!s||s.rol!=='admin'||!s.ak)err('aloginMsg','Usuario o clave de administración incorrectos.');
    else{
      claves={usuario:s.usuario,ck:s.ck,ak:s.ak};
      registro=acceso.registro?await CRIPTO.descifrar(s.ak,acceso.registro):[];
      try{sobreContenido=await CRIPTO.leerJSON(CRIPTO.RUTA_CONTENIDO)}catch(x){sobreContenido=null}
      $('ap').value='';entrarPanel();
    }
  }catch(x){err('aloginMsg','No se ha podido comprobar el acceso en este navegador.')}
  $('aloginBtn').disabled=false;$('aloginBtn').textContent='Entrar';
});

$('genClave').onclick=()=>{$('nc').value=CRIPTO.generarClave()};
$('crearForm').addEventListener('submit',async e=>{
  e.preventDefault();const u=CRIPTO.normUser($('nu').value),n=$('nn').value.trim(),c=$('nc').value.trim();
  if(!CRIPTO.validUser(u))return err('crearMsg','El usuario debe tener de 3 a 32 caracteres: letras minúsculas, números, punto, guion o guion bajo.');
  if(c.length<10)return err('crearMsg','La clave debe tener al menos 10 caracteres.');
  err('crearMsg','');
  await ocupado($('crearBtn'),async()=>{
    const id=await CRIPTO.idUsuario(u,acceso.idSalt,acceso.kdf.idIter);
    if(registro.some(x=>x.usuario===u)||acceso.usuarios[id]||acceso.admin.id===id)return err('crearMsg','Ya existe un usuario con ese nombre.');
    const reg={usuario:u,nombre:n,creado:hoy(),activo:true,id};
    await nuevaEntrada(reg,c);registro.push(reg);anotarClave(reg,c);
    $('nu').value='';$('nn').value='';$('nc').value=CRIPTO.generarClave();marcar('acceso');$('nu').focus();
  });
});

$('copyCreds').onclick=()=>{
  const t=$('creds').textContent,m=$('credMsg');
  const sel=()=>{const r=document.createRange();r.selectNodeContents($('creds'));const s=getSelection();s.removeAllRanges();s.addRange(r);m.textContent='Texto seleccionado: cópialo con Ctrl+C o Cmd+C.'};
  try{navigator.clipboard.writeText(t).then(()=>m.textContent='Claves copiadas.',sel)}catch(x){sel()}
};
$('clearCreds').onclick=()=>{pendientes=[];$('credMsg').textContent='';render()};

$('actualizar').onclick=async()=>{
  let d;try{d=await leerArchivoContenido($('cf'))}catch(x){return err('contMsg',x.message)}
  err('contMsg','');await ocupado($('actualizar'),async()=>{sobreContenido=await CRIPTO.cifrar(claves.ck,d)});
  $('cf').value='';marcar('contenido');$('saveMsg').textContent='Contenido cifrado. Guarda los cambios para publicarlo.';
};

$('renovar').onclick=async()=>{
  const b=$('renovar');
  let d;try{d=await leerArchivoContenido($('rf'))}catch(x){return err('renMsg',x.message)}
  const s=await CRIPTO.entrar(acceso,claves.usuario,$('rp').value);
  if(!s||s.rol!=='admin')return err('renMsg','Tu clave de administración no es correcta.');
  if(!b.classList.contains('confirm')){err('renMsg','');b.classList.add('confirm');b.textContent='Confirmar renovación';setTimeout(()=>{b.classList.remove('confirm');b.textContent='Renovar todas las claves'},6000);return}
  b.classList.remove('confirm');err('renMsg','');
  await ocupado(b,async()=>{
    const ck=await CRIPTO.nuevaClave();
    sobreContenido=await CRIPTO.cifrar(ck,d);
    acceso.admin={id:acceso.admin.id,...await CRIPTO.entrada($('rp').value,ck,{ak:claves.ak})};
    claves.ck=ck;acceso.usuarios={};pendientes=[];
    for(const u of registro){if(!u.activo)continue;const c=CRIPTO.generarClave();await nuevaEntrada(u,c);anotarClave(u,c)}
  });
  b.textContent='Renovar todas las claves';$('rp').value='';$('rf').value='';marcar('acceso','contenido');
  $('saveMsg').textContent='Claves renovadas. Guarda los cambios y entrega las claves nuevas.';
};

$('cambioForm').addEventListener('submit',async e=>{
  e.preventDefault();const p1=$('cp1').value,p2=$('cp2').value;
  if(p1.length<12)return err('cambioMsg','La clave debe tener al menos 12 caracteres.');
  if(p1!==p2)return err('cambioMsg','Las dos claves no coinciden.');
  err('cambioMsg','');
  acceso.admin={id:acceso.admin.id,...await CRIPTO.entrada(p1,claves.ck,{ak:claves.ak})};
  $('cp1').value=$('cp2').value='';marcar('acceso');
  $('saveMsg').textContent='Clave de administración cambiada. Guarda los cambios para que tenga efecto.';
});

function descargar(nombre,texto){
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([texto],{type:'application/json'}));a.download=nombre;
  document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1500);
}
$('guardar').onclick=async()=>{
  const m=$('saveMsg'),btn=$('guardar');
  if(!cambiados.size){m.textContent='No hay cambios que guardar.';return}
  btn.disabled=true;
  try{
    acceso.registro=await CRIPTO.cifrar(claves.ak,registro);acceso.actualizado=new Date().toISOString();
    const txt={acceso:JSON.stringify(acceso,null,1)+'\n',contenido:sobreContenido?JSON.stringify({formato:CRIPTO.FORMATO,...sobreContenido})+'\n':null};
    const lista=[...cambiados].filter(k=>txt[k]);
    if(!CRIPTO.enArtefacto()){
      for(const k of lista){descargar(ARCHIVOS[k],txt[k]);await new Promise(r=>setTimeout(r,600))}
      m.textContent=`Descargado: ${lista.map(k=>ARCHIVOS[k]).join(' y ')}. ${lista.length>1?'Súbelos':'Súbelo'} a la carpeta data de tu repositorio para que los cambios tengan efecto.`;
      cambiados.clear();render();return;
    }
    const art=await window.claude.use('artifact');
    if(art){
      try{const files={};lista.forEach(k=>files['data/'+ARCHIVOS[k]]=txt[k]);await art.publish(files);cambiados.clear();render();m.textContent='Cambios guardados. Ya están activos en el test.';return}
      catch(x){
        if(x&&x.code==='conflict'){m.textContent='Otra persona ha guardado cambios a la vez. Recarga la página y repite la operación.';return}
        if(!(x&&(x.code==='not_writer'||x.code==='not_granted'))){m.textContent='No se han podido guardar los cambios. Inténtalo de nuevo en unos segundos.';return}
      }
    }
    const dl=await window.claude.use('downloads');
    if(!dl){m.textContent='Esta vista no permite guardar ni descargar archivos.';return}
    for(const k of lista)await dl.save({filename:ARCHIVOS[k],data:txt[k]});
    m.textContent='No tienes permiso para publicar aquí, así que se han descargado los archivos.';
  }catch(x){m.textContent=x&&x.code==='declined'?'Descarga cancelada.':'No se han podido guardar los cambios. Inténtalo de nuevo.'}
  finally{btn.disabled=false}
};

$('salir').onclick=()=>{claves=null;registro=[];pendientes=[];cambiados.clear();sobreContenido=null;show('alogin')};
window.addEventListener('beforeunload',e=>{if(cambiados.size||pendientes.length){e.preventDefault();e.returnValue=''}});

(async function init(){
  try{acceso=await CRIPTO.leerJSON(CRIPTO.RUTA_ACCESO)}
  catch(e){$('cargaMsg').textContent='No se ha podido cargar data/acceso.json. Abre este panel desde la dirección web del test (por ejemplo, tu página de GitHub Pages) y no directamente desde el archivo en tu ordenador.';return}
  if(!acceso||!acceso.admin){show('setup');return}
  if(acceso.formato!==CRIPTO.FORMATO){$('cargaMsg').textContent='El archivo data/acceso.json no tiene un formato compatible con esta versión.';return}
  show('alogin');
})();
