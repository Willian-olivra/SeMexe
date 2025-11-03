// ===== UTILITÁRIOS GLOBAIS =====
// Este arquivo contém funções que podem ser usadas em qualquer página

/**
 * Verifica se o usuário está logado
 * @returns {boolean}
 */
function estaLogado() {
    const token = localStorage.getItem('token');
    const userInfo = localStorage.getItem('userInfo');
    return !!(token && userInfo);
}

/**
 * Obtém informações do usuário logado
 * @returns {Object|null}
 */
function getUsuarioLogado() {
    try {
        const userInfo = localStorage.getItem('userInfo');
        return userInfo ? JSON.parse(userInfo) : null;
    } catch (error) {
        console.error('Erro ao obter usuário:', error);
        return null;
    }
}

/**
 * Obtém o token JWT
 * @returns {string|null}
 */
function getToken() {
    return localStorage.getItem('token');
}

/**
 * Faz logout do usuário
 */
function fazerLogout(event) {
    if (event) event.preventDefault();
    localStorage.clear();
    window.location.href = 'index.html';
}

/**
 * Atualiza o menu de navegação baseado no estado de autenticação
 */
function atualizarMenu() {
    const navMenu = document.getElementById('nav-menu');
    if (!navMenu) return;

    const usuario = getUsuarioLogado();

    if (estaLogado() && usuario) {
        // Usuário logado - mostrar menu logado
        const primeiroNome = usuario.nome.split(' ')[0];
        navMenu.innerHTML = `
            <li style="color: #2a9d8f; font-weight: 600;">
                <i class="fa-solid fa-user"></i> Olá, ${primeiroNome}!
            </li>
            <li><a href="minhasAtividades.html">Minhas Atividades</a></li>
            <li><a href="criarAtividade.html">Criar Atividade</a></li>
            <li><a href="#" class="btn-logout" onclick="fazerLogout(event)">Logout</a></li>
        `;
    } else {
        // Usuário não logado - mostrar menu padrão
        navMenu.innerHTML = `
            <li><a href="cadastro.html">Cadastrar</a></li>
            <li><a href="login.html">Login</a></li>
        `;
    }
}

/**
 * Redireciona para login se não estiver autenticado
 * @param {string} mensagem - Mensagem a ser exibida
 */
function requerAutenticacao(mensagem = 'Você precisa fazer login primeiro!') {
    if (!estaLogado()) {
        alert(mensagem);
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

/**
 * Formata data e hora para exibição
 * @param {string} dataHora - Data no formato ISO
 * @returns {string}
 */
function formatarDataHora(dataHora) {
    const data = new Date(dataHora);
    const opcoes = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return data.toLocaleDateString('pt-BR', opcoes);
}

/**
 * Obtém ícone do Font Awesome baseado no esporte
 * @param {string} esporte - Nome do esporte
 * @returns {string}
 */
function getIconeEsporte(esporte) {
    const icones = {
        'Futebol': 'fa-solid fa-futbol',
        'Vôlei': 'fa-solid fa-volleyball',
        'Basquete': 'fa-solid fa-basketball',
        'Corrida': 'fa-solid fa-person-running',
        'Natação': 'fa-solid fa-person-swimming'
    };
    return icones[esporte] || 'fa-solid fa-person-running';
}

// Inicializa o menu quando o DOM carregar
document.addEventListener('DOMContentLoaded', () => {
    atualizarMenu();
});