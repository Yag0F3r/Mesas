const bcrypt = require('bcrypt');
const User = require('./models/User');

async function listUsers() {
  return User.find({}, 'name role favorites');
}

async function getUserById(id) {
  return User.findById(id, 'name role favorites');
}

async function createUser({ name, password, role = 'user', favorites = [] }) {
  if (!name || !password) {
    throw new Error('name y password son obligatorios');
  }

  const existingUser = await User.findOne({ name });
  if (existingUser) {
    throw new Error('El nombre ya está registrado');
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({
    name: name.trim(),
    password: hashedPassword,
    role,
    favorites,
  });

  return user.save();
}

async function updateUser(id, { name, password, role, favorites }) {
  const user = await User.findById(id);
  if (!user) {
    throw new Error('Usuario no encontrado');
  }

  if (name && name.trim() !== user.name) {
    const existingUser = await User.findOne({ name: name.trim() });
    if (existingUser && existingUser._id.toString() !== id.toString()) {
      throw new Error('El nombre ya está registrado');
    }
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
