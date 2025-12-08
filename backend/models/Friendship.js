const mongoose = require('mongoose');

const FriendshipSchema = new mongoose.Schema({
    requester: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Quem pediu
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Quem recebeu
    status: { 
        type: String, 
        enum: ['pendente', 'aceito'], 
        default: 'pendente' 
    },
    data_amizade: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Friendship', FriendshipSchema);