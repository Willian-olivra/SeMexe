const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    remetente: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Nome do seu model de Usuário (ajuste se for 'Usuario')
        required: true
    },
    destinatario: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    texto: {
        type: String,
        required: true
    },
    data_envio: {
        type: Date,
        default: Date.now
    },
    lida: {
        type: Boolean,
        default: false
    }
});

module.exports = mongoose.model('Mensagem', MessageSchema);