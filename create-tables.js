const mongoose = require('mongoose');
const Table = require('./models/Table');
require('dotenv').config();

const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/tpk_mesa_auth';

async function createTables() {
  try {
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Conectado a MongoDB');

    // Eliminar mesas existentes
    await Table.deleteMany({});
    console.log('Mesas anteriores eliminadas');

    const tablesData = [
      { tableNumber: 1, maxPlayers: 4, currentPlayers: 0, tableType: 'disponible' },
      { tableNumber: 2, maxPlayers: 5, currentPlayers: 0, tableType: 'disponible' },
      { tableNumber: 3, maxPlayers: 4, currentPlayers: 0, tableType: 'disponible' },
      { tableNumber: 4, maxPlayers: 4, currentPlayers: 0, tableType: 'disponible' },
      { tableNumber: 5, maxPlayers: 4, currentPlayers: 0, tableType: 'evento' },
      { tableNumber: 6, maxPlayers: 7, currentPlayers: 0, tableType: 'disponible' },
      { tableNumber: 7, maxPlayers: 4, currentPlayers: 0, tableType: 'disponible' },
      { tableNumber: 8, maxPlayers: 4, currentPlayers: 0, tableType: 'disponible' },
    ];

    await Table.insertMany(tablesData);
    console.log('Mesas creadas exitosamente');
    tablesData.forEach(t => {
      console.log(`Mesa ${t.tableNumber}: Tipo ${t.tableType} - ${t.currentPlayers}/${t.maxPlayers} jugadores`);
    });
  } catch (error) {
    console.error('Error creando mesas:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Conexión cerrada');
  }
}

createTables();
