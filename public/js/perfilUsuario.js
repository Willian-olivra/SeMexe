document.addEventListener('DOMContentLoaded', async () => {
    // Carrega o menu se a função existir (utils.js)
    if (typeof atualizarMenu === 'function') atualizarMenu();

    const params = new URLSearchParams(window.location.search);
    const userId = params.get('id');
    const token = localStorage.getItem('token');
    const meuUser = getUsuarioLogado(); // Pega dados do localStorage

    // Redireciona se não tiver ID na URL
    if (!userId || userId === 'undefined') { 
        window.location.href = 'index.html'; 
        return; 
    }

    // Se for meu perfil, redireciona para a página de edição/perfil próprio
    if (meuUser && (userId.toString() === meuUser.id?.toString() || userId.toString() === meuUser._id?.toString())) {
        window.location.href = 'perfil.html';
        return;
    }

    // --- Elementos da Interface ---
    const btnAdd = document.getElementById('btn-add');
    const btnPending = document.getElementById('btn-pending');
    const areaAmigo = document.getElementById('area-amigo');
    const btnRemove = document.getElementById('btn-remove');
    const btnMsg = document.getElementById('btn-mensagem');
    const actionsContainer = document.getElementById('friend-actions');

    // --- Variáveis do Chat ---
    let socket;
    let chatAmigoIdAtual = null; // Guarda o ID de com quem estamos falando agora
    const chatWindow = document.getElementById('chat-window');
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const btnCloseChat = document.getElementById('chat-close');
    const btnSendChat = document.getElementById('chat-send');

    // --- 1. CONFIGURAÇÃO DO SOCKET.IO ---
    if (typeof io !== 'undefined' && token) {
        socket = io({
            auth: { token: token } // Autentica no socket
        });

        // Ouve mensagens chegando em tempo real
        socket.on('mensagem_recebida', (msg) => {
            // Só mostra na tela se a janela estiver aberta E for conversa com essa pessoa
            if (!chatWindow.classList.contains('hidden') && 
                (msg.remetenteId === chatAmigoIdAtual || msg.destinatarioId === chatAmigoIdAtual)) {
                
                const souEu = msg.remetenteId.toString() === (meuUser.id || meuUser._id).toString();
                adicionarMensagemNaTela(msg.conteudo || msg.texto, souEu);
                rolarParaBaixo();
            }
        });
    }

    // Eventos de UI do Chat
    if (btnCloseChat) {
        btnCloseChat.addEventListener('click', () => {
            chatWindow.classList.add('hidden');
            chatWindow.style.display = 'none';
            chatAmigoIdAtual = null; // Limpa o ID para não receber msg errada
        });
    }

    if (btnSendChat) {
        btnSendChat.addEventListener('click', enviarMensagem);
    }

    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') enviarMensagem();
        });
    }

    // --- 2. CARREGAR DADOS DO USUÁRIO ---
    try {
        const res = await fetch(`/api/users/${userId}`);
        
        if (!res.ok) throw new Error('Usuário não encontrado');
        
        const user = await res.json();
        
        document.getElementById('perfil-nome').textContent = user.nome;
        document.getElementById('perfil-email').textContent = user.email;

        const avatarEl = document.getElementById('avatar-letra');
        if (user.avatar && user.avatar.includes('fa-')) {
            avatarEl.textContent = '';
            avatarEl.innerHTML = `<i class="${user.avatar}"></i>`;
        } else {
            avatarEl.textContent = user.nome.charAt(0).toUpperCase();
        }

        if (token) {
            actionsContainer.classList.remove('hidden');
            // Verifica se já são amigos
            verificarStatusAmizade(user.id || user._id);
        }
        const elNota = document.getElementById('perfil-fairplay');
    const elFaltas = document.getElementById('perfil-faltas');

    if (elNota && user.fairplayNota !== undefined) {
        elNota.innerText = user.fairplayNota.toFixed(1); // Ex: 4.8
        
        // Cor dinâmica
        if(user.fairplayNota >= 4.5) elNota.className = "block text-2xl font-bold text-green-400";
        else if(user.fairplayNota >= 3) elNota.className = "block text-2xl font-bold text-yellow-400";
        else elNota.className = "block text-2xl font-bold text-red-500";
    }

    if (elFaltas && user.faltas !== undefined) {
        elFaltas.innerText = user.faltas;
    }

    } catch (error) {
        console.error(error);
        document.getElementById('perfil-nome').textContent = 'Usuário não encontrado';
        document.getElementById('lista-atividades').innerHTML = '';
    }

    // --- 3. CARREGAR ATIVIDADES DO USUÁRIO ---
    try {
        const res = await fetch(`/api/atividades/usuario/${userId}`);
        const atividades = await res.json();
        renderizarAtividades(atividades);
    } catch (error) { console.error(error); }


    // --- FUNÇÕES DE AMIZADE ---
    async function verificarStatusAmizade(amigoId) {
        try {
            const res = await fetch(`/api/amigos/check/${amigoId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            
            // Reseta botões
            if(btnAdd) btnAdd.classList.add('hidden');
            if(btnPending) btnPending.classList.add('hidden');
            if(areaAmigo) {
                areaAmigo.classList.add('hidden');
                areaAmigo.style.display = 'none';
            }

            if (data.status === 'nenhum') {
                btnAdd.classList.remove('hidden');
                btnAdd.onclick = () => enviarSolicitacao(amigoId);
            
            } else if (data.status === 'enviado') {
                btnPending.classList.remove('hidden');
                btnPending.innerHTML = '<i class="fa-solid fa-clock"></i> Solicitação Enviada';
            
            } else if (data.status === 'recebido') {
                btnPending.classList.remove('hidden');
                btnPending.innerHTML = '<i class="fa-solid fa-envelope"></i> Pedido Recebido';
                btnPending.onclick = () => window.location.href = 'perfil.html';
                btnPending.classList.add('cursor-pointer');

            } else if (data.status === 'aceito') {
                areaAmigo.classList.remove('hidden');
                areaAmigo.style.display = 'flex';
                
                // Configura botão de remover
                const novoBtnRemove = btnRemove.cloneNode(true);
                if(btnRemove.parentNode) btnRemove.parentNode.replaceChild(novoBtnRemove, btnRemove);
                novoBtnRemove.onclick = () => removerAmizade(amigoId, document.getElementById('perfil-nome').textContent);
                
                // Configura botão de mensagem
                const novoBtnMsg = btnMsg.cloneNode(true);
                if(btnMsg.parentNode) btnMsg.parentNode.replaceChild(novoBtnMsg, btnMsg);
                novoBtnMsg.onclick = () => abrirChat(amigoId, document.getElementById('perfil-nome').textContent);
            }
        } catch (error) { console.error(error); }
    }

    async function enviarSolicitacao(friendId) {
        const original = btnAdd.innerHTML;
        btnAdd.disabled = true;
        btnAdd.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

        try {
            const res = await fetch('/api/amigos/solicitar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ amigoId: friendId })
            });

            if (res.ok) {
                showToast('Solicitação enviada!', 'success');
                verificarStatusAmizade(friendId);
            } else {
                const data = await res.json();
                showToast(data.error, 'warning');
                btnAdd.disabled = false;
                btnAdd.innerHTML = original;
            }
        } catch (error) {
            showToast('Erro de conexão.', 'error');
            btnAdd.disabled = false;
            btnAdd.innerHTML = original;
        }
    }

    async function removerAmizade(friendId, nomeAmigo) {
        let confirmado = await showConfirmModal(`Desfazer amizade com ${nomeAmigo}?`, 'Sim, desfazer', 'Cancelar');
        if (!confirmado) return;

        try {
            const res = await fetch(`/api/amigos/${friendId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                showToast('Amizade desfeita.', 'success');
                verificarStatusAmizade(friendId);
            } else {
                showToast('Erro ao remover.', 'error');
            }
        } catch (error) { showToast('Erro de conexão.', 'error'); }
    }


    // --- FUNÇÕES DO CHAT ---
    function abrirChat(amigoId, nomeAmigo) {
        chatAmigoIdAtual = amigoId;
        chatWindow.classList.remove('hidden');
        chatWindow.style.display = 'flex';
        document.getElementById('chat-amigo-nome').textContent = nomeAmigo;
        
        carregarHistorico(amigoId);
        setTimeout(() => chatInput.focus(), 100);
    }

    async function carregarHistorico(amigoId) {
        chatMessages.innerHTML = '<p class="text-center text-gray-600 text-xs py-4">Carregando...</p>';
        try {
            const res = await fetch(`/api/chat/historico/${amigoId}`, { 
                headers: { 'Authorization': `Bearer ${token}` } 
            });
            const msgs = await res.json();
            chatMessages.innerHTML = '';
            
            if (msgs.length === 0) {
                 chatMessages.innerHTML = '<p class="text-center text-gray-500 text-xs mt-4">Nenhuma mensagem ainda.</p>';
            }

            msgs.forEach(m => {
                const remetenteId = m.remetente._id || m.remetente; 
                const meuId = meuUser._id || meuUser.id;
                const souEu = remetenteId.toString() === meuId.toString();
                adicionarMensagemNaTela(m.conteudo || m.texto, souEu);
            });
            rolarParaBaixo();
        } catch (e) { 
            chatMessages.innerHTML = '<p class="text-center text-gray-500 text-xs">Erro ao carregar mensagens.</p>'; 
        }
    }

    async function enviarMensagem() {
        const texto = chatInput.value.trim();
        if (!texto || !chatAmigoIdAtual) return;

        chatInput.value = ''; // Limpa input
        adicionarMensagemNaTela(texto, true); // Mostra na tela (otimista)
        rolarParaBaixo();

        try {
            const res = await fetch('/api/chat/enviar', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ 
                    destinatarioId: chatAmigoIdAtual, 
                    texto: texto 
                })
            });

            if (res.ok) {
                // SUCESSO NO BANCO -> AVISA O SOCKET
                if(socket && meuUser) {
                    // CORREÇÃO AQUI: Garante que pega o ID correto
                    const meuIdCorreto = meuUser._id || meuUser.id;
                    
                    socket.emit('enviar_mensagem', {
                        destinatarioId: chatAmigoIdAtual,
                        texto: texto,
                        remetenteId: meuIdCorreto // Envia o ID certo pro servidor
                    });
                }
            } else {
                console.error('Erro ao salvar mensagem no servidor.');
            }

        } catch (error) {
            console.error('Erro de conexão:', error);
        }
    }

    function adicionarMensagemNaTela(texto, souEu) {
        const div = document.createElement('div');
        div.className = `flex ${souEu ? 'justify-end' : 'justify-start'}`;
        div.innerHTML = `<div class="${souEu ? 'bg-neon-blue text-black' : 'bg-gray-700 text-white'} px-3 py-2 rounded-lg max-w-[80%] text-sm break-words shadow-sm">${texto}</div>`;
        chatMessages.appendChild(div);
    }

    function rolarParaBaixo() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }


    // --- RENDERIZAR ATIVIDADES NA PÁGINA ---
    function renderizarAtividades(atividades) {
        const container = document.getElementById('lista-atividades');
        
        if (!atividades || atividades.length === 0) {
            container.innerHTML = '<p class="col-span-full text-center text-gray-500 py-10">Este usuário não tem atividades públicas recentes.</p>';
            return;
        }

        container.innerHTML = atividades.map(a => {
            const idAtividade = a._id || a.id;
            
            return `
            <div class="bg-dark-highlight border border-gray-700 p-4 rounded-lg hover:border-neon-blue transition cursor-pointer group" onclick="window.location.href='atividade.html?id=${idAtividade}'">
                <div class="flex justify-between items-start mb-2">
                    <h4 class="font-bold text-white truncate w-3/4 group-hover:text-neon-blue transition">${a.titulo}</h4>
                    <span class="text-xs bg-neon-blue/10 text-neon-blue px-2 py-1 rounded border border-neon-blue/20">${a.esporte}</span>
                </div>
                <div class="space-y-1">
                    <p class="text-gray-400 text-sm flex items-center gap-2"><i class="fa-solid fa-location-dot w-5 text-center text-gray-600"></i> ${a.local}</p>
                    <p class="text-gray-400 text-sm flex items-center gap-2"><i class="fa-solid fa-calendar-days w-5 text-center text-gray-600"></i> ${new Date(a.data_hora).toLocaleDateString()}</p>
                </div>
            </div>
        `}).join('');
    }

    // Função auxiliar para garantir que pega o usuário
    function getUsuarioLogado() {
        try { 
            return JSON.parse(localStorage.getItem('userInfo')); 
        } catch { 
            return null; 
        }
    }
});