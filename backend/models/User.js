const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    nome: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    senha: { type: String, required: true },
    avatar: { type: String, default: 'fa-solid fa-user' },
    data_criacao: { type: Date, default: Date.now },

    resetPasswordToken: String,
    resetPasswordExpires: Date,
    twoFactorCode: String,
    twoFactorExpires: Date,

    fairplayNota: { type: Number, default: 5 }, // Começa com 5 (neutro/bom)
    fairplayQtd: { type: Number, default: 0 },   // Quantas vezes foi avaliado
    faltas: { type: Number, default: 0 },         // Quantas vezes marcou e não foi

    bio: { type: String, maxlength: 200, default: '' },
    cidade: { type: String, default: '' },
    instagram: { type: String, default: '' },
    esportes: [{ type: String }], // Array de strings: ['Futebol', 'Vôlei']
});

module.exports = mongoose.model('User', UserSchema);