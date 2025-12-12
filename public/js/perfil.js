document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    if (!token) { window.location.href = 'login.html'; return; }

    // Elementos
    const els = {
        nomeInput: document.getElementById('input-nome'),
        emailDisplay: document.getElementById('display-email'),
        bioInput: document.getElementById('input-bio'),
        cidadeInput: document.getElementById('input-cidade'),
        instaInput: document.getElementById('input-instagram'),
        
        imgPreview: document.getElementById('profile-img-preview'),
        iconDefault: document.getElementById('profile-icon-default'),
        fileInput: document.getElementById('upload-avatar'),
        loading: document.getElementById('img-loading'),
        
        fairplay: document.getElementById('stat-fairplay'),
        faltas: document.getElementById('stat-faltas'),
        
        form: document.getElementById('form-perfil'),
        btnSalvar: document.getElementById('btn-salvar'),
        
        sportTags: document.querySelectorAll('.sport-tag'),
        
        // Listas
        boxSolicitacoes: document.getElementById('lista-solicitacoes'),
        boxAmigos: document.getElementById('lista-amigos')
    };

    let avatarBase64 = null;
    let meusEsportes = [];

    // --- 1. CARREGAR DADOS BÁSICOS ---
    try {
        const res = await fetch('/api/users/me', { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) throw new Error('Erro ao carregar');
        const user = await res.json();

        // Campos
        els.nomeInput.value = user.nome;
        els.emailDisplay.innerText = user.email;
        els.bioInput.value = user.bio || '';
        els.cidadeInput.value = user.cidade || '';
        els.instaInput.value = user.instagram || '';

        // Avatar
        if (user.avatar && user.avatar.startsWith('data:image')) {
            els.imgPreview.src = user.avatar;
            els.imgPreview.classList.remove('hidden');
            els.iconDefault.classList.add('hidden');
        } else {
            els.imgPreview.classList.add('hidden');
            els.iconDefault.classList.remove('hidden');
        }

        // Stats
        if (user.fairplayNota !== undefined) els.fairplay.innerText = user.fairplayNota.toFixed(1);
        if (user.faltas !== undefined) els.faltas.innerText = user.faltas;

        // Esportes
        if (user.esportes) {
            meusEsportes = user.esportes;
            atualizarTagsVisuais();
        }

    } catch (error) { console.error(error); }

    // --- 2. CARREGAR AMIGOS E SOLICITAÇÕES ---
    window.carregarListas = async function() {
        // Solicitações
        try {
            const res = await fetch('/api/amigos/pendentes', { headers: { 'Authorization': `Bearer ${token}` } });
            const pendentes = await res.json();
            
            if (pendentes.length === 0) {
                els.boxSolicitacoes.innerHTML = '<p class="text-gray-600 text-sm italic">Nenhuma solicitação pendente.</p>';
            } else {
                els.boxSolicitacoes.innerHTML = pendentes.map(u => `
                    <div class="flex items-center justify-between bg-dark-base p-3 rounded-xl border border-gray-700 animate-fade-in">
                        <div class="flex items-center gap-3 cursor-pointer" onclick="window.location.href='perfilUsuario.html?id=${u._id}'">
                            <div class="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center border border-gray-600 overflow-hidden">
                                ${u.avatar && u.avatar.startsWith('data:') ? `<img src="${u.avatar}" class="w-full h-full object-cover">` : '<i class="fa-solid fa-user text-xs"></i>'}
                            </div>
                            <span class="text-sm font-bold text-white hover:text-neon-blue">${u.nome}</span>
                        </div>
                        <div class="flex gap-2">
                            <button onclick="responderSolicitacao('${u._id}', 'aceitar')" class="text-green-400 hover:bg-green-500/10 p-1.5 rounded transition" title="Aceitar"><i class="fa-solid fa-check"></i></button>
                            <button onclick="responderSolicitacao('${u._id}', 'recusar')" class="text-red-400 hover:bg-red-500/10 p-1.5 rounded transition" title="Recusar"><i class="fa-solid fa-xmark"></i></button>
                        </div>
                    </div>
                `).join('');
            }
        } catch(e) { console.error(e); }

        // Amigos
        try {
            const res = await fetch('/api/amigos', { headers: { 'Authorization': `Bearer ${token}` } });
            const amigos = await res.json();
            
            if (amigos.length === 0) {
                els.boxAmigos.innerHTML = '<p class="text-gray-600 text-sm italic">Você ainda não tem amigos.</p>';
            } else {
                els.boxAmigos.innerHTML = amigos.map(u => `
                    <div class="flex items-center justify-between bg-dark-base p-3 rounded-xl border border-gray-700 hover:border-gray-600 transition group animate-fade-in">
                        <div class="flex items-center gap-3 cursor-pointer" onclick="window.location.href='perfilUsuario.html?id=${u._id}'">
                            <div class="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center border border-gray-600 overflow-hidden">
                                ${u.avatar && u.avatar.startsWith('data:') ? `<img src="${u.avatar}" class="w-full h-full object-cover">` : '<i class="fa-solid fa-user text-xs"></i>'}
                            </div>
                            <div>
                                <p class="text-sm font-bold text-white hover:text-neon-blue">${u.nome}</p>
                                <p class="text-[10px] text-gray-500">${u.cidade || 'Sem local'}</p>
                            </div>
                        </div>
                        <button onclick="removerAmigo('${u._id}')" class="text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition p-2" title="Remover">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                `).join('');
            }
        } catch(e) { console.error(e); }
    };

    carregarListas();

    // --- 3. TAGS VISUAIS ---
    els.sportTags.forEach(btn => {
        btn.addEventListener('click', () => {
            const esporte = btn.dataset.sport;
            if (meusEsportes.includes(esporte)) meusEsportes = meusEsportes.filter(e => e !== esporte);
            else meusEsportes.push(esporte);
            atualizarTagsVisuais();
        });
    });

    function atualizarTagsVisuais() {
        els.sportTags.forEach(btn => {
            if (meusEsportes.includes(btn.dataset.sport)) {
                btn.classList.add('bg-neon-blue/10', 'border-neon-blue', 'text-neon-blue');
                btn.classList.remove('bg-dark-base', 'border-gray-700', 'text-gray-400');
            } else {
                btn.classList.remove('bg-neon-blue/10', 'border-neon-blue', 'text-neon-blue');
                btn.classList.add('bg-dark-base', 'border-gray-700', 'text-gray-400');
            }
        });
    }

    // --- 4. UPLOAD DE FOTO ---
    if(els.fileInput) {
        els.fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            if (file.size > 70 * 1024) { showToast('Imagem muito grande (Max 70KB).', 'warning'); return; }

            els.loading.classList.remove('hidden');
            const reader = new FileReader();
            reader.onload = function(ev) {
                avatarBase64 = ev.target.result;
                els.imgPreview.src = avatarBase64;
                els.imgPreview.classList.remove('hidden');
                els.iconDefault.classList.add('hidden');
                els.loading.classList.add('hidden');
            };
            reader.readAsDataURL(file);
        });
    }

    // --- 5. SALVAR TUDO ---
    if(els.form) {
        els.form.addEventListener('submit', async (e) => {
            e.preventDefault();
            els.btnSalvar.disabled = true;
            els.btnSalvar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';

            try {
                const bodyData = {
                    nome: els.nomeInput.value.trim(),
                    bio: els.bioInput.value.trim(),
                    cidade: els.cidadeInput.value.trim(),
                    instagram: els.instaInput.value.trim(),
                    esportes: meusEsportes
                };
                if (avatarBase64) bodyData.avatar = avatarBase64;

                const res = await fetch('/api/users/me', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify(bodyData)
                });

                if (res.ok) {
                    showToast('Perfil salvo!', 'success');
                    const userInfo = JSON.parse(localStorage.getItem('userInfo')) || {};
                    userInfo.nome = bodyData.nome;
                    if(avatarBase64) userInfo.avatar = avatarBase64;
                    localStorage.setItem('userInfo', JSON.stringify(userInfo));
                    if(typeof atualizarMenu === 'function') atualizarMenu();
                } else {
                    throw new Error('Erro ao salvar');
                }
            } catch (error) {
                showToast('Erro ao salvar.', 'error');
            } finally {
                els.btnSalvar.disabled = false;
                els.btnSalvar.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Salvar Perfil';
            }
        });
    }
});

// --- FUNÇÕES GLOBAIS DE AÇÃO (Window) ---

window.responderSolicitacao = async (amigoId, acao) => {
    try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/amigos/responder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ amigoId, acao })
        });
        if (res.ok) {
            showToast(acao === 'aceitar' ? 'Amigo adicionado!' : 'Solicitação recusada.', 'success');
            if (typeof window.carregarListas === 'function') window.carregarListas();
        }
    } catch(e) { showToast('Erro na solicitação.', 'error'); }
};

window.removerAmigo = async (amigoId) => {
    // ALTERADO: Usa nosso modal estiloso em vez do confirm() nativo
    const confirmado = await showConfirmModal('Tem certeza que deseja remover este amigo?', 'Sim, Remover', 'Cancelar');
    
    if (!confirmado) return;

    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/amigos/${amigoId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
            showToast('Amigo removido com sucesso.', 'success');
            // Remove o item da lista visualmente ou recarrega
            if (typeof window.carregarListas === 'function') window.carregarListas();
        } else {
            showToast('Erro ao remover amigo.', 'error');
        }
    } catch(e) { 
        console.error(e);
        showToast('Erro de conexão.', 'error'); 
    }
};