const mongoose = require('mongoose');

const tableSchema = new mongoose.Schema({
  tableNumber: {
    type: Number,
    required: true,
    unique: true,
  },
  game: {
    type: String,
    default: null,
  },
  level: {
    type: String,
    enum: ['Fácil', 'Normal', 'Difícil', 'Experto', null],
    default: null,
  },
  maxPlayers: {
    type: Number,
    required: true,
    default: 4,
  },
  currentPlayers: {
    type: Number,
    required: true,
    default: 0,
  },
  tableType: {
    type: String,
    enum: ['evento', 'disponible'],
    default: 'disponible',
  },
  reservedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Table', tableSchema);
