export const NO_EXPIRY=8640000000000000;
export const accessExpired=(user,now=Date.now())=>user?.role!=='admin'&&Number.isFinite(user?.expires_at)&&user.expires_at<=now;
export function accessExpiry(value){if(value==='00-00-0000')return NO_EXPIRY;if(!Number.isSafeInteger(value)||value<=Date.now()||value>NO_EXPIRY)throw Error('Indica una fecha futura o 00-00-0000 para acceso sin caducidad.');return value;}
