const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/User');
require('dotenv').config();

const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/tpk_mesa_auth';

async function createTestUsers() {
  try {
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Conectado a MongoDB');

    // Eliminar usuarios existentes
    await User.deleteMany({ email: { $in: ['test@example.com', 'admin@example.com'] } });
    console.log('Usuarios anteriores eliminados');

    // Usuario de prueba
    const testUserPassword = await bcrypt.hash('test123', 10);
    const testUser = new User({
      name: 'Usuario Prueba',
      email: 'test@example.com',
      password: testUserPassword,
      role: 'user',
    });
    await testUser.save();
    console.log('Usuario de prueba creado: test@example.com / test123');

    // Usuario admin
    const adminPassword = await bcrypt.hash('admin123', 10);
    const adminUser = new User({
      name: 'Administrador',
      email: 'admin@example.com',
      password: adminPassword,
      role: 'admin',
    });
    await adminUser.save();
    console.log('Usuario admin creado: admin@example.com / admin123');

    console.log('Usuarios creados exitosamente');
  } catch (error) {
    console.error('Error creando usuarios:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Conexión cerrada');
  }
}

createTestUsers();