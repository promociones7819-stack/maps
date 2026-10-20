# PNOA en RutasAD

En MAPA → Fuente del mapa se puede elegir PNOA · IGN. Es una opción gratuita y sin clave. La elección se recuerda; no sustituye automáticamente las fuentes guardadas. Si geoEuskadi falla, Usar PNOA · gratuito permite cambiar directamente.

La fuente seleccionada se usa para el editor de trayectorias, la revisión GPX con PIP, las carátulas de biblioteca y la pizarra. Las grabaciones y exportaciones usan ese mismo fondo y conservan su atribución. Las coordenadas, señales, alumnos y proyectos no cambian al cambiar de fondo.

El servicio WMTS del IGN se utiliza con OI.OrthoimageCoverage, GoogleMapsCompatible y teselas JPEG. Esta denominación de matriz identifica una cuadrícula estándar y no implica utilizar imágenes ni servicios de Google Maps. Se muestra © Instituto Geográfico Nacional de España · PNOA · CC BY 4.0 ign.es.

El navegador mantiene una caché PNOA separada de la de geoEuskadi. En escritorio, las descargas nativas y su caché también están separadas. Las zonas no descargadas necesitan Internet.

Validación real: descargas JPEG del servicio oficial, mapa visible, pizarra, carátulas y persistencia en Chromium y WebKit; la misma prueba en Electron para Mac y grabación MP4 de pizarra. Windows se empaqueta con el mismo código, sin ejecución en una máquina Windows durante esta entrega. WebKit no sustituye una prueba física de todas las versiones de Safari/iPad.

Servicio oficial: https://www.ign.es/wmts/pnoa-ma?SERVICE=WMTS&REQUEST=GetCapabilities
Política de datos: https://www.ign.es/web/info-aviso-legal

## Posible integración de Google Maps

Google Maps JavaScript API permite superponer elementos propios. RutasAD ya guarda sus trazadas y señales separadas del mapa. Una integración necesitaría adaptar el motor de dibujo, las cámaras y la captura; un iframe por debajo no proporciona por sí solo esas funciones.

Serían necesarios una clave y facturación de Google Maps Platform. Los logotipos y atribuciones deben permanecer visibles. Tener una capa de edición propia no elimina las condiciones sobre contenido, caché, trazado de elementos del mapa o exportación. Las directrices de Google contemplan ciertos vídeos educativos con atribución, pero no equivalen a autorización general para las exportaciones automáticas de una aplicación comercial. Revisar el uso concreto antes de implementarlo. Google Maps no está integrado en esta versión.

Fuentes oficiales:
- https://developers.google.com/maps/documentation/javascript/customoverlays
- https://developers.google.com/maps/documentation/javascript/usage-and-billing
- https://cloud.google.com/terms/maps-platform/eea
- https://about.google/brand-resource-center/products-and-services/geo-guidelines/
