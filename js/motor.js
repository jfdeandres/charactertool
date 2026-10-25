// Motor del test: adapta las plantillas del contenido (que llega cifrado) al contexto de cada persona.
// Este archivo no contiene preguntas ni textos del informe.
const ORDER=['ap','di','co','ad'];
const HEX={ap:[29,138,107],di:[200,69,44],co:[47,98,181],ad:[176,122,18]};
let C=null;              // contenido descifrado: ST, SHIFT, PAIRS, AGES, SECTORS, AREAS, ITEMS
let N=0,NN=0,NE=0,MAXS=0,MINS=0,MIDS=0,TOTAL=0;

function usarContenido(datos){
  C=datos;N=C.ITEMS.length;NN=C.ITEMS.filter(i=>i.p==='n').length;NE=N-NN;
  MAXS=NN*4;MINS=NN;MIDS=NN*2.5;TOTAL=NN*10;
}
const cap=s=>s.charAt(0).toUpperCase()+s.slice(1);
const de=x=>x.startsWith('el ')?'del '+x.slice(3):'de '+x;
function rellenar(t,ctx){
  return t.replace(/\{(cap:|de:)?([\w.]+)\}/g,(m,f,ruta)=>{
    let v=ruta.split('.').reduce((o,k)=>o==null?o:o[k],ctx);
    if(v==null)return m;v=String(v);
    return f==='cap:'?cap(v):f==='de:'?de(v):v;
  });
}
// Una plantilla es un texto o una lista de variantes [[condición, texto], …, ['', texto por defecto]]
function tx(p,ctx){
  if(typeof p==='string')return rellenar(p,ctx);
  const v=p.find(([cond])=>!cond||ctx[cond]);return rellenar(v[1],ctx);
}
function buildCtx(sel){
  const S=C.SECTORS[sel.sector]||C.SECTORS.otro;
  const plant=(C.AREAS[sel.area]||C.AREAS.otra).v;
  const A={};for(const k in plant)A[k]=rellenar(plant[k],{S});
  const young=sel.edad==='m30',senior=sel.edad==='45-59'||sel.edad==='60',lead=sel.lead==='si';
  return Object.assign({},A,{S,young,senior,lead,en:S.en,
    comp:lead?'una persona de tu equipo':'un compañero',
    equipo:lead?'tu equipo':'el equipo',
    jefe:lead?(senior?'la dirección general':'tu director'):'tu responsable',
    critico:young?`alguien ${de(A.otraArea)} con mucha más experiencia que tú`:senior?`alguien ${de(A.otraArea)} con bastante menos experiencia que tú`:`alguien ${de(A.otraArea)}`});
}
