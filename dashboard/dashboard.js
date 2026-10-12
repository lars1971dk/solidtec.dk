(() => {
'use strict';
const $ = id => document.getElementById(id);
const api = document.querySelector('meta[name="statistics-api"]').content;
let key = '', data = null, busy = false;
function status(text,error=false) { $('status').textContent=text; $('status').classList.toggle('error',error); }
function element(tag,text,cls) { const el=document.createElement(tag); if(text!==undefined) el.textContent=text; if(cls) el.className=cls; return el; }
function render() {
  const selected=$('site').value;
  const sites=data.sites.filter(site=>selected==='all'||selected===site.id);
  $('cards').replaceChildren();
  $('pages').replaceChildren();
  for(const site of sites) {
    const card=element('article',undefined,'panel card');
    const title=element('div');title.append(element('h2',site.name),element('p','Sidevisninger','small'));
    card.append(title,element('div',site.total.toLocaleString('da-DK'),'number'));$('cards').append(card);
    for(const page of site.pages) {const row=element('tr');row.append(element('td',site.name+' / '+({da:'Dansk',en:'Engelsk',home:'Forside'}[page.page]||page.page)),element('td',String(page.views)));$('pages').append(row);}
  }
  const daily=data.sites[0].daily.map((entry,i)=>({day:entry.day,views:sites.reduce((sum,site)=>sum+site.daily[i].views,0)}));
  const max=Math.max(1,...daily.map(x=>x.views));
  $('chart').replaceChildren();
  for(const entry of daily) {const bar=element('div',undefined,'bar');bar.style.height=(entry.views/max*100)+'%';bar.tabIndex=0;bar.title=entry.day+': '+entry.views+' sidevisninger';bar.setAttribute('aria-label',bar.title);$('chart').append(bar);}
  $('dates').replaceChildren(element('span',daily[0].day),element('span',daily.at(-1).day));
  $('updated').textContent='Opdateret '+new Date(data.generatedAt).toLocaleString('da-DK')+' · Dagene følger dansk tid';
  status(sites.every(s=>s.total===0)?'Ingen registrerede sidevisninger i denne periode.':'');
}
async function load() {
  if(busy) return;
  if(!api) {status('Statistikdelen er endnu ikke aktiveret. Dashboardet er klar til opsætning.',true);return;}
  busy=true;$('refresh').disabled=true;status('Henter statistik…');
  try {
    const response=await fetch(api+'/api/report?days='+$('days').value,{headers:{Authorization:'Bearer '+key},credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer'});
    if(response.status===401) {logout();throw new Error('Adgangskoden blev ikke accepteret.');}
    if(!response.ok) throw new Error('Statistikken kunne ikke hentes. Prøv igen om lidt.');
    data=await response.json();
    if(!Array.isArray(data.sites)||data.sites.length!==3||data.sites.some(s=>!Array.isArray(s.daily)||!Array.isArray(s.pages))) throw new Error('Statistikken kunne ikke læses.');
    $('login').hidden=true;$('report').hidden=false;$('logout').hidden=false;render();
  } catch(error) {status(error.message||'Kunne ikke hente statistik.',true);}
  finally {busy=false;$('refresh').disabled=false;}
}
function logout(){key='';data=null;$('password').value='';$('login').hidden=false;$('report').hidden=true;$('logout').hidden=true;status('');}
$('login-form').addEventListener('submit',event=>{event.preventDefault();key=$('password').value;$('password').value='';load();});
$('days').addEventListener('change',load);$('site').addEventListener('change',()=>{if(data)render();});$('refresh').addEventListener('click',load);$('logout').addEventListener('click',logout);
if(!api)status('Statistikdelen er endnu ikke aktiveret. Dashboardet er klar til opsætning.');
})();
