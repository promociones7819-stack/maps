// A teaching copy never shares mutable objects or identifiers with the project.
export function trajectoryBoardDocument(routes,markers,name='Situación preparada'){
 const copied=new Map(),items=[];
 for(const route of routes){if(!route.points?.length)continue;const id=crypto.randomUUID();copied.set(route.id,id);items.push({id,type:'route',name:route.name||'',points:structuredClone(route.points),color:route.color,width:5,opacity:1});}
 for(const marker of markers){if(!copied.has(marker.routeId)||!marker.coordinates)continue;items.push({...structuredClone(marker),id:crypto.randomUUID(),routeId:copied.get(marker.routeId),type:marker.signalCode?'signal':'note'});}
 return {steps:[{id:crypto.randomUUID(),name,question:'',answer:'',items}],activeStep:0};
}
