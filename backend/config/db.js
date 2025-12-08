const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // Ele busca o MONGO_URI lá do arquivo .env
        const conn = await mongoose.connect(process.env.MONGO_URI);
        
        console.log(`MongoDB Conectado: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Erro ao conectar no MongoDB: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;