import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';

const COLORS = ['#e36b4d', '#477bda', '#35a17e', '#a271c5', '#d2a33c'];
const SPEEDS = [0.1, 0.2, 0.3, 0.4, 0.5, 1, 2];
const START = [-2.9352, 43.2631];
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
  const [savedToken, setSavedToken] = useState(() => {
    try { return localStorage.getItem('traza-bizkaia-mapbox-token') || ''; } catch { return ''; }
  });
  const [tokenInput, setTokenInput] = useState(savedToken);
  const [tokenMessage, setTokenMessage] = useState('');
  const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || savedToken;
  const mapNode = useRef(null), mapRef = useRef(null), routesRef = useRef([]), activeRef = useRef('');
  const progressRef = useRef(0), rafRef = useRef(0), lastFrameRef = useRef(0);
  const recorderRef = useRef(null), chunksRef = useRef([]), folderRef = useRef(null), recordFrameRef = useRef(0);
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
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState('');
  const [progress, setProgress] = useState(0);
  const [recording, setRecording] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [exportMessage, setExportMessage] = useState('');
  const [nameDialog, setNameDialog] = useState(null);
  const modeRef = useRef(mode);
  const dragRef = useRef(null);

  const activeRoute = routes.find(route => route.id === activeId) || routes[0];
  const totalDistance = useMemo(() => activeRoute?.points.slice(1).reduce((sum, p, i) => sum + distance(activeRoute.points[i], p), 0) || 0, [activeRoute]);

  const saveMapboxToken = event => {
    event.preventDefault();
    const value = tokenInput.trim();
    if (!value.startsWith('pk.')) {
      setTokenMessage('El token público debe empezar por pk.');
      return;
    }
    try { localStorage.setItem('traza-bizkaia-mapbox-token', value); } catch { /* Keep the token for this session if storage is unavailable. */ }
    setSavedToken(value);
    setTokenMessage('Token guardado en este navegador.');
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
    if (!token || !mapNode.current || mapRef.current) return;
    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: mapNode.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      center: START,
      zoom: 10.1,
      pitch: 0,
      attributionControl: false,
      cooperativeGestures: true,
      preserveDrawingBuffer: true,
    });
    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl({ showCompass: true }), 'top-right');
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right');
    map.on('load', () => {
      map.addSource('route-lines', { type: 'geojson', data: lineFeatureCollection(routesRef.current, activeRef.current) });
      map.addLayer({ id: 'routes-outline', type: 'line', source: 'route-lines', paint: { 'line-color': '#101b22', 'line-width': ['case', ['get', 'active'], 7, 5], 'line-opacity': 0.68, 'line-blur': 1.5 } });
      map.addLayer({ id: 'routes-line', type: 'line', source: 'route-lines', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': ['get', 'color'], 'line-width': ['case', ['get', 'active'], 4, 2.5], 'line-opacity': ['case', ['get', 'active'], 1, 0.68] } });
      map.addSource('route-points', { type: 'geojson', data: pointFeatureCollection(routesRef.current, activeRef.current) });
      map.addLayer({ id: 'route-points-layer', type: 'circle', source: 'route-points', filter: ['!', ['has', 'vehicle']], paint: { 'circle-radius': ['case', ['get', 'active'], 7, 5], 'circle-color': ['get', 'color'], 'circle-stroke-color': '#fff', 'circle-stroke-width': 2 } });
      map.addLayer({ id: 'vehicle-halo', type: 'circle', source: 'route-points', filter: ['has', 'vehicle'], paint: { 'circle-radius': 12, 'circle-color': '#fff', 'circle-opacity': 0.35 } });
      map.addLayer({ id: 'vehicle-point', type: 'circle', source: 'route-points', filter: ['has', 'vehicle'], paint: { 'circle-radius': 7, 'circle-color': ['get', 'color'], 'circle-stroke-color': '#fff', 'circle-stroke-width': 2 } });
      setMapReady(true);
    });
    map.on('error', event => { if (event.error?.message) setMapError(event.error.message); });
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
    return () => { cancelAnimationFrame(rafRef.current); map.remove(); mapRef.current = null; };
  // Map lifetime is tied to the token; event handlers read current state through refs below.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

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
  const exportVideo = () => {
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
      const attribution = mapRef.current.getContainer().querySelector('.mapboxgl-ctrl-attrib-inner')?.innerText?.replace(/\s+/g, ' ').trim() || '© Mapbox';
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
      const mimeType = ['video/mp4;codecs="avc1.42E01E"', 'video/mp4;codecs=avc1', 'video/mp4'].find(type => MediaRecorder.isTypeSupported(type));
      if (!mimeType) {
        cancelAnimationFrame(recordFrameRef.current);
        stream.getTracks().forEach(track => track.stop());
        mapRef.current.setLayoutProperty('route-points-layer', 'visibility', 'visible');
        setExportMessage('Este navegador no puede grabar en MP4. Usa Safari actualizado para exportar el vídeo.');
        return;
      }
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      recorderRef.current = recorder;
      recorder.ondataavailable = event => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onerror = () => { cancelAnimationFrame(recordFrameRef.current); setExportMessage('La grabación falló. Inténtalo de nuevo.'); setRecording(false); setPlaying(false); };
      recorder.onstop = async () => {
        cancelAnimationFrame(recordFrameRef.current);
        stream.getTracks().forEach(track => track.stop());
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
        offset: vehicleView ? [0, mapRef.current.getContainer().clientHeight * 0.22] : [0, 0],
        bearing: vehicleView ? start.bearing : 0,
        pitch: vehicleView ? 74 : 0,
        zoom: vehicleView ? Math.max(19.3, Math.min(20.5, 21.4 - Math.log2(height / 100))) : Math.max(15.5, Math.min(19.2, 18.2 - Math.log2(height / 100))),
      });
      recorder.start(1000);
      setRecording(true);
      setPlaying(true);
      setExportMessage('Grabando el recorrido. Se guardará automáticamente al llegar al final.');
    } catch {
      cancelAnimationFrame(recordFrameRef.current);
      setRecording(false);
      setPlaying(false);
      if (mapRef.current?.getLayer('route-points-layer')) mapRef.current.setLayoutProperty('route-points-layer', 'visibility', 'visible');
      setExportMessage('No se pudo iniciar la grabación MP4. Comprueba que Safari esté actualizado e inténtalo de nuevo.');
    }
  };
  const focusRoute = route => {
    if (!route?.points.length || !mapRef.current) return;
    const bounds = route.points.reduce((b, coord) => b.extend(coord), new mapboxgl.LngLatBounds(route.points[0], route.points[0]));
    mapRef.current.fitBounds(bounds, { padding: 100, maxZoom: 16, duration: 800 });
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
        ? Math.max(19.3, Math.min(20.5, 21.4 - Math.log2(height / 100)))
        : Math.max(15.5, Math.min(19.2, 18.2 - Math.log2(height / 100)));
      map.easeTo({
        center: position.coords,
        offset: vehicleView ? [0, map.getContainer().clientHeight * 0.22] : [0, 0],
        bearing: vehicleView ? position.bearing : 0,
        pitch: vehicleView ? 74 : 0,
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

  const togglePlayback = () => {
    if (!activeRoute || activeRoute.points.length < 2) return;
    if (progressRef.current >= 1) progressRef.current = 0;
    setPlaying(value => !value);
  };

  return <main className="app-shell">
    <header className="topbar">
      <div className="brand"><div className="brand-mark"><span /><span /><span /></div><div><div className="brand-name">TRAZA<span> / BIZKAIA</span></div><div className="brand-subtitle">Estudio de recorridos aéreos</div></div></div>
      <div className="topbar-right"><span className="map-status"><i className={mapReady ? 'status-dot ready' : 'status-dot'} />{mapReady ? 'Mapa satélite' : token ? 'Conectando al mapa' : 'Falta configurar Mapbox'}</span><button className="icon-button" title="Centrar en Bizkaia" onClick={() => mapRef.current?.flyTo({ center: START, zoom: 10.1, pitch: 0, bearing: 0, duration: 900 })}><span className="crosshair">⌖</span></button></div>
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
          <button className="restart-button" title="Volver al inicio" onClick={() => { progressRef.current = 0; setProgress(0); if (activeRoute?.points[0]) { const vehicleView = cameraView === 'vehicle'; mapRef.current?.flyTo({ center: activeRoute.points[0], zoom: vehicleView ? Math.max(19.3, Math.min(20.5, 21.4 - Math.log2(height / 100))) : Math.max(15.5, Math.min(19.2, 18.2 - Math.log2(height / 100))), pitch: vehicleView ? 74 : 0, bearing: vehicleView ? interpolateRoute(activeRoute.points, 0).bearing : 0, duration: 700 }); } }}>↺</button>
        </div>
        <div className="video-card">
          <div className="video-card-heading"><strong>Vídeo · {activeRoute?.name}</strong><span>MP4</span></div>
          <div className="video-actions"><button className="folder-button" onClick={chooseOutputFolder}>▰ {folderName || 'Elegir carpeta…'}</button><button className="export-button" disabled={!recording && (!folderName || !activeRoute || activeRoute.points.length < 2)} onClick={exportVideo}>{recording ? '■ Finalizar y guardar' : '● Grabar vídeo'}</button></div>
          <small>{exportMessage || (folderName ? `Se guardará en «${folderName}».` : 'Selecciona una trayectoria y elige dónde guardar su vídeo MP4.')}</small>
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
        {!token && <div className="map-overlay setup-overlay"><div className="setup-card"><div className="setup-symbol">⌖</div><p className="eyebrow">CONFIGURACIÓN INICIAL</p><h2>Conecta tu mapa de Mapbox</h2><p>El token solo se guarda en este navegador. Pega aquí tu token público de Mapbox para cargar el mapa y empezar a trazar.</p><form className="token-form" onSubmit={saveMapboxToken}><label htmlFor="mapbox-token">Token público de Mapbox</label><input id="mapbox-token" type="password" autoComplete="off" placeholder="pk.…" value={tokenInput} onChange={event => setTokenInput(event.target.value)} /><button type="submit" disabled={!tokenInput.trim()}>Conectar mapa</button>{tokenMessage && <small role="status">{tokenMessage}</small>}</form><div className="token-note"><span>🔒</span> Usa un token <strong>público</strong> que empieza por pk. Nunca pegues aquí uno secreto que empieza por sk.</div></div></div>}
        {token && mapError && !mapReady && <div className="map-overlay"><div className="map-error"><strong>No se ha podido cargar el mapa</strong><p>{mapError}</p><small>Comprueba el token y la conexión a internet.</small></div></div>}
        <div className="map-top-tools"><div className="map-pill"><span className="satellite-icon">▧</span><span>SATÉLITE</span><span className="pill-divider" /><span>3D</span></div><button className={`map-tool ${mode === 'add' ? 'active' : ''}`} onClick={() => { setMode(mode === 'add' ? 'select' : 'add'); setPlaying(false); }}><span>＋</span> Añadir punto</button></div>
        <div className="map-bottom-left"><span className="north">N</span><span className="scale-line" /><span>Mapa · Bizkaia</span></div>
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
