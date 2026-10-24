import nodemailer from 'nodemailer';
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

// This endpoint serves two independent websites. A mail recipient is NOT the
// same as the SMTP sender: mail providers such as one.com require sender and
// authenticated mailbox to be the same.
export function contactSmtpSettings(site,config=process.env) {
 if(!['solidtec','consults'].includes(site)) throw new Error('Unknown contact site');
 const solidtec={
  host:config.DASHBOARD_SMTP_HOST,
  port:Number(config.DASHBOARD_SMTP_PORT||465),
  user:config.DASHBOARD_SMTP_USER,
  pass:config.DASHBOARD_SMTP_PASSWORD,
  dedicated:false
 };
 // Keep the original working sender while the owner securely configures a
 // separate CONSULTS mailbox. No unverified sender impersonation is attempted.
 if(site==='solidtec'||!config.CONSULTS_SMTP_PASSWORD) return solidtec;
 const user=String(config.CONSULTS_SMTP_USER||'info@consults.dk').trim();
 if(user.toLowerCase()!=='info@consults.dk') {
  throw new Error('CONSULTS SMTP account must be info@consults.dk');
 }
 return {
  host:config.CONSULTS_SMTP_HOST||solidtec.host,
  port:Number(config.CONSULTS_SMTP_PORT||solidtec.port),
  user,
  pass:config.CONSULTS_SMTP_PASSWORD,
  dedicated:true
 };
}

export function contactReady(site='solidtec',config=process.env) {
 // Backward compatible with previous contactReady(config) calls.
 if(site&&typeof site==='object'&&!Array.isArray(site)){config=site;site='solidtec';}
 try {
  const {host,port,user,pass}=contactSmtpSettings(site,config);
  return !!(host&&Number.isInteger(port)&&port>0&&port<=65535&&user&&pass);
 } catch {
  return false;
 }
}

function makeSolidtecContactMessage(payload,config=process.env){
 if(!['solidtec','consults'].includes(payload.site))throw new Error('Unknown contact site');
 const recipient=payload.site==='consults'?(config.CONSULTS_CONTACT_RECIPIENT_EMAIL||'info@consults.dk'):'info@solidtec.dk';
 const english=payload.lang==='en',labels=english?['Company','Name','Email','Phone','Topic','Message']:['Virksomhed','Navn','E-mail','Telefon','Emne','Besked'];
 const values=[payload.firma,payload.navn,payload.email,payload.tlf||'-',payload.emne||'-',payload.besked];
 const text=labels.map((label,i)=>label+': '+values[i]).join('\n\n');
 const brand=payload.site==='consults'?'CONSULTS':'SOLIDTEC';
 const rows=labels.map((l,i)=>'<tr><td style="padding:11px 14px;border-bottom:1px solid #e5e8e8;color:#627073;width:125px;vertical-align:top;font-size:13px">'+esc(l)+'</td><td style="padding:11px 14px;border-bottom:1px solid #e5e8e8;color:#202a2c;white-space:pre-wrap;overflow-wrap:anywhere">'+esc(values[i])+'</td></tr>').join('');
 const heading=english?'New website enquiry':'Ny henvendelse fra hjemmesiden';
 const html='<!doctype html><html><body style="margin:0;padding:28px 12px;background:#f4f5f6;font-family:Arial,Helvetica,sans-serif;color:#202a2c"><table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;max-width:620px;margin:auto;background:#fff;border:1px solid #dce4e2;border-radius:10px"><tr><td style="padding:26px;background:#0b3533;color:white"><div style="font-size:13px;letter-spacing:2px;font-weight:700">'+brand+'</div><h1 style="font-size:22px;line-height:1.3;margin:12px 0 0">'+heading+'</h1></td></tr><tr><td style="padding:22px 16px"><table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse">'+rows+'</table></td></tr><tr><td style="padding:16px 26px;color:#627073;font-size:12px;border-top:1px solid #e5e8e8">'+brand+' · <a href="'+(payload.site==='consults'?'https://consults.dk/':'https://solidtec.dk/')+'" style="color:#14655f">'+(payload.site==='consults'?'consults.dk':'solidtec.dk')+'</a></td></tr></table></body></html>';
 // SMTP login remains the authenticated sender to avoid DMARC/SPF failures.
 const sender=payload.site==='solidtec'?(config.SOLIDTEC_FROM_EMAIL||config.DASHBOARD_SMTP_USER):config.DASHBOARD_SMTP_USER;
 return {from:{name:brand+' ApS',address:sender},to:recipient,replyTo:{name:payload.navn,address:payload.email},subject:brand+': '+(payload.emne||heading),text,html};
}
export function makeCustomerCopy(payload,config=process.env){
 if(payload.site!=='solidtec'||payload.copy!==true)return null;
 const en=payload.lang==='en',recipient='info@solidtec.dk';
 const title=en?'Copy of your enquiry to SOLIDTEC':'Kopi af din henvendelse til SOLIDTEC';
 const intro=en?'Thank you for contacting SOLIDTEC. Below is a copy of the information you submitted. We will respond as soon as possible.':'Tak for din henvendelse til SOLIDTEC. Her får du en kopi af de oplysninger, du har sendt. Vi vender tilbage hurtigst muligt.';
 const base=makeContactMessage(payload,config);
 const html=base.html.replace(en?'New website enquiry':'Ny henvendelse fra hjemmesiden',esc(title)).replace('<tr><td style="padding:22px 16px">','<tr><td style="padding:18px 26px 0;font-size:15px;line-height:1.5">'+esc(intro)+'</td></tr><tr><td style="padding:22px 16px">');
 return {...base,to:payload.email,replyTo:recipient,subject:title,html,text:intro+'\n\n'+base.text};
}
// Escape all visitor-supplied strings before placing them in email HTML.
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({
 '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
})[c]);
const newlineHtml=value=>escapeHtml(value).replace(/\r\n|\r|\n/g,'<br>');

function contactLabels(lang='da') {
 return lang==='en'?{
  company:'Company',name:'Contact',email:'Email',phone:'Phone',topic:'Assistance',message:'Project description',
  empty:'Not specified',enquiry:'New website enquiry',copyTitle:'Your enquiry to CONSULTS',
  copyLead:'This is a copy of the enquiry you sent to CONSULTS.',
  copyFoot:'If you need to add something, reply to this email.',
  ownerFoot:'Submitted through the contact form on consults.dk. Reply to this email to reach the visitor.',
  web:'CONSULTS · Freelance PLC & HMI engineering'
 }:{
  company:'Virksomhed',name:'Kontaktperson',email:'E-mail',phone:'Telefon',topic:'Assistance',message:'Opgavebeskrivelse',
  empty:'Ikke oplyst',enquiry:'Ny henvendelse fra hjemmesiden',copyTitle:'Din forespørgsel til CONSULTS',
  copyLead:'Her er en kopi af den forespørgsel, du har sendt til CONSULTS.',
  copyFoot:'Hvis du vil tilføje noget, kan du svare direkte på denne e-mail.',
  ownerFoot:'Sendt via kontaktformularen på consults.dk. Besvar mailen for at kontakte afsenderen.',
  web:'CONSULTS · Freelance PLC- og HMI-software'
 };
}
function structuredFields(payload,lang='da') {
 const t=contactLabels(lang);
 return [
  [t.company,payload.firma],
  [t.name,payload.navn],
  [t.email,payload.email],
  [t.phone,payload.tlf||t.empty],
  [t.topic,payload.emne||t.empty]
 ];
}
export function contactEmailHtml(payload,{customer=false}={}){
 if(payload.site!=='consults')throw new Error('CONSULTS HTML template only');
 const lang=payload.lang==='en'?'en':'da';
 const l=contactLabels(lang);
 const title=customer?l.copyTitle:l.enquiry;
 const lead=customer?l.copyLead:(lang==='en'?'A visitor has requested PLC/HMI assistance.':'En kunde har sendt en forespørgsel om PLC-/HMI-assistance.');
 const rows=structuredFields(payload,lang).map(([label,value],i)=>
  '<tr><td style="padding:11px 16px;border-bottom:1px solid #e7ebf2;color:#5a6475;font-size:13px;vertical-align:top;width:140px;">'+escapeHtml(label)+'</td>'+
  '<td style="padding:11px 16px;border-bottom:1px solid #e7ebf2;color:#18243c;font-size:14px;vertical-align:top;font-weight:600;word-break:break-word;">'+escapeHtml(value)+'</td></tr>'
 ).join('');
 const action=customer
  ?'<a href="mailto:info@consults.dk" style="display:inline-block;background-color:#ed651c;color:#fff;font-weight:700;padding:12px 20px;text-decoration:none;border-radius:5px;">'+(lang==='en'?'Reply to CONSULTS':'Svar CONSULTS')+'</a>'
  :'<a href="mailto:'+escapeHtml(payload.email)+'" style="display:inline-block;background-color:#ed651c;color:#fff;font-weight:700;padding:12px 20px;text-decoration:none;border-radius:5px;">'+(lang==='en'?'Reply to visitor':'Besvar forespørgsel')+'</a>';
 return '<!doctype html><html lang="'+lang+'"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<title>'+escapeHtml(title)+'</title></head>'+
  '<body style="margin:0;padding:24px 12px;background:#f2f5fa;font-family:Arial,Helvetica,sans-serif;color:#17243b;">'+
  '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:640px;margin:0 auto;border-collapse:collapse;background:#fff;">'+
  '<tr><td style="background:#0b1830;padding:25px 30px;border-bottom:4px solid #ed651c;">'+
   '<div style="font-size:25px;line-height:1.1;color:#fff;font-weight:800;letter-spacing:1px;">CONSULTS</div>'+
   '<div style="font-size:10px;color:#dbe5f3;letter-spacing:2px;margin-top:6px;">POWERING AUTOMATION</div></td></tr>'+
  '<tr><td style="padding:31px 30px 18px;">'+
   '<div style="color:#ed651c;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.7px;">'+escapeHtml(l.web)+'</div>'+
   '<h1 style="font-size:23px;line-height:1.35;color:#10203b;margin:12px 0 14px;">'+escapeHtml(title)+'</h1>'+
   '<p style="font-size:14px;line-height:1.65;color:#4c5a6d;margin:0 0 23px;">'+escapeHtml(lead)+'</p>'+
   '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;border:1px solid #e7ebf2;">'+rows+'</table>'+
   '<h2 style="font-size:15px;margin:29px 0 12px;color:#10203b;">'+escapeHtml(l.message)+'</h2>'+
   '<div style="padding:18px 20px;border-left:3px solid #ed651c;background:#f5f7fb;color:#24344c;font-size:14px;line-height:1.65;overflow-wrap:anywhere;">'+newlineHtml(payload.besked)+'</div>'+
   '<div style="margin:27px 0 5px;">'+action+'</div>'+
  '</td></tr>'+
  '<tr><td style="padding:20px 30px 28px;border-top:1px solid #e7ebf2;font-size:12px;line-height:1.65;color:#657082;">'+
  escapeHtml(customer?l.copyFoot:l.ownerFoot)+'<br>'+
  '<a style="color:#3155a2;text-decoration:none;" href="https://consults.dk/">consults.dk</a> · info@consults.dk</td></tr>'+
  '</table></body></html>';
}
export function contactEmailText(payload,{customer=false}={}){
 const lang=payload.lang==='en'?'en':'da';
 const l=contactLabels(lang),heading=customer?l.copyTitle:l.enquiry;
 return [
  'CONSULTS — POWERING AUTOMATION',heading,'',
  ...(customer?[l.copyLead,'']:[]),
  ...structuredFields(payload,lang).map(([label,value])=>label+': '+value),
  '',l.message+':','',payload.besked,'',
  customer?l.copyFoot:l.ownerFoot,
  'CONSULTS ApS | info@consults.dk | https://consults.dk/'
 ].join('\n');
}
function makeConsultsContactMessage(payload,config=process.env){
 if(payload.site!=='consults')throw new Error('Invalid site for CONSULTS mail');
 const smtp=contactSmtpSettings(payload.site,config);
 return {
  from:smtp.dedicated?{name:'CONSULTS',address:'info@consults.dk'}:smtp.user,
  to:config.CONSULTS_CONTACT_RECIPIENT_EMAIL||'info@consults.dk',
  replyTo:{name:payload.navn,address:payload.email},
  subject:'CONSULTS · '+(payload.emne||'Website enquiry')+' · '+payload.firma,
  text:contactEmailText(payload),
  html:contactEmailHtml(payload)
 };
}
export function makeContactMessage(payload,config=process.env){
 if(payload.site==='solidtec')return makeSolidtecContactMessage(payload,config);
 if(payload.site==='consults')return makeConsultsContactMessage(payload,config);
 throw new Error('Unknown contact site');
}
export function makeContactCopy(payload,config=process.env){
 if(payload.site!=='consults')throw new Error('Copies only supported for CONSULTS');
 const smtp=contactSmtpSettings(payload.site,config);
 if(!smtp.dedicated)throw new Error('Dedicated CONSULTS sender not available');
 return {
  from:{name:'CONSULTS',address:'info@consults.dk'},
  to:payload.email,
  replyTo:'info@consults.dk',
  subject:payload.lang==='en'?'Copy of your CONSULTS enquiry':'Kopi af din forespørgsel til CONSULTS',
  text:contactEmailText(payload,{customer:true}),
  html:contactEmailHtml(payload,{customer:true})
 };
}
export async function sendContact(payload){
 const smtp=contactSmtpSettings(payload.site);
 if(!contactReady(payload.site))throw new Error('SMTP is not configured');
 const transport=nodemailer.createTransport({
  host:smtp.host,port:smtp.port,secure:smtp.port===465,requireTLS:smtp.port!==465,
  auth:{user:smtp.user,pass:smtp.pass},connectionTimeout:10000,socketTimeout:15000
 });
 // Owner delivery comes first and is authoritative for both websites.
 await transport.sendMail(makeContactMessage(payload));
 if(payload.site==='solidtec'){
  // Keep the latest SOLIDTEC opt-in copy exactly as before.
  let copySent=false;
  const customerCopy=makeCustomerCopy(payload);
  if(customerCopy){
   try{await transport.sendMail(customerCopy);copySent=true;}
   catch(error){console.error('Customer copy delivery failed',error?.name||'Error');}
  }
  return {copySent};
 }
 if(payload.copyToSender!==true)return {copyRequested:false,copySent:false};
 if(!smtp.dedicated){
  // An opt-in copy must not impersonate CONSULTS with SOLIDTEC credentials.
  return {copyRequested:true,copySent:false};
 }
 try{
  await transport.sendMail(makeContactCopy(payload));
  return {copyRequested:true,copySent:true};
 }catch(error){
  // Do not change owner delivery status; avoids duplicates if user retries.
  console.error('CONSULTS copy delivery failed',error?.name||'Error');
  return {copyRequested:true,copySent:false};
 }
}
