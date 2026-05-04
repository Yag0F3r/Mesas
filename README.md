# TPK Mesa

Proyecto de ejemplo para un sistema web de registro, login y reserva de mesas usando Node.js y MongoDB.

## Estructura del proyecto

- `server.js`
  - Servidor principal Express.
  - Configura conexión a MongoDB con Mongoose.
  - Gestiona sesiones con `express-session` y `connect-mongo`.
  - Define rutas de registro, inicio de sesión, logout, vista de perfil y lista de mesas.
  - Permite reservar mesas y guarda la reserva en la base de datos.
  - Incluye rutas de administración para cambiar el tipo de mesa y resetear mesas.

- `models/User.js`
  - Modelo Mongoose para los usuarios.
  - Campos: `name`, `email`, `password` y `role`.
  - El campo `role` se usa para distinguir entre usuarios normales y administradores.

- `models/Table.js`
  - Modelo Mongoose para las mesas.
  - Campos: `tableNumber`, `game`, `level`, `maxPlayers`, `currentPlayers`, `tableType`, `reservedBy` y `createdAt`.
  - `tableType` permite marcar mesas de tipo `evento` o `disponible`.

- `models/Reservation.js`
  - Modelo Mongoose para las reservas.
  - Guarda la relación entre `table` y `user`, además de `game`, `level`, `numPlayers` y `reservedAt`.

- `create-users.js`
  - Script de utilidad para crear usuarios de prueba en la base de datos.
  - Crea un usuario normal y un admin con credenciales predeterminadas.

- `create-tables.js`
  - Script de utilidad para inicializar las mesas en la base de datos.
  - Crea varias mesas con estado inicial y tipos (`disponible` / `evento`).

- `public/index.html`
  - Página de inicio pública.
  - Enlaces de acceso a registro e inicio de sesión.

- `public/register.html`
  - Formulario de registro.
  - Envía datos a `POST /register`.

- `public/login.html`
  - Formulario de inicio de sesión.
  - Envía datos a `POST /login`.

- `public/style.css`
  - Estilos globales para la aplicación.
  - Diseña formularios, botones, tarjetas de mesa y la interfaz general.

- `.env.example`
  - Ejemplo de configuración del entorno.
  - Variables: `MONGODB_URI` y `SESSION_SECRET`.

- `.env`
  - Archivo de configuración real usado por el proyecto.
  - Debe contener la URL de MongoDB y la clave de sesión.

- `.gitignore`
  - Ignora `node_modules/` y archivos de entorno local como `.env`.

## Scripts disponibles

- `npm install`
  - Instala las dependencias del proyecto.

- `npm start`
  - Inicia el servidor con Node.js.

- `npm run dev`
  - Inicia el servidor con `nodemon` para recarga automática.

- `npm run create-users`
  - Crea usuarios de prueba en MongoDB.

- `npm run create-tables`
  - Inicializa las mesas en la base de datos.

## Funcionamiento básico

1. Configura MongoDB y copia `.env.example` a `.env`.
2. Ejecuta `npm install`.
3. Ejecuta `npm run create-users` para crear usuarios.
4. Ejecuta `npm run create-tables` para crear mesas.
5. Inicia la app con `npm start`.
6. Abre `http://localhost:3000`.

## Roles y permisos

- Usuario normal:
  - Puede registrarse e iniciar sesión.
  - Puede reservar mesas disponibles.
  - Al reservar, debe indicar juego y nivel.

- Admin:
  - Además de las acciones de usuario normal, puede reservar mesas de tipo `evento`.
  - Tiene acceso a un panel de administración para cambiar mesas y resetearlas.

## Notas

- Las reservas se guardan en la colección `reservations`.
- Cada reserva incluye el usuario, la mesa, el juego, el nivel de dificultad, la cantidad de jugadores y la fecha de reserva.
