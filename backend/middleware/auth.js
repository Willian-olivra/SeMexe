const jwt = require('jsonwebtoken');

/**
 * Middleware de autenticação JWT
 * Verifica se o token é válido e extrai o ID do usuário
 */
const authMiddleware = (req, res, next) => {
    // Pega o token do header Authorization
    // Formato esperado: "Bearer TOKEN_AQUI"
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ error: 'Token não fornecido. Faça login primeiro.' });
    }

    // Separa "Bearer" do token
    const parts = authHeader.split(' ');

    if (parts.length !== 2) {
        return res.status(401).json({ error: 'Formato de token inválido.' });
    }

    const [scheme, token] = parts;

    // Verifica se o esquema é "Bearer"
    if (!/^Bearer$/i.test(scheme)) {
        return res.status(401).json({ error: 'Token mal formatado.' });
    }

    try {
        // Verifica e decodifica o token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Adiciona o ID do usuário na requisição para uso posterior
        req.userId = decoded.id;
        req.userEmail = decoded.email;
        
        // Continua para a próxima função
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expirado. Faça login novamente.' });
        }
        return res.status(401).json({ error: 'Token inválido.' });
    }
};

module.exports = authMiddleware;