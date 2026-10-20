# Autoguardado de RutasAD

Los cambios de trayectorias, señales, GPX e incidencias se conservan mientras se trabaja. La última pizarra, sus pasos, textos y trazos pendientes se recuperan al volver a abrir la aplicación. Esta recuperación es independiente de las explicaciones guardadas a mano; salir de pizarra confirmando descartar elimina su recuperación.

En Mac y Windows, el cierre normal espera a guardar los datos y finalizar una grabación activa antes de cerrar. Si falla la escritura, permanece abierta y muestra el error. La biblioteca sigue en Documentos/RutasAD/Biblioteca de recorridos.json y los vídeos en la carpeta elegida. Un cierre forzado del sistema o un corte eléctrico no permite finalizar un MP4 activo.

En Chrome, los cambios se guardan en el almacenamiento de la cuenta en ese navegador. Al cerrar una pestaña no se puede garantizar que termine una escritura asíncrona ni una grabación: se muestra el aviso del navegador si hay una captura activa o un fallo de guardado. Para conservar una grabación hay que finalizarla antes de cerrar Chrome. Los archivos originales continúan en sus carpetas y no se copian al autoguardado.

La carpeta seleccionada se actualiza durante el trabajo. Se reconecta al abrir si Chrome mantiene el permiso y la copia no cambió desde otro dispositivo. Si falta permiso, pulsa Reabrir carpeta. Una copia modificada externamente se conserva sin sobrescribir: hay que abrirla y revisar qué datos importar. El indicador de guardado permite reintentar errores de escritura. El autoguardado no sustituye a las copias de seguridad.

Validación: cierre y reapertura reales de Chromium; cierre de ventana y salida de Electron en Mac; última pulsación en pizarra, recuperación de GPX desde IndexedDB, finalización MP4, bloqueo del cierre ante fallo de disco, importación de copias y borrado completo de alumnos. El instalador Windows se genera con el mismo protocolo; no se ha ejecutado en Windows en esta máquina.
