document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    const userInfo = getUsuarioLogado();

    // Redireciona se não estiver logado
    if (!token || !userInfo) { 
        window.location.href = 'login.html'; 
        return; 
    }

    // --- 1. Exibição do Perfil (Nome, Email e Avatar) ---
    document.getElementById('perfil-nome').textContent = userInfo.nome || 'Usuário';
    document.getElementById('perfil-email').textContent = userInfo.email || '';

    const avatarElement = document.getElementById('avatar-letra');
    if (avatarElement) {
        if (userInfo.avatar && userInfo.avatar.includes('fa-')) {
            // Se for um ícone (FontAwesome)
            avatarElement.textContent = ''; 
            avatarElement.innerHTML = `<i class="${userInfo.avatar} text-2xl"></i>`; 
        } else {
            // Se for apenas letra inicial
            avatarElement.textContent = (userInfo.nome || '?').charAt(0).toUpperCase();
        }
    }

    // --- 2. Carregar Contagem de Atividades ---
    try {
        const res = await fetch('/api/atividades/minhas', { 
            headers: { 'Authorization': `Bearer ${token}` } 
        });
        if (res.ok) {
            const data = await res.json();
            const el = document.getElementById('contador-atividades');
            if(el) el.textContent = data.length || 0; 
        }
    } catch (error) {
        console.error("Erro ao carregar contador:", error);
    }

    // --- 3. Carregar Meus Amigos ---
    async function carregarMeusAmigos() {
        const container = document.getElementById('lista-amigos');
        const contador = document.getElementById('contador-amigos');
        
        try {
            const res = await fetch('/api/amigos', { 
                headers: { 'Authorization': `Bearer ${token}` } 
            });
            const amigos = await res.json();
            
            if(contador) contador.textContent = amigos.length;

            if (amigos.length === 0) { 
                container.innerHTML = '<p class="col-span-full text-center text-gray-500 py-10">Você ainda não adicionou amigos.</p>'; 
                return; 
            }

            container.innerHTML = amigos.map(u => {
                const idCorreto = u._id || u.id; // Garante pegar o ID certo do Mongo
                return `
                <div class="flex items-center justify-between bg-dark-highlight p-3 rounded-lg border border-gray-700 animate-fade-in group hover:border-gray-600 transition">
                    <div class="flex items-center gap-3 cursor-pointer" onclick="window.location.href='perfilUsuario.html?id=${idCorreto}'">
                        <div class="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-white font-bold border border-gray-600">
                             ${u.avatar && u.avatar.includes('fa-') ? `<i class="${u.avatar}"></i>` : u.nome.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <p class="text-white font-medium hover:text-neon-blue transition">${u.nome}</p>
                            <p class="text-xs text-gray-400">${u.email}</p>
                        </div>
                    </div>
                    <button onclick="removerAmigo('${idCorreto}', '${u.nome}')" class="text-gray-500 hover:text-neon-pink transition opacity-0 group-hover:opacity-100 p-2" title="Remover amigo">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            `}).join('');
        } catch (e) { console.error(e); }
    }

    // --- 4. Carregar Solicitações Pendentes ---
    async function carregarSolicitacoes() {
        const container = document.getElementById('lista-solicitacoes');
        const badge = document.getElementById('badge-solicitacoes');
        
        try {
            const res = await fetch('/api/amigos/pendentes', { 
                headers: { 'Authorization': `Bearer ${token}` } 
            });
            const pendentes = await res.json();

            if (pendentes.length > 0) {
                if(badge) badge.classList.remove('hidden');
                container.innerHTML = pendentes.map(u => {
                    const idCorreto = u._id || u.id;
                    return `
                    <div class="flex items-center justify-between bg-dark-highlight p-4 rounded-lg border border-gray-700 animate-fade-in">
                        <div class="flex items-center gap-3 cursor-pointer" onclick="window.location.href='perfilUsuario.html?id=${idCorreto}'">
                            <div class="w-10 h-10 rounded-full bg-neon-pink text-black font-bold flex items-center justify-center border border-neon-pink/50">
                                ${u.avatar && u.avatar.includes('fa-') ? `<i class="${u.avatar}"></i>` : u.nome.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <p class="text-white font-bold text-sm hover:text-neon-blue transition">${u.nome}</p>
                                <p class="text-gray-400 text-xs">Quer ser seu amigo</p>
                            </div>
                        </div>
                        <div class="flex gap-2">
                            <button onclick="responderSolicitacao('${idCorreto}', 'aceitar')" class="bg-neon-blue text-black px-3 py-1 rounded text-xs font-bold hover:bg-white transition"><i class="fa-solid fa-check"></i></button>
                            <button onclick="responderSolicitacao('${idCorreto}', 'recusar')" class="bg-transparent border border-gray-600 text-gray-400 px-3 py-1 rounded text-xs font-bold hover:text-white transition"><i class="fa-solid fa-xmark"></i></button>
                        </div>
                    </div>
                `}).join('');
            } else {
                if(badge) badge.classList.add('hidden');
                container.innerHTML = '<p class="text-gray-500 text-center py-6">Nenhuma solicitação pendente.</p>';
            }
        } catch (e) { console.error(e); }
    }

    // --- Funções Globais (Acessíveis pelo HTML) ---

    window.removerAmigo = async function(amigoId, nomeAmigo) {
        if (!confirm(`Tem certeza que deseja remover ${nomeAmigo} da sua lista de amigos?`)) return;
        try {
            const res = await fetch(`/api/amigos/${amigoId}`, { 
                method: 'DELETE', 
                headers: { 'Authorization': `Bearer ${token}` } 
            });
            if (res.ok) { 
                showToast('Amigo removido.', 'success'); 
                carregarMeusAmigos(); 
            }
        } catch (e) { showToast('Erro ao remover.', 'error'); }
    };

    window.responderSolicitacao = async function(amigoId, acao) {
        try {
            const res = await fetch('/api/amigos/responder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ amigoId, acao })
            });
            if (res.ok) { 
                showToast(acao === 'aceitar' ? 'Solicitação aceita!' : 'Solicitação recusada.', 'success'); 
                carregarSolicitacoes(); 
                if (acao === 'aceitar') carregarMeusAmigos(); 
            }
        } catch (e) { showToast('Erro ao responder.', 'error'); }
    };

    window.adicionarAmigo = async function(friendId) {
        const btn = event.target.closest('button'); 
        const originalContent = btn.innerHTML;
        
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

        try {
            const res = await fetch('/api/amigos/solicitar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ amigoId: friendId })
            });
            
            if (res.ok) {
                showToast('Solicitação enviada!', 'success');
                btn.innerHTML = '<i class="fa-solid fa-check"></i> Enviado';
                btn.classList.remove('bg-neon-blue', 'text-black');
                btn.classList.add('bg-green-500', 'text-white');
            } else {
                const data = await res.json();
                showToast(data.error || 'Erro ao adicionar.', 'warning');
                btn.innerHTML = originalContent;
                btn.disabled = false;
            }
        } catch (e) { 
            console.error(e);
            showToast('Erro de conexão.', 'error');
            btn.innerHTML = originalContent;
            btn.disabled = false;
        }
    };

    // --- 5. Sistema de Busca de Usuários ---
    const inputBusca = document.getElementById('input-busca');
    const containerResultados = document.getElementById('resultados-busca');
    let timeoutBusca = null;

    if (inputBusca) {
        inputBusca.addEventListener('input', (e) => {
            const termo = e.target.value.trim();
            clearTimeout(timeoutBusca);
            
            if (termo.length < 3) { 
                containerResultados.innerHTML = '<p class="text-gray-500 text-center text-sm">Digite pelo menos 3 letras...</p>'; 
                return; 
            }

            timeoutBusca = setTimeout(async () => {
                containerResultados.innerHTML = '<p class="text-gray-500 text-center text-sm"><i class="fa-solid fa-spinner fa-spin"></i> Buscando...</p>';
                try {
                    const res = await fetch(`/api/users/buscar?q=${encodeURIComponent(termo)}`);
                    if (res.ok) {
                        const usuarios = await res.json();
                        
                        // FILTRO IMPORTANTE: Remove eu mesmo da lista usando .toString()
                        const filtrados = usuarios.filter(u => {
                            const uId = u._id || u.id;
                            const myId = userInfo.id || userInfo._id;
                            return uId.toString() !== myId.toString();
                        });
                        
                        if (filtrados.length === 0) {
                            containerResultados.innerHTML = '<p class="text-gray-500 text-center text-sm">Nenhum usuário encontrado.</p>';
                            return;
                        }

                        containerResultados.innerHTML = filtrados.map(u => {
                            const idCorreto = u._id || u.id;
                            return `
                            <div class="flex items-center justify-between bg-dark-highlight p-3 rounded-lg border border-gray-700 hover:border-gray-600 transition animate-fade-in">
                                <div class="flex items-center gap-3 cursor-pointer" onclick="window.location.href='perfilUsuario.html?id=${idCorreto}'">
                                    <div class="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-white font-bold text-xs border border-gray-500">
                                        ${u.avatar && u.avatar.includes('fa-') ? `<i class="${u.avatar}"></i>` : u.nome.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p class="text-white font-medium text-sm hover:text-neon-blue transition">${u.nome}</p>
                                        <p class="text-xs text-gray-400">${u.email}</p>
                                    </div>
                                </div>
                                <button onclick="window.adicionarAmigo('${idCorreto}')" class="bg-neon-blue text-black px-3 py-1 rounded text-xs font-bold hover:bg-white transition flex items-center gap-1 z-10 relative">
                                    <i class="fa-solid fa-user-plus"></i> Add
                                </button>
                            </div>`
                        }).join('');
                    }
                } catch (e) { console.error(e); }
            }, 500);
        });
    }

    // --- 6. Modal de Edição de Perfil ---
    const modalEditar = document.getElementById('modal-editar-perfil');
    const formEditar = document.getElementById('form-editar-perfil');
    const inputNome = document.getElementById('edit-nome');

    window.abrirModalEditar = function() {
        if(!modalEditar || !inputNome) return;
        inputNome.value = userInfo.nome;
        
        // Marca o avatar atual
        const currentAvatar = userInfo.avatar || 'fa-solid fa-user';
        const radios = document.getElementsByName('avatar-selecionado');
        for(let r of radios) {
            if(r.value === currentAvatar) {
                r.checked = true;
            }
        }

        modalEditar.classList.remove('hidden');
        // Animação suave
        setTimeout(() => {
            modalEditar.classList.remove('opacity-0');
            modalEditar.querySelector('div').classList.remove('scale-95');
            modalEditar.querySelector('div').classList.add('scale-100');
        }, 10);
    };

    window.fecharModalEditar = function() {
        if(!modalEditar) return;
        modalEditar.classList.add('opacity-0');
        modalEditar.querySelector('div').classList.remove('scale-100');
        modalEditar.querySelector('div').classList.add('scale-95');
        setTimeout(() => modalEditar.classList.add('hidden'), 300);
    };

    if(formEditar) {
        formEditar.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const btnSalvar = document.getElementById('btn-salvar-perfil');
            const originalText = btnSalvar.innerHTML;
            btnSalvar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
            btnSalvar.disabled = true;

            const novoNome = inputNome.value.trim();
            const avatarSelecionado = document.querySelector('input[name="avatar-selecionado"]:checked');
            const novoAvatar = avatarSelecionado ? avatarSelecionado.value : (userInfo.avatar || 'fa-solid fa-user');

            try {
                const res = await fetch('/api/users/perfil', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ nome: novoNome, avatar: novoAvatar })
                });

                if(res.ok) {
                    // Atualiza o LocalStorage com os novos dados
                    const newUserInfo = { ...userInfo, nome: novoNome, avatar: novoAvatar };
                    localStorage.setItem('userInfo', JSON.stringify(newUserInfo));
                    
                    showToast('Perfil atualizado com sucesso!', 'success');
                    setTimeout(() => location.reload(), 1000);
                } else {
                    const errData = await res.json();
                    showToast(errData.error || 'Erro ao atualizar.', 'error');
                }
            } catch (error) {
                console.error(error);
                showToast('Erro de conexão.', 'error');
            } finally {
                btnSalvar.innerHTML = originalText;
                btnSalvar.disabled = false;
            }
        });
    }

    // Fecha modal ao clicar fora
    if(modalEditar) {
        modalEditar.addEventListener('click', (e) => {
            if(e.target === modalEditar) fecharModalEditar();
        });
    }

    // Inicialização
    carregarMeusAmigos();
    carregarSolicitacoes();
});