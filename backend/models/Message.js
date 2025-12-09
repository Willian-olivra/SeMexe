const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    remetente: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', 
        required: true
    },
    // Destinatário agora é opcional (pode ser null se for chat de grupo)
    destinatario: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false 
    },
    // Novo campo para vincular à atividade
    atividade: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Activity',
        required: false
    },
    texto: { type: String, required: true },
    data_envio: { type: Date, default: Date.now },
    lida: { type: Boolean, default: false }
});

module.exports = mongoose.model('Mensagem', MessageSchema);