# RutasAD para Windows

Instalador de prueba 0.10.0: Windows 10/11 de 64 bits (procesadores Intel/AMD, x64). No admite Windows 7/8/8.1 ni Windows de 32 bits. ARM64 no se ha probado.

## Crear el instalador

Con Node.js y npm instalados, ejecutar `npm ci` y después `npm run package:win` en la raíz del repositorio. El archivo queda en `release/RutasAD-0.10.0-Windows-x64-Setup.exe` (el número sigue la versión de package.json). El icono Windows se incluye en el repositorio. No necesita las herramientas de iconos de macOS. electron-builder edita los recursos PE directamente y crea el instalador NSIS.

La instalación permite elegir carpeta y crear accesos directos. Es por usuario, sin exigir instalación para todos los usuarios. La desinstalación no elimina automáticamente los datos personales.

## Datos y traslado desde Mac

La aplicación resuelve la carpeta Documentos mediante el sistema operativo y utiliza su subcarpeta RutasAD. Si Windows redirige Documentos a OneDrive, también afecta a esta ubicación. La aplicación no decide si esa carpeta se sincroniza.

Trasladar la copia JSON y los GPX/vídeos originales. Las rutas absolutas de un Mac no funcionan en Windows: abrir la carpeta de los archivos desde Windows para volver a vincular el vídeo/GPX. Conservar siempre una copia original antes de migrar.

## Estado de verificación

El instalador se ha compilado desde macOS y se ha inspeccionado su contenido Windows x64. Esto no sustituye una instalación y ejecución reales en Windows. Antes de distribuirlo comercialmente, comprobar en Windows 10 y 11: instalación/arranque, mapas GeoEuskadi, micrófono y permisos, carpeta local, importar copia, GPX y vídeo real de 50 minutos, exportación MP4, reconexión RaceBox y desinstalación sin pérdida de datos. Verificar los códecs del vídeo usado; no prometer compatibilidad universal con HEVC.

Este instalador no tiene firma digital de editor: Windows puede mostrar una advertencia de SmartScreen. No es una versión certificada para venta. No incluye actualización automática ni control de suscripción de escritorio. El acceso web y su revocación no bloquean esta aplicación local.
