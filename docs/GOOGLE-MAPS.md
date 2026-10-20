# Google Maps opcional en RutasAD

GeoEuskadi sigue siendo el proveedor inicial gratuito y PNOA la alternativa gratuita. MapLibre GL JS ya es el motor del mapa; no requiere activar Google. OpenStreetMap está integrado como mapa de calles gratuito en el mapa principal, revisión GPX/PIP y pizarra. Se recuerda la fuente elegida; no se cambia automáticamente a proveedores de pago.

La opción Google usa Map Tiles API (2D satélite), no Maps JavaScript / Dynamic Maps. Cada centro introduce su propia clave en MAPA > Google Maps. No hay clave compartida en el código. Se guarda solo en el perfil local, fuera de las copias de proyectos. La comprobación crea una sesión real, pero no lee ni verifica cuotas o facturación de Cloud.

Controles: 2.500 intentos/día UTC y 90.000/mes UTC por perfil; aviso al 80 %, reserva previa a la petición, coordinación entre pestañas con Web Locks. Alcanzar el límite impide nuevas peticiones de imágenes. Una autorización explícita añade 500 al margen diario y mensual. No altera las cuotas de Cloud. Google Map Tiles requiere una restricción compatible por IP; una restricción de sitio web no basta. Si la red cambia de IP hace falta revisar la autorización o un puente seguro del centro (no incluido). Google debe tener una cuota global propia (guía: 3.000/día) y clave restringida. El contador local no garantiza un coste cero, no mide otros dispositivos y puede borrarse al limpiar el perfil.

Google no se ofrece offline ni para exportar/grabar imágenes: se conservan esas funciones con PNOA, GeoEuskadi y OpenStreetMap. La atribución del viewport permanece visible. Carátulas con Google u OSM seleccionado usan PNOA y se identifican como tal. Las peticiones de sesión y viewport no consumen el cupo local de imágenes. No se guarda Google en el caché offline de la aplicación.

## Validación de esta entrega

- Compilación Vite correcta.
- `node tests/osm-maps.mjs`: Chromium, WebKit y Electron Mac, con imágenes locales de prueba: mapa, pizarra, atribución visible, PNG con atribución, cambio de fuente sin alterar la trayectoria, persistencia, carátulas PNOA y ausencia de peticiones Google. Una petición identificada al servidor público OSM devolvió PNG real de 12.830 bytes. No se realizan barridos de OSM para las pruebas.
- OSM usa la caché HTTP normal, sin descarga de zonas ni precarga de biblioteca. El cliente nativo envía User-Agent RutasAD y la web conserva el origen de referencia sin enviar rutas o consultas a otros sitios. El servicio comunitario no ofrece SLA comercial.
- `node tests/google-maps.mjs`: sesión, imágenes y atribución con API interceptada; límites concurrentes, bloqueo sin nuevas imágenes, autorización, contador inválido y regreso a PNOA. **No demuestra funcionamiento con una cuenta real**.
- PNOA real comprobado en Chromium, WebKit y Electron Mac: imágenes, pizarra, carátulas y MP4.
- Asignaciones a alumnos y copias de seguridad comprobadas.
- Grabación WebGL sin fotogramas negros comprobada; prueba de límites ampliada con consentimiento y conservación de la configuración anterior ante una clave rechazada.
- Instaladores 0.16.0 generados. Contenido de ambos paquetes comparado con los archivos probados; DMG verificado y aplicación Mac empaquetada comprobada en entorno aislado. EXE x64 generado, sin prueba de ejecución en Windows.
- `node tests/map-web-policy.mjs`: origen de referencia para mapas externos y protección de la aplicación privada y API de administración.
- Pendiente introducir una clave real en la interfaz, comprobar sus restricciones (web y escritorio por separado), imágenes nuevas y el consumo en Google Cloud. No se han modificado cuentas ni cuotas de Google automáticamente.

El manual PDF adjunto detalla la configuración y la entrega comercial. No debe prometerse Google ilimitado, exportación de sus imágenes ni un tope económico global basado en el contador local.
