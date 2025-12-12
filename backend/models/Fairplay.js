const mongoose = require('mongoose');

const FairplaySchema = new mongoose.Schema({
    avaliador: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    avaliado: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    atividade: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Activity', 
        required: true 
    },
    // Critérios de avaliação
    compareceu: { type: Boolean, default: true }, // Se foi ao jogo
    respeito: { type: Number, min: 1, max: 5, required: true }, // 1 a 5 estrelas
    jogoLimpo: { type: Number, min: 1, max: 5, required: true }, // 1 a 5 estrelas
    comentario: { type: String, maxlength: 200 },
    
    data_avaliacao: { type: Date, default: Date.now }
});

// Garante que um usuário só avalie outro UMA vez por atividade
FairplaySchema.index({ avaliador: 1, avaliado: 1, atividade: 1 }, { unique: true });

module.exports = mongoose.model('Fairplay', FairplaySchema);