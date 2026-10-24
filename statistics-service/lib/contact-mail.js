import nodemailer from 'nodemailer';
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
export function contactReady(config=process.env){return !!(config.DASHBOARD_SMTP_HOST&&config.DASHBOARD_SMTP_USER&&config.DASHBOARD_SMTP_PASSWORD);}
export function makeContactMessage(payload,config=process.env){
 if(!['solidtec','consults'].includes(payload.site))throw new Error('Unknown contact site');
 const recipient=payload.site==='consults'?(config.CONSULTS_CONTACT_RECIPIENT_EMAIL||'info@consults.dk'):'info@solidtec.dk';
 const english=payload.lang==='en',labels=english?['Company','Name','Email','Phone','Topic','Message']:['Virksomhed','Navn','E-mail','Telefon','Emne','Besked'];
 const values=[payload.firma,payload.navn,payload.email,payload.tlf||'-',payload.emne||'-',payload.besked];
 const text=labels.map((label,i)=>label+': '+values[i]).join('\n\n');
 const brand=payload.site==='consults'?'CONSULTS':'SOLIDTEC';
 const rows=labels.map((l,i)=>'<tr><td style="padding:11px 14px;border-bottom:1px solid #e5e8e8;color:#627073;width:125px;vertical-align:top;font-size:13px">'+esc(l)+'</td><td style="padding:11px 14px;border-bottom:1px solid #e5e8e8;color:#202a2c;white-space:pre-wrap;overflow-wrap:anywhere">'+esc(values[i])+'</td></tr>').join('');
 const heading=english?'New website enquiry':'Ny henvendelse fra hjemmesiden';
 const html='<!doctype html><html><body style="margin:0;padding:28px 12px;background:#f4f5f6;font-family:Arial,Helvetica,sans-serif;color:#202a2c"><table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;max-width:620px;margin:auto;background:#fff;border:1px solid #dce4e2;border-radius:10px"><tr><td style="padding:26px;background:#0b3533;color:white"><div style="font-size:13px;letter-spacing:2px;font-weight:700">'+brand+'</div><h1 style="font-size:22px;line-height:1.3;margin:12px 0 0">'+heading+'</h1></td></tr><tr><td style="padding:22px 16px"><table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse">'+rows+'</table></td></tr><tr><td style="padding:16px 26px;color:#627073;font-size:12px;border-top:1px solid #e5e8e8">SOLIDTEC ApS · <a href="https://solidtec.dk/" style="color:#14655f">solidtec.dk</a></td></tr></table></body></html>';
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
export async function sendContact(payload){
 const port=Number(process.env.DASHBOARD_SMTP_PORT||465);
 const smtp=nodemailer.createTransport({host:process.env.DASHBOARD_SMTP_HOST,port,secure:port===465,requireTLS:port!==465,auth:{user:process.env.DASHBOARD_SMTP_USER,pass:process.env.DASHBOARD_SMTP_PASSWORD},connectionTimeout:10000,socketTimeout:15000});
 await smtp.sendMail(makeContactMessage(payload));
 let copySent=false;
 const copy=makeCustomerCopy(payload);
 if(copy){try{await smtp.sendMail(copy);copySent=true;}catch(error){console.error('Customer copy delivery failed',error?.name||'Error');}}
 return {copySent};
}
