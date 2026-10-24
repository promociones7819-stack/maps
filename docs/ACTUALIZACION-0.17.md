# RutasAD 0.17 — mejoras integradas sin cambiar la identidad

Origen comparado: RutasElorrieta / admobility26/elorrietatrack 8c63604, junto con la eliminación de licencias de promociones7819-stack/elorrietaTrack. Destino: promociones7819-stack/maps, sobre 04d5fae. Se han portado las diferencias funcionales; los componentes equivalentes y los recursos de identidad permanecen en RutasAD.

## Funciones añadidas
- Montaje de varios GPX y vídeos PIP por tramos; ordenar, quitar, sincronizar, recortar y conservar incidencias. Los originales no se modifican.
- Exportación rápida MP4 con WebCodecs, mapa fijo, posición en movimiento, datos, puntos críticos y audio original. Tiempo real sigue disponible para narración y pausa de imagen con audio continuo. La velocidad depende del equipo y del formato del vídeo, y la vía rápida requiere H.264/AAC compatible. No se suben vídeos a ningún servidor.
- Buscador explícito de municipios y calles, sin búsquedas por cada tecla. CartoCiudad / IGN, CC BY 4.0; requiere Internet.
- Marca de agua con el logo AD Mobility que ya tenía RutasAD; manual sin conexión en euskera y castellano, contacto e inicio desde el control de identidad.
- Licencias firmadas y vinculadas al equipo, uso sin conexión hasta 30 días, renovación, bloqueo, borrado definitivo con confirmación, identificador PC y PDF. EEM/PRE: una activación; ADMIN: varios equipos y sin caducidad. 00-00-0000 significa sin fecha límite.
- Accesos web con fecha de fin o permanentes. Se conservan los usuarios anteriores con acceso permanente hasta que el administrador cambie su fecha. Cambio de fecha invalida sesiones para volver a identificar el acceso.
- Preparación de dominio propio: `npm run domain -- nombre.example` solo muestra una propuesta; `--apply` hace copia y conexión escalonada conservando D1, firmante y workers.dev. Requiere iniciar sesión en la cuenta original y contratar/configurar previamente el dominio.

## Lo que se conserva
- Logo y archivos de icono de RutasAD, nombre RutasAD, appId com.traza.bizkaia y protocolo traza://.
- Documentos/RutasAD, perfil .datos-de-la-aplicacion, traza-bizkaia-*, IndexedDB traza-lessons, rutasad-project y rutasad-backup, ficha y alumnos existentes.
- Todos los módulos de RutasAD disponibles con licencia activa: no se ha sustituido la aplicación completa por la edición reducida de Elorrieta. Los campos de plan se conservan para la administración; no recortan los módulos ya existentes de RutasAD.
- GeoEuskadi, PNOA, OpenStreetMap y los proveedores opcionales Google/Mapbox. Las restricciones de exportación de Google y los avisos/cuotas anteriores siguen vigentes.
- Cuenta Cloudflare promociones7819, Worker maps, D1 rutasad-auth b4769b34-1321-4f6f-bfc4-74af49ff2713, usuarios/contraseñas/sesiones y aislamiento de cada cuenta. No se copian licencias, usuarios ni claves de Elorrieta.

## Publicación y administración
La migración aditiva `migrations/0001_access_licenses.sql` se aplica una sola vez mediante Wrangler; no se vuelve a sembrar el administrador. La firma se guarda únicamente como secreto LICENSE_PRIVATE_JWK. La clave pública está en electron/license-public.json. El material privado y una copia de recuperación de D1 se conservan fuera del repositorio, en RutasAD-Privado. Nunca versionar ni compartir esa carpeta.

El administrador web existente entra en Administración → Control de licencias para crear las claves. Los instaladores nuevos piden una licencia de RutasAD por primera vez; las claves de Elorrieta no sirven. No se han creado claves ni usuarios reales de prueba durante las verificaciones. Crear una licencia propia antes de actualizar el equipo de trabajo. El código no instala ni sustituye automáticamente la aplicación que el usuario tenga abierta.

El acceso web se gestiona por usuario y fecha; no requiere introducir una clave de escritorio. La licencia ADMIN no concede derechos de administrador de la web.

Los instaladores son para macOS Apple Silicon y Windows 10/11 x64; no están firmados comercialmente. No se ha probado el EXE en un PC físico. La aplicación móvil Capacitor conserva su arranque anterior; este trabajo no añade una activación nativa de licencias de iOS/Android.
