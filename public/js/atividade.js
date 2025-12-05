document.addEventListener("DOMContentLoaded", async () => {
    if (typeof atualizarMenu === 'function') atualizarMenu();
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
  
    // 1. Proteção inicial (já existia, mantive)
    if (!id || id === 'undefined') { 
        console.warn('ID inválido ou inexistente. Redirecionando para a home.');
        window.location.href = 'index.html'; 
        return; 
    }
  
    const token = localStorage.getItem("token");
    const userInfo = getUsuarioLogado();
  
    try {
        const resAtividade = await fetch(`/api/atividades/${id}`);
        if (!resAtividade.ok) throw new Error('Atividade não encontrada');
        
        const atividade = await resAtividade.json();

        // CORREÇÃO CRÍTICA: Garante que o objeto atividade tenha um ID válido.
        // Se o banco não retornou 'id', usamos o ID que veio da URL (que sabemos que é válido).
        if (!atividade.id) {
            atividade.id = id;
        }
        
        renderizarAtividade(atividade);
        await configurarBotaoParticipacao(atividade, token, userInfo);
        await carregarParticipantes(id);
        renderizarMapa(atividade);
        
    } catch (error) {
        console.error('Erro:', error);
        const container = document.getElementById('atividade-info-container');
        if (container) {
             container.innerHTML = `<p class="text-neon-pink">Erro ao carregar detalhes: ${error.message}</p>`;
        }
    }
});

function renderizarAtividade(atividade) {
    // Adicionei verificação de segurança para elementos nulos
    const container = document.getElementById('atividade-info-container');
    if (!container) return;

    document.getElementById("titulo-atividade").innerText = atividade.titulo || "Sem Título";
    const iconeEsporte = getIconeEsporte(atividade.esporte);
    const dataFormatada = formatarDataHora(atividade.data_hora);

    const html = `
        <div class="bg-dark-highlight p-4 rounded-lg flex items-start gap-4 border border-gray-700">
            <i class="${iconeEsporte} text-2xl text-neon-blue mt-1"></i>
            <div><strong class="block text-gray-400 text-xs uppercase">Esporte</strong><span class="text-white text-lg">${atividade.esporte || '-'}</span></div>
        </div>
        <div class="bg-dark-highlight p-4 rounded-lg flex items-start gap-4 border border-gray-700">
            <i class="fa-solid fa-location-dot text-2xl text-neon-blue mt-1"></i>
            <div><strong class="block text-gray-400 text-xs uppercase">Local</strong><span class="text-white text-lg">${atividade.local || '-'}</span></div>
        </div>
        <div class="bg-dark-highlight p-4 rounded-lg flex items-start gap-4 border border-gray-700">
            <i class="fa-solid fa-calendar-days text-2xl text-neon-blue mt-1"></i>
            <div><strong class="block text-gray-400 text-xs uppercase">Data</strong><span class="text-white text-lg">${dataFormatada}</span></div>
        </div>
        <div class="bg-dark-highlight p-4 rounded-lg flex items-start gap-4 border border-gray-700">
            <i class="fa-solid fa-users text-2xl text-neon-blue mt-1"></i>
            <div><strong class="block text-gray-400 text-xs uppercase">Vagas</strong><span class="text-white text-lg">${atividade.vagas_disponiveis}/${atividade.vagas} ${atividade.lotada ? '(LOTADA)' : ''}</span></div>
        </div>
        <div class="bg-dark-highlight p-4 rounded-lg flex items-start gap-4 border border-gray-700 col-span-1 md:col-span-2">
            <i class="fa-solid fa-user-astronaut text-2xl text-neon-blue mt-1"></i>
            <div><strong class="block text-gray-400 text-xs uppercase">Organizador</strong><span class="text-white text-lg">${atividade.criador_nome || 'Anônimo'}</span></div>
        </div>
    `;
    container.innerHTML = html;
}

async function configurarBotaoParticipacao(atividade, token, userInfo) {
    const btn = document.getElementById("participar-btn");
    if (!btn) return;
  
    // CORREÇÃO: Se não tiver ID da atividade, bloqueia o botão para evitar erro
    if (!atividade.id) {
        console.error("ID da atividade indefinido ao configurar botão.");
        btn.disabled = true;
        btn.innerHTML = "Erro ao carregar ID";
        return;
    }

    if (!token) {
        btn.innerHTML = '<i class="fa-solid fa-lock"></i> Faça login para participar';
        btn.disabled = true;
        btn.className = "w-full bg-gray-800 text-gray-500 py-4 rounded-lg font-bold text-lg flex justify-center items-center gap-2 cursor-not-allowed";
        return;
    }
  
    if (userInfo && atividade.id_usuario === userInfo.id) {
        btn.innerHTML = '<i class="fa-solid fa-user-pen"></i> Você é o organizador';
        btn.disabled = true;
        btn.className = "w-full bg-dark-highlight text-neon-blue border border-neon-blue py-4 rounded-lg font-bold text-lg flex justify-center items-center gap-2 opacity-80 cursor-default";
        return;
    }
  
    const inscrito = await verificarInscricao(atividade.id, token);
    
    if (inscrito) {
        btn.innerHTML = '<i class="fa-solid fa-right-from-bracket"></i> Cancelar Inscrição';
        btn.className = "w-full bg-transparent border border-neon-pink text-neon-pink py-4 rounded-lg font-bold text-lg flex justify-center items-center gap-2 hover:bg-neon-pink hover:text-white transition shadow-[0_0_10px_rgba(255,0,127,0.3)]";
        btn.disabled = false;
        
        const novoBtn = btn.cloneNode(true);
        if(btn.parentNode) btn.parentNode.replaceChild(novoBtn, btn);
        novoBtn.addEventListener('click', () => cancelarInscricao(atividade.id, token));
    } else {
        if (atividade.lotada) {
            btn.innerHTML = '<i class="fa-solid fa-ban"></i> Lotada';
            btn.disabled = true;
            btn.className = "w-full bg-red-900/20 text-neon-pink border border-neon-pink py-4 rounded-lg font-bold text-lg flex justify-center items-center gap-2 cursor-not-allowed";
        } else {
            configurarBotaoParticipar(btn, atividade.id, token, atividade);
        }
    }
}

async function verificarInscricao(atividadeId, token) {
    // CORREÇÃO: Evita a chamada Fetch se o ID for inválido (Erro linha 103)
    if (!atividadeId || atividadeId === 'undefined') {
        console.warn("Tentativa de verificar inscrição com ID inválido");
        return false;
    }

    try {
        const res = await fetch(`/api/atividades/${atividadeId}/status`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            return data.inscrito;
        }
    } catch (e) { console.error(e); }
    return false;
}

function configurarBotaoParticipar(btn, atividadeId, token, atividade) {
    btn.innerHTML = `<i class="fa-solid fa-user-plus"></i> Confirmar Presença`;
    btn.className = "w-full bg-neon-blue text-black py-4 rounded-lg font-bold text-lg flex justify-center items-center gap-2 hover:bg-white hover:shadow-[0_0_20px_rgba(0,229,255,0.6)] transition shadow-lg cursor-pointer transform hover:-translate-y-1";
    btn.disabled = false;
  
    const novoBtn = btn.cloneNode(true);
    if(btn.parentNode) btn.parentNode.replaceChild(novoBtn, btn);

    novoBtn.addEventListener('click', async () => {
        // CORREÇÃO: Verificação extra antes do POST (Erro linha 130)
        if (!atividadeId || atividadeId === 'undefined') {
            showToast('Erro: ID da atividade inválido.', 'error');
            return;
        }

        const confirmado = await showConfirmModal(`Confirmar inscrição em "${atividade.titulo}"?`, 'Sim, Participar');
        if (!confirmado) return;
        
        novoBtn.disabled = true;
        novoBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processando...';
        
        try {
            const res = await fetch(`/api/atividades/${atividadeId}/participar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
            });
            
            if (res.ok) {
                showToast('Inscrição realizada! 🚀', 'success');
                setTimeout(() => location.reload(), 1000);
            } else {
                const data = await res.json();
                throw new Error(data.error || 'Erro ao participar');
            }
        } catch (e) { 
            showToast(e.message, 'error');
            novoBtn.disabled = false;
            novoBtn.innerHTML = `<i class="fa-solid fa-user-plus"></i> Tentar Novamente`;
        }
    });
}

async function cancelarInscricao(atividadeId, token) {
    if (!atividadeId || atividadeId === 'undefined') return;

    const confirmado = await showConfirmModal('Deseja cancelar sua inscrição? 😢', 'Sim, Cancelar');
    if (!confirmado) return;
    
    try {
        const res = await fetch(`/api/atividades/${atividadeId}/sair`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
            showToast('Inscrição cancelada.', 'warning');
            setTimeout(() => location.reload(), 1000);
        } else {
            showToast('Erro ao cancelar.', 'error');
        }
    } catch (error) {
        showToast('Erro de conexão.', 'error');
    }
}

async function carregarParticipantes(atividadeId) {
    const container = document.getElementById('participantes-container');
    if(!container) return;

    // Proteção extra
    if (!atividadeId || atividadeId === 'undefined') return;

    try {
        const res = await fetch(`/api/atividades/${atividadeId}/participantes`);
        const participantes = await res.json();
        
        if (!participantes || participantes.length === 0) {
            container.innerHTML = `<div class="text-center py-6 border border-dashed border-gray-800 rounded-lg text-gray-500">Nenhum participante ainda.</div>`;
            return;
        }

        container.innerHTML = `
            <h3 class="text-white font-bold mb-4 flex items-center gap-2 text-lg">
                <i class="fa-solid fa-users text-neon-blue"></i> Inscritos (${participantes.length})
            </h3>
            <ul class="grid grid-cols-1 md:grid-cols-2 gap-3">
                ${participantes.map(p => `
                    <li class="flex items-center gap-3 bg-dark-highlight p-3 rounded border border-gray-700">
                        <div class="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-neon-blue font-bold border border-gray-600">${p.nome ? p.nome.charAt(0).toUpperCase() : '?'}</div>
                        <div class="flex flex-col"><span class="text-gray-200 font-medium text-sm">${p.nome || 'Usuário'}</span><small class="text-gray-600 text-xs">${p.data_inscricao ? new Date(p.data_inscricao).toLocaleDateString() : '-'}</small></div>
                    </li>
                `).join('')}
            </ul>
        `;
    } catch (e) { console.error(e); }
}

function renderizarMapa(atividade) {
    const mapSection = document.getElementById("mapa-section");
    const mapDiv = document.getElementById("map");
    if (!mapSection || !mapDiv) return;
    
    mapSection.classList.remove('hidden');
    mapSection.style.display = 'block';
    
    let query = (atividade.latitude && atividade.longitude) 
        ? `${atividade.latitude},${atividade.longitude}`
        : encodeURIComponent(`${atividade.local}, Pelotas, RS, Brasil`);
    
    // Corrigido typo na URL do mapa
    mapDiv.innerHTML = `<iframe width="100%" height="100%" frameborder="0" style="border:0; width: 100%; height: 100%; min-height: 400px; border-radius: 0.5rem;" src="https://maps.google.com/maps?q=${query}&t=m&z=15&output=embed&iwloc=near" allowfullscreen loading="lazy"></iframe>`;
}

function getUsuarioLogado() {
    try { return JSON.parse(localStorage.getItem('userInfo')); } catch { return null; }
}

function formatarDataHora(data) {
    if (!data) return "Data a definir";
    return new Date(data).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function getIconeEsporte(esporte) {
    const icones = { 'Futebol': 'fa-solid fa-futbol', 'Vôlei': 'fa-solid fa-volleyball', 'Basquete': 'fa-solid fa-basketball', 'Corrida': 'fa-solid fa-person-running', 'Natação': 'fa-solid fa-person-swimming' };
    return icones[esporte] || 'fa-solid fa-person-running';
}