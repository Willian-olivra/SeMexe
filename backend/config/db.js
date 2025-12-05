// config/db.js
const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // A string de conexão muda (ex: mongodb://localhost:27017/se_mexe)
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/se_mexe');
        console.log('MongoDB Conectado!');
    } catch (err) {
        console.error('Erro ao conectar no MongoDB:', err.message);
        process.exit(1);
    }
};

module.exports = connectDB;