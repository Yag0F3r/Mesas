const bcrypt = require('bcrypt');
const User = require('./models/User');

async function listUsers() {
  return User.find({}, 'name email role favorites');
}

async function getUserById(id) {
  return User.findById(id, 'name email role favorites');
}

async function createUser({ name, email, password, role = 'user', favorites = [] }) {
  if (!name || !email || !password) {
    throw new Error('name, email y password son obligatorios');
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new Error('El correo ya está registrado');
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password: hashedPassword,
    role,
    favorites,
  });

  return user.save();
}

async function updateUser(id, { name, email, password, role, favorites }) {
  const user = await User.findById(id);
  if (!user) {
    throw new Error('Usuario no encontrado');
  }

  if (email && email.trim().toLowerCase() !== user.email) {
    const existingUser = await User.findOne({ email: email.trim().toLowerCase() });
    if (existingUser && existingUser._id.toString() !== id.toString()) {
      throw new Error('El correo ya está registrado');
    }
    user.email = email.trim().toLowerCase();
  }

  if (name) {
    user.name = name.trim();
  }

  if (role) {
    user.role = role;
  }

  if (favorites) {
    user.favorites = Array.isArray(favorites)
      ? favorites.map((item) => item.trim()).filter(Boolean)
      : favorites
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);
  }

  if (password) {
    user.password = await bcrypt.hash(password, 10);
  }

  return user.save();
}

async function deleteUser(id) {
  const user = await User.findById(id);
  if (!user) {
    throw new Error('Usuario no encontrado');
  }

  return User.deleteOne({ _id: id });
}

module.exports = {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
};
