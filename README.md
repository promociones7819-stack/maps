# Traza · Bizkaia

Aplicación web para diseñar cuatro recorridos aéreos, previsualizarlos y grabar un MP4. El mapa usa ortofotografía oficial de geoEuskadi y no necesita token ni cuenta de Mapbox.

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

## Datos cartográficos

La ortofoto procede del servicio WMTS oficial de geoEuskadi. Se muestra la atribución **Eusko Jaurlaritza / Gobierno Vasco · geoEuskadi**. Al descargar una zona offline, sus teselas quedan almacenadas en la caché de este navegador.
