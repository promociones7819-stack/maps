import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import 'maplibre-gl/dist/maplibre-gl.css';
import 'mapbox-gl/dist/mapbox-gl.css';
import './styles.css';

if (import.meta.env.PROD && 'serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
