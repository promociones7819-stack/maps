# Pizarra didáctica de RutasAD 0.10.0

Acceso: **Trayectorias → Pizarra didáctica**. Se abre un mapa propio en la posición actual. El proyecto y su grabación permanecen separados de la pizarra.

## Preparar una situación

- **Puntero** señala solo sobre el mapa. **Mover mapa** permite desplazar o acercar la vista; no se vuelve automáticamente al punto inicial. **Coordenadas** sitúa un lugar exacto.
- **Vehículos** coloca coches, autobuses, camiones, bicicletas o peatones. Pulsa en el mapa, arrastra el vehículo para recolocarlo y ajusta etiqueta, orientación y tamaño. La zona de observación es un cono orientativo con apertura regulable: no calcula obstáculos, oclusiones ni puntos ciegos reales.
- **Dibujar** conserva las trayectorias por puntos y las flechas originales. El selector incorpora trazo libre con ratón, dedo o lápiz, líneas rectas/discontinuas, círculos, rectángulos, áreas y flechas curvas. Color, grosor y opacidad son ajustables. Cada trazo se deshace como una sola acción. Las anotaciones quedan vinculadas al lugar del mapa.
- **Señales** utiliza el catálogo y los gráficos compartidos con el resto de la aplicación. Velocidad, destinos y direcciones siguen siendo editables. Cada semáforo se puede pulsar para cambiar entre rojo, ámbar, verde, ámbar intermitente y apagado, o editar con **Mover / editar**. Es posible mostrar u ocultar las señales en el paso actual.
- **Punto conflictivo**, **Mover / editar**, **Borrar**, **Deshacer** y **Limpiar pizarra** conservan su funcionamiento. Las trayectorias permiten mover y eliminar vértices.

## Explicar por pasos y animar

En **Explicar**, asigna nombre, pregunta y explicación al paso. **Duplicar y añadir paso** copia la situación para modificarla sin alterar el paso anterior. Se pueden adelantar, retrasar y eliminar pasos. **Anterior / Siguiente** cambia de escena sin desplazar la cámara. Hasta 20 pasos por explicación.

Para animar, dibuja una trayectoria por puntos o una flecha; selecciona un vehículo y elige **Trayectoria asignada**. Ajusta su duración. Cada vehículo tiene **Reproducir / Pausar** y **Reiniciar**, independientes. La animación recorre el trazo del profesor; no evalúa prioridades, velocidades de circulación ni corrección de la maniobra. La posición guardada de la escena es la que se coloca manualmente; la reproducción es una vista temporal y no reescribe la escena.

**Presentar** oculta las herramientas y mantiene mapa, pasos, controles de reproducción y la pregunta arriba a la derecha. **Mostrar explicación** revela la respuesta cuando el profesor lo decide. El puntero solo se resalta sobre el mapa. **Editar pizarra** recupera las herramientas.

## Guardado opcional y exportación

La pizarra comienza vacía y no se guarda automáticamente. **Guardar explicación** conserva nombre, ubicación, escenas y elementos en **Mis explicaciones**, separado de proyectos, alumnos y recorridos. Se pueden abrir, actualizar, guardar como nueva copia y eliminar casos. Hasta 60 casos, sujetos al espacio disponible del navegador. Salir solicita descartar la sesión; los casos guardados no se eliminan.

Los casos utilizan el almacenamiento de la cuenta activa en la web y se incluyen en las copias JSON generales. En escritorio y en Chrome con carpeta de datos conectada se incorporan a la biblioteca de datos a través del guardado existente. Al restaurar copias, conservar/actualizar también se aplica a las explicaciones. El JSON no sustituye a los vídeos o GPX originales.

**Exportar** genera PNG o PDF del paso actual con mapa, elementos, notas y la respuesta si se ha revelado. La exportación pausa el movimiento de los vehículos. Requiere mapa cargado y una fuente cartográfica que permita leer su imagen; conserva atribución. No exporta la animación como vídeo y no pide micrófono. PDF representa la composición como imagen.

## Verificación

- `node tests/board-model.mjs`: escenas independientes, reordenación, eliminación, deshacer, geometría y validación.
- `node tests/board-expanded.mjs`: vehículos y pausas independientes, dibujos, preguntas, guardado/recuperación, copias y exportaciones reales PNG/PDF.
- `node tests/didactic-board.mjs` y `node tests/didactic-board-mobile.mjs`: catálogo compartido, edición, mapa fijo y disposición en Chromium/WebKit.
- `node tests/desktop-board.mjs`: biblioteca original intacta en Electron.

La pizarra no inicia grabación de audio o vídeo. Continúa desactivada mientras se graba un recorrido o se registra una clase en directo.

## Fragmentos reales desde GPX

En **Revisar recorrido GPX → Recortar tramo → pizarra**, escribe inicio y final `mm:ss`. **Previsualizar tramo** reproduce mapa y vídeo con su sincronización actual y se detiene al final. Puedes pausar y ajustar los tiempos. Un GPX sin tiempos completos no permite esta función; los límites que caen en un hueco de GPS deben ajustarse.

**Crear fragmento** guarda otra entrada independiente en la biblioteca: copia las coordenadas, horas, telemetría e incidencias dentro del intervalo, con identificadores nuevos y sin asignación al alumno o a su clase. No modifica el proyecto ni los archivos originales. El vídeo se referencia, no se recodifica ni duplica: conserva su hora de sincronización original y sigue necesitando el archivo original en su carpeta. Si se mueve la carpeta, vuelve a abrirla. Los vídeos seleccionados temporalmente se pueden volver a seleccionar en la pizarra.

**Enviar a pizarra** abre una copia temporal del tramo, su trazada azul, las señales y los puntos críticos. El reproductor del tramo controla un indicador GPS independiente y el vídeo PIP. El mapa no sigue automáticamente al indicador: se mantiene disponible para explicar, dibujar alternativas y añadir vehículos o señales. **Guardar explicación** conserva el fragmento y sus referencias de vídeo junto a los pasos de la pizarra; las copias de seguridad incluyen estos datos, pero no el archivo de vídeo. Los PNG/PDF de pizarra siguen exportando mapa y elementos, no una película del vídeo PIP. Para MP4, abre el fragmento guardado desde la biblioteca y utiliza la exportación habitual del recorrido con PIP.

### Abrir una situación ya preparada

Desde **Trayectorias → Abrir trazadas en pizarra** se copian todas las trazadas no vacías del proyecto actual y sus señales o puntos conflictivos. Se conserva la vista del mapa. La copia tiene identificadores y objetos independientes: modificarla o descartarla no altera el proyecto de origen. La opción **Pizarra didáctica** continúa abriendo un mapa vacío.

**Mover mapa** está disponible en cualquier grupo de herramientas. Cambiar de herramienta conserva el trazo por puntos en curso; **Continuar trazo** vuelve a ese mismo trazo. También puedes volver a **Dibujar → Trayectoria**. Para empezar una trayectoria nueva, pulsa **Terminar trazo** antes de colocar el siguiente punto. Los cambios de paso o de explicación conservan su separación habitual.

## Grabación de las explicaciones en clase

La barra **Grabar clase** permite grabar la pizarra como MP4. Con **Voz del micrófono** activada se solicita permiso al comenzar; si se deniega, la grabación no empieza. Puede desactivarse explícitamente para vídeo sin voz. **Pausar imagen / Reanudar imagen** detiene y reanuda el vídeo del tramo y los vehículos, manteniendo la grabación de voz y el tiempo real de la clase; el puntero y las anotaciones siguen registrándose mientras explicas; **Finalizar y guardar MP4** cierra el archivo y libera el micrófono.

La captura compone el mapa, trazadas, señales, vehículos en movimiento, puntero sobre el mapa y vídeo PIP si lo hay. No graba los botones ni el escritorio. Añade el nombre, la pregunta y un extracto de las notas como pie, con atribución del mapa. Los textos completos siguen en la explicación editable y los PNG/PDF. La salida es de hasta 1280×720 a 15 fps; el vídeo PIP aporta imagen y la voz procede del micrófono (no se mezcla el audio de la dashcam). Cambiar de paso, dibujar, añadir señales y mover vehículos sigue disponible durante la grabación.

En Chrome y RutasAD se elige el archivo MP4 antes de comenzar y se escribe por bloques, sin acumular una clase de 50 minutos en memoria. En navegadores sin guardado directo, la descarga en memoria está limitada a cinco minutos. Al ocultar la ventana la grabación se pausa y requiere pulsar Reanudar. Se espera a que el mapa esté cargado antes de empezar; durante una recarga de teselas se conserva el último fotograma completo. No se mantiene una grabación si falla la escritura o se pierde el micrófono: se cancela el archivo parcial.

**Ver grabación** permite reproducir y descargar el MP4. Chrome recuerda el permiso del archivo cuando el navegador lo permite. En Mac, los archivos guardados en `Documentos/RutasAD/Vídeos MP4` se abren directamente. Si cambias de carpeta, equipo o navegador, vuelve a seleccionar el MP4 guardado. Las copias JSON incluyen la explicación y la referencia, no los bytes del vídeo.

### Guardar como otro proyecto de trayectoria

En **Exportar → Nombre del proyecto → Guardar como proyecto de trayectoria** se crea un proyecto independiente, accesible en Trayectorias y Biblioteca. Cada paso aporta sus trazadas y señales; además se conserva una copia completa de todos los pasos, vehículos, dibujos, preguntas y la referencia de la grabación. Desde el proyecto, **Reabrir explicación de clase** recupera esa pizarra completa. Los cambios del proyecto de trayectorias y los de la pizarra son copias independientes. Un nuevo guardado desde la pizarra crea otro proyecto y no sobrescribe el original.

PNG y PDF siguen disponibles. El menú Exportar también permite abrir o descargar el MP4 ya grabado. Las nuevas referencias se incluyen y validan al importar copias de seguridad.
