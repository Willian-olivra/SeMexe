document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    const userInfo = getUsuarioLogado();

    if (!token || !userInfo) { window.location.href = 'login.html'; return; }

    document.getElementById('perfil-nome').textContent = userInfo.nome || 'Usuário';
    document.getElementById('perfil-email').textContent = userInfo.email || '';
    document.getElementById('avatar-letra').textContent = (userInfo.nome || '?').charAt(0).toUpperCase();

    fetch('/api/atividades/minhas', { headers: { 'Authorization': `Bearer ${token}` } })
        .then(res => res.json()).then(data => { 
            const el = document.getElementById('contador-atividades');
            if(el) el.textContent = data.length || 0; 
        });

    async function carregarMeusAmigos() {
        const container = document.getElementById('lista-amigos');
        const contador = document.getElementById('contador-amigos');
        try {
            const res = await fetch('/api/amigos', { headers: { 'Authorization': `Bearer ${token}` } });
            const amigos = await res.json();
            if(contador) contador.textContent = amigos.length;

            if (amigos.length === 0) { container.innerHTML = '<p class="col-span-full text-center text-gray-500 py-10">Sem amigos.</p>'; return; }

            container.innerHTML = amigos.map(u => `
                <div class="flex items-center justify-between bg-dark-highlight p-3 rounded-lg border border-gray-700 animate-fade-in group hover:border-gray-600 transition">
                    <div class="flex items-center gap-3 cursor-pointer" onclick="window.location.href='perfilUsuario.html?id=${u.id}'">
                        <div class="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-white font-bold">${u.nome.charAt(0).toUpperCase()}</div>
                        <div><p class="text-white font-medium hover:text-neon-blue transition">${u.nome}</p><p class="text-xs text-gray-400">${u.email}</p></div>
                    </div>
                    <button onclick="removerAmigo(${u.id}, '${u.nome}')" class="text-gray-500 hover:text-neon-pink transition opacity-0 group-hover:opacity-100 p-2"><i class="fa-solid fa-trash-can"></i></button>
                </div>
            `).join('');
        } catch (e) { console.error(e); }
    }

    async function carregarSolicitacoes() {
        const container = document.getElementById('lista-solicitacoes');
        const badge = document.getElementById('badge-solicitacoes');
        try {
            const res = await fetch('/api/amigos/pendentes', { headers: { 'Authorization': `Bearer ${token}` } });
            const pendentes = await res.json();

            if (pendentes.length > 0) {
                if(badge) badge.classList.remove('hidden');
                container.innerHTML = pendentes.map(u => `
                    <div class="flex items-center justify-between bg-dark-highlight p-4 rounded-lg border border-gray-700 animate-fade-in">
                        <div class="flex items-center gap-3 cursor-pointer" onclick="window.location.href='perfilUsuario.html?id=${u.id}'">
                            <div class="w-10 h-10 rounded-full bg-neon-pink text-black font-bold flex items-center justify-center">${u.nome.charAt(0).toUpperCase()}</div>
                            <div><p class="text-white font-bold text-sm hover:text-neon-blue transition">${u.nome}</p><p class="text-gray-400 text-xs">Quer ser seu amigo</p></div>
                        </div>
                        <div class="flex gap-2">
                            <button onclick="responderSolicitacao(${u.id}, 'aceitar')" class="bg-neon-blue text-black px-3 py-1 rounded text-xs font-bold hover:bg-white transition"><i class="fa-solid fa-check"></i></button>
                            <button onclick="responderSolicitacao(${u.id}, 'recusar')" class="bg-transparent border border-gray-600 text-gray-400 px-3 py-1 rounded text-xs font-bold hover:text-white transition"><i class="fa-solid fa-xmark"></i></button>
                        </div>
                    </div>
                `).join('');
            } else {
                if(badge) badge.classList.add('hidden');
                container.innerHTML = '<p class="text-gray-500 text-center py-6">Nenhuma solicitação.</p>';
            }
        } catch (e) { console.error(e); }
    }

    window.removerAmigo = async function(amigoId, nomeAmigo) {
        if (!confirm(`Remover ${nomeAmigo}?`)) return;
        try {
            const res = await fetch(`/api/amigos/${amigoId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) { showToast('Amigo removido.', 'success'); carregarMeusAmigos(); }
        } catch (e) { showToast('Erro.', 'error'); }
    };

    window.responderSolicitacao = async function(amigoId, acao) {
        try {
            const res = await fetch('/api/amigos/responder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ amigoId, acao })
            });
            if (res.ok) { showToast('Feito!', 'success'); carregarSolicitacoes(); if (acao === 'aceitar') carregarMeusAmigos(); }
        } catch (e) { showToast('Erro.', 'error'); }
    };

    window.adicionarAmigo = async function(friendId) {
        try {
            const res = await fetch('/api/amigos/solicitar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ amigoId: friendId })
            });
            if (res.ok) showToast('Solicitação enviada!', 'success');
            else showToast('Erro ou já enviado.', 'warning');
        } catch (e) { showToast('Erro.', 'error'); }
    };

    const inputBusca = document.getElementById('input-busca');
    const containerResultados = document.getElementById('resultados-busca');
    let timeoutBusca = null;

    if (inputBusca) {
        inputBusca.addEventListener('input', (e) => {
            const termo = e.target.value.trim();
            clearTimeout(timeoutBusca);
            if (termo.length < 3) { containerResultados.innerHTML = '<p class="text-gray-500 text-center text-sm">Digite 3 letras...</p>'; return; }

            timeoutBusca = setTimeout(async () => {
                containerResultados.innerHTML = '<p class="text-gray-500 text-center text-sm">Buscando...</p>';
                try {
                    const res = await fetch(`/api/users/buscar?q=${encodeURIComponent(termo)}`);
                    if (res.ok) {
                        const usuarios = await res.json();
                        const filtrados = usuarios.filter(u => u.id !== userInfo.id);
                        containerResultados.innerHTML = filtrados.length ? filtrados.map(u => `
                            <div class="flex items-center justify-between bg-dark-highlight p-3 rounded-lg border border-gray-700 hover:border-gray-600 transition animate-fade-in">
                                <div class="flex items-center gap-3 cursor-pointer" onclick="window.location.href='perfilUsuario.html?id=${u.id}'">
                                    <div class="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-white font-bold text-xs border border-gray-500">${u.nome.charAt(0).toUpperCase()}</div>
                                    <div><p class="text-white font-medium text-sm hover:text-neon-blue transition">${u.nome}</p><p class="text-xs text-gray-400">${u.email}</p></div>
                                </div>
                                <button onclick="adicionarAmigo(${u.id})" class="bg-neon-blue text-black px-3 py-1 rounded text-xs font-bold hover:bg-white transition flex items-center gap-1"><i class="fa-solid fa-user-plus"></i> Add</button>
                            </div>`).join('') : '<p class="text-gray-500 text-center text-sm">Ninguém encontrado.</p>';
                    }
                } catch (e) { console.error(e); }
            }, 500);
        });
    }

    carregarMeusAmigos();
    carregarSolicitacoes();
});