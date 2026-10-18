const enc=new TextEncoder();
const hex=bytes=>Array.from(new Uint8Array(bytes),n=>n.toString(16).padStart(2,'0')).join('');
export const digest=async value=>hex(await crypto.subtle.digest('SHA-256',enc.encode(value)));
export async function passwordHash(password,salt=hex(crypto.getRandomValues(new Uint8Array(16)))){
 const key=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveBits']);
 return `pbkdf2:100000:${salt}:${hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:enc.encode(salt),iterations:100000,hash:'SHA-256'},key,256))}`;
}
export async function verifyPassword(password,stored){
 const salt=stored?.split(':')[2];if(!salt)return false;
 const candidate=await passwordHash(password,salt);let mismatch=candidate.length^stored.length;
 for(let i=0;i<candidate.length;i++)mismatch|=candidate.charCodeAt(i)^(stored.charCodeAt(i)||0);
 return mismatch===0;
}
