const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    remetente_id: {
        type: mongoose.Schema.Types.ObjectId, // Link para um User
        ref: 'User',
        required: true
    },
    destinatario_id: {
        type: mongoose.Schema.Types.ObjectId, // Link para um User
        ref: 'User',
        required: true
    },
    mensagem: {
        type: String,
        required: true
    },
    data_envio: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Message', MessageSchema);