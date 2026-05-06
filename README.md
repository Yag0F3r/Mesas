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
  - Campos: `name`, `password` y `role`.
  - El campo `role` se usa para distinguir entre usuarios normales y administradores.
  - El `name` es único y se usa como identificador para login.

- `userService.js`
  - Servicio con funciones reutilizables para listar, crear, editar y eliminar usuarios.
  - Centraliza la lógica de validación y hash de contraseñas.

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

## Flujo de reservas

- **Mesas vacías:** Muestran formulario completo para reservar (seleccionar juego, nivel y número de jugadores).
- **Mesas con reserva iniciada:** Muestran solo el juego y nivel (no editables) con botón "Unirse" para que otros usuarios se unan hasta completar la mesa.
- **Mesas llenas:** Muestran mensaje "Mesa llena".
- **Mesas de evento:** Solo pueden ser reservadas por administradores.

## Roles y permisos

- Usuario normal:
  - Puede registrarse e iniciar sesión.
  - Puede iniciar reservas en mesas vacías (seleccionando juego, nivel y número de jugadores).
  - Puede unirse a mesas ya reservadas por otros usuarios (solo botón "Unirse").
  - Al reservar, debe indicar juego y nivel.

- Admin:
  - Además de las acciones de usuario normal, puede reservar mesas de tipo `evento`.
  - Tiene acceso a un panel de administración en `/admin` donde puede:
    - crear nuevos usuarios,
    - editar usuarios existentes,
    - eliminar usuarios,
    - cambiar el tipo de mesa (`disponible` / `evento`),
    - resetear mesas.

## Credenciales de prueba

- **Usuario admin:**
  - Email: `admin@example.com`
  - Contraseña: `admin123`

- **Usuario de prueba:**
  - Email: `test@example.com`
  - Contraseña: `test123`

- **Usuario Juan Pérez:**
  - Email: `juan@example.com`
  - Contraseña: `user123`
  - Juegos favoritos: Catan, Azul

- **Usuario María García:**
  - Email: `maria@example.com`
  - Contraseña: `user456`
  - Juegos favoritos: Ticket to Ride, Wingspan
