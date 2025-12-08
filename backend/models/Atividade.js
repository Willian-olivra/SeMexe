const mongoose = require('mongoose');

const AtividadeSchema = new mongoose.Schema({
    id_usuario: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    titulo: { type: String, required: true },
    esporte: { type: String, required: true },
    local: { type: String, required: true },
    data_hora: { type: Date, required: true },
    vagas: { type: Number, required: true },
    visibilidade: { 
        type: String, 
        enum: ['public', 'friends'], 
        default: 'public' 
    },
    participantes: [{
        usuario_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        data_inscricao: { type: Date, default: Date.now }
    }],
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Atividade', AtividadeSchema);