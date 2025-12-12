const mongoose = require('mongoose');

const ActivitySchema = new mongoose.Schema({
    titulo: { type: String, required: true },
    esporte: { type: String, required: true },
    local: { type: String, required: true },
    data_hora: { type: Date, required: true },
    vagas: { type: Number, required: true },
    visibilidade: { type: String, enum: ['public', 'friends'], default: 'public' },
    

    criador: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    
    // Array de IDs de quem vai jogar
    participantes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
});

module.exports = mongoose.model('Activity', ActivitySchema);