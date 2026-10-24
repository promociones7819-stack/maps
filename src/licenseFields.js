export const NO_EXPIRY=8640000000000000;
export function parseLicenseDate(value){
 const text=String(value||'').trim();if(text==='00-00-0000')return NO_EXPIRY;
 const m=text.match(/^(\d{2})-(\d{2})-(\d{4})$/);if(!m)throw Error('Escribe la fecha como DD-MM-AAAA o 00-00-0000 para no caducar.');
 const [,day,month,year]=m.map(Number),date=new Date(year,month-1,day,23,59,59);
 if(date.getFullYear()!==year||date.getMonth()!==month-1||date.getDate()!==day)throw Error('La fecha no es válida.');return date.getTime();
}
export function licenseExpiryLabel(l){return l.license_kind==='admin'||l.expires_at===NO_EXPIRY?'Sin caducidad':new Date(l.expires_at).toLocaleDateString('es-ES');}
