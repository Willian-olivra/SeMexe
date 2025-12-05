const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
    // 1. Tenta pegar o token do Header
    const authHeader = req.headers['authorization'];
    
    // Se não tiver header, bloqueia
    if (!authHeader) {
        return res.status(401).json({ error: 'Acesso negado. Token não fornecido.' });
    }

    // 2. Limpa o token (remove a palavra "Bearer " se existir)
    const token = authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Acesso negado. Formato de token inválido.' });
    }

    try {
        // 3. Verifica o token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // 4. Adiciona os dados do usuário na requisição
        req.user = decoded; 
        
        // Opcional: Garante compatibilidade se algum código antigo usar req.userId
        req.userId = decoded.id; 

        next();
    } catch (err) {
        res.status(403).json({ error: 'Token inválido ou expirado.' });
    }
};