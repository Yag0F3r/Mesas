const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcrypt');
const path = require('path');
const dotenv = require('dotenv');
const User = require('./models/User');
const Table = require('./models/Table');
const Reservation = require('./models/Reservation');
const userService = require('./userService');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/tpk_mesa_auth';

mongoose
  .connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('MongoDB conectado'))
  .catch((err) => console.error('Error conectando a MongoDB:', err));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'clave-secreta-de-ejemplo',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: mongoUri }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24,
    },
  })
);

function requireAuth(req, res, next) {
  if (req.session.userId) {
    return next();
  }
  res.redirect('/login');
}

function requireAdmin(req, res, next) {
  if (req.session.userId && req.session.userRole === 'admin') {
    return next();
  }
  res.status(403).send('Acceso denegado. Se requieren permisos de administrador.');
}

app.get('/profile', requireAuth, (req, res) => {
  const adminLink = req.session.userRole === 'admin' ? '<a class="button" href="/admin">Panel de Admin</a>' : '';
  const favorites = req.session.userFavorites || [];
  const favoritesValue = favorites.join(', ');
  res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Perfil - TPK Mesa</title>
  <link rel="stylesheet" href="/style.css" />
</head>
<body>
  <main class="container">
    <h1>Bienvenido, ${req.session.userName}!</h1>
    <p>Has iniciado sesión correctamente.</p>
    <form action="/profile/update" method="post" style="margin-top: 24px; text-align: left;">
      <label for="name">Nombre</label>
      <input id="name" name="name" type="text" value="${req.session.userName}" required />
      <label for="favorites">Juegos favoritos</label>
      <input id="favorites" name="favorites" type="text" value="${favoritesValue}" placeholder="Catan, Azul, Carcassonne" />
      <p style="color: #cbd5e1; font-size: 0.95rem; margin-top: 4px;">Estos juegos se usarán como valores por defecto al reservar mesa.</p>
      <button type="submit">Guardar cambios</button>
    </form>
    <div style="margin-top: 24px; display: flex; gap: 12px; flex-wrap: wrap;">
      <a class="button" href="/tables">Ver Mesas Disponibles</a>
      ${adminLink}
      <a class="button" href="/logout">Cerrar sesión</a>
    </div>
  </main>
</body>
</html>`);
});

app.post('/register', async (req, res) => {
  const { name, password } = req.body;
  if (!name || !password) {
    return res.redirect('/register.html?error=Todos los campos son obligatorios');
  }

  const existingUser = await User.findOne({ name });
  if (existingUser) {
    return res.redirect('/register.html?error=El nombre ya está registrado');
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({ name, password: hashedPassword, role: 'user', favorites: [] });
  await user.save();

  req.session.userId = user._id;
  req.session.userName = user.name;
  req.session.userRole = user.role;
  req.session.userFavorites = user.favorites;
  res.redirect('/profile');
});

app.post('/login', async (req, res) => {
  const { name, password } = req.body;
  if (!name || !password) {
    return res.redirect('/login.html?error=Todos los campos son obligatorios');
  }

  const user = await User.findOne({ name });
  if (!user) {
    return res.redirect('/login.html?error=Nombre o contraseña incorrectos');
  }

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    return res.redirect('/login.html?error=Nombre o contraseña incorrectos');
  }

  req.session.userId = user._id;
  req.session.userName = user.name;
  req.session.userRole = user.role;
  req.session.userFavorites = user.favorites || [];
  res.redirect('/profile');
});

app.post('/profile/update', requireAuth, async (req, res) => {
  const { name, favorites } = req.body;
  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.redirect('/login.html?error=Usuario no encontrado');
    }

    user.name = name.trim() || user.name;
    const favoriteList = favorites
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    user.favorites = favoriteList;
    await user.save();

    req.session.userName = user.name;
    req.session.userFavorites = user.favorites;
    res.redirect('/profile');
  } catch (error) {
    console.error('Error actualizando perfil:', error);
    res.redirect('/profile?error=No se pudo actualizar el perfil');
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

app.get('/tables', requireAuth, async (req, res) => {
  const tables = await Table.find({});
  const favoriteGames = req.session.userFavorites || [];
  const defaultGame = favoriteGames[0] || '';
  
  const getIndicatorColor = (table, userRole) => {
    if (table.tableType === 'evento') return '#8b5cf6';
    if (table.currentPlayers >= table.maxPlayers) return '#ef4444';
    if (table.currentPlayers > 0) return '#f97316';
    return '#10b981';
  };

  const getIndicatorText = (table, userRole) => {
    if (table.tableType === 'evento') return 'Evento';
    if (table.currentPlayers >= table.maxPlayers) return 'Ocupado';
    if (table.currentPlayers > 0) return 'Sitio Libre';
    return 'Disponible';
  };

  const canReserve = (table, userRole) => {
    if (table.tableType === 'evento') return userRole === 'admin';
    return table.currentPlayers < table.maxPlayers;
  };

  const tablesHTML = tables.map(t => {
    const spotsAvailable = t.maxPlayers - t.currentPlayers;
    const isEmpty = t.currentPlayers === 0;
    const isPartiallyReserved = t.currentPlayers > 0 && t.currentPlayers < t.maxPlayers;
    const isFull = t.currentPlayers >= t.maxPlayers;
    const reservedByCurrentUser = t.reservedBy && t.reservedBy.toString() === req.session.userId;
    const canJoin = isPartiallyReserved && !reservedByCurrentUser && t.tableType !== 'evento';
    const canReserveTable = isEmpty && canReserve(t, req.session.userRole);
    const indicatorColor = getIndicatorColor(t, req.session.userRole);
    const indicatorText = getIndicatorText(t, req.session.userRole);
    
    return `
    <div class="table-card">
      <div class="table-header">
        <h3>Mesa ${t.tableNumber}</h3>
        <span class="status-badge" style="background: ${indicatorColor};">${indicatorText}</span>
      </div>
      <div class="table-info">
        <p><strong>Juego:</strong> ${t.game || 'Sin asignar'}</p>
        <p><strong>Nivel:</strong> ${t.level || 'Sin asignar'}</p>
        <p><strong>Jugadores:</strong> ${t.currentPlayers}/${t.maxPlayers}</p>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${(t.currentPlayers / t.maxPlayers) * 100}%"></div>
        </div>
      </div>
      ${canReserveTable ? `
        <div style="margin-top: 12px;">
          <form action="/reserve" method="post">
            <div style="margin-bottom: 10px;">
              <label for="game-${t._id}">Juego:</label>
              <input list="favorite-games-${t._id}" type="text" id="game-${t._id}" name="game" required placeholder="Ej: Catan" value="${defaultGame}" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #475569; background: #0f172a; color: #e2e8f0; box-sizing: border-box;">
              <datalist id="favorite-games-${t._id}">
                ${favoriteGames.map(game => `<option value="${game}"></option>`).join('')}
              </datalist>
            </div>
            <div style="margin-bottom: 10px;">
              <label for="level-${t._id}">Nivel:</label>
              <select id="level-${t._id}" name="level" required style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #475569; background: #0f172a; color: #e2e8f0; box-sizing: border-box;">
                <option value="">Selecciona nivel</option>
                <option value="Fácil">Fácil</option>
                <option value="Normal">Normal</option>
                <option value="Difícil">Difícil</option>
                <option value="Experto">Experto</option>
              </select>
            </div>
            ${t.tableType === 'disponible' ? `
              <div style="margin-bottom: 10px;">
                <label for="players-${t._id}">Jugadores:</label>
                <select id="players-${t._id}" name="numPlayers" required style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #475569; background: #0f172a; color: #e2e8f0; box-sizing: border-box;">
                  ${Array.from({length: spotsAvailable}, (_, i) => i + 1).map(n => `<option value="${n}">${n}</option>`).join('')}
                </select>
              </div>
            ` : '<input type="hidden" name="numPlayers" value="1">'}
            <input type="hidden" name="tableId" value="${t._id.toString()}">
            <button type="submit" class="button-small" style="width: 100%;">Reservar</button>
          </form>
        </div>
      ` : canJoin ? `
        <div style="margin-top: 12px;">
          <form action="/join" method="post">
            <input type="hidden" name="tableId" value="${t._id.toString()}">
            <button type="submit" class="button-small" style="width: 100%;">Unirse</button>
          </form>
        </div>
      ` : reservedByCurrentUser ? `
        <p style="color: #facc15; font-size: 0.9rem; margin-top: 12px;">Ya formas parte de esta mesa.</p>
      ` : `
        <p style="color: #ef4444; font-size: 0.9rem; margin-top: 12px;">${t.tableType === 'evento' ? 'Solo admin puede reservar eventos' : 'Mesa llena'}</p>
      `}
    </div>
  `;
  }).join('');

  res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Mesas - TPK Mesa</title>
  <link rel="stylesheet" href="/style.css" />
  <style>
    .tables-container {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
      margin: 20px 0;
    }
    .table-card {
      background: rgba(30, 41, 59, 0.5);
      border: 1px solid rgba(148, 163, 184, 0.18);
      border-radius: 12px;
      padding: 16px;
      transition: all 0.3s ease;
    }
    .table-card:hover {
      border-color: rgba(148, 163, 184, 0.3);
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.3);
    }
    .table-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .table-header h3 {
      margin: 0;
      font-size: 1.3rem;
    }
    .status-badge {
      padding: 4px 12px;
      border-radius: 20px;
      color: white;
      font-size: 0.85rem;
      font-weight: 600;
    }
    .table-info p {
      margin: 8px 0;
      font-size: 0.95rem;
    }
    .progress-bar {
      background: #0f172a;
      border-radius: 6px;
      height: 8px;
      overflow: hidden;
      margin-top: 8px;
    }
    .progress-fill {
      background: #2563eb;
      height: 100%;
      transition: width 0.3s ease;
    }
    .button-small {
      width: 100%;
      padding: 10px;
      background: #2563eb;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
    }
    .button-small:hover {
      background: #1d4ed8;
    }
  </style>
</head>
<body>
  <main class="container" style="max-width: 1200px;">
    <h1>Mesas Disponibles</h1>
    <p>Selecciona una mesa para reservar</p>
    <div class="tables-container">
      ${tablesHTML}
    </div>
    <a class="button" href="/profile" style="margin-top: 20px;">Volver al Perfil</a>
  </main>
</body>
</html>`);
});

app.post('/reserve', requireAuth, async (req, res) => {
  const { tableId, game, level, numPlayers } = req.body;
  const numPlayersInt = parseInt(numPlayers) || 1;
  
  try {
    const table = await Table.findById(tableId);
    if (!table) {
      return res.redirect('/tables?error=Mesa no encontrada');
    }

    // Validar permisos: solo admin para eventos
    if (table.tableType === 'evento' && req.session.userRole !== 'admin') {
      return res.redirect('/tables?error=Solo administradores pueden reservar eventos');
    }

    const spotsAvailable = table.maxPlayers - table.currentPlayers;
    if (spotsAvailable <= 0) {
      return res.redirect('/tables?error=Mesa llena, no hay sitios disponibles');
    }

    if (numPlayersInt > spotsAvailable) {
      return res.redirect('/tables?error=No hay suficientes sitios disponibles');
    }

    // Actualizar mesa con juego, nivel y jugadores
    table.game = game;
    table.level = level;
    table.currentPlayers += numPlayersInt;
    table.reservedBy = req.session.userId;
    await table.save();

    // Guardar registro de reserva en la base de datos
    const reservation = new Reservation({
      table: table._id,
      user: req.session.userId,
      game,
      level,
      numPlayers: numPlayersInt,
    });
    await reservation.save();

    res.redirect('/tables?success=Reserva realizada exitosamente');
  } catch (error) {
    console.error('Error al reservar:', error);
    res.redirect('/tables?error=Error al reservar la mesa');
  }
});

app.post('/join', requireAuth, async (req, res) => {
  const { tableId } = req.body;
  try {
    const table = await Table.findById(tableId);
    if (!table) {
      return res.redirect('/tables?error=Mesa no encontrada');
    }

    if (table.tableType === 'evento' && req.session.userRole !== 'admin') {
      return res.redirect('/tables?error=Solo administradores pueden unirse a eventos');
    }

    if (table.currentPlayers <= 0 || table.currentPlayers >= table.maxPlayers) {
      return res.redirect('/tables?error=Mesa no disponible para unirse');
    }

    if (table.reservedBy && table.reservedBy.toString() === req.session.userId) {
      return res.redirect('/tables?error=Ya formas parte de esta mesa');
    }

    table.currentPlayers += 1;
    await table.save();

    const reservation = new Reservation({
      table: table._id,
      user: req.session.userId,
      game: table.game,
      level: table.level,
      numPlayers: 1,
    });
    await reservation.save();

    res.redirect('/tables?success=Te has unido a la mesa');
  } catch (error) {
    console.error('Error al unirse:', error);
    res.redirect('/tables?error=Error al unirse a la mesa');
  }
});

app.post('/admin/toggle-event', requireAdmin, async (req, res) => {
  const { tableId } = req.body;
  try {
    const table = await Table.findById(tableId);
    if (!table) {
      return res.redirect('/admin?error=Mesa no encontrada');
    }
    
    table.tableType = table.tableType === 'evento' ? 'disponible' : 'evento';
    await table.save();
    
    res.redirect('/admin?success=Tipo de mesa actualizado');
  } catch (error) {
    console.error('Error al cambiar tipo:', error);
    res.redirect('/admin?error=Error al cambiar tipo de mesa');
  }
});

app.post('/admin/users/create', requireAdmin, async (req, res) => {
  const { name, password, role, favorites } = req.body;
  try {
    const favoritesList = favorites
      ? favorites
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      : [];

    await userService.createUser({
      name,
      password,
      role: role || 'user',
      favorites: favoritesList,
    });

    res.redirect('/admin?success=Usuario creado correctamente');
  } catch (error) {
    console.error('Error creando usuario:', error);
    res.redirect(`/admin?error=${encodeURIComponent(error.message)}`);
  }
});

app.get('/admin/user/edit/:id', requireAdmin, async (req, res) => {
  try {
    const user = await userService.getUserById(req.params.id);
    if (!user) {
      return res.redirect('/admin?error=Usuario no encontrado');
    }

    const favoritesValue = (user.favorites || []).join(', ');

    res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Editar Usuario - Admin</title>
  <link rel="stylesheet" href="/style.css" />
</head>
<body>
  <main class="container" style="max-width: 800px;">
    <h1>Editar usuario</h1>
    <form action="/admin/users/update" method="post" style="display: grid; gap: 16px;">
      <input type="hidden" name="userId" value="${user._id.toString()}" />
      <label>
        Nombre
        <input type="text" name="name" value="${user.name}" required />
      </label>
      <label>
        Rol
        <select name="role" required>
          <option value="user" ${user.role === 'user' ? 'selected' : ''}>Usuario</option>
          <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Administrador</option>
        </select>
      </label>
      <label>
        Contraseña (dejar en blanco para mantenerla)
        <input type="password" name="password" placeholder="Nueva contraseña" />
      </label>
      <label>
        Juegos favoritos
        <input type="text" name="favorites" value="${favoritesValue}" placeholder="Catan, Azul" />
      </label>
      <button type="submit" class="button">Guardar cambios</button>
    </form>
    <a class="button secondary" href="/admin" style="margin-top: 20px; display: inline-block;">Volver al panel</a>
  </main>
</body>
</html>`);
  } catch (error) {
    console.error('Error cargando usuario para editar:', error);
    res.redirect('/admin?error=Error al cargar el usuario');
  }
});

app.post('/admin/users/update', requireAdmin, async (req, res) => {
  const { userId, name, password, role, favorites } = req.body;
  try {
    const favoritesList = favorites
      ? favorites
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      : [];

    await userService.updateUser(userId, {
      name,
      password: password || undefined,
      role,
      favorites: favoritesList,
    });

    res.redirect('/admin?success=Usuario actualizado correctamente');
  } catch (error) {
    console.error('Error actualizando usuario:', error);
    res.redirect(`/admin?error=${encodeURIComponent(error.message)}`);
  }
});

app.post('/admin/users/delete', requireAdmin, async (req, res) => {
  const { userId } = req.body;
  try {
    if (req.session.userId === userId) {
      return res.redirect('/admin?error=No puedes eliminar tu propia cuenta desde el panel de admin');
    }

    await userService.deleteUser(userId);
    res.redirect('/admin?success=Usuario eliminado correctamente');
  } catch (error) {
    console.error('Error eliminando usuario:', error);
    res.redirect(`/admin?error=${encodeURIComponent(error.message)}`);
  }
});

app.get('/admin', requireAdmin, async (req, res) => {
  const users = await userService.listUsers();
  const tables = await Table.find({});
  const statusMessage = req.query.error
    ? `<p style="color: #f87171;">${req.query.error}</p>`
    : req.query.success
    ? `<p style="color: #4ade80;">${req.query.success}</p>`
    : '';
  
  const usersList = users.map(u => `<tr>
    <td>${u.name}</td>
    <td><span style="background: ${u.role === 'admin' ? '#dc2626' : '#2563eb'}; color: white; padding: 4px 12px; border-radius: 4px;">${u.role}</span></td>
    <td>${(u.favorites || []).join(', ') || '-'}</td>
    <td>
      <a href="/admin/user/edit/${u._id.toString()}" style="color: #38bdf8; text-decoration: underline; margin-right: 12px;">Editar</a>
      <form action="/admin/users/delete" method="post" style="display: inline; margin: 0;">
        <input type="hidden" name="userId" value="${u._id.toString()}" />
        <button type="submit" style="background: none; border: none; color: #f97316; cursor: pointer; text-decoration: underline; padding: 0;">Eliminar</button>
      </form>
    </td>
  </tr>`).join('');

  const tablesList = tables.map(t => `<tr>
    <td>Mesa ${t.tableNumber}</td>
    <td>${t.game || '-'}</td>
    <td>${t.level || '-'}</td>
    <td>${t.currentPlayers}/${t.maxPlayers}</td>
    <td><span style="background: ${t.tableType === 'evento' ? '#8b5cf6' : '#2563eb'}; color: white; padding: 4px 12px; border-radius: 4px;">${t.tableType === 'evento' ? 'Evento' : 'Disponible'}</span></td>
    <td>
      <form action="/admin/toggle-event" method="post" style="display: inline;">
        <input type="hidden" name="tableId" value="${t._id.toString()}">
        <button type="submit" style="background: none; border: none; color: #2563eb; cursor: pointer; text-decoration: underline; padding: 0;">
          ${t.tableType === 'evento' ? 'Normalizar' : 'Hacer Evento'}
        </button>
      </form>
      <form action="/admin/reset-table" method="post" style="display: inline; margin-left: 10px;">
        <input type="hidden" name="tableId" value="${t._id.toString()}">
        <button type="submit" style="background: none; border: none; color: #ef4444; cursor: pointer; text-decoration: underline; padding: 0;">Resetear</button>
      </form>
    </td>
  </tr>`).join('');
  
  res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Panel de Admin - TPK Mesa</title>
  <link rel="stylesheet" href="/style.css" />
  <style>
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #475569; font-size: 0.9rem; }
    th { background: #1e293b; font-weight: 600; }
    tr:hover { background: rgba(148, 163, 184, 0.1); }
    .form-grid { display: grid; gap: 16px; }
    .admin-card { background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 14px; padding: 20px; margin-top: 20px; }
    .admin-card label { display: block; font-size: 0.95rem; margin-bottom: 6px; }
    .admin-card input, .admin-card select { width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #475569; background: #0f172a; color: #e2e8f0; }
  </style>
</head>
<body>
  <main class="container" style="max-width: 1200px;">
    <h1>Panel de Administrador</h1>
    ${statusMessage}

    <section class="admin-card">
      <h2>Crear nuevo usuario</h2>
      <form action="/admin/users/create" method="post" class="form-grid">
        <label>
          Nombre
          <input type="text" name="name" required />
        </label>
        <label>
          Contraseña
          <input type="password" name="password" required />
        </label>
        <label>
          Rol
          <select name="role" required>
            <option value="user">Usuario</option>
            <option value="admin">Administrador</option>
          </select>
        </label>
        <label>
          Juegos favoritos
          <input type="text" name="favorites" placeholder="Catan, Azul, Carcassonne" />
        </label>
        <button type="submit" class="button">Crear usuario</button>
      </form>
    </section>

    <section class="admin-card">
      <h2>Usuarios registrados</h2>
      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Rol</th>
            <th>Favoritos</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${usersList}
        </tbody>
      </table>
    </section>

    <section class="admin-card">
      <h2>Mesas</h2>
      <table>
        <thead>
          <tr>
            <th>Mesa</th>
            <th>Juego</th>
            <th>Nivel</th>
            <th>Jugadores</th>
            <th>Tipo</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${tablesList}
        </tbody>
      </table>
    </section>

    <div style="margin-top: 30px; display: flex; gap: 12px; flex-wrap: wrap;">
      <a class="button" href="/profile">Volver al perfil</a>
      <a class="button secondary" href="/logout">Cerrar sesión</a>
    </div>
  </main>
</body>
</html>`);
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Servidor iniciado en http://localhost:${port}`);
});
