document.addEventListener('DOMContentLoaded', async () => {
    // Carrega o menu
    if (typeof atualizarMenu === 'function') atualizarMenu();

    const params = new URLSearchParams(window.location.search);
    const userId = params.get('id');
    const token = localStorage.getItem('token');
    const meuUser = getUsuarioLogado();

    if (!userId) { window.location.href = 'index.html'; return; }

    // Se for meu perfil, redireciona
    if (meuUser && parseInt(userId) === parseInt(meuUser.id)) {
        window.location.href = 'perfil.html';
        return;
    }

    // Elementos da UI
    const btnAdd = document.getElementById('btn-add');
    const btnPending = document.getElementById('btn-pending');
    const areaAmigo = document.getElementById('area-amigo');
    const btnRemove = document.getElementById('btn-remove');
    const btnMsg = document.getElementById('btn-mensagem');
    const actionsContainer = document.getElementById('friend-actions');

    // Variáveis Chat
    let socket;
    const chatWindow = document.getElementById('chat-window');
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const btnCloseChat = document.getElementById('chat-close'); // Botão X

    // --- CORREÇÃO: LÓGICA DE FECHAR O CHAT (GLOBAL) ---
    if (btnCloseChat) {
        btnCloseChat.addEventListener('click', () => {
            chatWindow.classList.add('hidden');
            chatWindow.style.display = 'none'; // Garante que suma
        });
    }

    // 1. Carrega Dados do Usuário
    try {
        const res = await fetch(`/api/users/${userId}`);
        if (!res.ok) throw new Error('Usuário não encontrado');
        
        const user = await res.json();
        
        document.getElementById('perfil-nome').textContent = user.nome;
        document.getElementById('perfil-email').textContent = user.email;
        document.getElementById('avatar-letra').textContent = user.nome.charAt(0).toUpperCase();

        // Se estiver logado, verifica o status da amizade
        if (token) {
            actionsContainer.classList.remove('hidden');
            verificarStatusAmizade(user.id);
        }

    } catch (error) {
        console.error(error);
        document.getElementById('perfil-nome').textContent = 'Usuário não encontrado';
        document.getElementById('lista-atividades').innerHTML = '';
    }

    // 2. Carrega Atividades Públicas
    try {
        const res = await fetch(`/api/atividades/usuario/${userId}`);
        const atividades = await res.json();
        renderizarAtividades(atividades);
    } catch (error) { console.error(error); }

    // --- LÓGICA DE AMIZADE EM TEMPO REAL ---

    async function verificarStatusAmizade(amigoId) {
        try {
            const res = await fetch(`/api/amigos/check/${amigoId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            
            // Reseta visualização
            btnAdd.classList.add('hidden');
            btnPending.classList.add('hidden');
            areaAmigo.classList.add('hidden');
            areaAmigo.style.display = 'none';

            if (data.status === 'nenhum') {
                btnAdd.classList.remove('hidden');
                btnAdd.onclick = () => enviarSolicitacao(amigoId);
            
            } else if (data.status === 'enviado') {
                btnPending.classList.remove('hidden');
                btnPending.innerHTML = '<i class="fa-solid fa-clock"></i> Solicitação Enviada';
            
            } else if (data.status === 'recebido') {
                btnPending.classList.remove('hidden');
                btnPending.innerHTML = '<i class="fa-solid fa-envelope"></i> Pedido Recebido (Ver Perfil)';
                btnPending.onclick = () => window.location.href = 'perfil.html';
                btnPending.classList.remove('cursor-default', 'opacity-70');
                btnPending.classList.add('cursor-pointer', 'hover:bg-gray-600');

            } else if (data.status === 'aceito') {
                areaAmigo.classList.remove('hidden');
                areaAmigo.style.display = 'flex';
                
                // Configura remover
                const novoBtnRemove = btnRemove.cloneNode(true);
                btnRemove.parentNode.replaceChild(novoBtnRemove, btnRemove);
                novoBtnRemove.onclick = () => removerAmizade(amigoId, document.getElementById('perfil-nome').textContent);
                
                // Configura botão de mensagem
                const novoBtnMsg = btnMsg.cloneNode(true);
                btnMsg.parentNode.replaceChild(novoBtnMsg, btnMsg);
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
        let confirmado = false;
        if (typeof showConfirmModal === 'function') {
            confirmado = await showConfirmModal(`Desfazer amizade com ${nomeAmigo}?`, 'Sim, desfazer', 'Cancelar');
        } else {
            confirmado = confirm(`Desfazer amizade com ${nomeAmigo}?`);
        }

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
        } catch (error) {
            showToast('Erro de conexão.', 'error');
        }
    }

    // --- LÓGICA DO CHAT ---

    function abrirChat(amigoId, nomeAmigo) {
        chatWindow.classList.remove('hidden');
        chatWindow.style.display = 'flex'; // Garante flex
        document.getElementById('chat-amigo-nome').textContent = nomeAmigo;
        
        if (!socket) {
            socket = io();
            socket.emit('entrar_chat', meuUser.id);

            socket.on('receber_mensagem', (data) => {
                if (parseInt(data.remetenteId) === parseInt(amigoId) || parseInt(data.remetenteId) === parseInt(meuUser.id)) {
                    adicionarMensagemNaTela(data.texto, parseInt(data.remetenteId) === parseInt(meuUser.id));
                }
            });
        }

        carregarHistorico(amigoId);

        const enviar = () => {
            const texto = chatInput.value.trim();
            if (!texto) return;
            
            socket.emit('enviar_mensagem', {
                remetenteId: meuUser.id,
                destinatarioId: amigoId,
                texto: texto
            });

            adicionarMensagemNaTela(texto, true);
            chatInput.value = '';
        };

        const btnSend = document.getElementById('chat-send');
        const newBtnSend = btnSend.cloneNode(true);
        btnSend.parentNode.replaceChild(newBtnSend, btnSend);
        
        newBtnSend.onclick = enviar;
        chatInput.onkeypress = (e) => { if(e.key === 'Enter') enviar(); };
    }

    async function carregarHistorico(amigoId) {
        chatMessages.innerHTML = '<p class="text-center text-gray-600 text-xs py-4">Carregando...</p>';
        try {
            const res = await fetch(`/api/chat/historico/${amigoId}`, { headers: { 'Authorization': `Bearer ${token}` } });
            const msgs = await res.json();
            chatMessages.innerHTML = '';
            msgs.forEach(m => {
                adicionarMensagemNaTela(m.mensagem, parseInt(m.remetente_id) === parseInt(meuUser.id));
            });
            chatMessages.scrollTop = chatMessages.scrollHeight;
        } catch (e) { 
            console.error(e); 
            chatMessages.innerHTML = '<p class="text-center text-neon-pink text-xs">Erro no histórico.</p>';
        }
    }

    function adicionarMensagemNaTela(texto, souEu) {
        const div = document.createElement('div');
        div.className = `flex ${souEu ? 'justify-end' : 'justify-start'}`;
        div.innerHTML = `
            <div class="${souEu ? 'bg-neon-blue text-black' : 'bg-gray-700 text-white'} px-3 py-2 rounded-lg max-w-[80%] text-sm break-words shadow-sm animate-fade-in">
                ${texto}
            </div>
        `;
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // --- RENDERIZAÇÃO DE ATIVIDADES ---

    function renderizarAtividades(atividades) {
        const container = document.getElementById('lista-atividades');
        
        if (atividades.length === 0) {
            container.innerHTML = '<p class="col-span-full text-center text-gray-500 py-10">Este usuário não tem atividades públicas recentes.</p>';
            return;
        }

        container.innerHTML = atividades.map(a => `
            <div class="bg-dark-highlight border border-gray-700 p-4 rounded-lg hover:border-neon-blue transition cursor-pointer group" onclick="window.location.href='atividade.html?id=${a.id}'">
                <div class="flex justify-between items-start mb-2">
                    <h4 class="font-bold text-white truncate w-3/4 group-hover:text-neon-blue transition">${a.titulo}</h4>
                    <span class="text-xs bg-neon-blue/10 text-neon-blue px-2 py-1 rounded border border-neon-blue/20">${a.esporte}</span>
                </div>
                <div class="space-y-1">
                    <p class="text-gray-400 text-sm flex items-center gap-2">
                        <i class="fa-solid fa-location-dot w-5 text-center text-gray-600"></i> ${a.local}
                    </p>
                    <p class="text-gray-400 text-sm flex items-center gap-2">
                        <i class="fa-solid fa-calendar-days w-5 text-center text-gray-600"></i> ${new Date(a.data_hora).toLocaleDateString()}
                    </p>
                </div>
            </div>
        `).join('');
    }
});