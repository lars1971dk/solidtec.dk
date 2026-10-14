import nodemailer from 'nodemailer';
import { ownerEmail } from './dashboard-auth.js';
export async function sendLogin(token) {
 const port=Number(process.env.DASHBOARD_SMTP_PORT||465);
 const transport=nodemailer.createTransport({host:process.env.DASHBOARD_SMTP_HOST,port,secure:port===465,requireTLS:port!==465,auth:{user:process.env.DASHBOARD_SMTP_USER,pass:process.env.DASHBOARD_SMTP_PASSWORD},connectionTimeout:10000,socketTimeout:15000});
 const link='https://solidtec.dk/dashboard/#login_token='+encodeURIComponent(token);
 await transport.sendMail({from:process.env.DASHBOARD_SMTP_USER,to:ownerEmail(),subject:'Dit login-link til SOLIDTEC dashboard',text:'Åbn dit private dashboard:\n\n'+link+'\n\nLinket kan bruges én gang og udløber efter 15 minutter. Hvis du ikke har bedt om linket, kan du ignorere mailen.'});
}
