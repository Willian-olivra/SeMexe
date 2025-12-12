let socket = null;
let chatAberto = false;
let chatMinimizado = false;

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const userId = params.get('id');
    const token = localStorage.getItem('token');
    const meuUser = getUsuarioLogado();

    if (!userId) { window.location.href = 'index.html'; return; }
    
    // Se for meu próprio perfil, redireciona para edição
    if (meuUser && (userId === meuUser.id || userId === meuUser._id)) {
        window.location.href = 'perfil.html';
        return;
    }

    // Elementos da Interface
    const els = {
        nome: document.getElementById('display-nome'),
        local: document.getElementById('display-local'),
        bio: document.getElementById('display-bio'),
        insta: document.getElementById('display-instagram'),
        img: document.getElementById('profile-img'),
        icon: document.getElementById('profile-icon'),
        actions: document.getElementById('friend-action-area'),
        fairplay: document.getElementById('stat-fairplay'),
        faltas: document.getElementById('stat-faltas'),
        esportes: document.getElementById('container-esportes'),
        badge: document.getElementById('badge-area')
    };

    let dadosAmigo = null;

    try {
        // 1. Conecta Socket (se logado)
        if (token && typeof io !== 'undefined') {
            socket = io({ auth: { token } });
            
            // Ouvinte Global de Mensagens
            socket.on('mensagem_recebida', (msg) => {
                // Se a janela estiver aberta e for desse remetente, mostra a mensagem
                const idAtual = document.getElementById('chat-destinatario-id').value;
                if (chatAberto && (msg.remetenteId === idAtual || msg.destinatarioId === idAtual)) {
                    renderizarMensagemChat(msg, msg.remetenteId === (meuUser.id || meuUser._id));
                } else {
                    // Opcional: Tocar som ou mostrar notificação se o chat estiver fechado
                    if(!chatAberto) showToast(`Nova mensagem de ${msg.remetenteId}`, 'info');
                }
            });
        }

        // 2. Carrega Perfil
        const res = await fetch(`/api/users/${userId}`);
        if (!res.ok) throw new Error('Usuário não encontrado');
        dadosAmigo = await res.json();

        // Preenche UI
        els.nome.innerText = dadosAmigo.nome;
        els.local.innerHTML = dadosAmigo.cidade ? `<i class="fa-solid fa-location-dot text-neon-blue mr-1"></i> ${dadosAmigo.cidade}` : '';
        if(dadosAmigo.bio) els.bio.innerText = dadosAmigo.bio;
        if(dadosAmigo.instagram) els.insta.innerText = dadosAmigo.instagram;

        // Avatar
        if (dadosAmigo.avatar && dadosAmigo.avatar.startsWith('data:image')) {
            els.img.src = dadosAmigo.avatar; els.img.classList.remove('hidden'); els.icon.classList.add('hidden');
        } else {
            els.img.classList.add('hidden'); els.icon.classList.remove('hidden');
        }

        // Stats
        if (dadosAmigo.fairplayNota !== undefined) {
            els.fairplay.innerText = dadosAmigo.fairplayNota.toFixed(1);
            if(dadosAmigo.fairplayNota >= 4.5) els.fairplay.className = "block text-2xl font-bold text-green-400";
            else if(dadosAmigo.fairplayNota < 3) els.fairplay.className = "block text-2xl font-bold text-red-500";
        }
        if (dadosAmigo.faltas !== undefined) els.faltas.innerText = dadosAmigo.faltas;

        // Tags de Esporte
        if (dadosAmigo.esportes && dadosAmigo.esportes.length > 0) {
            els.esportes.innerHTML = dadosAmigo.esportes.map(e => `<span class="px-2 py-1 bg-dark-highlight border border-gray-700 rounded text-xs text-gray-300">${e}</span>`).join(' ');
        }

        // 3. Verifica Amizade e Renderiza Botão
        if (token) {
            verificarStatusAmizade(userId, token, els.actions, dadosAmigo);
        }

    } catch (e) { console.error(e); }

    // --- FUNÇÕES GLOBAIS (Janela Flutuante) ---
    
    window.abrirChat = async function() {
        const chatWin = document.getElementById('floating-chat');
        const chatBody = document.getElementById('chat-body');
        const chatHeaderName = document.getElementById('chat-header-nome');
        const inputId = document.getElementById('chat-destinatario-id');

        if(!chatWin || !dadosAmigo) return;

        // Preenche dados
        chatHeaderName.innerText = dadosAmigo.nome;
        inputId.value = dadosAmigo._id || dadosAmigo.id;

        // Abre a janela
        chatWin.classList.remove('hidden');
        // Pequeno delay para animação CSS funcionar
        setTimeout(() => chatWin.classList.remove('translate-y-full'), 10);
        chatAberto = true;
        chatMinimizado = false;

        // Carrega Histórico
        chatBody.innerHTML = '<div class="flex justify-center mt-4"><i class="fa-solid fa-spinner fa-spin text-neon-blue"></i></div>';
        
        try {
            const res = await fetch(`/api/chat/historico/${userId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const mensagens = await res.json();
            
            chatBody.innerHTML = '';
            const meuId = meuUser.id || meuUser._id;
            
            mensagens.forEach(msg => {
                const remetenteId = msg.remetente._id || msg.remetente;
                const souEu = remetenteId.toString() === meuId.toString();
                renderizarMensagemChat(msg, souEu);
            });
            chatBody.scrollTop = chatBody.scrollHeight;

        } catch (e) {
            chatBody.innerHTML = '<p class="text-red-500 text-xs text-center mt-2">Erro ao carregar.</p>';
        }
    };

    window.fecharChat = function() {
        const chatWin = document.getElementById('floating-chat');
        chatWin.classList.add('translate-y-full');
        setTimeout(() => chatWin.classList.add('hidden'), 300);
        chatAberto = false;
    };

    window.toggleMinimizarChat = function() {
        const chatWin = document.getElementById('floating-chat');
        const body = document.getElementById('chat-body');
        const form = document.getElementById('chat-form');
        
        if (chatMinimizado) {
            // Maximiza
            body.classList.remove('hidden');
            form.classList.remove('hidden');
            chatWin.style.transform = 'translateY(0)';
        } else {
            // Minimiza (esconde corpo, mantém header)
            body.classList.add('hidden');
            form.classList.add('hidden');
            // Opcional: ajustar altura se necessário, mas ocultar filhos já funciona visualmente
        }
        chatMinimizado = !chatMinimizado;
    };

    // Enviar Mensagem
    const formChat = document.getElementById('chat-form');
    if(formChat) {
        formChat.addEventListener('submit', async (e) => {
            e.preventDefault();
            const input = document.getElementById('chat-input');
            const texto = input.value.trim();
            const destId = document.getElementById('chat-destinatario-id').value;
            
            if(!texto) return;
            
            input.value = '';

            // 1. Renderiza Imediatamente (Otimista)
            const msgTemp = { conteudo: texto, data_envio: new Date() }; // 'conteudo' para compatibilidade visual
            renderizarMensagemChat(msgTemp, true); // true = sou eu

            // 2. Envia para API (Salvar no banco)
            try {
                const res = await fetch('/api/chat/enviar', { // Rota POST que já existe em routes/chat.js
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ destinatarioId: destId, texto: texto })
                });
                
                // 3. Emite Socket (Para o outro receber em tempo real)
                if(res.ok) {
                    const msgSalva = await res.json();
                    socket.emit('enviar_mensagem', {
                        remetenteId: meuUser.id || meuUser._id,
                        destinatarioId: destId,
                        texto: texto
                    });
                }
            } catch (err) { console.error(err); }
        });
    }
});

function renderizarMensagemChat(msg, souEu) {
    const box = document.getElementById('chat-body');
    const div = document.createElement('div');
    div.className = `flex mb-2 ${souEu ? 'justify-end' : 'justify-start'}`;
    
    // Suporte para msg vinda do banco (msg.texto) ou socket (msg.conteudo)
    const texto = msg.texto || msg.conteudo;
    
    div.innerHTML = `
        <div class="max-w-[75%] px-3 py-2 rounded-lg text-sm break-words ${souEu ? 'bg-neon-blue text-black rounded-br-none' : 'bg-gray-700 text-white rounded-bl-none'}">
            ${texto}
        </div>
    `;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
}

async function verificarStatusAmizade(amigoId, token, container, dadosAmigo) {
    try {
        const res = await fetch('/api/amigos', { headers: { 'Authorization': `Bearer ${token}` } });
        const amigos = await res.json();
        const jaEhAmigo = amigos.some(a => (a._id || a.id) === amigoId);

        if (jaEhAmigo) {
            // Usa a função global window.abrirChatGlobal definida no utils.js
            container.innerHTML = `
                <div class="flex gap-2">
                    <button onclick="window.abrirChatGlobal('${amigoId}', '${dadosAmigo.nome}', '${dadosAmigo.avatar || ''}')" class="bg-neon-blue text-black px-6 py-2 rounded-full font-bold hover:bg-white transition flex items-center gap-2 shadow-lg shadow-neon-blue/20">
                        <i class="fa-solid fa-comment-dots"></i> Mensagem
                    </button>
                    <button onclick="removerAmigo('${amigoId}')" class="w-10 h-10 rounded-full border border-gray-600 text-gray-400 hover:text-neon-pink hover:border-neon-pink transition flex items-center justify-center">
                        <i class="fa-solid fa-user-xmark"></i>
                    </button>
                </div>
            `;
        } else {
            // SE NÃO: Botão "Adicionar"
            container.innerHTML = `
                <button onclick="enviarSolicitacao('${amigoId}')" id="btn-add" class="bg-dark-highlight border border-gray-600 text-white px-6 py-2 rounded-full font-bold hover:border-neon-blue hover:text-neon-blue transition flex items-center gap-2">
                    <i class="fa-solid fa-user-plus"></i> Adicionar
                </button>
            `;
        }
    } catch (e) { console.error(e); }
}

// ... Funções globais (enviarSolicitacao, removerAmigo) mantidas iguais ...
window.enviarSolicitacao = async function(amigoId) {
    const btn = document.getElementById('btn-add');
    if(btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>'; }
    try {
        const res = await fetch('/api/amigos/solicitar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            body: JSON.stringify({ amigoId })
        });
        if (res.ok) {
            showToast('Solicitação enviada!', 'success');
            if(btn) { btn.innerHTML = '<i class="fa-solid fa-check"></i> Enviado'; btn.className = "bg-green-500 text-white px-6 py-2 rounded-full text-sm font-bold flex items-center gap-2"; }
        } else {
            const data = await res.json();
            showToast(data.error || 'Erro', 'warning');
            if(btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Adicionar'; }
        }
    } catch (e) { console.error(e); }
};

window.removerAmigo = async function(amigoId) {
    if(!confirm('Remover este amigo?')) return;
    try {
        const res = await fetch(`/api/amigos/${amigoId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if(res.ok) {
            showToast('Amigo removido.', 'success');
            setTimeout(() => location.reload(), 1000);
        }
    } catch (e) { console.error(e); }
};

function getUsuarioLogado() {
    try { return JSON.parse(localStorage.getItem('userInfo')); } catch { return null; }
}