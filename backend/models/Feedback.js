const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema({
    nome: String,
    email: String,
    mensagem: String,
    data_envio: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Feedback', FeedbackSchema);