/**
 * SISTEMA DE NOTIFICAÇÕES E MODAIS - DARK NEON
 */

const styleSheet = document.createElement("style");
styleSheet.innerText = `
  @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
  @keyframes fadeOut { to { opacity: 0; transform: translateX(100%); } }
  @keyframes popIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
  .toast-enter { animation: slideInRight 0.3s ease-out forwards; }
  .toast-exit { animation: fadeOut 0.3s ease-in forwards; }
  .modal-enter { animation: popIn 0.2s ease-out forwards; }
`;
document.head.appendChild(styleSheet);

// --- TOASTS ---

function getToastContainer() {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'fixed top-5 right-5 z-[100] flex flex-col gap-3 pointer-events-none';
        document.body.appendChild(container);
    }
    return container;
}

function showToast(message, type = 'success') {
    const container = getToastContainer();
    
    const config = {
        success: { border: 'border-neon-blue', icon: 'fa-check-circle', color: 'text-neon-blue', shadow: 'shadow-[0_0_10px_rgba(0,229,255,0.3)]' },
        error: { border: 'border-neon-pink', icon: 'fa-circle-exclamation', color: 'text-neon-pink', shadow: 'shadow-[0_0_10px_rgba(255,0,127,0.3)]' },
        warning: { border: 'border-yellow-400', icon: 'fa-triangle-exclamation', color: 'text-yellow-400', shadow: 'shadow-[0_0_10px_rgba(250,204,21,0.3)]' }
    };

    const style = config[type] || config.success;

    const toast = document.createElement('div');
    toast.className = `pointer-events-auto min-w-[300px] max-w-sm bg-dark-surface border-l-4 ${style.border} ${style.shadow} text-white p-4 rounded-r-lg rounded-l-sm flex items-center gap-4 shadow-2xl toast-enter`;

    toast.innerHTML = `
        <i class="fa-solid ${style.icon} ${style.color} text-2xl"></i>
        <p class="text-sm font-medium flex-1 leading-snug">${message}</p>
        <button onclick="this.parentElement.remove()" class="text-gray-500 hover:text-white transition p-1"><i class="fa-solid fa-xmark"></i></button>
    `;

    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.remove('toast-enter');
        toast.classList.add('toast-exit');
        toast.addEventListener('animationend', () => toast.remove());
    }, 4000);
}

// --- MODAL DE CONFIRMAÇÃO ---

function showConfirmModal(mensagem, textoConfirmar = 'Confirmar', textoCancelar = 'Cancelar') {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4 opacity-0 transition-opacity duration-200';
        
        const modal = document.createElement('div');
        modal.className = 'bg-dark-surface border border-gray-700 rounded-xl shadow-2xl w-full max-w-sm p-6 transform scale-95 transition-all duration-200 modal-enter text-center';
        
        modal.innerHTML = `
            <div class="w-16 h-16 bg-dark-highlight rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-600 shadow-inner">
                <i class="fa-solid fa-question text-3xl text-neon-blue"></i>
            </div>
            <h3 class="text-xl font-bold text-white mb-2">Confirmação</h3>
            <p class="text-gray-400 text-sm mb-6">${mensagem}</p>
            <div class="flex gap-3 justify-center">
                <button id="btn-cancelar-modal" class="flex-1 bg-transparent border border-gray-600 text-gray-300 py-2.5 rounded-lg hover:bg-gray-800 hover:text-white transition font-medium">
                    ${textoCancelar}
                </button>
                <button id="btn-confirmar-modal" class="flex-1 bg-neon-blue text-black py-2.5 rounded-lg hover:bg-white hover:shadow-[0_0_15px_rgba(0,229,255,0.5)] transition font-bold shadow-lg">
                    ${textoConfirmar}
                </button>
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        requestAnimationFrame(() => {
            overlay.classList.remove('opacity-0');
            modal.classList.remove('scale-95');
            modal.classList.add('scale-100');
        });

        const fechar = (resultado) => {
            overlay.classList.add('opacity-0');
            modal.classList.add('scale-95', 'opacity-0');
            setTimeout(() => {
                overlay.remove();
                resolve(resultado);
            }, 200);
        };

        overlay.querySelector('#btn-confirmar-modal').onclick = () => fechar(true);
        overlay.querySelector('#btn-cancelar-modal').onclick = () => fechar(false);
        overlay.onclick = (e) => { if (e.target === overlay) fechar(false); };
    });
}

// --- UTILS DE AUTENTICAÇÃO ---

function estaLogado() {
    const token = localStorage.getItem('token');
    const userInfo = localStorage.getItem('userInfo');
    return !!(token && userInfo);
}

function getUsuarioLogado() {
    try {
        return JSON.parse(localStorage.getItem('userInfo'));
    } catch (error) { return null; }
}

function fazerLogout(event) {
    if (event) event.preventDefault();
    localStorage.clear();
    showToast('Você saiu da conta.', 'warning');
    setTimeout(() => { window.location.href = 'index.html'; }, 1500);
}

function atualizarMenu() {
    const navMenu = document.getElementById('nav-menu');
    if (!navMenu) return;

    const usuario = getUsuarioLogado();

    if (estaLogado() && usuario) {
        const primeiroNome = usuario.nome.split(' ')[0];
        navMenu.innerHTML = `
            <li>
                <a href="perfil.html" class="text-neon-blue font-bold italic drop-shadow-sm flex items-center gap-2 hover:underline transition-all">
                    <i class="fa-solid fa-user-astronaut"></i> ${primeiroNome}
                </a>
            </li>
            <li><a href="minhasAtividades.html" class="text-gray-300 hover:text-neon-blue transition-colors font-medium">Minhas Atividades</a></li>
            <li><a href="criarAtividade.html" class="text-gray-300 hover:text-neon-blue transition-colors font-medium">Criar Atividade</a></li>
            <li><a href="#" class="border border-neon-pink text-neon-pink px-4 py-1.5 rounded hover:bg-neon-pink hover:text-white transition-colors font-bold btn-logout" onclick="fazerLogout(event)">Logout</a></li>
        `;
    } else {
        navMenu.innerHTML = `
            <li><a href="cadastro.html" class="text-gray-300 hover:text-neon-blue transition font-medium">Cadastrar</a></li>
            <li>
                <a href="login.html" class="bg-neon-blue !text-black hover:bg-white hover:!text-neon-blue px-5 py-2 rounded font-bold transition shadow-[0_0_10px_rgba(0,229,255,0.5)]">
                    Login
                </a>
            </li>
        `;
    }
}

// --- FUNÇÕES AUXILIARES GLOBAIS (Para não dar erro nos outros scripts) ---

function formatarDataHora(dataHora) {
    const d = new Date(dataHora);
    return d.toLocaleDateString('pt-BR', { 
        weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
    });
}

function getIconeEsporte(esporte) {
    const icones = {
        'Futebol': 'fa-solid fa-futbol',
        'Vôlei': 'fa-solid fa-volleyball',
        'Basquete': 'fa-solid fa-basketball',
        'Corrida': 'fa-solid fa-person-running',
        'Natação': 'fa-solid fa-person-swimming',
        'Ciclismo': 'fa-solid fa-bicycle',
        'Academia': 'fa-solid fa-dumbbell'
    };
    return icones[esporte] || 'fa-solid fa-person-running';
}

document.addEventListener('DOMContentLoaded', atualizarMenu);