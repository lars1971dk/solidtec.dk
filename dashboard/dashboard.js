(() => {
'use strict';
const $=id=>document.getElementById(id);
const api=document.querySelector('meta[name="statistics-api"]').content;
if(!$('ip-settings')){const fresh=new URL(location.href);if(fresh.searchParams.get('v')!=='20261013-ip'){fresh.searchParams.set('v','20261013-ip');location.replace(fresh.href);}return;}
const svgNS='http://www.w3.org/2000/svg';
const format=new Intl.NumberFormat('da-DK');
const regionNames=new Intl.DisplayNames(['da'],{type:'region'});
const pageNames={da:'Dansk forside',en:'Engelsk forside',home:'Forside'};
const deviceNames={desktop:'Computer',mobile:'Mobil',tablet:'Tablet',unknown:'Ukendt'};
const deviceColors={desktop:'#247e7a',mobile:'#e3ab45',tablet:'#7fabb4',unknown:'#d6e0e2'};
let key='',data=null,busy=false;
let settingsVersion=null,currentIP=null,settingsLoaded=false,settingsBusy=false;
function defaultSite(){const select=$('site');for(const option of [...select.options])if(!['solidtec','consults','preview'].includes(option.value))option.remove();select.value='solidtec';$('site-title').textContent='solidtec.dk';}
function status(text,error=false){$('status').textContent=text;$('status').classList.toggle('error',error);}
function element(tag,text,cls){const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(cls)node.className=cls;return node;}
function svg(tag,attributes){const node=document.createElementNS(svgNS,tag);for(const [key,value]of Object.entries(attributes||{}))node.setAttribute(key,value);return node;}
function selected(){return data?.sites.find(site=>site.id===$('site').value);}
function percent(n,total){return total?(n/total*100).toLocaleString('da-DK',{maximumFractionDigits:1})+' %':'0 %';}
function date(day){return new Date(day+'T12:00:00Z').toLocaleDateString('da-DK',{day:'numeric',month:'short'});}
function countryName(code){if(code==='ZZ')return 'Ukendt / ældre visninger';try{return regionNames.of(code)||code;}catch{return 'Ukendt';}}
function kpi(label,value,note){const card=element('article',undefined,'panel kpi');card.append(element('div',label,'kpi-label'),element('div',value,'value'),element('div',note,'kpi-note'));return card;}
function drawChart(site){
 const daily=site.daily,previous=site.comparison?.daily||[];
 const W=Math.max(300,Math.min(960,Math.round($('chart').getBoundingClientRect().width))),H=245,L=45,R=15,T=18,B=30;
 const maximum=Math.max(1,...daily.map(x=>x.views),...previous.map(x=>x.views));
 const top=maximum<=4?4:Math.ceil(maximum/4)*4;
 const x=i=>L+(i+.5)*(W-L-R)/daily.length;
 const y=value=>H-B-value/top*(H-B-T);
 const chart=svg('svg',{viewBox:'0 0 '+W+' '+H,role:'img','aria-label':'Daglige sidevisninger for '+site.name});
 const title=svg('title');title.textContent='Sidevisninger pr. dag. Brug skyderen nedenfor til at læse de enkelte dage.';chart.append(title);
 for(let i=0;i<=4;i++){const value=top*i/4,yy=y(value);chart.append(svg('line',{x1:L,x2:W-R,y1:yy,y2:yy,stroke:'#e2e9ea','stroke-width':1}));const text=svg('text',{x:L-9,y:yy+4,'text-anchor':'end',fill:'#6a8389','font-size':12});text.textContent=format.format(value);chart.append(text);}
 const points=daily.map((entry,i)=>x(i)+','+y(entry.views)).join(' ');
 const linePath=daily.map((entry,i)=>(i?'L':'M')+x(i)+' '+y(entry.views)).join(' ');
 chart.append(svg('path',{d:linePath+' L'+x(daily.length-1)+' '+y(0)+' L'+x(0)+' '+y(0)+' Z',fill:'#e2f0ed'}));
 if(previous.length===daily.length)chart.append(svg('polyline',{points:previous.map((entry,i)=>x(i)+','+y(entry.views)).join(' '),fill:'none',stroke:'#b4c6ca','stroke-width':2,'stroke-dasharray':'5 5'}));
 chart.append(svg('polyline',{points,fill:'none',stroke:'#247e7a','stroke-width':3,'stroke-linejoin':'round'}));
 const tickIndices=[...new Set([0,Math.floor((daily.length-1)/2),daily.length-1])];
 for(const i of tickIndices){const text=svg('text',{x:x(i),y:H-5,'text-anchor':'middle',fill:'#6a8389','font-size':12});text.textContent=date(daily[i].day);chart.append(text);}
 const cursor=svg('line',{id:'chart-cursor',x1:x(daily.length-1),x2:x(daily.length-1),y1:T,y2:H-B,stroke:'#e3ab45','stroke-width':1.5});chart.append(cursor);
 chart.addEventListener('pointermove',event=>{const bounds=chart.getBoundingClientRect();const px=(event.clientX-bounds.left)/bounds.width*W;const index=Math.max(0,Math.min(daily.length-1,Math.floor((px-L)/(W-L-R)*daily.length)));$('inspect-day').value=index;inspectDay();});
 $('chart').replaceChildren(chart);$('inspect-day').max=daily.length-1;$('inspect-day').value=daily.length-1;
 inspectDay();
}
function inspectDay(){
 const site=selected();if(!site)return;
 const i=Number($('inspect-day').value),entry=site.daily[i],previous=site.comparison?.daily?.[i];
 if(!entry)return;
 $('chart-detail').replaceChildren(element('span',date(entry.day)+': '+format.format(entry.views)+' sidevisninger'),element('span',previous?'Forrige periode · '+date(previous.day)+': '+format.format(previous.views):''));
 const line=document.getElementById('chart-cursor');if(line){const width=$('chart').querySelector('svg').viewBox.baseVal.width;const x=45+(i+.5)*(width-45-15)/site.daily.length;line.setAttribute('x1',x);line.setAttribute('x2',x);}
}
function renderCountries(site){
 const countries=site.countries||[];
 $('countries').replaceChildren();
 for(const country of countries){
   const row=element('tr'),cell=element('td'),wrapper=element('div',undefined,'country-cell');
   wrapper.append(element('span',country.code==='ZZ'?'—':country.code,'country-code'),element('span',countryName(country.code),'country-name'));cell.append(wrapper);
   const share=element('td',undefined,'share-cell'),bar=element('div',undefined,'share-bar'),fill=element('span');
   fill.style.width=site.total?country.views/site.total*100+'%':'0%';bar.append(fill);share.append(element('span',percent(country.views,site.total)),bar);
   row.append(cell,share,element('td',format.format(country.views)));$('countries').append(row);
 }
 $('countries-empty').hidden=countries.length>0;
 const geo=site.geography||{};
 $('country-coverage').textContent=percent(geo.knownViews||0,site.total)+' med kendt land';
 let note=geo.firstCountryDay?'Landedata registreres fra '+date(geo.firstCountryDay)+'.':'Landedata vises, når nye sidevisninger er registreret.';
 if(geo.legacyViews)note+=' '+format.format(geo.legacyViews)+' ældre visninger har ikke landedata.';
 note+=' Land er et skøn; VPN kan ændre det.';
 $('country-note').textContent=note;
}
function renderDevices(site){
 const devices=site.devices||[],ring=svg('svg',{viewBox:'0 0 120 120',role:'img','aria-label':'Fordeling af sidevisninger efter enhed'});
 ring.append(svg('circle',{cx:60,cy:60,r:44,fill:'none',stroke:'#edf2f2','stroke-width':15}));
 let offset=0;const circumference=2*Math.PI*44;
 $('devices').replaceChildren();
 for(const device of devices){
   const share=site.total?device.views/site.total:0;
   if(share)ring.append(svg('circle',{cx:60,cy:60,r:44,fill:'none',stroke:deviceColors[device.category]||deviceColors.unknown,'stroke-width':15,'stroke-dasharray':share*circumference+' '+circumference,'stroke-dashoffset':-offset*circumference,transform:'rotate(-90 60 60)'}));
   offset+=share;
   const row=element('div',undefined,'device-row'),name=element('span',undefined,'device-name'),color=element('i');color.style.background=deviceColors[device.category]||deviceColors.unknown;
   name.append(color,element('span',deviceNames[device.category]||'Ukendt'));row.append(name,element('span',format.format(device.views)+' · '+percent(device.views,site.total)));$('devices').append(row);
 }
 const count=svg('text',{x:60,y:60,'text-anchor':'middle','font-size':21,'font-weight':650,fill:'#18363c'});count.textContent=format.format(site.total);
 const label=svg('text',{x:60,y:76,'text-anchor':'middle','font-size':10,fill:'#687e84'});label.textContent='visninger';ring.append(count,label);$('device-ring').replaceChildren(ring);
}
function render(){
 const site=selected();if(!site)return;
 $('site-title').textContent=site.name;
 const countries=(site.countries||[]).filter(c=>c.code!=='ZZ');
 const comparison=site.comparison||{};
 const change=comparison.changePercent;
 const comparisonLabel=change===null||change===undefined?'Ingen fuld sammenligningsperiode':(change>=0?'+':'')+change.toLocaleString('da-DK',{maximumFractionDigits:1})+' % mod forrige periode';
 $('cards').replaceChildren(kpi('Sidevisninger',format.format(site.total),comparisonLabel),kpi('I dag',format.format(site.today??site.daily.at(-1).views),date(data.today||site.daily.at(-1).day)),kpi('Gennemsnit pr. dag',(site.total/data.days).toLocaleString('da-DK',{maximumFractionDigits:1}),'I den valgte periode'),kpi('Lande',format.format(countries.length),countries.length?'Flest visninger: '+countryName(countries[0].code):'Afventer landedata'));
 $('chart-subtitle').textContent=site.name+' · '+date(site.daily[0].day)+' – '+date(site.daily.at(-1).day);
 $('comparison-note').textContent='Forrige periode: '+format.format(comparison.total||0)+' sidevisninger.'+(!comparison.complete?' Sammenligningen mangler historik; der vises ingen procentændring.':'');
 drawChart(site);renderCountries(site);renderDevices(site);
 $('pages').replaceChildren();
 for(const page of site.pages){const row=element('tr');row.append(element('td',pageNames[page.page]||page.page),element('td',percent(page.views,site.total)),element('td',format.format(page.views)));$('pages').append(row);}
 $('updated').textContent='Opdateret '+new Date(data.generatedAt).toLocaleString('da-DK')+' · Dansk tid';
 status(site.total===0?'Ingen registrerede sidevisninger i denne periode.':'');
}
function validate(value){
 if(!value||![7,30,90].includes(value.days)||!Array.isArray(value.sites)||value.sites.length!==3)return false;
 return value.sites.every(site=>['solidtec','consults','preview'].includes(site.id)&&Number.isFinite(site.total)&&Array.isArray(site.daily)&&site.daily.length===value.days&&site.daily.every(day=>/^\d{4}-\d{2}-\d{2}$/.test(day.day)&&Number.isFinite(day.views))&&Array.isArray(site.pages));
}
async function load(){
 if(busy)return;
 if(!api){status('Statistikdelen er endnu ikke aktiveret.',true);return;}
 busy=true;$('refresh').disabled=true;$('export').disabled=true;status('Henter statistik…');
 try{
 const response=await fetch(api+'/api/report?days='+$('days').value,{headers:{Authorization:'Bearer '+key},credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer'});
 if(response.status===401){logout();throw new Error('Adgangskoden blev ikke accepteret.');}
 if(!response.ok)throw new Error('Statistikken kunne ikke hentes. Prøv igen om lidt.');
 const report=await response.json();if(!validate(report))throw new Error('Statistikken kunne ikke læses.');
 data=report;$('login').hidden=true;$('report').hidden=false;$('logout').hidden=false;render();
 }catch(error){status(error.message||'Kunne ikke hente statistik.',true);}
 finally{busy=false;$('refresh').disabled=false;$('export').disabled=!data;}
}
function logout(){key='';data=null;settingsLoaded=false;settingsVersion=null;currentIP=null;$('ip-settings').open=false;$('excluded-ips').value='';$('current-ip').textContent='';$('ip-status').textContent='';$('excluded-ips').disabled=true;$('save-ip-settings').disabled=true;$('exclude-current-ip').disabled=true;$('password').value='';$('site').value='solidtec';$('site-title').textContent='solidtec.dk';$('login').hidden=false;$('report').hidden=true;$('logout').hidden=true;status('');}
function exportCSV(){
 const site=selected();if(!site)return;
 const rows=[['Site','Type','Dato / kategori','Sidevisninger'],[site.name,'I alt',data.days+' dage',site.total]];
 for(const entry of site.daily)rows.push([site.name,'Dag',entry.day,entry.views]);
 for(const entry of site.pages)rows.push([site.name,'Side',pageNames[entry.page]||entry.page,entry.views]);
 for(const entry of site.countries||[])rows.push([site.name,'Land',countryName(entry.code),entry.views]);
 for(const entry of site.devices||[])rows.push([site.name,'Enhed',deviceNames[entry.category]||'Ukendt',entry.views]);
 const escaped=value=>{let text=String(value);if(/^[=+@\-\t\r]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';};
 const url=URL.createObjectURL(new Blob(['\uFEFF'+rows.map(row=>row.map(escaped).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'}));
 const link=element('a');link.href=url;link.download=site.name+'-statistik-'+data.days+'-dage.csv';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function ipStatus(text,error=false){$('ip-status').textContent=text;$('ip-status').classList.toggle('error',error);}
function settingsControls(){ $('excluded-ips').disabled=!settingsLoaded||settingsBusy; $('save-ip-settings').disabled=!settingsLoaded||settingsBusy; $('exclude-current-ip').disabled=!settingsLoaded||!currentIP||settingsBusy; $('reload-ip-settings').disabled=settingsBusy; }
function applySettings(value){
 if(!Array.isArray(value.rules)||value.rules.some(rule=>typeof rule!=='string')||(value.version!==null&&typeof value.version!=='string'))throw new Error('Indstillingerne kunne ikke læses.');
 settingsVersion=value.version;currentIP=typeof value.currentIP==='string'?value.currentIP:null;settingsLoaded=true;
 $('excluded-ips').value=value.rules.join('\n');$('current-ip').textContent=currentIP?'Din aktuelle IP: '+currentIP:'Din aktuelle IP kunne ikke findes. Du kan stadig indtaste adresser manuelt.';
}
async function settingsRequest(options={}){
 const response=await fetch(api+'/api/settings',{...options,headers:{Authorization:'Bearer '+key,...options.headers},cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'});
 if(response.status===401){logout();status('Log ind igen for at ændre indstillinger.',true);throw new Error('Login kræves.');}
 let body;try{body=await response.json();}catch{throw new Error('Indstillingerne kunne ikke hentes.');}
 if(!response.ok)throw new Error(body.error||'Indstillingerne kunne ikke gemmes.');
 return body;
}
async function loadIPSettings(){
 if(settingsBusy)return;settingsBusy=true;settingsControls();ipStatus('Henter indstillinger…');
 try{applySettings(await settingsRequest());ipStatus('');}catch(error){ipStatus(error.message,true);}finally{settingsBusy=false;settingsControls();}
}
async function saveIPSettings(){
 if(!settingsLoaded||settingsBusy)return;
 const rules=$('excluded-ips').value.split(/[\n,;]+/).map(value=>value.trim()).filter(Boolean);
 settingsBusy=true;settingsControls();ipStatus('Gemmer…');
 try{applySettings(await settingsRequest({method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({rules,version:settingsVersion})}));ipStatus('Gemt. Nye besøg fra disse IP-adresser tælles ikke med.');}
 catch(error){ipStatus(error.message,true);}finally{settingsBusy=false;settingsControls();}
}
defaultSite();
window.addEventListener('pageshow',()=>{defaultSite();if(data)render();});
$('login-form').addEventListener('submit',event=>{event.preventDefault();key=$('password').value;$('password').value='';load();});
$('site').addEventListener('change',()=>{if(data)render();});
$('days').addEventListener('change',load);$('refresh').addEventListener('click',load);$('logout').addEventListener('click',logout);$('inspect-day').addEventListener('input',inspectDay);$('export').addEventListener('click',exportCSV);
let resizeFrame;window.addEventListener('resize',()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(()=>{const site=selected();if(site)drawChart(site);});});
$('ip-settings').addEventListener('toggle',()=>{if($('ip-settings').open&&!settingsLoaded)loadIPSettings();});
$('reload-ip-settings').addEventListener('click',loadIPSettings);
$('ip-form').addEventListener('submit',event=>{event.preventDefault();saveIPSettings();});
$('exclude-current-ip').addEventListener('click',()=>{if(!currentIP||!settingsLoaded)return;const rules=$('excluded-ips').value.split(/[\n,;]+/).map(v=>v.trim()).filter(Boolean);if(!rules.includes(currentIP))rules.push(currentIP);$('excluded-ips').value=rules.join('\n');saveIPSettings();});
if(!api)status('Statistikdelen er endnu ikke aktiveret.');
})();

