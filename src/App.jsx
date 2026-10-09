import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Map as MapLibreMap, NavigationControl, AttributionControl, LngLatBounds, setWorkerUrl } from 'maplibre-gl';
import mapboxgl, { Map as MapboxGLMap, NavigationControl as MapboxNavigationControl, AttributionControl as MapboxAttributionControl } from 'mapbox-gl';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

setWorkerUrl(maplibreWorkerUrl);

const COLORS = ['#e36b4d', '#477bda', '#35a17e', '#a271c5', '#d2a33c'];
const SPEEDS = [0.1, 0.2, 0.3, 0.4, 0.5, 1, 2];
const START = [-2.9352, 43.2631];
const EUSKADI_TILES = 'https://www.geo.euskadi.eus/geoeuskadi/rest/services/U11/WMTS_ORTO/MapServer/WMTS/tile/1.0.0/U11_WMTS_ORTO/default/GoogleMapsCompatible/{z}/{y}/{x}';
const geoEuskadiSource = { type: 'raster', tiles: [EUSKADI_TILES], maxzoom: 20, tileSize: 256, attribution: '© Eusko Jaurlaritza / Gobierno Vasco · geoEuskadi' };
const makeInitialRoutes = () => ['A', 'B', 'C', 'D'].map((letter, index) => ({
  id: crypto.randomUUID(), name: `Trayectoria ${letter}`, color: COLORS[index], points: [],
}));
const ensureFourRoutes = routes => {
  const expanded = [...routes];
  while (expanded.length < 4) {
    const index = expanded.length;
    expanded.push({ id: crypto.randomUUID(), name: `Trayectoria ${String.fromCharCode(65 + index)}`, color: COLORS[index % COLORS.length], points: [] });
  }
  return expanded;
};
const loadLegacyRoutes = () => {
  try {
    const saved = JSON.parse(localStorage.getItem('traza-bizkaia-routes') || 'null');
    if (Array.isArray(saved) && saved.length && saved.every(route => route.id && route.name && route.color && Array.isArray(route.points))) return ensureFourRoutes(saved);
  } catch { /* Start with an empty project if local data is malformed. */ }
  return makeInitialRoutes();
};
const loadProjectState = () => {
  try {
    const saved = JSON.parse(localStorage.getItem('traza-bizkaia-projects') || 'null');
    if (Array.isArray(saved?.projects) && saved.projects.length && saved.projects.every(project => project.id && project.name)) return saved;
  } catch { /* Create a fresh project if the index is malformed. */ }
  const id = crypto.randomUUID();
  return { activeProjectId: id, projects: [{ id, name: 'Recorrido nuevo', legacy: true }] };
};
const loadProjectRoutes = project => {
  if (!project || project.legacy) return loadLegacyRoutes();
  try {
    const saved = JSON.parse(localStorage.getItem(`traza-bizkaia-project-${project.id}`) || 'null');
    if (Array.isArray(saved) && saved.length && saved.every(route => route.id && route.name && route.color && Array.isArray(route.points))) return ensureFourRoutes(saved);
  } catch { /* Start this project with blank routes if its local data is malformed. */ }
  return makeInitialRoutes();
};
const safeFileName = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9-_]+/g, '-').replace(/^-|-$/g, '').slice(0, 70) || 'recorrido';

function pointFeatureCollection(routes, activeId, current) {
  const features = [];
  routes.forEach(route => route.points.forEach((coords, index) => features.push({
    type: 'Feature', properties: { routeId: route.id, index, color: route.color, active: route.id === activeId },
    geometry: { type: 'Point', coordinates: coords },
  })));
  if (current) features.push({ type: 'Feature', properties: { vehicle: true, color: routes.find(r => r.id === activeId)?.color || COLORS[0] }, geometry: { type: 'Point', coordinates: current } });
  return { type: 'FeatureCollection', features };
}

function lineFeatureCollection(routes, activeId) {
  return { type: 'FeatureCollection', features: routes.filter(r => r.points.length > 1).map(route => ({
    type: 'Feature', properties: { routeId: route.id, color: route.color, active: route.id === activeId },
    geometry: { type: 'LineString', coordinates: route.points },
  })) };
}

function distance(a, b) {
  const rad = x => x * Math.PI / 180;
  const dLat = rad(b[1] - a[1]), dLon = rad(b[0] - a[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function interpolateRoute(points, fraction) {
  const lengths = points.slice(1).map((p, i) => distance(points[i], p));
  const total = lengths.reduce((sum, n) => sum + n, 0);
  if (!total) return { coords: points[0], bearing: 0 };
  let target = total * fraction;
  for (let i = 0; i < lengths.length; i += 1) {
    if (target <= lengths[i] || i === lengths.length - 1) {
      const t = Math.min(1, target / lengths[i]);
      const a = points[i], b = points[i + 1];
      let bearing = Math.atan2(Math.sin((b[0] - a[0]) * Math.PI / 180) * Math.cos(b[1] * Math.PI / 180), Math.cos(a[1] * Math.PI / 180) * Math.sin(b[1] * Math.PI / 180) - Math.sin(a[1] * Math.PI / 180) * Math.cos(b[1] * Math.PI / 180) * Math.cos((b[0] - a[0]) * Math.PI / 180)) * 180 / Math.PI;
      if (bearing < 0) bearing += 360;
      return { coords: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], bearing };
    }
    target -= lengths[i];
  }
  return { coords: points.at(-1), bearing: 0 };
}

export default function App() {
  const mapNode = useRef(null), mapRef = useRef(null), mapViewRef = useRef(null), routesRef = useRef([]), activeRef = useRef('');
  const progressRef = useRef(0), rafRef = useRef(0), lastFrameRef = useRef(0);
  const recorderRef = useRef(null), chunksRef = useRef([]), folderRef = useRef(null), recordFrameRef = useRef(0), audioResourcesRef = useRef(null), mediaStreamRef = useRef(null), audioInputRef = useRef(null);
  const [projectState, setProjectState] = useState(loadProjectState);
  const currentProject = projectState.projects.find(project => project.id === projectState.activeProjectId) || projectState.projects[0];
  const [routes, setRoutes] = useState(() => loadProjectRoutes(currentProject));
  const [activeId, setActiveId] = useState(() => routes[0].id);
  const [mode, setMode] = useState('select');
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [height, setHeight] = useState(120);
  const [follow, setFollow] = useState(true);
  const [cameraView, setCameraView] = useState('top');
  const [mapProvider, setMapProvider] = useState(() => localStorage.getItem('traza-bizkaia-map-provider') === 'mapbox' && localStorage.getItem('traza-bizkaia-mapbox-token')?.startsWith('pk.') ? 'mapbox' : 'geoEuskadi');
  const [mapToken, setMapToken] = useState(() => localStorage.getItem('traza-bizkaia-mapbox-token') || '');
  const [mapTokenDraft, setMapTokenDraft] = useState(() => localStorage.getItem('traza-bizkaia-mapbox-token') || '');
  const [mapSettingsOpen, setMapSettingsOpen] = useState(false);
  const [mapboxTokenError, setMapboxTokenError] = useState('');
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState('');
  const [progress, setProgress] = useState(0);
  const [recording, setRecording] = useState(false);
  const [audioFile, setAudioFile] = useState(null);
  const [recordMicrophone, setRecordMicrophone] = useState(false);
  const [offlineDownloading, setOfflineDownloading] = useState(false);
  const [offlineMessage, setOfflineMessage] = useState('');
  const [folderName, setFolderName] = useState('');
  const [exportMessage, setExportMessage] = useState('');
  const [nameDialog, setNameDialog] = useState(null);
  const modeRef = useRef(mode);
  const dragRef = useRef(null);

  const selectMapProvider = provider => {
    if (provider === 'mapbox') {
      const token = mapTokenDraft.trim();
      if (!token.startsWith('pk.')) { setMapboxTokenError('Pega un token público completo de Mapbox que empiece por pk.'); setMapSettingsOpen(true); return; }
      setMapboxTokenError('');
      try { localStorage.setItem('traza-bizkaia-mapbox-token', token); localStorage.setItem('traza-bizkaia-map-provider', 'mapbox'); }
      catch { setMapError('No se pudo guardar la configuración del mapa en este navegador.'); return; }
      setMapToken(token);
    } else {
      localStorage.setItem('traza-bizkaia-map-provider', 'geoEuskadi');
      setMapboxTokenError('');
    }
    setMapError('');
    setMapProvider(provider);
  };

  const clearMapboxToken = () => {
    localStorage.removeItem('traza-bizkaia-mapbox-token');
    localStorage.setItem('traza-bizkaia-map-provider', 'geoEuskadi');
    setMapToken(''); setMapTokenDraft(''); setMapProvider('geoEuskadi'); setMapError(''); setMapboxTokenError('');
  };

  const activeRoute = routes.find(route => route.id === activeId) || routes[0];
  const totalDistance = useMemo(() => activeRoute?.points.slice(1).reduce((sum, p, i) => sum + distance(activeRoute.points[i], p), 0) || 0, [activeRoute]);

  const releaseAudio = async () => {
    const resources = audioResourcesRef.current;
    audioResourcesRef.current = null;
    const stream = mediaStreamRef.current;
    mediaStreamRef.current = null;
    stream?.getTracks().forEach(track => track.stop());
    if (!resources) return;
    resources.audio?.pause();
    if (resources.audio) resources.audio.removeAttribute('src');
    if (resources.url) URL.revokeObjectURL(resources.url);
    resources.microphone?.getTracks().forEach(track => track.stop());
    if (resources.context?.state !== 'closed') await resources.context?.close().catch(() => {});
  };
  const downloadOfflineArea = async () => {
    const map = mapRef.current;
    if (!map || offlineDownloading) return;
    if (!('caches' in window)) {
      setOfflineMessage('Este navegador no permite guardar mapas para usarlos sin conexión.');
      return;
    }
    const zoom = map.getZoom();
    const minZoom = Math.max(8, Math.floor(zoom) - 1);
    const maxZoom = Math.min(18, Math.ceil(zoom) + 2);
    const bounds = map.getBounds();
    const tileX = (longitude, level) => Math.floor((longitude + 180) / 360 * (2 ** level));
    const tileY = (latitude, level) => Math.floor((1 - Math.asinh(Math.tan(latitude * Math.PI / 180)) / Math.PI) / 2 * (2 ** level));
    const tiles = [];
    for (let level = minZoom; level <= maxZoom; level += 1) {
      const northWest = bounds.getNorthWest(), southEast = bounds.getSouthEast();
      const minX = tileX(northWest.lng, level), maxX = tileX(southEast.lng, level);
      const minY = tileY(northWest.lat, level), maxY = tileY(southEast.lat, level);
      for (let x = minX; x <= maxX; x += 1) for (let y = minY; y <= maxY; y += 1) {
        tiles.push(`https://www.geo.euskadi.eus/geoeuskadi/rest/services/U11/WMTS_ORTO/MapServer/WMTS/tile/1.0.0/U11_WMTS_ORTO/default/GoogleMapsCompatible/${level}/${y}/${x}`);
      }
    }
    if (tiles.length > 1800) {
      setOfflineMessage(`La zona incluye ${tiles.length} imágenes. Acércate a un área menor y vuelve a intentarlo (máximo 1.800).`);
      return;
    }
    setOfflineDownloading(true);
    setOfflineMessage(`Preparando ${tiles.length} imágenes aéreas…`);
    try {
      const cache = await caches.open('ortofoto-euskadi-v1');
      const missing = [];
      for (const url of tiles) if (!await cache.match(url)) missing.push(url);
      let cursor = 0, complete = 0, failed = 0;
      await Promise.all(Array.from({ length: 8 }, async () => {
        while (cursor < missing.length) {
          const url = missing[cursor++];
          try {
            const response = await fetch(url, { mode: 'cors' });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            await cache.put(url, response.clone());
          } catch { failed += 1; }
          complete += 1;
          if (complete % 10 === 0 || complete === missing.length) setOfflineMessage(`Guardando imágenes aéreas: ${complete}/${missing.length}…`);
        }
      }));
      setOfflineMessage(failed ? `Guardadas ${tiles.length - failed} imágenes; ${failed} no se pudieron descargar.` : `Zona guardada sin conexión: ${tiles.length} imágenes aéreas.`);
    } catch {
      setOfflineMessage('No se pudo guardar la zona. Comprueba el espacio disponible en el navegador.');
    } finally {
      setOfflineDownloading(false);
    }
  };

  const updateSources = useCallback((nextRoutes = routesRef.current, selected = activeRef.current, vehicle = null) => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    map.getSource('route-lines')?.setData(lineFeatureCollection(nextRoutes, selected));
    map.getSource('route-points')?.setData(pointFeatureCollection(nextRoutes, selected, vehicle));
  }, []);

  const commitRoutes = useCallback((nextRoutes) => {
    routesRef.current = nextRoutes;
    setRoutes(nextRoutes);
    updateSources(nextRoutes, activeRef.current);
  }, [updateSources]);

  useEffect(() => {
    routesRef.current = routes;
    activeRef.current = activeId;
    modeRef.current = mode;
    try { localStorage.setItem(`traza-bizkaia-project-${currentProject.id}`, JSON.stringify(routes)); } catch { /* Browser storage may be unavailable. */ }
    updateSources(routes, activeId);
  }, [routes, activeId, mode, updateSources, currentProject.id]);

  useEffect(() => {
    try {
      localStorage.setItem('traza-bizkaia-projects', JSON.stringify({
        activeProjectId: projectState.activeProjectId,
        projects: projectState.projects.map(({ id, name }) => ({ id, name })),
      }));
    } catch { /* Browser storage may be unavailable. */ }
  }, [projectState]);

  useEffect(() => {
    if (!mapNode.current) return;
    setMapReady(false);
    setMapError('');
    const initialView = mapViewRef.current || { center: START, zoom: 10.1, pitch: 0, bearing: 0 };
    const isMapbox = mapProvider === 'mapbox';
    const MapConstructor = isMapbox ? MapboxGLMap : MapLibreMap;
    if (isMapbox) mapboxgl.accessToken = mapToken;
    const map = new MapConstructor({
      container: mapNode.current,
      ...(isMapbox ? {
        style: 'mapbox://styles/mapbox/satellite-streets-v12',
      } : { style: {
        version: 8,
        sources: {
          'basemap-source': geoEuskadiSource,
        },
        layers: [{ id: 'basemap-layer', type: 'raster', source: 'basemap-source' }],
      } }),
      center: initialView.center,
      zoom: initialView.zoom,
      pitch: initialView.pitch,
      bearing: initialView.bearing,
      attributionControl: false,
      cooperativeGestures: true,
      preserveDrawingBuffer: true,
    });
    mapRef.current = map;
    map.addControl(isMapbox ? new MapboxNavigationControl({ showCompass: true }) : new NavigationControl({ showCompass: true }), 'top-right');
    map.addControl(isMapbox ? new MapboxAttributionControl({ compact: true }) : new AttributionControl({ compact: true }), 'bottom-right');
    map.on('load', () => {
      if (!isMapbox) map.setMaxZoom(20);
      map.addSource('route-lines', { type: 'geojson', data: lineFeatureCollection(routesRef.current, activeRef.current) });
      map.addLayer({ id: 'routes-outline', type: 'line', source: 'route-lines', paint: { 'line-color': '#101b22', 'line-width': ['case', ['get', 'active'], 7, 5], 'line-opacity': 0.68, 'line-blur': 1.5 } });
      map.addLayer({ id: 'routes-line', type: 'line', source: 'route-lines', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': ['get', 'color'], 'line-width': ['case', ['get', 'active'], 4, 2.5], 'line-opacity': ['case', ['get', 'active'], 1, 0.68] } });
      map.addSource('route-points', { type: 'geojson', data: pointFeatureCollection(routesRef.current, activeRef.current) });
      map.addLayer({ id: 'route-points-layer', type: 'circle', source: 'route-points', filter: ['!', ['has', 'vehicle']], paint: { 'circle-radius': ['case', ['get', 'active'], 7, 5], 'circle-color': ['get', 'color'], 'circle-stroke-color': '#fff', 'circle-stroke-width': 2 } });
      map.addLayer({ id: 'vehicle-halo', type: 'circle', source: 'route-points', filter: ['has', 'vehicle'], paint: { 'circle-radius': 12, 'circle-color': '#fff', 'circle-opacity': 0.35 } });
      map.addLayer({ id: 'vehicle-point', type: 'circle', source: 'route-points', filter: ['has', 'vehicle'], paint: { 'circle-radius': 7, 'circle-color': ['get', 'color'], 'circle-stroke-color': '#fff', 'circle-stroke-width': 2 } });
      setMapReady(true);
    });
    map.on('error', event => {
      if (!event.error?.message || (!isMapbox && event.sourceId !== 'basemap-source')) return;
      const status = event.error.status;
      if (isMapbox && status === 401) setMapError('Mapbox ha rechazado el token al cargar el mapa (401). Comprueba que sea el token público activo de esta cuenta.');
      else if (isMapbox && status === 403) setMapError('Mapbox no autoriza esta cuenta o el token (403). Comprueba que el token público siga activo y que la cuenta tenga acceso al servicio.');
      else setMapError(event.error.message);
    });
    map.on('click', event => {
      if (modeRef.current !== 'add') {
        const features = map.queryRenderedFeatures(event.point, { layers: ['route-points-layer'] });
        if (features[0]) setSelectedPoint({ routeId: features[0].properties.routeId, index: Number(features[0].properties.index) });
        else setSelectedPoint(null);
        return;
      }
      const target = routesRef.current.find(r => r.id === activeRef.current);
      if (!target) return;
      const next = routesRef.current.map(route => route.id === target.id ? { ...route, points: [...route.points, [event.lngLat.lng, event.lngLat.lat]] } : route);
      setSelectedPoint({ routeId: target.id, index: target.points.length });
      commitRoutes(next);
    });
    map.on('mousedown', 'route-points-layer', event => {
      if (modeRef.current === 'add') return;
      const feature = event.features?.[0];
      if (!feature) return;
      event.preventDefault();
      const selection = { routeId: feature.properties.routeId, index: Number(feature.properties.index) };
      dragRef.current = selection;
      setSelectedPoint(selection);
      map.dragPan.disable();
      map.getCanvas().style.cursor = 'grabbing';
    });
    map.on('mousemove', event => {
      if (!dragRef.current) return;
      const { routeId, index } = dragRef.current;
      const nextRoutes = routesRef.current.map(route => route.id === routeId ? { ...route, points: route.points.map((point, i) => i === index ? [event.lngLat.lng, event.lngLat.lat] : point) } : route);
      commitRoutes(nextRoutes);
    });
    map.on('mouseup', () => {
      if (!dragRef.current) return;
      dragRef.current = null;
      map.dragPan.enable();
      map.getCanvas().style.cursor = modeRef.current === 'add' ? 'crosshair' : '';
    });
    map.on('mouseleave', () => {
      if (dragRef.current) { dragRef.current = null; map.dragPan.enable(); }
    });
    return () => {
      cancelAnimationFrame(rafRef.current);
      if (mapRef.current === map) {
        const center = map.getCenter();
        mapViewRef.current = { center: [center.lng, center.lat], zoom: map.getZoom(), pitch: map.getPitch(), bearing: map.getBearing() };
        map.remove();
        mapRef.current = null;
      }
    };
  }, [mapProvider, mapToken]);

  useEffect(() => { if (mapReady) updateSources(routes, activeId); }, [mapReady, routes, activeId, updateSources]);
  useEffect(() => {
    const pointLayer = mapRef.current?.getLayer('route-points-layer');
    if (pointLayer) mapRef.current.setLayoutProperty('route-points-layer', 'visibility', playing || recording ? 'none' : 'visible');
  }, [mapReady, playing, recording]);
  useEffect(() => {
    if (mapReady && mapRef.current) mapRef.current.getCanvas().style.cursor = mode === 'add' ? 'crosshair' : '';
  }, [mapReady, mode]);

  // Keep map click handlers current without rebuilding the map.
  useEffect(() => { routesRef.current = routes; activeRef.current = activeId; }, [routes, activeId]);

  const addRoute = () => {
    if (routes.length >= 4) return;
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    setPlaying(false);
    const letter = String.fromCharCode(65 + routes.length);
    const route = { id: crypto.randomUUID(), name: `Trayectoria ${letter}`, color: COLORS[routes.length % COLORS.length], points: [] };
    commitRoutes([...routes, route]); setActiveId(route.id); setSelectedPoint(null); setMode('add'); setPlaying(false);
  };
  const renameRoute = id => {
    const route = routes.find(item => item.id === id);
    if (route) setNameDialog({ kind: 'route', target: id, value: route.name });
  };
  const deleteRoute = id => {
    if (routes.length === 1) { commitRoutes(routes.map(r => r.id === id ? { ...r, points: [] } : r)); setSelectedPoint(null); return; }
    const rest = routes.filter(route => route.id !== id); commitRoutes(rest);
    if (id === activeId) setActiveId(rest[0].id);
    setSelectedPoint(null);
  };
  const removeSelectedPoint = () => {
    if (!selectedPoint) return;
    const { routeId, index } = selectedPoint;
    commitRoutes(routes.map(route => route.id === routeId ? { ...route, points: route.points.filter((_, i) => i !== index) } : route));
    setSelectedPoint(null);
  };
  const createProject = () => setNameDialog({ kind: 'project-new', value: '' });
  const createNamedProject = name => {
    const id = crypto.randomUUID();
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    const newRoutes = makeInitialRoutes();
    try { localStorage.setItem(`traza-bizkaia-project-${id}`, JSON.stringify(newRoutes)); } catch { /* Browser storage may be unavailable. */ }
    setProjectState(previous => ({
      activeProjectId: id,
      projects: [...previous.projects.map(({ id: oldId, name: oldName }) => ({ id: oldId, name: oldName })), { id, name }],
    }));
    setRoutes(newRoutes);
    setActiveId(newRoutes[0].id);
    setSelectedPoint(null);
    setPlaying(false);
    setProgress(0);
    progressRef.current = 0;
    setMode('select');
    mapRef.current?.flyTo({ center: START, zoom: 10.1, pitch: 0, bearing: 0, duration: 700 });
  };
  const switchProject = id => {
    const project = projectState.projects.find(item => item.id === id);
    if (!project || project.id === currentProject.id) return;
    const nextRoutes = loadProjectRoutes(project);
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    setProjectState(previous => ({ ...previous, activeProjectId: id }));
    setRoutes(nextRoutes);
    setActiveId(nextRoutes[0].id);
    setSelectedPoint(null);
    setPlaying(false);
    setProgress(0);
    progressRef.current = 0;
    setMode('select');
    mapRef.current?.flyTo({ center: START, zoom: 10.1, pitch: 0, bearing: 0, duration: 700 });
  };
  const renameProject = () => {
    setNameDialog({ kind: 'project-rename', target: currentProject.id, value: currentProject.name });
  };
  const saveNameDialog = event => {
    event.preventDefault();
    const dialog = nameDialog;
    const name = dialog?.value.trim();
    if (!dialog || !name) return;
    if (dialog.kind === 'route') commitRoutes(routes.map(route => route.id === dialog.target ? { ...route, name } : route));
    if (dialog.kind === 'project-rename') setProjectState(previous => ({ ...previous, projects: previous.projects.map(project => project.id === dialog.target ? { ...project, name } : project) }));
    if (dialog.kind === 'project-new') createNamedProject(name);
    setNameDialog(null);
  };
  const chooseOutputFolder = async () => {
    if (recording) return;
    setExportMessage('');
    if (!window.showDirectoryPicker) {
      folderRef.current = null;
      setFolderName('Descargas del navegador');
      setExportMessage('Este navegador no permite elegir carpeta. El vídeo se descargará en Descargas.');
      return;
    }
    try {
      const directory = await window.showDirectoryPicker({ mode: 'readwrite' });
      folderRef.current = directory;
      setFolderName(directory.name);
      setExportMessage('');
    } catch (error) {
      if (error.name !== 'AbortError') setExportMessage('No se pudo acceder a esa carpeta. Elige otra.');
    }
  };
  const exportVideo = async () => {
    if (recording) {
      setPlaying(false);
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
      return;
    }
    if (!activeRoute || activeRoute.points.length < 2 || !mapRef.current || !folderName) return;
    const canvas = mapRef.current.getCanvas();
    if (!canvas.captureStream || !window.MediaRecorder) {
      setExportMessage('Este navegador no admite grabar el mapa. Prueba con Google Chrome actualizado.');
      return;
    }
    try {
      const videoCanvas = document.createElement('canvas');
      videoCanvas.width = canvas.width;
      videoCanvas.height = canvas.height;
      const context = videoCanvas.getContext('2d');
      if (!context || !videoCanvas.captureStream) throw new Error('Canvas recording is unavailable');
      const attribution = mapRef.current.getContainer().querySelector('.maplibregl-ctrl-attrib-inner')?.innerText?.replace(/\s+/g, ' ').trim() || '© Eusko Jaurlaritza / Gobierno Vasco · geoEuskadi';
      const composeFrame = () => {
        context.drawImage(canvas, 0, 0, videoCanvas.width, videoCanvas.height);
        const fontSize = Math.max(11, Math.round(videoCanvas.width / 110));
        context.font = `500 ${fontSize}px sans-serif`;
        const textWidth = context.measureText(attribution).width;
        const pad = Math.round(fontSize * 0.65);
        context.fillStyle = 'rgba(255,255,255,0.9)';
        context.fillRect(12, videoCanvas.height - fontSize - pad * 2 - 12, textWidth + pad * 2, fontSize + pad * 2);
        context.fillStyle = '#37433b';
        context.fillText(attribution, 12 + pad, videoCanvas.height - pad - 12);
        recordFrameRef.current = requestAnimationFrame(composeFrame);
      };
      composeFrame();
      mapRef.current.setLayoutProperty('route-points-layer', 'visibility', 'none');
      const stream = videoCanvas.captureStream(30);
      mediaStreamRef.current = stream;
      let audioElement = null;
      let audioContext = null;
      let microphone = null;
      let audioUrl = null;
      if (audioFile || recordMicrophone) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) throw new Error('Audio recording is not supported in this browser');
        audioContext = new AudioContextClass();
        audioResourcesRef.current = { audio: null, context: audioContext, microphone: null, url: null };
        const destination = audioContext.createMediaStreamDestination();
        if (audioFile) {
          audioUrl = URL.createObjectURL(audioFile);
          audioElement = new Audio(audioUrl);
          audioElement.preload = 'auto';
          audioContext.createMediaElementSource(audioElement).connect(destination);
          audioResourcesRef.current = { ...audioResourcesRef.current, audio: audioElement, url: audioUrl };
        }
        if (recordMicrophone) {
          if (!navigator.mediaDevices?.getUserMedia) throw new Error('Microphone access is unavailable');
          setExportMessage('Esperando permiso para usar el micrófono…');
          microphone = await navigator.mediaDevices.getUserMedia({ audio: true });
          audioResourcesRef.current = { ...audioResourcesRef.current, microphone };
          audioContext.createMediaStreamSource(microphone).connect(destination);
        }
        await audioContext.resume();
        destination.stream.getAudioTracks().forEach(track => stream.addTrack(track));
      }
      const mimeType = ['video/mp4;codecs="avc1.42E01E,mp4a.40.2"', 'video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4;codecs="avc1.42E01E"', 'video/mp4;codecs=avc1', 'video/mp4'].find(type => MediaRecorder.isTypeSupported(type));
      if (!mimeType) {
        cancelAnimationFrame(recordFrameRef.current);
        await releaseAudio();
        mapRef.current.setLayoutProperty('route-points-layer', 'visibility', 'visible');
        setExportMessage('Este navegador no puede grabar en MP4. Usa Safari actualizado para exportar el vídeo.');
        return;
      }
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      recorderRef.current = recorder;
      recorder.ondataavailable = event => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onerror = () => { cancelAnimationFrame(recordFrameRef.current); void releaseAudio(); setExportMessage('La grabación falló. Inténtalo de nuevo.'); setRecording(false); setPlaying(false); };
      recorder.onstop = async () => {
        cancelAnimationFrame(recordFrameRef.current);
        await releaseAudio();
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'video/mp4' });
        const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const fileName = `${safeFileName(currentProject.name)}-${safeFileName(activeRoute.name)}-${stamp}.mp4`;
        try {
          if (folderRef.current) {
            const file = await folderRef.current.getFileHandle(fileName, { create: true });
            const writable = await file.createWritable();
            await writable.write(blob);
            await writable.close();
            setExportMessage(`Vídeo guardado en «${folderName}»: ${fileName}`);
          } else {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url; link.download = fileName; link.click();
            URL.revokeObjectURL(url);
            setExportMessage(`Vídeo descargado: ${fileName}`);
          }
        } catch {
          setExportMessage('No se pudo guardar el vídeo en esa carpeta. Vuelve a seleccionarla e inténtalo otra vez.');
        }
        setRecording(false);
        recorderRef.current = null;
      };
      progressRef.current = 0;
      setProgress(0);
      const start = interpolateRoute(activeRoute.points, 0);
      const vehicleView = cameraView === 'vehicle';
      mapRef.current.jumpTo({
        center: start.coords,
        offset: vehicleView ? [0, mapRef.current.getContainer().clientHeight * 0.14] : [0, 0],
        bearing: vehicleView ? start.bearing : 0,
        pitch: vehicleView ? 60 : 0,
        zoom: vehicleView ? Math.max(18.8, Math.min(19.7, 20.3 - Math.log2(height / 100))) : Math.max(15.5, Math.min(19.2, 18.2 - Math.log2(height / 100))),
      });
      if (audioElement) { audioElement.currentTime = 0; await audioElement.play(); }
      recorder.start(1000);
      setRecording(true);
      setPlaying(true);
      setExportMessage('Grabando el recorrido. Se guardará automáticamente al llegar al final.');
    } catch {
      cancelAnimationFrame(recordFrameRef.current);
      await releaseAudio();
      setRecording(false);
      setPlaying(false);
      if (mapRef.current?.getLayer('route-points-layer')) mapRef.current.setLayoutProperty('route-points-layer', 'visibility', 'visible');
      setExportMessage('No se pudo iniciar la grabación MP4. Comprueba que Safari esté actualizado e inténtalo de nuevo.');
    }
  };
  const focusRoute = route => {
    if (!route?.points.length || !mapRef.current) return;
    const bounds = route.points.reduce((b, coord) => b.extend(coord), new LngLatBounds(route.points[0], route.points[0]));
    mapRef.current.fitBounds(bounds.toArray(), { padding: 100, maxZoom: 16, duration: 800 });
  };
  const setActive = id => { if (recorderRef.current?.state === 'recording') recorderRef.current.stop(); setPlaying(false); setProgress(0); progressRef.current = 0; setActiveId(id); setSelectedPoint(null); };

  const animate = useCallback((now) => {
    const route = routesRef.current.find(r => r.id === activeRef.current);
    const map = mapRef.current;
    if (!route || route.points.length < 2 || !map) { setPlaying(false); return; }
    if (!lastFrameRef.current) lastFrameRef.current = now;
    const dt = Math.min(60, now - lastFrameRef.current); lastFrameRef.current = now;
    const duration = Math.max(5000, (distance(route.points[0], route.points.at(-1)) / 16) * 1000) / speed;
    progressRef.current += dt / duration;
    if (progressRef.current >= 1) {
      if (recorderRef.current?.state === 'recording') {
        progressRef.current = 1;
        setProgress(1);
        setPlaying(false);
        recorderRef.current.stop();
        return;
      }
      progressRef.current = 0;
    }
    const position = interpolateRoute(route.points, progressRef.current);
    setProgress(progressRef.current);
    updateSources(routesRef.current, activeRef.current, position.coords);
    if (follow) {
      const vehicleView = cameraView === 'vehicle';
      const zoom = vehicleView
        ? Math.max(18.8, Math.min(19.7, 20.3 - Math.log2(height / 100)))
        : Math.max(15.5, Math.min(19.2, 18.2 - Math.log2(height / 100)));
      map.easeTo({
        center: position.coords,
        offset: vehicleView ? [0, map.getContainer().clientHeight * 0.14] : [0, 0],
        bearing: vehicleView ? position.bearing : 0,
        pitch: vehicleView ? 60 : 0,
        zoom,
        duration: 0,
        essential: true,
      });
    }
    rafRef.current = requestAnimationFrame(animate);
  }, [speed, height, follow, cameraView, updateSources]);

  useEffect(() => {
    if (playing) { lastFrameRef.current = 0; rafRef.current = requestAnimationFrame(animate); }
    else { cancelAnimationFrame(rafRef.current); updateSources(routes, activeId); }
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, animate, routes, activeId, updateSources]);

  useEffect(() => {
    if (playing) return;
    const route = routes.find(item => item.id === activeId);
    const map = mapRef.current;
    if (!map || !route?.points.length) return;
    const progressAt = progressRef.current;
    const position = route.points.length > 1
      ? interpolateRoute(route.points, progressAt)
      : { coords: route.points[0], bearing: 0 };
    const vehicleView = cameraView === 'vehicle';
    const zoom = vehicleView
      ? Math.max(18.8, Math.min(19.7, 20.3 - Math.log2(height / 100)))
      : Math.max(15.5, Math.min(19.2, 18.2 - Math.log2(height / 100)));
    map.easeTo({
      center: position.coords,
      offset: vehicleView ? [0, map.getContainer().clientHeight * 0.14] : [0, 0],
      bearing: vehicleView && follow ? position.bearing : 0,
      pitch: vehicleView ? 60 : 0,
      zoom,
      duration: 700,
      essential: true,
    });
  }, [cameraView, height, follow, activeId, playing, routes]);

  const togglePlayback = () => {
    if (!activeRoute || activeRoute.points.length < 2) return;
    if (progressRef.current >= 1) progressRef.current = 0;
    const nextPlaying = !playing;
    const audio = audioResourcesRef.current?.audio;
    if (nextPlaying) audio?.play().catch(() => {});
    else audio?.pause();
    setPlaying(nextPlaying);
  };

  return <main className="app-shell">
    <header className="topbar">
      <div className="brand"><div className="brand-mark"><span /><span /><span /></div><div><div className="brand-name">TRAZA<span> / BIZKAIA</span></div><div className="brand-subtitle">Estudio de recorridos aéreos</div></div></div>
      <div className="topbar-right"><span className="map-status"><i className={mapReady && !mapError ? 'status-dot ready' : 'status-dot'} />{mapProvider === 'mapbox' ? 'Mapbox Satélite' : 'Ortofoto geoEuskadi'}</span><button className="icon-button" title="Centrar en Bizkaia" onClick={() => mapRef.current?.flyTo({ center: START, zoom: 10.1, pitch: 0, bearing: 0, duration: 900 })}><span className="crosshair">⌖</span></button></div>
    </header>
    <section className="workspace">
      <aside className="sidebar">
        <div className="panel-heading"><div><p className="eyebrow">PROYECTO</p><h1 title={currentProject.name}>{currentProject.name}</h1></div><div className="project-actions"><button className="add-route" title="Crear proyecto" onClick={createProject}>+</button><button className="more-button" title="Cambiar nombre" onClick={renameProject}>···</button></div></div>
        {projectState.projects.length > 1 && <div className="project-switcher"><span className="eyebrow">CAMBIAR PROYECTO</span><select aria-label="Seleccionar proyecto" value={currentProject.id} onChange={event => switchProject(event.target.value)}>{projectState.projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></div>}
        <div className="location-chip"><span className="pin-icon">⌖</span><div><strong>Bizkaia, Euskadi</strong><small>Vista inicial · mapa real</small></div><span className="chip-live">LIVE</span></div>
        <div className="section-title"><div><span className="eyebrow">CAPAS DE RECORRIDO</span><span className="count-badge">{routes.length}/4</span></div><button className="add-route" onClick={addRoute} disabled={routes.length >= 4} aria-label="Crear trayectoria" title={routes.length >= 4 ? 'Ya tienes las cuatro trayectorias' : 'Crear trayectoria'}>+</button></div>
        <div className="route-list">
          {routes.map((route, index) => <article key={route.id} className={`route-card ${activeId === route.id ? 'selected' : ''}`}>
            <button className="route-main" onClick={() => setActive(route.id)}><span className="route-swatch" style={{ '--route-color': route.color }}><span /></span><span className="route-info"><strong>{route.name}</strong><small>{route.points.length} {route.points.length === 1 ? 'punto' : 'puntos'}{route.points.length > 1 ? ` · ${Math.round(route.points.slice(1).reduce((sum, p, i) => sum + distance(route.points[i], p), 0))} m` : ''}</small></span><span className="route-key">{String.fromCharCode(65 + index)}</span></button>
            {activeId === route.id && <div className="route-actions"><button onClick={() => renameRoute(route.id)}>Renombrar</button><button onClick={() => focusRoute(route)}>Enfocar</button><button className="danger-text" onClick={() => deleteRoute(route.id)}>{routes.length === 1 ? 'Vaciar' : 'Eliminar'}</button></div>}
          </article>)}
        </div>
        <div className="drawing-card">
          <div className="drawing-heading"><span className="draw-icon">✳</span><div><strong>Edición de trazado</strong><small>{mode === 'add' ? 'Haz clic en el mapa para añadir puntos' : 'Selecciona una ruta para editarla'}</small></div></div>
          <button className={`draw-toggle ${mode === 'add' ? 'active' : ''}`} onClick={() => { setMode(mode === 'add' ? 'select' : 'add'); setPlaying(false); }}>{mode === 'add' ? '✓  Añadiendo puntos' : '+  Añadir puntos en el mapa'}</button>
          <div className="edit-row"><span>Arrastra un punto en el mapa para recolocarlo</span><button disabled={!selectedPoint} onClick={removeSelectedPoint} title="Eliminar punto seleccionado">⌫</button></div>
        </div>
        <div className="divider" />
        <div className="section-title playback-title"><div><span className="eyebrow">VUELO DE CÁMARA</span></div><span className="preview-label">PREVISUALIZACIÓN</span></div>
        <div className="play-card">
          <button className={`play-button ${playing ? 'is-playing' : ''}`} onClick={togglePlayback} disabled={!activeRoute || activeRoute.points.length < 2} aria-label={playing ? 'Pausar' : 'Reproducir'}>{playing ? 'Ⅱ' : '▶'}</button>
          <div className="play-copy"><strong>{playing ? 'Simulación en curso' : 'Vista previa del recorrido'}</strong><small>{activeRoute?.points.length < 2 ? 'Añade al menos dos puntos' : `Sigue ${activeRoute?.name}`}</small></div>
          <button className="restart-button" title="Volver al inicio" onClick={() => { progressRef.current = 0; setProgress(0); if (activeRoute?.points[0]) { const vehicleView = cameraView === 'vehicle'; mapRef.current?.flyTo({ center: activeRoute.points[0], zoom: vehicleView ? Math.max(18.8, Math.min(19.7, 20.3 - Math.log2(height / 100))) : Math.max(15.5, Math.min(19.2, 18.2 - Math.log2(height / 100))), pitch: vehicleView ? 60 : 0, bearing: vehicleView ? interpolateRoute(activeRoute.points, 0).bearing : 0, duration: 700 }); } }}>↺</button>
        </div>
        <div className="video-card">
          <div className="video-card-heading"><strong>Vídeo · {activeRoute?.name}</strong><span>MP4</span></div>
          <div className="video-actions"><button className="folder-button" onClick={chooseOutputFolder}>▰ {folderName || 'Elegir carpeta…'}</button><button className="export-button" disabled={!recording && (!folderName || !activeRoute || activeRoute.points.length < 2)} onClick={exportVideo}>{recording ? '■ Finalizar y guardar' : '● Grabar vídeo'}</button></div>
          <small>{exportMessage || (folderName ? `Se guardará en «${folderName}».` : 'Selecciona una trayectoria y elige dónde guardar su vídeo MP4.')}</small>
        </div>
        <div className="audio-card">
          <strong>Audio del vídeo</strong>
          <input ref={audioInputRef} className="audio-file-input" type="file" accept="audio/*,.mp3,.m4a,.wav" onChange={event => setAudioFile(event.target.files?.[0] || null)} />
          <div className="audio-file-row"><button className="audio-file-button" disabled={recording} onClick={() => audioInputRef.current?.click()}>{audioFile ? `♪ ${audioFile.name}` : '♪ Añadir pista de audio'}</button>{audioFile && <button className="audio-clear-button" disabled={recording} title="Quitar pista" onClick={() => { setAudioFile(null); if (audioInputRef.current) audioInputRef.current.value = ''; }}>×</button>}</div>
          <label className="microphone-option"><input type="checkbox" checked={recordMicrophone} disabled={recording} onChange={event => setRecordMicrophone(event.target.checked)} /> Grabar voz con el micrófono</label>
          <small>La pista y la voz se incluyen en el MP4. El navegador pedirá permiso para usar el micrófono.</small>
        </div>
        <div className="control-group"><div className="control-label"><span>Perspectiva de cámara</span><strong>{cameraView === 'top' ? 'Vertical' : 'A ras de suelo'}</strong></div><div className="segmented view-segmented"><button className={cameraView === 'top' ? 'on' : ''} onClick={() => setCameraView('top')}>⊙ Vertical</button><button className={cameraView === 'vehicle' ? 'on' : ''} onClick={() => setCameraView('vehicle')}>▰ A bordo</button></div><small className="view-note">Sin puntos de paso · vista baja simulada, no grabación interior real.</small></div>
        <div className="timeline"><div className="timeline-track"><div className="timeline-fill" style={{ width: `${progress * 100}%` }} /><span className="timeline-knob" style={{ left: `${progress * 100}%` }} /></div><div className="timeline-labels"><span>00:00</span><span>{Math.max(0, Math.round(totalDistance / 16 / speed))} s aprox.</span></div></div>
        <div className="control-group"><div className="control-label"><span>Velocidad</span><strong>{speed.toLocaleString('es-ES', { minimumFractionDigits: speed < 1 ? 1 : 0, maximumFractionDigits: 1 })}×</strong></div><div className="segmented speed-segmented">{SPEEDS.map(value => <button key={value} className={speed === value ? 'on' : ''} onClick={() => setSpeed(value)}>{value.toLocaleString('es-ES', { minimumFractionDigits: value < 1 ? 1 : 0, maximumFractionDigits: 1 })}×</button>)}</div></div>
        <div className="control-group"><div className="control-label"><span>Altura de cámara</span><strong>{height} m</strong></div><input type="range" min="50" max="500" step="10" value={height} onChange={event => setHeight(Number(event.target.value))} /></div>
        <div className="control-group orientation-row"><div><strong>Orientación dinámica</strong><small>La cámara gira con la trayectoria</small></div><button className={`switch ${follow ? 'on' : ''}`} onClick={() => setFollow(!follow)} aria-label="Alternar orientación"><span /></button></div>
        <div className="future-card"><span>✦</span><p><strong>Siguiente paso</strong><br />Marcadores de incidencias y notas.</p><span className="soon-tag">PRÓXIMAMENTE</span></div>
        <div className="sidebar-footer"><span>TRAZA 01</span><span>GUARDADO EN ESTE NAVEGADOR</span></div>
      </aside>
      <section className="map-panel">
        <div ref={mapNode} className="map-canvas" />
        {mapError && <div className="map-overlay"><div className="map-error"><strong>{mapProvider === 'mapbox' ? 'No se ha podido cargar Mapbox' : 'No se ha podido cargar la ortofoto'}</strong><p>{mapError}</p><small>{mapProvider === 'mapbox' ? 'Comprueba que el token público esté activo y que la cuenta permita cargar el estilo. También puedes volver a geoEuskadi.' : 'Comprueba la conexión a geoEuskadi y vuelve a intentarlo.'}</small></div></div>}
        <div className="map-top-tools"><button className="map-pill map-source-button" onClick={() => setMapSettingsOpen(!mapSettingsOpen)} aria-expanded={mapSettingsOpen}><span className="satellite-icon">▧</span><span>MAPA: {mapProvider === 'mapbox' ? 'MAPBOX' : 'GEOEUSKADI'}</span><span className="pill-divider" /><span>⚙</span></button><button className={`map-tool ${mode === 'add' ? 'active' : ''}`} onClick={() => { setMode(mode === 'add' ? 'select' : 'add'); setPlaying(false); }}><span>＋</span> Añadir punto</button><button className="map-tool offline-map-button" onClick={downloadOfflineArea} disabled={offlineDownloading || mapProvider === 'mapbox'} title={mapProvider === 'mapbox' ? 'La descarga offline está disponible con geoEuskadi' : ''}><span>⇩</span> {offlineDownloading ? 'Guardando zona…' : 'Guardar zona offline'}</button></div>
        {mapSettingsOpen && <div className="map-settings-card"><div className="map-settings-heading"><strong>Fuente del mapa</strong><button aria-label="Cerrar configuración del mapa" onClick={() => setMapSettingsOpen(false)}>×</button></div><div className="map-provider-options"><button className={mapProvider === 'geoEuskadi' ? 'selected' : ''} onClick={() => selectMapProvider('geoEuskadi')}>GeoEuskadi <small>Ortofoto de Euskadi · sin token</small></button><button className={mapProvider === 'mapbox' ? 'selected' : ''} onClick={() => { if (mapToken) selectMapProvider('mapbox'); }}>Mapbox Satellite <small>Imágenes satélite de Mapbox</small></button></div><label className="map-token-label" htmlFor="mapbox-public-token">Token público de Mapbox</label><input id="mapbox-public-token" className="map-token-input" type="text" autoComplete="off" spellCheck="false" placeholder="pk.…" value={mapTokenDraft} onChange={event => { setMapTokenDraft(event.target.value); setMapboxTokenError(''); }} /><small className="map-token-help">Usa un token público (pk.) con permisos styles:read y fonts:read. Se guarda en este navegador y se envía a Mapbox para cargar el mapa. No uses un token secreto (sk.).</small>{mapboxTokenError && <div className="mapbox-token-error" role="alert">{mapboxTokenError}</div>}<div className="map-settings-actions"><button onClick={clearMapboxToken} disabled={!mapToken && !mapTokenDraft}>Borrar token</button><button className="mapbox-apply-button" onClick={() => selectMapProvider('mapbox')}>Usar Mapbox</button></div></div>}
        {offlineMessage && <div className="offline-map-status" role="status">{offlineMessage}</div>}
        <div className="map-bottom-left"><span className="north">N</span><span className="scale-line" /><span>{mapProvider === 'mapbox' ? 'Mapbox Satellite · Bizkaia' : 'Ortofoto geoEuskadi · Bizkaia'}</span></div>
        {mapReady && <div className="map-hint">{mode === 'add' ? <><b>＋</b> Haz clic en el mapa para marcar el siguiente punto</> : <><b>⌘</b> Desplaza y acerca el mapa · Selecciona una ruta</>}</div>}
        {playing && <div className="flight-badge"><span className="pulse-dot" /> VUELO EN DIRECTO <span>·</span> {activeRoute?.name}</div>}
      </section>
    </section>
    {nameDialog && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setNameDialog(null); }}><form className="name-dialog" onSubmit={saveNameDialog}>
      <p className="eyebrow">{nameDialog.kind === 'route' ? 'TRAYECTORIA' : 'PROYECTO'}</p>
      <h2>{nameDialog.kind === 'project-new' ? 'Crear proyecto' : 'Cambiar nombre'}</h2>
      <label htmlFor="name-dialog-input">Nombre</label>
      <input id="name-dialog-input" autoFocus maxLength={60} value={nameDialog.value} onChange={event => setNameDialog(previous => ({ ...previous, value: event.target.value }))} placeholder="Escribe un nombre" />
      <div className="dialog-actions"><button type="button" onClick={() => setNameDialog(null)}>Cancelar</button><button type="submit" disabled={!nameDialog.value.trim()}>Guardar</button></div>
    </form></div>}
  </main>;
}
