/**
 * SISTEMA GLOBAL: Utils, Menu, Notificações e Navegação
 */

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Injeta CSS Global (Animações e Ajustes de Layout)
    const styleSheet = document.createElement("style");
    styleSheet.innerText = `
        @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes fadeOut { to { opacity: 0; transform: translateX(100%); } }
        .toast-enter { animation: slideInRight 0.3s ease-out forwards; }
        
        /* Ajuste para iPhone X+ (Safe Area) */
        .pb-safe { padding-bottom: env(safe-area-inset-bottom, 20px); }
        
        /* Garante espaço para o Bottom Nav não cobrir o conteúdo */
        body.has-bottom-nav { padding-bottom: 90px; }
    `;
    document.head.appendChild(styleSheet);

    // 2. Inicializações
    if (typeof atualizarMenu === 'function') atualizarMenu();
});

// --- MENUS (Topo e Bottom) ---

function atualizarMenu() {
    const navMenu = document.getElementById('nav-menu');
    const usuario = getUsuarioLogado();
    const logado = !!(localStorage.getItem('token') && usuario);

    // 1. Menu Superior (Desktop)
    if (navMenu) {
        if (logado) {
            navMenu.innerHTML = `
                <li><a href="perfil.html" class="text-neon-blue font-bold flex items-center gap-2"><i class="fa-solid fa-user-astronaut"></i> ${usuario.nome.split(' ')[0]}</a></li>
                <li><a href="minhasAtividades.html" class="text-gray-300 hover:text-neon-blue">Minhas Atividades</a></li>
                <li><a href="criarAtividade.html" class="text-gray-300 hover:text-neon-blue">Criar Atividade</a></li>
                <li><a href="#" onclick="logout()" class="text-neon-pink hover:text-white font-bold border border-neon-pink px-3 py-1 rounded">Sair</a></li>
            `;
        } else {
            navMenu.innerHTML = `
                <li><a href="cadastro.html" class="text-gray-300 hover:text-neon-blue">Cadastrar</a></li>
                <li><a href="login.html" class="bg-neon-blue text-black px-4 py-2 rounded font-bold hover:bg-white">Login</a></li>
            `;
        }
    }

    // 2. Menu Inferior (Mobile) - Injeta apenas se não existir
    if (!document.getElementById('mobile-bottom-nav')) {
        renderizarBottomNav(logado);
    }
}

function renderizarBottomNav(logado) {
    const nav = document.createElement('nav');
    nav.id = 'mobile-bottom-nav';
    // Estilo fixo, com z-index alto e padding para safe area
    nav.className = 'fixed bottom-0 left-0 w-full h-16 bg-dark-surface border-t border-gray-800 z-[99] md:hidden pb-safe';

    // Determina qual aba está ativa para colorir de azul
    const path = window.location.pathname;
    const activeClass = (p) => path.includes(p) ? 'text-neon-blue' : 'text-gray-500 hover:text-gray-300';

    if (logado) {
        nav.innerHTML = `
            <div class="relative w-full h-full flex justify-between items-center px-6">
                <div class="flex gap-8">
                    <a href="index.html" class="flex flex-col items-center gap-1 ${activeClass('index.html')}">
                        <i class="fa-solid fa-house text-xl"></i>
                        <span class="text-[10px] font-medium">Início</span>
                    </a>
                    <a href="minhasAtividades.html" class="flex flex-col items-center gap-1 ${activeClass('minhasAtividades')}">
                        <i class="fa-solid fa-calendar-check text-xl"></i>
                        <span class="text-[10px] font-medium">Minhas</span>
                    </a>
                </div>

                <div class="absolute left-1/2 -translate-x-1/2 -top-6">
                    <a href="criarAtividade.html" class="flex items-center justify-center w-14 h-14 bg-neon-blue rounded-full border-[4px] border-dark-base text-black shadow-[0_0_15px_rgba(0,229,255,0.4)] transform transition hover:scale-110 active:scale-95">
                        <i class="fa-solid fa-plus text-2xl"></i>
                    </a>
                </div>

                <div class="flex gap-8">
                    <a href="perfil.html" class="flex flex-col items-center gap-1 ${activeClass('perfil')}">
                        <i class="fa-solid fa-user text-xl"></i>
                        <span class="text-[10px] font-medium">Perfil</span>
                    </a>
                    <a href="#" onclick="logout()" class="flex flex-col items-center gap-1 text-gray-500 hover:text-neon-pink">
                        <i class="fa-solid fa-right-from-bracket text-xl"></i>
                        <span class="text-[10px] font-medium">Sair</span>
                    </a>
                </div>
            </div>
        `;
    } else {
        // Visitante (Sem botão central, distribuição uniforme)
        nav.innerHTML = `
            <div class="w-full h-full flex justify-around items-center">
                <a href="index.html" class="flex flex-col items-center gap-1 ${activeClass('index.html')}">
                    <i class="fa-solid fa-house text-xl"></i>
                    <span class="text-[10px] font-medium">Início</span>
                </a>
                <a href="cadastro.html" class="flex flex-col items-center gap-1 ${activeClass('cadastro')}">
                    <i class="fa-solid fa-user-plus text-xl"></i>
                    <span class="text-[10px] font-medium">Cadastrar</span>
                </a>
                <a href="login.html" class="flex flex-col items-center gap-1 ${activeClass('login')}">
                    <i class="fa-solid fa-right-to-bracket text-xl"></i>
                    <span class="text-[10px] font-medium">Entrar</span>
                </a>
            </div>
        `;
    }

    document.body.appendChild(nav);
    document.body.classList.add('has-bottom-nav');
}

// --- UTILS GERAIS ---

function getUsuarioLogado() {
    try { return JSON.parse(localStorage.getItem('userInfo')); } catch { return null; }
}

function logout() {
    localStorage.clear();
    showToast('Até logo! 👋', 'info');
    setTimeout(() => window.location.href = 'index.html', 1000);
}

// --- TOASTS (Notificações) ---

function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'fixed top-5 right-5 z-[100] flex flex-col gap-3 pointer-events-none';
        document.body.appendChild(container);
    }

    const config = {
        success: { border: 'border-neon-blue', icon: 'fa-check-circle', color: 'text-neon-blue' },
        error: { border: 'border-neon-pink', icon: 'fa-circle-exclamation', color: 'text-neon-pink' },
        warning: { border: 'border-yellow-400', icon: 'fa-triangle-exclamation', color: 'text-yellow-400' },
        info: { border: 'border-white', icon: 'fa-info-circle', color: 'text-white' }
    };
    const style = config[type] || config.success;

    const toast = document.createElement('div');
    toast.className = `pointer-events-auto bg-dark-surface border-l-4 ${style.border} text-white p-4 rounded shadow-2xl flex gap-3 items-center toast-enter min-w-[280px] backdrop-blur-md`;
    toast.innerHTML = `<i class="fa-solid ${style.icon} ${style.color} text-lg"></i> <span class="text-sm font-bold">${message}</span>`;
    
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

// --- MODAL DE CONFIRMAÇÃO ---

function showConfirmModal(mensagem, btnSim = 'Confirmar', btnNao = 'Cancelar') {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4 opacity-0 transition-opacity duration-200';
        
        const modal = document.createElement('div');
        modal.className = 'bg-dark-surface border border-gray-700 rounded-xl shadow-2xl w-full max-w-sm p-6 transform scale-95 transition-all duration-200 text-center';
        
        modal.innerHTML = `
            <div class="w-14 h-14 bg-dark-highlight rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-600">
                <i class="fa-solid fa-question text-2xl text-neon-blue"></i>
            </div>
            <h3 class="text-lg font-bold text-white mb-2">Confirmação</h3>
            <p class="text-gray-400 text-sm mb-6">${mensagem}</p>
            <div class="flex gap-3 justify-center">
                <button id="btn-cancel" class="flex-1 bg-transparent border border-gray-600 text-gray-300 py-2 rounded-lg hover:bg-gray-800 transition text-sm font-bold">${btnNao}</button>
                <button id="btn-confirm" class="flex-1 bg-neon-blue text-black py-2 rounded-lg hover:bg-white transition text-sm font-bold shadow-lg">${btnSim}</button>
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        requestAnimationFrame(() => {
            overlay.classList.remove('opacity-0');
            modal.classList.remove('scale-95');
            modal.classList.add('scale-100');
        });

        const fechar = (val) => {
            overlay.classList.add('opacity-0');
            modal.classList.add('scale-95');
            setTimeout(() => { overlay.remove(); resolve(val); }, 200);
        };

        overlay.querySelector('#btn-confirm').onclick = () => fechar(true);
        overlay.querySelector('#btn-cancel').onclick = () => fechar(false);
        overlay.onclick = (e) => { if(e.target === overlay) fechar(false); };
    });
}