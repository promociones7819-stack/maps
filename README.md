# Traza · Bizkaia

Aplicación web para diseñar cuatro recorridos aéreos, previsualizarlos y grabar un MP4. GeoEuskadi es la fuente inicial y funciona sin token. También se puede seleccionar Mapbox Satellite.

## Puesta en marcha

Requisitos: Node.js 20 o posterior.

```sh
npm install
npm run dev
```

Abre la dirección local que indique Vite. En Cloudflare, abre la dirección publicada de la aplicación. Hace falta conexión a internet para abrir la web y para descargar nuevas imágenes aéreas.

## Guardar una zona para trabajar sin conexión

1. Desplázate y acerca el mapa hasta encuadrar la zona que vas a grabar. Puedes seleccionar una trayectoria y pulsar **Enfocar** para centrarte en ella.
2. Pulsa **Guardar zona offline**. La aplicación guardará las imágenes aéreas de la zona visible y varios niveles de detalle en este navegador.
3. Espera el mensaje **Zona guardada sin conexión** antes de cerrar. Después, el mapa puede volver a mostrar esa zona sin internet, siempre que uses el mismo navegador y equipo.

La descarga está limitada a 1.800 imágenes por intento. Si la zona es demasiado grande, acércate más y descarga varias zonas por separado. Los mapas offline se guardan en el almacenamiento del navegador; borrar sus datos elimina las copias locales.

La aplicación web también guarda sus archivos básicos en el navegador para volver a abrirla sin conexión después de haberla visitado mientras había internet. Los mapas no descargados necesitarán conexión.

## Uso

- Cada proyecto empieza con cuatro trayectorias (A, B, C y D). Selecciona una para editarla, previsualizarla o grabar su vídeo.
- Pulsa **Añadir puntos en el mapa** y haz clic en la ortofoto para trazar la trayectoria. Arrastra puntos para recolocarlos y usa la papelera para eliminarlos.
- La vista vertical comienza a 120 m y mantiene la cámara directamente encima del vehículo. La altura se puede ajustar entre 50 y 500 m.
- En **Vídeo · Trayectoria**, elige dónde guardar el MP4 y pulsa **Grabar vídeo**. Cada trayectoria genera un archivo independiente cuyo nombre incluye el proyecto y la ruta.
- En **Audio del vídeo**, puedes añadir una pista, grabar voz con el micrófono o combinar ambas opciones. El navegador pedirá permiso antes de usar el micrófono.
- La vista “A bordo” es una simulación inclinada, no una grabación real desde el interior de un vehículo.

## Elegir Mapbox Satellite

1. En la esquina superior izquierda del mapa, pulsa **Mapa: GeoEuskadi**.
2. Pega tu token **público** de Mapbox (empieza por `pk.`) con el permiso público `styles:read` y pulsa **Comprobar y usar Mapbox**. La aplicación valida el acceso antes de cambiar el mapa y muestra el error de autorización que devuelva Mapbox. El token queda guardado solo en el almacenamiento local de ese navegador; no se incluye en el repositorio ni en la publicación de Cloudflare.
3. Si restringes el token por URL en Mapbox, permite el dominio de tu aplicación (`maps.promociones7819.workers.dev`) y el origen local de desarrollo (`localhost:5173`).
4. Para volver al mapa actual, abre la misma opción y pulsa **GeoEuskadi**. **Borrar token** elimina el token guardado y vuelve a GeoEuskadi.

Se aceptan únicamente tokens públicos. Nunca pegues un token secreto (`sk.`). Al seleccionar Mapbox, el navegador envía el token a los servidores de Mapbox para solicitar las imágenes satélite. El uso depende del plan, la facturación y los límites vigentes de tu cuenta. La descarga de zonas para uso sin conexión sigue disponible con GeoEuskadi.

## Datos cartográficos

La ortofoto por defecto procede del servicio WMTS oficial de geoEuskadi. Se muestra la atribución correspondiente y las teselas guardadas offline quedan almacenadas en la caché de este navegador. La opción Mapbox carga el estilo oficial `mapbox://styles/mapbox/satellite-v9` con Mapbox GL JS y requiere un token público.
