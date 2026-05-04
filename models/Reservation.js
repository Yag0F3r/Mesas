const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
  table: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Table',
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  game: {
    type: String,
    required: true,
  },
  level: {
    type: String,
    enum: ['Fácil', 'Normal', 'Difícil', 'Experto'],
    required: true,
  },
  numPlayers: {
    type: Number,
    required: true,
    min: 1,
  },
  reservedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Reservation', reservationSchema);
