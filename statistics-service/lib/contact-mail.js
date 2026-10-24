import nodemailer from 'nodemailer';
export function contactReady() {
 return !!(process.env.DASHBOARD_SMTP_HOST && process.env.DASHBOARD_SMTP_USER && process.env.DASHBOARD_SMTP_PASSWORD);
}
export function makeContactMessage(payload,config=process.env) {
 if(!['solidtec','consults'].includes(payload.site))throw new Error('Unknown contact site');
 // Recipient is decided on the server, never from the public form body.
 const recipient=payload.site==='consults'
   ? (config.CONSULTS_CONTACT_RECIPIENT_EMAIL||'info@consults.dk')
   : (config.CONTACT_RECIPIENT_EMAIL||'lt@solidtec.dk');
 const labelSet={
  da:['Virksomhed','Navn','E-mail','Telefon','Emne','Besked'],
  en:['Company','Name','Email','Phone','Topic','Message']
 };
 const labels=labelSet[payload.lang==='en'?'en':'da'];
 const values=[payload.firma,payload.navn,payload.email,payload.tlf||'-',payload.emne||'-',payload.besked];
 const text=labels.map((label,i)=>label+': '+values[i]).join('\n\n');
 const brand=payload.site==='consults'?'CONSULTS hjemmeside':'SOLIDTEC hjemmeside';
 return {
  from:config.DASHBOARD_SMTP_USER,
  to:recipient,
  replyTo:{name:payload.navn,address:payload.email},
  subject:brand+': '+(payload.emne||'Ny henvendelse'),
  text
 };
}
export async function sendContact(payload) {
 const port=Number(process.env.DASHBOARD_SMTP_PORT||465);
 const smtp=nodemailer.createTransport({
  host:process.env.DASHBOARD_SMTP_HOST,port,
  secure:port===465,requireTLS:port!==465,
  auth:{user:process.env.DASHBOARD_SMTP_USER,pass:process.env.DASHBOARD_SMTP_PASSWORD},
  connectionTimeout:10000,socketTimeout:15000
 });
 await smtp.sendMail(makeContactMessage(payload));
}
