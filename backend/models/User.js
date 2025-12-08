const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    nome: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    senha: { type: String, required: true }, // Senha hash
    avatar: { type: String, default: 'fa-solid fa-user' },
    data_criacao: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);