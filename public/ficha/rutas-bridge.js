// Runs only inside the same-origin RutasAD frame, with no independent database.
(() => {
 const key='traza-bizkaia-ficha-autoescuela-v2',query=new URLSearchParams(location.search);
 const clean=new URL(location.href);clean.searchParams.delete('action');history.replaceState(null,'',clean);
 const notify=()=>parent.postMessage({type:'rutasad:ficha-saved'},location.origin==='null'?'*':location.origin);
 const set=Storage.prototype.setItem;
 Storage.prototype.setItem=function(k,v){set.call(this,k,v);if(this===localStorage&&k===key)notify();};
 const css=document.createElement('style');css.textContent='.topbar,footer,.primaryNav{display:none!important} :root{--blue:#315e50;--blue2:#214236}.app{max-width:none}.studentsView{max-width:none}.sidebar .panel:last-child{display:none}';document.head.append(css);
 // Open by UUID, including when two learners share a name.
 setTimeout(()=>{if(query.get('action')==='new')window.RutasFicha?.create();else if(query.get('action')==='edit')window.RutasFicha?.edit(query.get('student'));else if(query.get('student'))window.RutasFicha?.open(query.get('student'),query.get('permit'),query.get('tab')||'history',query.get('entry'));},30);
 addEventListener('message',e=>{if(e.source!==parent||e.data?.type!=='rutasad:flush-ficha')return;window.RutasFicha?.flush();notify();});
})();
