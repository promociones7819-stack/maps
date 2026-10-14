# RaceBox Mini · Traza Bizkaia (`maps`)

Integración realizada sobre https://github.com/promociones7819-stack/maps.git, revisión `1bfcfcae2a4c14f78cd65a3d8079c6575021775c`, con integración de RaceBox Mini y revisión con vídeo. La aplicación web se publica en https://maps.promociones7819.workers.dev/. La instalación nativa iOS y la validación con un RaceBox físico siguen pendientes.

## Uso

La bienvenida ofrece Euskara / Castellano; euskera es el idioma inicial. Abre **GPX / Saioak** (en castellano, **Revisar recorrido GPX**). El panel RaceBox Mini permite crear/seleccionar alumno, conectar el Mini, iniciar sesión, marcar incidencias con un botón grande y finalizar. Se comprueba el modelo por Device Information y solo se acepta RaceBox Mini. Espera una solución GPS 3D válida y reciente para iniciar o marcar.

El mapa de Traza, con GeoEuskadi o Mapbox, muestra los segmentos del recorrido. El punto de vehículo se actualiza durante la sesión. Las incidencias usan posición/hora del último paquete, y no abren un formulario durante la práctica. Después puedes usar los formularios existentes para editar notas, eliminar incidencias y revisar el recorrido con el alumno. Guarda las modificaciones con **Guardar sesión** para actualizar el historial.

**Importar GPX** del panel añade puntos y segmentos; no inventa hora ni velocidad. El importador GPX original sigue disponible con sus funciones anteriores. **Editar punto** modifica coordenadas y hora UTC del punto indicado, actualizando las incidencias vinculadas. Guarda la revisión en una sesión de un alumno. El historial carga sesiones reales o GPX guardados; ⚠ identifica una sesión sin finalización (por ejemplo, cierre de la app). No reanuda automáticamente la grabación BLE.

GPX exporta recorrido e incidencias como waypoints. JSON exporta la revisión y el alumno seleccionado. **Exportar historial** incluye todos los alumnos y sesiones; **Importar historial** recupera ese formato sin sobrescribir sesiones con el mismo identificador. Las copias de Biblioteca y copias son el formato antiguo de proyectos y no incluyen las sesiones de IndexedDB: utiliza Exportar historial para ellas.

## iPad: arquitectura real

Safari iPadOS no ofrece Web Bluetooth. El botón Conectar muestra esta limitación y permite seguir usando GPX. No hay dispositivos de demostración ni conexión simulada.

Se ha generado el proyecto Capacitor `ios/App/App.xcodeproj`, con permiso Bluetooth y los plugins bluetooth-le (CoreBluetooth), Filesystem y Share. GPX/JSON del panel usan la hoja nativa para guardar o compartir archivos. En navegadores que ofrecen Web Bluetooth, el mismo adaptador puede utilizarlo; en iPad se necesita instalar esta app nativa.

```
npm ci
npm run build
npm run ios:sync
```

Abre el proyecto en Xcode completo, selecciona equipo de firma y un iPad, y compila. La PWA y el contenedor nativo tienen almacenamiento independiente: exporta/importa el historial para trasladar sesiones. El selector de idioma del flujo de prácticas está implementado; algunas herramientas antiguas de planificación, mapa y vídeo aún mantienen textos en castellano.

## Protocolo y almacenamiento

- Servicio UART `6e400001-b5a3-f393-e0a9-e50e24dcca9e`; notificaciones TX `6e400003-b5a3-f393-e0a9-e50e24dcca9e`.
- UBX little-endian, checksum, reensamblado de notificaciones fragmentadas o agrupadas y límite de tamaño. Datos FF/01 de 80 bytes. Coordenadas /10⁷; velocidad mm/s → km/h; precisión mm → m.
- Filtrado por 3D fix, fix válido y lat/lon válidos. Tiempo UTC GNSS; si falta fecha/hora válida se señala `timeSource: device`.
- Recepción hasta 25 Hz; registro aproximado a 5 Hz y actualización visual/guardado a 1 Hz. Marcar una incidencia conserva el paquete más reciente.
- Las pérdidas de más de dos segundos producen otro segmento, evitando dibujar una línea falsa a través del hueco. Reconexión manual conserva la sesión activa.
- IndexedDB almacena sesiones y posiciones. Los fallos de guardado detienen la grabación con aviso. Los proyectos y la revisión GPX antigua conservan su almacenamiento anterior; la sesión BLE no se duplica en localStorage.
- No se escriben comandos de configuración al Mini. Iniciar/finalizar controla la grabación en Traza. El Mini no tiene memoria de grabación autónoma; esa función corresponde al Mini S.

## Verificado y pendiente

Compilación web de producción y sincronización de los tres plugins en iOS correctas. El aviso de Vite sobre tamaño de los paquetes sigue presente por las bibliotecas cartográficas de la app.

Pruebas: `npm run test:racebox`, con `npm run dev -- --host 127.0.0.1` en puerto 5173. Incluyen el paquete oficial en todas las posiciones de fragmentación, checksum incorrecto, recuperación y paquetes agrupados. Chromium y WebKit: euskera inicial, importación GPX, alumno, historial, recarga, exportación, castellano y ausencia de desbordamiento horizontal en 834×1194. WebKit confirma que no se habilita una sesión sin conexión/GPS reales.

Pendientes: compilar/enlazar con SDK iOS, firma e instalación y prueba con Mini físico. Este Mac solo tiene Command Line Tools, sin Xcode completo. Las pruebas WebKit no equivalen a una prueba física de BLE ni verifican precisión GNSS. El fondo cartográfico utiliza los servicios existentes; su disponibilidad de red no se sustituye ni se simula.

La grabación requiere aplicación visible e iPad despierto. No se garantiza segundo plano o pantalla bloqueada. Si la app se cierra, solo se conservan los datos ya guardados (intervalo aproximado de un segundo). Mapas offline y vídeo MP4 mantienen las capacidades y límites previos; no se ha certificado grabación de vídeo en el contenedor iOS.

Límites de importación: GPX del nuevo panel 20 MB y 100.000 puntos; historial 50 MB y 1.000 sesiones. El importador nuevo admite trk/trkseg; el original conserva rutas rtept. Exporta copias periódicas: no existe sincronización de alumnos entre dispositivos.

## Fuentes

- [Protocolo oficial RaceBox, revisión 9](https://www.racebox.pro/products/mini-micro-protocol-documentation?k=67c166d0bda80de96505efba)
- [Especificaciones Mini / Mini S](https://www.racebox.pro/products/racebox-mini/tech-specs)
- [WebKit: Web Bluetooth iOS](https://bugs.webkit.org/show_bug.cgi?id=238049)
- [Puente BLE Capacitor](https://github.com/capacitor-community/bluetooth-le)
- [CoreBluetooth de Apple](https://developer.apple.com/documentation/corebluetooth)

## Telemetría y dashcam en la revisión

El panel del mapa muestra velocidad, fuerzas X/Y/Z en g, giro Z en °/s, rumbo, batería y precisión GPS. Se conservan los datos de acelerómetro y giroscopio recibidos del Mini con cada muestra guardada (aproximadamente 5 Hz en esta versión). No se detectan ni clasifican errores automáticamente. La velocidad de un GPX se estima entre puntos con horas válidas y se distingue con ≈; fuerzas y giros ausentes se muestran como —.

Los ejes corresponden al dispositivo: X longitudinal, Y lateral y Z vertical. Coloca el Mini con orientación conocida. **Fijar cero en reposo** resta la lectura de una muestra que tú hayas comprobado que corresponde al coche detenido. Esta corrección elimina un offset constante; no compensa cambios de inclinación, vibración ni orientación durante el trayecto. **Quitar cero** vuelve a datos brutos. Guarda la sesión para conservar la corrección. La recepción BLE y esa calibración siguen pendientes de validación física.

El reloj común usa las horas del track (incluyendo paradas), no una velocidad de cámara calculada a partir de la distancia. Las muestras repetidas admiten hora idéntica; tiempos ausentes o fuera de orden impiden la sincronización con vídeo. Se interpolan posiciones dentro de un segmento continuo; no se atraviesan los huecos entre segmentos. Un hueco GPS se señala y no admite marcar un punto crítico dentro de él. La barra anterior de la revisión y la nueva barra del mapa actúan sobre la misma posición.

### Añadir y alinear vídeo

1. Importa/carga una sesión y selecciona la grabación de dashcam en la ventana del mapa. Es una superposición dentro de Traza, no una ventana PiP del sistema operativo.
2. **Ajustar sincronización** pausa la reproducción y permite usar los controles del vídeo o introducir su segundo.
3. Coloca el cursor del recorrido en un instante reconocible y el vídeo en ese mismo momento; pulsa **Vincular este instante**. Se guarda la hora UTC correspondiente al fotograma cero.
4. Usa la barra común y el botón de reproducción. El vídeo respeta la velocidad seleccionada para revisar. Si la grabación no cubre el instante seleccionado se muestra «Sin vídeo para este instante».
5. **Punto crítico** conserva hora, posición y segundo del vídeo; completa el comentario después en la lista de incidencias existente. **Guardar sesión** guarda las incidencias, la referencia de vídeo y su sincronización en el historial del alumno.

La cabecera de la ventana permite arrastrarla con ratón o dedo, y ⤢ cambia su tamaño. La reproducción comienza silenciada. Los archivos de hasta 256 MB se intentan guardar localmente en IndexedDB como datos binarios; pueden recuperarse al volver a abrir la sesión. Si no hay espacio o el archivo es mayor, se reproduce directamente desde el archivo seleccionado y se avisa de que tendrás que seleccionarlo otra vez después de cerrar. Al volver a elegir el mismo nombre y tamaño se conserva el desfase guardado. Las copias JSON incluyen la referencia y el ajuste, no los bytes del vídeo: conserva también la grabación original para trasladarla a otro dispositivo.

Empieza con MP4 H.264. Otros contenedores/códecs dependen del navegador; se muestra un error si no se pueden reproducir. Solo se contempla un archivo de vídeo por sesión. No hay unión automática de clips de dashcam ni corrección de deriva del reloj mediante varios puntos de sincronización.

La reproducción en navegador no convierte archivos ni sube vídeos a servidores. El contenedor nativo iPad comparte la implementación, pero sigue pendiente la instalación y prueba en dispositivo real, especialmente con grabaciones largas y de alta resolución. «Vídeo final · MP4» abre una pantalla limpia con el vídeo original y los puntos críticos. Exporta el vídeo completo con su audio y avisos de cuatro segundos por incidencia, sin mapa ni interfaz de edición. Se conserva la proporción original hasta 1280×720, 30 fps, recodificando a H.264/AAC según soporte real del navegador. La exportación es en tiempo real: mantén la aplicación visible y la pantalla encendida; puedes cancelarla. Después pulsa Descargar MP4. No sube el vídeo al servidor. El montaje con mapa y telemetría sigue fuera de este flujo.

### Comprobaciones de esta ampliación

- `npm run test:racebox`: datos del paquete oficial, incluidos acelerómetro y giroscopio, y flujos de alumnos/GPX existentes.
- `npm run test:studio`: reloj GPS con tiempos irregulares/repetidos/ausentes y segmentos; Chromium y WebKit decodifican un MP4 H.264 de prueba, sincronizan, avanzan, guardan un punto crítico y recuperan el vídeo y ajuste tras recargar.
- Compilación de producción y sincronización iOS. El MP4 de colores de tests/fixtures es exclusivamente una entrada de prueba; no aparece en la aplicación de los usuarios ni representa una dashcam real.

- `npm run test:movie`: exportación real en Chromium y WebKit, contenedor MP4, duración, fotogramas visibles, audio audible decodificado, cancelación/reintento, descarga y sincronización de avisos.
