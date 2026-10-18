# Acceso web de RutasAD

La web usa sesiones del servidor y una base D1 exclusiva para accesos. No almacena alumnos, vídeos ni recorridos en D1. Mac y Capacitor conservan el arranque local sin identificación web.

- Administrador: alta manual por correo y contraseña/PIN de 8–128 caracteres, bloqueo, reactivación, restablecimiento y eliminación. No hay registro público ni correo automático.
- Cookies HttpOnly, Secure, SameSite=Strict, tokens aleatorios guardados solo como SHA-256, caducidad de siete días. Mutaciones exigen el mismo Origin. Contraseñas PBKDF2-SHA256 con sal aleatoria, 100.000 iteraciones (límite del runtime de Workers).
- API comprueba sesión/rol en cada solicitud. Bloqueo, cambio de contraseña y eliminación invalidan sesiones. La UI comprueba acceso cada 15 segundos y al recuperar el foco; un fallo de conexión también bloquea la web. Se necesita conexión para iniciar y mantener la sesión web.
- Intentos de acceso limitados por IP y correo, persistidos en D1 (15 por 15 minutos). El administrador no se elimina ni bloquea desde el panel; puede cambiar su contraseña.
- El Worker se ejecuta antes de servir los archivos. Solo el arranque, login y actualizador del service worker son públicos. El código de la aplicación y la ficha requieren sesión. El service worker elimina las antiguas cachés de la app y conserva únicamente las teselas públicas de ortofoto.
- Cada UUID de cuenta tiene un espacio separado de localStorage, sessionStorage, IndexedDB y permisos de carpeta recordados, también en la ficha incrustada y las copias. No hay sincronización entre equipos. Es separación funcional en un navegador: no es cifrado de los archivos locales frente a alguien con acceso al perfil del navegador o al disco.
- Los datos históricos sin cuenta se ofrecen solamente al administrador de ese navegador. La importación confirmada sustituye las claves de esa cuenta por las anteriores y asigna las bases históricas sin duplicar vídeos grandes ni borrar originales. Otras cuentas empiezan vacías. Las copias/importaciones explícitas siguen permitiendo compartir si el propietario así lo decide.
- Una cuenta eliminada pierde el acceso; sus archivos originales, copias y datos del navegador no se borran remotamente. Recrear el mismo correo asigna un UUID nuevo y una biblioteca vacía.

## Preparación de otra instalación

Crear D1, aplicar `server/schema.sql`, añadir el binding AUTH y sembrar el administrador con un hash generado por `passwordHash` de `server/password.js`. No incluir contraseñas reales en código, SQL versionado, variables VITE ni archivos públicos. La inicialización real se realiza con SQL temporal privado fuera del repositorio y se elimina después. El administrador y todos los usuarios posteriores se conservan en D1 entre despliegues.

## Verificación local

1. `npm run build`
2. `wrangler d1 execute rutasad-auth --local --file server/schema.sql`
3. `node scripts/seed-auth-test.mjs` y ejecutar **solo en local** el SQL temporal indicado en ese script. Contiene exclusivamente credenciales ficticias y reinicia el estado de pruebas.
4. `wrangler dev --port 8787` (un runtime antiguo puede requerir `--compatibility-date 2026-09-17`).
5. `node tests/web-access.mjs`

El test cubre creación en el panel, errores de acceso, control de rol y Origin, aislamiento de datos en el mismo navegador y en la ficha, creación de alumno/clase, exportación de copia, bloqueo/activación/cambio de PIN/eliminación, revocación de sesiones y límite de intentos. Las demás pruebas de la app usan Vite en local sin activar la puerta de acceso de producción.
