const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    nome: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    senha: { type: String, required: true },
    avatar: { type: String, default: 'fa-solid fa-user' },
    data_criacao: { type: Date, default: Date.now },

    // --- NOVOS CAMPOS PARA RECUPERAÇÃO DE SENHA ---
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date }
});

module.exports = mongoose.model('User', UserSchema);