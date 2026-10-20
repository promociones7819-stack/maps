// SPDX-FileCopyrightText: 2026 Aitor Delgado Martínez · AD Mobility
// SPDX-License-Identifier: LicenseRef-RutasAD-Educational-NonCommercial-1.0
const geoBase='https://www.geo.euskadi.eus/geoeuskadi/rest/services/U11/WMTS_ORTO/MapServer/WMTS/tile/1.0.0/U11_WMTS_ORTO/default/GoogleMapsCompatible';
export const rasterTileUrl=(provider,z,x,y)=>{
 const native=typeof window!=='undefined'&&window.trazaDesktop&&location.protocol==='traza:';
 if(provider==='pnoa')return native?`traza://app/__pnoa/tiles/${z}/${y}/${x}`:`https://www.ign.es/wmts/pnoa-ma?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetTile&LAYER=OI.OrthoimageCoverage&STYLE=default&FORMAT=image%2Fjpeg&TILEMATRIXSET=GoogleMapsCompatible&TILEMATRIX=${z}&TILEROW=${y}&TILECOL=${x}`;
 return `${native?'traza://app/__geo/tiles':geoBase}/${z}/${y}/${x}`;
};
export const geoTileUrl=(z,x,y)=>rasterTileUrl('geoEuskadi',z,x,y);
export const rasterName=provider=>provider==='pnoa'?'PNOA · IGN':'geoEuskadi';
export const rasterAttribution=provider=>provider==='pnoa'?'© Instituto Geográfico Nacional de España · PNOA · CC BY 4.0 ign.es':'© Eusko Jaurlaritza / Gobierno Vasco · geoEuskadi';
export const rasterCache=provider=>provider==='pnoa'?'ortofoto-pnoa-v1':'ortofoto-euskadi-v1';
export const rasterSource=provider=>({type:'raster',tiles:[rasterTileUrl(provider,'{z}','{x}','{y}')],maxzoom:20,tileSize:256,attribution:rasterAttribution(provider)});
