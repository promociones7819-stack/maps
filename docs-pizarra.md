# Pizarra didáctica

Abre **Trayectorias → Pizarra didáctica** desde la vista del lugar que quieras explicar. La pizarra abre un mapa independiente, inicialmente en esa misma posición, sin copiar ni modificar el proyecto.

- **Puntero:** resalta únicamente sobre el mapa. La vista permanece fija; los botones no se resaltan.
- **Mover mapa:** permite desplazar y acercar el mapa. **Coordenadas** sitúa un lugar exacto introduciendo latitud y longitud.
- **Trayectoria / Flecha:** dibuja trazos temporales; termina un recorrido antes de empezar otro. Cada flecha tiene inicio y final.
- **Señal:** utiliza el catálogo y los mismos gráficos que el resto de la aplicación, con destinos, direcciones, distancia y velocidad editables.
- **Semáforo:** coloca uno y púlsalo para pasar por rojo, ámbar y verde.
- **Punto conflictivo:** añade título y explicación, que se muestran en una tarjeta discreta arriba a la derecha.
- **Mover / editar:** arrastra señales y puntos conflictivos. Pulsa una señal para editarla o un trazo para mover sus vértices; pulsa un vértice para eliminarlo.
- **Borrar**, **Deshacer** y **Limpiar pizarra** permiten corregir la explicación. La limpieza se puede deshacer.
- **Salir de pizarra** solicita confirmación si hay elementos y los descarta. Al abrir de nuevo, la pizarra empieza vacía. La posición y los datos del proyecto original permanecen intactos.

No inicia grabación de audio ni vídeo ni escribe sus elementos en localStorage, IndexedDB, proyectos, biblioteca, carpetas o copias de seguridad. Está desactivada mientras se graba o se registra una clase en directo.

Verificación: `node tests/didactic-board.mjs`, `node tests/didactic-board-mobile.mjs` y `PACKAGED_APP=/ruta/app.asar node tests/desktop-board.mjs`. Las pruebas usan perfiles y documentos ficticios.
