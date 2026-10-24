import nodemailer from 'nodemailer';

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
 try {
  const {host,port,user,pass}=contactSmtpSettings(site,config);
  return !!(host&&Number.isInteger(port)&&port>0&&port<=65535&&user&&pass);
 } catch {
  return false;
 }
}

export function makeContactMessage(payload,config=process.env) {
 if(!['solidtec','consults'].includes(payload.site))throw new Error('Unknown contact site');
 // Recipient is chosen on the server by the validated HTTP Origin.
 const recipient=payload.site==='consults'
  ? (config.CONSULTS_CONTACT_RECIPIENT_EMAIL||'info@consults.dk')
  : (config.CONTACT_RECIPIENT_EMAIL||'lt@solidtec.dk');
 const labels=payload.lang==='en'
  ?['Company','Name','Email','Phone','Topic','Message']
  :['Virksomhed','Navn','E-mail','Telefon','Emne','Besked'];
 const values=[payload.firma,payload.navn,payload.email,payload.tlf||'-',payload.emne||'-',payload.besked];
 const text=labels.map((label,i)=>label+': '+values[i]).join('\n\n');
 const brand=payload.site==='consults'?'CONSULTS hjemmeside':'SOLIDTEC hjemmeside';
 const smtp=contactSmtpSettings(payload.site,config);
 return {
  // Nodemailer accepts a structured sender to prevent ambiguous display names.
  // Do NOT set "From: info@consults.dk" using SOLIDTEC SMTP authentication.
  from:smtp.dedicated?{name:'CONSULTS',address:smtp.user}:smtp.user,
  to:recipient,
  replyTo:{name:payload.navn,address:payload.email},
  subject:brand+': '+(payload.emne||'Ny henvendelse'),
  text
 };
}

export async function sendContact(payload) {
 const smtp=contactSmtpSettings(payload.site);
 if(!contactReady(payload.site))throw new Error('SMTP is not configured');
 const transport=nodemailer.createTransport({
  host:smtp.host,
  port:smtp.port,
  secure:smtp.port===465,
  requireTLS:smtp.port!==465,
  auth:{user:smtp.user,pass:smtp.pass},
  connectionTimeout:10000,socketTimeout:15000
 });
 await transport.sendMail(makeContactMessage(payload));
}
