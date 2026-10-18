// Install before importing the app or loading the embedded pupil editor.
window.installRutasAccount = function(user) {
 if(window.rutasAccount)return;
 window.rutasAccount=user;
 const rawLocal=window.localStorage,rawSession=window.sessionStorage;
 const native={get:Storage.prototype.getItem,set:Storage.prototype.setItem,remove:Storage.prototype.removeItem,key:Storage.prototype.key,clear:Storage.prototype.clear};
 const ownerKey='rutasad-legacy-owner',prefix=`rutasad-account:${user.id}:`;
 const owner=native.get.call(rawLocal,ownerKey);
 const legacyKeys=Array.from({length:rawLocal.length},(_,i)=>native.key.call(rawLocal,i)).filter(k=>k.startsWith('traza-bizkaia-'));
 window.rutasLegacyAvailable=user.role==='admin'&&!owner&&legacyKeys.length>0;
 window.claimRutasLegacy=()=>{
  if(user.role!=='admin'||native.get.call(rawLocal,ownerKey))throw Error('Los datos anteriores ya están asignados.');
  for(const key of legacyKeys)native.set.call(rawLocal,prefix+key,native.get.call(rawLocal,key));
  native.set.call(rawLocal,ownerKey,user.id);
 };
 const facades=new WeakMap();
 function keys(raw){return Array.from({length:raw.length},(_,i)=>native.key.call(raw,i)).filter(k=>k.startsWith(prefix)).map(k=>k.slice(prefix.length));}
 for(const [method,fn] of Object.entries({
  getItem(key){const raw=facades.get(this);return native.get.call(raw,prefix+String(key));},
  setItem(key,value){const raw=facades.get(this);return native.set.call(raw,prefix+String(key),String(value));},
  removeItem(key){return native.remove.call(facades.get(this),prefix+String(key));},
  key(index){return keys(facades.get(this))[Number(index)]??null;},
  clear(){const raw=facades.get(this);for(const k of keys(raw))native.remove.call(raw,prefix+k);}
 })){
  const original=Storage.prototype[method];Storage.prototype[method]=function(...args){return facades.has(this)?fn.apply(this,args):original.apply(this,args);};
 }
 function scoped(raw){
  const proxy=new Proxy({}, {
   get(target,key){if(key==='length')return keys(raw).length;if(['getItem','setItem','removeItem','key','clear'].includes(key))return Storage.prototype[key];if(typeof key==='symbol')return undefined;return native.get.call(raw,prefix+key)??undefined;},
   set(target,key,value){Storage.prototype.setItem.call(proxy,key,value);return true;},
   deleteProperty(target,key){Storage.prototype.removeItem.call(proxy,key);return true;},
   ownKeys(){return keys(raw);},getOwnPropertyDescriptor(target,key){if(keys(raw).includes(key))return {configurable:true,enumerable:true,writable:true,value:native.get.call(raw,prefix+key)};}
  });facades.set(proxy,raw);return proxy;
 }
 Object.defineProperty(window,'localStorage',{value:scoped(rawLocal),configurable:true});
 Object.defineProperty(window,'sessionStorage',{value:scoped(rawSession),configurable:true});
 const legacyDatabases=new Set(['traza-lessons','rutasad-data-folder','rutasad-workspace']);
 const nameFor=name=>owner===user.id&&legacyDatabases.has(name)?name:prefix+name;
 const open=indexedDB.open.bind(indexedDB),remove=indexedDB.deleteDatabase.bind(indexedDB);
 indexedDB.open=(name,...args)=>open(nameFor(String(name)),...args);
 indexedDB.deleteDatabase=name=>remove(nameFor(String(name)));
 if(indexedDB.databases){const list=indexedDB.databases.bind(indexedDB);indexedDB.databases=async()=>(await list()).filter(d=>d.name.startsWith(prefix)||(owner===user.id&&legacyDatabases.has(d.name))).map(d=>({...d,name:d.name.startsWith(prefix)?d.name.slice(prefix.length):d.name}));}
 const add=window.addEventListener.bind(window),removeListener=window.removeEventListener.bind(window),listeners=new WeakMap();
 window.addEventListener=(type,fn,...args)=>{
  if(type!=='storage')return add(type,fn,...args);
  const wrapped=e=>{if(e.key!==null&&!e.key.startsWith(prefix))return;const event=new StorageEvent('storage',{key:e.key?.slice(prefix.length)??null,oldValue:e.oldValue,newValue:e.newValue,url:e.url});if(typeof fn==='function')fn(event);else fn.handleEvent(event);};listeners.set(fn,wrapped);return add(type,wrapped,...args);
 };
 window.removeEventListener=(type,fn,...args)=>removeListener(type,type==='storage'?(listeners.get(fn)||fn):fn,...args);
};
