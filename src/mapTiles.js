// SPDX-FileCopyrightText: 2026 Aitor Delgado Martínez · AD Mobility
// SPDX-License-Identifier: LicenseRef-RutasAD-Educational-NonCommercial-1.0
const base='https://www.geo.euskadi.eus/geoeuskadi/rest/services/U11/WMTS_ORTO/MapServer/WMTS/tile/1.0.0/U11_WMTS_ORTO/default/GoogleMapsCompatible';
export const geoTileUrl=(z,x,y)=>`${typeof window!=='undefined'&&window.trazaDesktop&&location.protocol==='traza:'?'traza://app/__geo/tiles':base}/${z}/${y}/${x}`;
