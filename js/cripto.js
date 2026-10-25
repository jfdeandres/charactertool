// Cifrado en el navegador con Web Crypto. No hay servidor ni base de datos.
//
// - El contenido del test se cifra con una clave de contenido (AES-GCM 256).
// - Cada usuario tiene una copia de esa clave «envuelta» (AES-KW) con una clave derivada
//   de su contraseña (PBKDF2-SHA256, 600.000 iteraciones, sal propia). Sin contraseña
//   válida, la clave de contenido no se puede obtener.
// - Los nombres de usuario no se publican: cada entrada se identifica con un derivado
//   (PBKDF2) del nombre de usuario.
// - El registro de usuarios (nombres, fechas, estado) va cifrado con una clave que solo
//   puede desenvolver la cuenta de administración.
// - Los resultados que se guardan en el dispositivo se cifran con una clave derivada de la
//   contraseña de cada persona.
const CRIPTO={
  FORMATO:'tf-lifo-cifrado-1',
  ITER:600000,
  ID_ITER:100000,
  RUTA_ACCESO:'data/acceso.json',
  RUTA_CONTENIDO:'data/contenido.cifrado.json',
  enc:new TextEncoder(),dec:new TextDecoder(),
  b64(buf){const b=new Uint8Array(buf);let s='';for(let i=0;i<b.length;i+=0x8000)s+=String.fromCharCode(...b.subarray(i,i+0x8000));return btoa(s)},
  unb64(s){const bin=atob(s);const b=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)b[i]=bin.charCodeAt(i);return b},
  rnd(n){const a=new Uint8Array(n);crypto.getRandomValues(a);return a},
  normUser(u){return String(u||'').trim().toLowerCase()},
  validUser(u){return /^[a-z0-9._-]{3,32}$/.test(u)},
  async pbkdf2(texto,sal,iter,bits){
    const base=await crypto.subtle.importKey('raw',this.enc.encode(texto),'PBKDF2',false,['deriveBits']);
    return new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt:sal,iterations:iter,hash:'SHA-256'},base,bits));
  },
  async idUsuario(usuario,idSalt,idIter){
    const b=await this.pbkdf2('tf-lifo|'+this.normUser(usuario),this.unb64(idSalt),idIter||this.ID_ITER,256);
    return this.b64(b).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  },
  // Una sola derivación produce la clave para envolver (AES-KW) y la clave local (AES-GCM)
  async derivar(pass,salt,iter){
    const b=await this.pbkdf2(pass,this.unb64(salt),iter||this.ITER,512);
    const kek=await crypto.subtle.importKey('raw',b.slice(0,32),'AES-KW',false,['wrapKey','unwrapKey']);
    const local=await crypto.subtle.importKey('raw',b.slice(32,64),'AES-GCM',false,['encrypt','decrypt']);
    return {kek,local};
  },
  nuevaClave(){return crypto.subtle.generateKey({name:'AES-GCM',length:256},true,['encrypt','decrypt'])},
  async envolver(clave,kek){return this.b64(await crypto.subtle.wrapKey('raw',clave,kek,'AES-KW'))},
  async desenvolver(b64,kek){return crypto.subtle.unwrapKey('raw',this.unb64(b64),kek,'AES-KW',{name:'AES-GCM',length:256},true,['encrypt','decrypt'])},
  async cifrar(clave,obj){
    const iv=this.rnd(12);
    const ct=await crypto.subtle.encrypt({name:'AES-GCM',iv},clave,this.enc.encode(JSON.stringify(obj)));
    return {iv:this.b64(iv),ct:this.b64(ct)};
  },
  async descifrar(clave,sobre){
    const pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:this.unb64(sobre.iv)},clave,this.unb64(sobre.ct));
    return JSON.parse(this.dec.decode(pt));
  },
  // Crea la entrada de una persona: sal nueva + copia envuelta de la clave de contenido
  async entrada(pass,claveContenido,extra){
    const salt=this.b64(this.rnd(16));const {kek}=await this.derivar(pass,salt);
    const e={salt,ck:await this.envolver(claveContenido,kek)};
    if(extra)for(const k in extra)e[k]=await this.envolver(extra[k],kek);
    return e;
  },
  async leerJSON(ruta){const r=await fetch(ruta,{cache:'no-store'});if(r.status===404)return null;if(!r.ok)throw new Error('http '+r.status);return r.json()},
  // Inicio de sesión: devuelve las claves o null si el usuario o la contraseña no son válidos
  async entrar(acceso,usuario,pass){
    const id=await this.idUsuario(usuario,acceso.idSalt,acceso.kdf&&acceso.kdf.idIter);
    let rol='usuario',e=acceso.usuarios[id];
    if(acceso.admin&&acceso.admin.id===id){rol='admin';e=acceso.admin}
    if(!e){await this.derivar(pass,acceso.idSalt,acceso.kdf&&acceso.kdf.iter);return null} // mismo tiempo de respuesta que una clave incorrecta
    const {kek,local}=await this.derivar(pass,e.salt,acceso.kdf&&acceso.kdf.iter);
    try{
      const ck=await this.desenvolver(e.ck,kek);
      const ak=rol==='admin'&&e.ak?await this.desenvolver(e.ak,kek):null;
      return {id,rol,usuario:this.normUser(usuario),ck,ak,local};
    }catch(x){return null}
  },
  generarClave(){const al='abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';const a=new Uint32Array(12);crypto.getRandomValues(a);return [...a].map(x=>al[x%al.length]).join('')},
  enArtefacto(){return !!(window.claude&&typeof window.claude.use==='function')}
};
