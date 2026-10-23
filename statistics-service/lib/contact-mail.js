import nodemailer from 'nodemailer';
export function contactReady() {
 return !!(process.env.DASHBOARD_SMTP_HOST && process.env.DASHBOARD_SMTP_USER && process.env.DASHBOARD_SMTP_PASSWORD);
}
export async function sendContact(payload) {
 const port=Number(process.env.DASHBOARD_SMTP_PORT||465);
 const smtp=nodemailer.createTransport({host:process.env.DASHBOARD_SMTP_HOST,port,secure:port===465,requireTLS:port!==465,auth:{user:process.env.DASHBOARD_SMTP_USER,pass:process.env.DASHBOARD_SMTP_PASSWORD},connectionTimeout:10000,socketTimeout:15000});
 const recipient=process.env.CONTACT_RECIPIENT_EMAIL||'lt@solidtec.dk';
 const labels={da:['Virksomhed','Navn','E-mail','Telefon','Emne','Besked'],en:['Company','Name','Email','Phone','Topic','Message']}[payload.lang];
 const values=[payload.firma,payload.navn,payload.email,payload.tlf||'-',payload.emne||'-',payload.besked];
 const text=labels.map((label,i)=>label+': '+values[i]).join('\n\n');
 await smtp.sendMail({from:process.env.DASHBOARD_SMTP_USER,to:recipient,replyTo:{name:payload.navn,address:payload.email},subject:'SOLIDTEC hjemmeside: '+(payload.emne||'Ny henvendelse'),text});
}
