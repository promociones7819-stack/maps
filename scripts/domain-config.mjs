// Build a domain configuration without replacing data bindings or existing routes.
export function domainConfiguration(current,input,{activate=false}={}) {
 const url=new URL(input.includes('://')?input:'https://'+input);
 const host=url.hostname;
 if(url.protocol!=='https:'||url.username||url.password||url.port||url.pathname!=='/'||url.search||url.hash||!/^([a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(host)||host==='workers.dev'||host.endsWith('.workers.dev'))throw Error('Introduce únicamente un dominio propio o subdominio HTTPS válido.');
 const config=structuredClone(current);
 config.workers_dev=true;
 config.routes=[...(config.routes||[]).filter(r=>r.pattern!==host),{pattern:host,custom_domain:true}];
 if(activate)config.vars={...config.vars,PUBLIC_ORIGIN:url.origin};
 return {config,origin:url.origin};
}
