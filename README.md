# Traza · Bizkaia

Herramienta local para crear proyectos de recorridos aéreos sobre cartografía real de Mapbox, previsualizar el vuelo y grabarlo como vídeo.

## Requisitos

- Node.js 20 o posterior.
- Un token **público** de Mapbox (`pk.…`). La aplicación usa el estilo satélite con etiquetas `mapbox://styles/mapbox/satellite-streets-v12`.

## Puesta en marcha en macOS

1. Abre la aplicación publicada y pega el token público en la pantalla de conexión. Se guardará en ese navegador para las siguientes visitas.
2. Para desarrollo local, también puedes copiar `.env.example` como `.env.local` y sustituir el texto de ejemplo por tu token público:

   ```env
   VITE_MAPBOX_ACCESS_TOKEN=pk.tu_token_publico
   ```

   No incluyas espacios después de `=`. En la consola de Mapbox, restringe el token a los orígenes donde usarás la aplicación. No uses un token secreto con prefijo `sk.`.

3. En Terminal, entra en esta carpeta y ejecuta:

   ```sh
   npm install
   npm run dev
   ```

4. Abre en el navegador la dirección local que indique Vite (normalmente `http://localhost:5173`). Si Safari bloquea la dirección HTTP por tener activado “Solo HTTPS”, abre la dirección en otro navegador o desactiva esa opción para la dirección local. Si cambias `.env.local`, detén y vuelve a iniciar `npm run dev`.

## Uso

- El mapa comienza centrado en Bizkaia. Usa rueda/pellizco para zoom, arrastra para desplazarte y los controles del mapa para girar o inclinar.
- Pulsa **Añadir puntos en el mapa** y haz clic sobre la imagen para trazar la trayectoria activa. Pulsa el botón otra vez para volver a navegar por el mapa.
- Crea un proyecto con **+** junto al nombre; la aplicación te pedirá un nombre. Si tienes varios proyectos, usa el selector para cambiar entre ellos. Los proyectos y sus rutas se conservan en ese navegador.
- El proyecto incluye cuatro trayectorias independientes (A, B, C y D), cada una con su color. Selecciona una en la lista para editarla o reproducirla; las cuatro pueden verse a la vez.
- Selecciona un punto y usa el icono de papelera para quitarlo. Arrastra un punto para recolocarlo. **Enfocar** ajusta el mapa a una trayectoria.
- Reproduce cualquier trayectoria con dos puntos o más. La vista vertical empieza a 120 m, mantiene la cámara directamente encima del vehículo y permite ajustar la altura entre 50 y 500 m.
- Elige una cámara vertical sobre el vehículo o una perspectiva baja orientada según la trayectoria. Los puntos de paso se ocultan durante la reproducción.
- Selecciona una trayectoria y, en **Vídeo · Trayectoria**, pulsa **Elegir carpeta** y **Grabar vídeo**. Cada recorrido se guarda como `.mp4` con el nombre del proyecto y de esa trayectoria. Puedes parar antes con **Finalizar y guardar**. La grabación MP4 requiere un navegador que la admita, como Safari actualizado.
- Si el navegador no permite elegir carpetas, el vídeo se descargará en la carpeta de descargas configurada en el navegador.
- Las rutas se guardan en el almacenamiento local del navegador de ese equipo.

## Alcance de esta V1

El vídeo exportado captura la vista del mapa e incluye la atribución cartográfica. La vista baja es una simulación de cámara inclinada sobre el mapa, no vídeo ni imágenes reales desde el interior de un vehículo. La estructura de los datos separa las trayectorias y deja sitio para incorporar marcadores de incidencias (STOP, semáforo, peligro) y textos.

## Estructura

- `src/App.jsx`: estado del proyecto, edición cartográfica y simulación.
- `src/styles.css`: interfaz adaptable para escritorio.
- `.env.local`: configuración privada local (ignorada por Git).
