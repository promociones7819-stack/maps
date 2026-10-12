# Traza · Bizkaia

Aplicación web para diseñar cuatro recorridos aéreos, previsualizarlos y grabar un MP4. GeoEuskadi es la fuente inicial y funciona sin token. También se puede seleccionar Mapbox Satellite.

## Puesta en marcha

Requisitos: Node.js 20 o posterior.

```sh
npm install
npm run dev
```

Abre la dirección local que indique Vite. En Cloudflare, abre la dirección publicada de la aplicación. Hace falta conexión a internet para abrir la web y para descargar nuevas imágenes aéreas.

## Instalar en Mac

Descarga `Traza-Bizkaia-0.1.0-arm64.dmg`, ábrelo y arrastra **Traza Bizkaia** a **Aplicaciones**. Está preparado para Mac con Apple Silicon, incluido M5. La primera vez, si macOS bloquea la app porque no está firmada por un desarrollador registrado, haz clic derecho sobre ella en Aplicaciones, elige **Abrir** y confirma.

La aplicación de escritorio guarda la biblioteca automáticamente en `Documentos/Traza Bizkaia/`:

- `Biblioteca de recorridos.json`: proyectos, trayectorias, señales, notas, preferencias y recorridos GPX editados.
- `Archivos GPX/`: copias de los archivos GPX originales que importes.
- `Vídeos MP4/`: vídeos grabados desde la aplicación.

Pulsa **Abrir carpeta de datos** en **Biblioteca y copias** para ver esos archivos. Haz copias de esa carpeta para conservar o trasladar todo el trabajo. Los MP4 y GPX originales se guardan como archivos separados para que la biblioteca siga siendo ligera.

Para llevar los proyectos de la versión web al Mac, abre la web en el mismo navegador donde los guardaste, pulsa **Descargar copia** en **Biblioteca y copias**, abre la app de escritorio e importa ese archivo con **Importar copia**. La copia transfiere los proyectos y sus datos; los MP4 descargados anteriormente y los GPX originales deben copiarse manualmente a sus respectivas carpetas dentro de `Documentos/Traza Bizkaia/`.

## Guardar una zona para trabajar sin conexión

1. Desplázate y acerca el mapa hasta encuadrar la zona que vas a grabar. Puedes seleccionar una trayectoria y pulsar **Enfocar** para centrarte en ella.
2. Pulsa **Guardar zona offline**. La aplicación guardará las imágenes aéreas de la zona visible y varios niveles de detalle en este navegador.
3. Espera el mensaje **Zona guardada sin conexión** antes de cerrar. Después, el mapa puede volver a mostrar esa zona sin internet, siempre que uses el mismo navegador y equipo.

La descarga está limitada a 1.800 imágenes por intento. Si la zona es demasiado grande, acércate más y descarga varias zonas por separado. Los mapas offline se guardan en el almacenamiento del navegador; borrar sus datos elimina las copias locales.

La aplicación web también guarda sus archivos básicos en el navegador para volver a abrirla sin conexión después de haberla visitado mientras había internet. Los mapas no descargados necesitarán conexión.

## Uso

- Cada proyecto empieza con cuatro trayectorias (A, B, C y D). Selecciona una para editarla, previsualizarla o grabar su vídeo.
- El selector **Trayectorias / Revisar recorrido GPX** separa la planificación de rutas de la revisión de una clase real. En **Revisar recorrido GPX**, importa el archivo grabado durante la conducción; la línea y las notas se guardan por proyecto sin modificar las cuatro trayectorias.
- Pulsa **Marcar un error en el mapa**, elige el lugar del recorrido y escribe un título y una nota correctiva. Puedes editar o eliminar cada incidencia. Las marcas de tiempo del GPX, si existen y el punto marcado está cerca de la traza, se conservan como referencia.
- Reproduce la revisión con la cámara siguiendo el GPS, ajusta la velocidad y desplaza la posición con la barra. **Grabar revisión** crea un MP4 de la vista cartográfica y muestra cada nota al llegar a su punto; el GPX aporta posiciones, no imágenes de una cámara del vehículo.
- Pulsa **Añadir puntos en el mapa** y haz clic en la ortofoto para trazar la trayectoria. Arrastra puntos para recolocarlos y usa la papelera para eliminarlos.
- En **Puntos conflictivos**, añade una señal del catálogo a la trayectoria activa y colócala con un clic en el mapa. La primera selección incluye preseñalización de destinos (S-220a), salida inmediata (S-350), STOP, ceda el paso, señales de advertencia, paso peatonal, velocidad máxima y semáforo. En las señales de dirección puedes cambiar los destinos, sus flechas y la distancia; añade también una explicación para el alumnado.
- Los puntos conflictivos se guardan con el proyecto y la trayectoria. Puedes editarlos, reubicarlos o eliminarlos. Si está activada la opción **Mostrar durante el vídeo**, la señal y la explicación aparecen en el MP4 cuando la cámara pasa cerca del punto.
- La vista vertical comienza a 120 m y mantiene la cámara directamente encima del vehículo. La altura se puede ajustar entre 50 y 500 m.
- En **Vídeo · Trayectoria**, elige dónde guardar el MP4 y pulsa **Grabar vídeo**. Cada trayectoria genera un archivo independiente cuyo nombre incluye el proyecto y la ruta.
- En **Audio del vídeo**, puedes añadir una pista, grabar voz con el micrófono o combinar ambas opciones. El navegador pedirá permiso antes de usar el micrófono.
- Puedes escribir una narración por trayectoria y elegir español o euskera para reproducirla con una voz disponible en Safari/macOS. La lista depende de las voces instaladas en el equipo. Si no hay voz de euskera disponible, la aplicación lo indica y no la sustituye por una voz inglesa. Safari reproduce la voz sincronizada, pero no permite incorporarla directamente al MP4; para que el archivo tenga audio, añade una pista de audio o activa el micrófono.
- La vista “A bordo” es una simulación inclinada, no una grabación real desde el interior de un vehículo.

## Elegir Mapbox Satellite

1. En la esquina superior izquierda del mapa, pulsa **Mapa: GeoEuskadi**.
2. Pega tu token **público** de Mapbox (empieza por `pk.`) con los permisos públicos `styles:read` y `fonts:read` y pulsa **Usar Mapbox**. El mapa usa el estilo oficial `mapbox://styles/mapbox/satellite-streets-v12`. El token queda guardado solo en el almacenamiento local de ese navegador; no se incluye en el repositorio ni en la publicación de Cloudflare.
3. Si restringes el token por URL en Mapbox, permite el dominio de tu aplicación (`maps.promociones7819.workers.dev`) y el origen local de desarrollo (`localhost:5173`).
4. Para volver al mapa actual, abre la misma opción y pulsa **GeoEuskadi**. **Borrar token** elimina el token guardado y vuelve a GeoEuskadi.

Se aceptan únicamente tokens públicos. Nunca pegues un token secreto (`sk.`). Al seleccionar Mapbox, el navegador envía el token a los servidores de Mapbox para solicitar las imágenes satélite. El uso depende del plan, la facturación y los límites vigentes de tu cuenta. La descarga de zonas para uso sin conexión sigue disponible con GeoEuskadi.

## Datos cartográficos

La ortofoto por defecto procede del servicio WMTS oficial de geoEuskadi. Se muestra la atribución correspondiente y las teselas guardadas offline quedan almacenadas en la caché de este navegador. La opción Mapbox carga el estilo oficial `mapbox://styles/mapbox/satellite-streets-v12` con Mapbox GL JS y requiere un token público.
