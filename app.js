'use strict';
const KEY='vaciado.v1',PX=56,DIAS=['domingo','lunes','martes','mi[eé]rcoles','jueves','viernes','s[aá]bado'];
const $=s=>document.querySelector(s),iso=d=>d.toLocaleDateString('sv'),p2=n=>String(n).padStart(2,'0');
const mk=(t,c)=>{const e=document.createElement(t);if(c)e.className=c;return e};
const hhmm=m=>p2(Math.floor(m/60))+':'+p2(m%60),mn=h=>{const[a,b]=h.split(':');return +a*60+ +b};
let items=[];try{items=JSON.parse(localStorage.getItem(KEY)||'[]')}catch{}
let pendiente=null,ult=null,wl=null,ft=null;
const guardar=()=>{try{localStorage.setItem(KEY,JSON.stringify(items))}catch{alert('No pude guardar: almacenamiento lleno o bloqueado. Exporta tus datos.')}};
const mas=n=>{const d=new Date();d.setDate(d.getDate()+n);return iso(d)};
const sig=(f,r)=>{const d=new Date(f+'T12:00');do d.setDate(d.getDate()+(r=='semanal'?7:1));while(r=='lab'&&[0,6].includes(d.getDay()));return iso(d)};
const fmt=(h,m,ap)=>{h=+h;if(ap){ap=ap.toLowerCase();if(ap=='pm'&&h<12)h+=12;if(ap=='am'&&h==12)h=0}return p2(h)+':'+p2(m||0)};

function parsear(t){
  let hora=null,fecha=null,dur=null,rec=null;
  const cut=(re,fn)=>{t=t.replace(re,(...a)=>{fn(...a);return ' '})};
  cut(/\b(todos los d[ií]as|diari[oa]s?|cada d[ií]a)\b/i,()=>{rec='diaria'});
  cut(/\b(entre semana|(?:de )?lunes a viernes)\b/i,()=>{rec='lab'});
  cut(/\bcada semana\b/i,()=>{rec='semanal'});
  cut(/\bcada(?=\s+(?:lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo))/i,()=>{rec='semanal'});
  cut(/\b(\d{1,2}):(\d{2})\s?(am|pm)?/i,(a,h,m,ap)=>{hora=fmt(h,m,ap)});
  if(!hora)cut(/\b(?:a las?\s)?(\d{1,2})\s?(am|pm)\b/i,(a,h,ap)=>{hora=fmt(h,0,ap)});
  if(!hora)cut(/\ba las?\s(\d{1,2})\b/i,(a,h)=>{hora=fmt(h>=1&&h<=7?+h+12:h,0)});
  cut(/\b(\d+)\s?min(?:utos?)?\b/i,(a,n)=>{dur=+n});
  cut(/\b(\d+(?:[.,]\d)?)\s?h(?:oras?)?\b/i,(a,n)=>{dur=Math.round(parseFloat(n.replace(',','.'))*60)});
  cut(/\bpasado ma[ñn]ana\b/i,()=>{fecha=mas(2)});
  cut(/\bma[ñn]ana\b/i,()=>{fecha=mas(1)});
  cut(/\bhoy\b/i,()=>{fecha=mas(0)});
  DIAS.forEach((d,i)=>cut(new RegExp('\\b'+d+'\\b','i'),()=>{fecha=mas((i-new Date().getDay()+7)%7||7)}));
  if((hora||rec)&&!fecha)fecha=mas(0);
  if(rec=='lab'&&[0,6].includes(new Date(fecha+'T12:00').getDay()))fecha=sig(fecha,'lab');
  return{texto:t.replace(/\s+/g,' ').trim(),fecha,hora,dur,rec};
}

function rodar(){const h=iso(new Date());
  items.forEach(i=>{if(!i.fecha||i.fecha>=h)return;
    if(i.rec){let n=0;while(i.fecha<h&&n++<400)i.fecha=sig(i.fecha,i.rec);i.hecho=false}
    else if(!i.hecho){i.fecha=null;i.hora=null}});guardar()}

function grip(i){const g=mk('button','grip');g.textContent='⋮⋮';g.setAttribute('aria-label','Arrastrar a la línea de tiempo');g.onpointerdown=e=>arrastrar(e,i);return g}
function editar(i){const v=prompt('Editar',i.texto);if(!v||!v.trim())return;const p=parsear(v);
  i.texto=p.texto||v.trim();if(p.fecha)i.fecha=p.fecha;if(p.hora)i.hora=p.hora;if(p.dur)i.dur=p.dur;if(p.rec)i.rec=p.rec;guardar();render()}
function check(i){const c=mk('button','chk');c.setAttribute('aria-label','Marcar hecha');
  c.onclick=()=>{i.hecho=!i.hecho;if(ult&&ult.id==i.id)ult=null;navigator.vibrate?.(15);guardar();render()};return c}
function borrar(i){const x=mk('button','borrar');x.textContent='×';x.setAttribute('aria-label','Borrar');
  x.onclick=()=>{items=items.filter(o=>o!==i);guardar();render()};return x}

function fila(i,sec){
  const li=mk('li',i.hecho?'hecho':''),t=mk('span','txt'),m=mk('span','meta');
  t.textContent=i.texto;t.onclick=()=>editar(i);
  m.textContent=[sec=='despues'?i.fecha.slice(5).split('-').reverse().join('/'):'',i.hora,i.dur?i.dur+'min':'',i.rec?'↻':''].filter(Boolean).join(' ');
  li.append(...(i.hecho?[]:[grip(i)]),check(i),t,m);
  if(!i.fecha&&!i.hecho){const b=mk('button');b.textContent='Hoy';
    b.onclick=()=>{pendiente=i;const p=$('#p');p.value='';p.showPicker?p.showPicker():p.click()};li.append(b)}
  li.append(borrar(i));return li}

function timeline(con){
  const tl=$('#tl');tl.replaceChildren();let ini=6,fin=23;
  con.forEach(i=>{ini=Math.min(ini,Math.floor(mn(i.hora)/60));fin=Math.max(fin,Math.ceil((mn(i.hora)+(i.dur||30))/60))});fin=Math.min(fin,24);
  tl.dataset.ini=ini;tl.style.height=(fin-ini)*PX+'px';
  for(let h=ini;h<fin;h++){const l=mk('div','hr');l.style.top=(h-ini)*PX+'px';l.textContent=p2(h);tl.append(l)}
  const lanes=[],ord=[...con].sort((a,b)=>mn(a.hora)-mn(b.hora));
  ord.forEach(i=>{const s=mn(i.hora),e=s+(i.dur||30);let k=lanes.findIndex(x=>x<=s);if(k<0){k=lanes.length;lanes.push(0)}lanes[k]=e;i._k=k});
  ord.forEach(i=>{const b=mk('div','blk'+(i.hecho?' hecho':'')),t=mk('span','txt'),n=lanes.length;
    b.style.top=(mn(i.hora)-ini*60)*PX/60+'px';b.style.height=Math.max(i.dur||30,22*60/PX)*PX/60-2+'px';
    b.style.left=`calc(34px + (100% - 34px) * ${i._k} / ${n})`;b.style.width=`calc((100% - 34px) / ${n} - 3px)`;
    t.textContent=i.texto+(i.rec?' ↻':'');t.onclick=()=>editar(i);
    const c=mk('button');c.textContent='✓';c.setAttribute('aria-label','Marcar hecha');
    c.onclick=()=>{i.hecho=!i.hecho;navigator.vibrate?.(15);guardar();render()};
    const rz=mk('div','rz');rz.setAttribute('aria-label','Cambiar duración');rz.onpointerdown=e=>redimensionar(e,i,b,rz);b.append(grip(i),t,c,rz);tl.append(b)});
  const w=mk('div');w.id='now';tl.append(w);ahora()}
function ahora(){const w=$('#now'),tl=$('#tl');if(!w)return;const d=new Date(),y=(d.getHours()*60+d.getMinutes()-tl.dataset.ini*60)*PX/60;
  w.hidden=y<0||y>parseFloat(tl.style.height);w.style.top=y+'px'}

function render(){
  const h=iso(new Date()),g={sh:[],bandeja:[],despues:[]},con=[],f=i=>i.fecha+(i.hora||'99:99');
  items.forEach(i=>{if(!i.fecha)g.bandeja.push(i);else if(i.fecha===h)(i.hora?con:g.sh).push(i);else g.despues.push(i)});
  g.despues.sort((a,b)=>f(a).localeCompare(f(b)));
  const pend=a=>a.filter(i=>!i.hecho).length;
  $('#nh').textContent='('+pend([...con,...g.sh])+')';$('#nb').textContent='('+pend(g.bandeja)+')';$('#nd').textContent='('+pend(g.despues)+')';
  for(const s in g){const ul=$('#'+s);ul.replaceChildren();g[s].forEach(i=>ul.append(fila(i,s)));
    if(!g[s].length&&s=='bandeja'){const li=mk('li','vacio');li.textContent='Vacía. Eso es bueno.';ul.append(li)}}
  $('#sh').hidden=!g.sh.length;$('#sd').hidden=!g.despues.length;timeline(con)}

function redimensionar(e,i,b,rz){
  e.preventDefault();e.stopPropagation();const y0=e.clientY+scrollY,d0=i.dur||30,tope=24*60-mn(i.hora);let d=d0;
  const mv=ev=>{d=Math.min(tope,Math.max(15,Math.round((d0+(ev.clientY+scrollY-y0)/PX*60)/15)*15));
    b.style.height=Math.max(d,22*60/PX)*PX/60-2+'px';rz.textContent=d+' min';
    if(ev.clientY<70)scrollBy(0,-14);else if(ev.clientY>innerHeight-70)scrollBy(0,14)};
  const fin=ok=>{removeEventListener('pointermove',mv);removeEventListener('pointerup',up);removeEventListener('pointercancel',cn);
    if(ok&&d!=d0){i.dur=d;navigator.vibrate?.(15);guardar()}render()};
  const up=()=>fin(true),cn=()=>fin(false);
  addEventListener('pointermove',mv);addEventListener('pointerup',up);addEventListener('pointercancel',cn)}

function arrastrar(e,i){
  e.preventDefault();const tl=$('#tl'),g=mk('div','ghost'),sn=mk('div','snap');g.textContent=i.texto;document.body.append(g);tl.append(sn);let m=null;
  const mv=ev=>{g.style.transform=`translate(${ev.clientX+8}px,${ev.clientY-16}px)`;
    if(ev.clientY<70)scrollBy(0,-14);else if(ev.clientY>innerHeight-70)scrollBy(0,14);
    const r=tl.getBoundingClientRect(),y=ev.clientY-r.top;
    if(y>=0&&y<r.height&&ev.clientX>=r.left&&ev.clientX<=r.right){
      m=Math.min(Math.round(y/PX*4)*15,r.height/PX*60-15)+tl.dataset.ini*60;
      sn.hidden=false;sn.style.top=(m-tl.dataset.ini*60)*PX/60+'px';sn.textContent=hhmm(m)}else{m=null;sn.hidden=true}};
  const fin=ok=>{removeEventListener('pointermove',mv);removeEventListener('pointerup',up);removeEventListener('pointercancel',cn);g.remove();sn.remove();
    if(ok&&m!=null){i.fecha=mas(0);i.hora=hhmm(m);navigator.vibrate?.(15);guardar()}render()};
  const up=()=>fin(true),cn=()=>fin(false);
  addEventListener('pointermove',mv);addEventListener('pointerup',up);addEventListener('pointercancel',cn);mv(e)}

function beep(){try{const a=new AudioContext(),o=a.createOscillator(),g=a.createGain();o.frequency.value=660;o.connect(g);g.connect(a.destination);
  g.gain.setValueAtTime(.2,a.currentTime);g.gain.exponentialRampToValueAtTime(.001,a.currentTime+.6);o.start();o.stop(a.currentTime+.6)}catch{}}
const cuenta=s=>{s=Math.max(0,Math.ceil(s));return Math.floor(s/60)+':'+p2(s%60)};
function tick(){
  const n=new Date(),h=iso(n),nm=n.getHours()*60+n.getMinutes()+n.getSeconds()/60,E=id=>$(id);
  const hoy=items.filter(i=>i.fecha===h&&i.hora&&!i.hecho).sort((a,b)=>mn(a.hora)-mn(b.hora));
  const act=hoy.find(i=>mn(i.hora)<=nm&&nm<mn(i.hora)+(i.dur||30)),prox=hoy.find(i=>mn(i.hora)>nm),band=items.find(i=>!i.fecha&&!i.hecho);
  if(act)ult=act;else if(ult){beep();navigator.vibrate?.([200,100,200]);ult=null}
  const set=(k,t,c,b,lbl,fn)=>{E('#fk').textContent=k;E('#ft').textContent=t;E('#fc').textContent=c;E('#fb').firstChild.style.width=b+'%';
    E('#fh').hidden=!lbl;if(lbl){E('#fh').textContent=lbl;E('#fh').onclick=()=>{fn();guardar();render();tick()}}};
  if(act)set('Ahora',act.texto,cuenta((mn(act.hora)+(act.dur||30)-nm)*60),(nm-mn(act.hora))/(act.dur||30)*100,'Hecho',()=>{act.hecho=true;ult=null;navigator.vibrate?.(30)});
  else if(prox)set('Siguiente · '+prox.hora,prox.texto,cuenta((mn(prox.hora)-nm)*60),0,'Empezar ya',()=>{prox.hora=hhmm(Math.floor(nm))});
  else if(band)set('Sin plan para ahora',band.texto,'¿Empezamos?',0,'Empezar ('+(band.dur||25)+' min)',()=>{band.fecha=h;band.hora=hhmm(Math.floor(nm));band.dur=band.dur||25});
  else set('Día libre','Nada pendiente','',0,'',()=>{})}
function abrirFoco(){$('#fo').hidden=false;navigator.wakeLock?.request('screen').then(l=>wl=l).catch(()=>{});tick();ft=setInterval(tick,1000)}
function cerrarFoco(){$('#fo').hidden=true;clearInterval(ft);wl&&wl.release();wl=null}

function bajar(n,txt,tipo){const a=mk('a');a.href=URL.createObjectURL(new Blob([txt],{type:tipo}));a.download=n;a.click()}
function ics(){
  const loc=d=>iso(d).replaceAll('-','')+'T'+p2(d.getHours())+p2(d.getMinutes())+'00',esc=s=>s.replace(/[\\;,]/g,'\\$&').replace(/\n/g,' ');
  const R={diaria:'FREQ=DAILY',lab:'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR',semanal:'FREQ=WEEKLY'},st=new Date().toISOString().replace(/[-:]|\.\d+/g,'');
  const L=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Vaciado//ES'];
  items.filter(i=>i.fecha&&(!i.hecho||i.rec)).forEach(i=>{L.push('BEGIN:VEVENT','UID:'+i.id+'@vaciado','DTSTAMP:'+st,'SUMMARY:'+esc(i.texto));
    if(i.hora){const s=new Date(i.fecha+'T'+i.hora);L.push('DTSTART:'+loc(s),'DTEND:'+loc(new Date(+s+(i.dur||30)*6e4)))}else L.push('DTSTART;VALUE=DATE:'+i.fecha.replaceAll('-',''));
    if(i.rec)L.push('RRULE:'+R[i.rec]);L.push('END:VEVENT')});
  L.push('END:VCALENDAR');bajar('vaciado-'+iso(new Date())+'.ics',L.join('\r\n'),'text/calendar')}

$('#f').onsubmit=e=>{e.preventDefault();const v=$('#t').value.trim();if(!v)return;const p=parsear(v);
  items.unshift({id:crypto.randomUUID(),texto:p.texto||v,fecha:p.fecha,hora:p.hora,dur:p.dur,rec:p.rec,hecho:false});
  navigator.vibrate?.(15);guardar();render();$('#t').value='';$('#t').focus()};
$('#p').onchange=e=>{if(pendiente&&e.target.value){pendiente.fecha=mas(0);pendiente.hora=e.target.value;guardar();render()}pendiente=null};
$('#c').onclick=()=>{items=items.filter(i=>!i.hecho);guardar();render()};
$('#x').onclick=()=>bajar('vaciado-'+iso(new Date())+'.json',JSON.stringify(items,null,2),'application/json');
$('#ic').onclick=ics;$('#foco').onclick=abrirFoco;$('#fs').onclick=cerrarFoco;
$('#i').onchange=async e=>{try{const d=JSON.parse(await e.target.files[0].text());if(!Array.isArray(d))throw 0;
  const ok=d.filter(o=>o&&typeof o.texto=='string').map(o=>({id:o.id||crypto.randomUUID(),texto:o.texto,fecha:o.fecha||null,hora:o.hora||null,dur:o.dur||null,rec:o.rec||null,hecho:!!o.hecho}));
  if(d.length&&!ok.length)throw 0;if(confirm('Esto reemplaza tus '+items.length+' tareas actuales por '+ok.length+'. ¿Continuar?')){items=ok;guardar();render()}}
  catch{alert('El archivo no es un respaldo válido de Vaciado.')}e.target.value=''};
document.addEventListener('visibilitychange',()=>{if(!document.hidden){rodar();render()}});
setInterval(ahora,30000);navigator.storage?.persist?.();
rodar();render();
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js');
