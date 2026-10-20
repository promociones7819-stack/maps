# Carga de geoEuskadi en escritorio

La versión de escritorio sirve las imágenes del mapa mediante su protocolo local y la conexión de red de Electron. El renderer deja de depender de que geoEuskadi acepte el origen traza://app en CORS. Las comprobaciones TLS y la seguridad del navegador permanecen activadas.

Solo se aceptan coordenadas de tesela válidas, de zoom 0 a 20, en una ruta fija del servidor oficial. No se admite una URL de destino enviada por la página. Las imágenes descargadas se conservan en la carpeta interna cache-ortofoto, dentro de Documentos/RutasAD/.datos-de-la-aplicacion. La caché se limita a unos 256 MB y se reutiliza aunque el servidor esté temporalmente inaccesible.

Cada descarga tiene un límite de tiempo y un segundo intento. Reintentar mapa reconstruye el mapa conservando su vista y las trazadas. La carga nativa, la caché y la recuperación se verifican en Electron contra un servidor de prueba sin cabeceras CORS, además de las pruebas de captura WebGL y cierre con grabación. Durante el diagnóstico el servicio real presentó también conexiones agotadas y respuestas vacías, por lo que no se puede garantizar la disponibilidad de teselas que aún no se hayan descargado.
