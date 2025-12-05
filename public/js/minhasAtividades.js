document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    
    if (!token) {
        showToast('Faça login para ver suas atividades', 'warning');
        setTimeout(() => window.location.href = 'login.html', 1500);
        return;
    }

    const eventList = document.querySelector('.event-list');
    if (!eventList) return;

    async function carregarMinhasAtividades() {
        try {
            const response = await fetch('/api/atividades/minhas', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    localStorage.clear();
                    window.location.href = 'login.html';
                    return;
                }
                throw new Error('Erro ao carregar atividades');
            }

            const atividades = await response.json();
            renderizarMinhasAtividades(atividades);
        } catch (error) {
            console.error('Erro:', error);
            eventList.innerHTML = `<div class="col-span-full text-center py-10 text-gray-400">Erro ao carregar atividades.</div>`;
        }
    }

    function renderizarMinhasAtividades(atividades) {
        if (!atividades || atividades.length === 0) {
            eventList.innerHTML = `
                <div class="col-span-full text-center py-16 bg-dark-surface rounded-xl border border-gray-800 border-dashed">
                    <i class="fa-solid fa-person-running text-5xl text-gray-700 mb-4"></i>
                    <p class="text-gray-400 text-lg mb-6">Você ainda não criou nenhuma atividade.</p>
                    <a href="criarAtividade.html" class="inline-block bg-neon-blue text-black font-bold px-6 py-3 rounded-md hover:bg-white transition">
                        <i class="fa-solid fa-plus mr-2"></i> Criar Primeira Atividade
                    </a>
                </div>
            `;
            return;
        }

        eventList.innerHTML = atividades.map(atividade => {
            // CORREÇÃO 1: Pega o ID correto (Mongo _id ou SQL id)
            const id = atividade._id || atividade.id;

            const icone = getIconeEsporte(atividade.esporte);
            const dataFormatada = formatarDataHora(atividade.data_hora);
            const participantes = atividade.participantes_count || 0;
            const vagasDisp = atividade.vagas_disponiveis !== undefined ? atividade.vagas_disponiveis : (atividade.vagas - participantes);
            
            // CORREÇÃO 2: Aspas simples '${id}' nos onclicks são OBRIGATÓRIAS para IDs do Mongo
            return `
                <article class="bg-dark-surface border border-gray-800 rounded-xl shadow-lg overflow-hidden hover:-translate-y-2 hover:border-neon-blue/50 transition duration-300 flex flex-col h-full" data-id="${id}">
                    <div class="p-5 border-b border-gray-800 flex items-center gap-4 bg-black/20">
                        <i class="${icone} text-3xl text-neon-blue"></i>
                        <h3 class="text-xl font-bold text-white truncate flex-1">${atividade.titulo}</h3>
                    </div>
                    <div class="p-5 flex-grow space-y-2 text-gray-400">
                        <p><i class="fa-solid fa-location-dot w-5 text-gray-600"></i> ${atividade.local}</p>
                        <p><i class="fa-solid fa-calendar-days w-5 text-gray-600"></i> ${dataFormatada}</p>
                        <p><i class="fa-solid fa-users w-5 text-gray-600"></i> <strong class="text-white">${participantes}</strong> inscritos</p>
                    </div>
                    <div class="p-5 bg-black/40 flex justify-between items-center gap-4 border-t border-gray-800">
                        <span class="bg-neon-blue/10 text-neon-blue border border-neon-blue/30 px-3 py-1 rounded-full text-xs font-medium">${vagasDisp}/${atividade.vagas} vagas</span>
                        <div class="flex gap-3">
                            <button onclick="window.location.href='atividade.html?id=${id}'" class="text-gray-400 hover:text-white transition" title="Ver"><i class="fa-solid fa-eye"></i></button>
                            <button onclick="editarAtividade('${id}')" class="text-gray-400 hover:text-neon-blue transition" title="Editar"><i class="fa-solid fa-pen"></i></button>
                            <button onclick="deletarAtividade('${id}')" class="text-gray-400 hover:text-neon-pink transition" title="Excluir"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </div>
                </article>
            `;
        }).join('');
    }

    // --- AÇÕES GLOBAIS ---

    window.deletarAtividade = async function(id) {
        if (!id || id === 'undefined') return;

        const confirmado = await showConfirmModal('Tem certeza que deseja excluir esta atividade permanentemente?', 'Sim, Excluir', 'Cancelar');
        
        if (!confirmado) return;

        try {
            const res = await fetch(`/api/atividades/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const card = document.querySelector(`article[data-id="${id}"]`);
                if(card) {
                    card.style.transform = "scale(0.9)";
                    card.style.opacity = "0";
                    setTimeout(() => carregarMinhasAtividades(), 300);
                }
                showToast('Atividade excluída!', 'success');
            } else {
                showToast('Erro ao excluir atividade.', 'error');
            }
        } catch (error) {
            console.error(error);
            showToast('Erro de conexão.', 'error');
        }
    };
    
    window.editarAtividade = function(id) {
        if(id && id !== 'undefined') {
            window.location.href = `editarAtividade.html?id=${id}`;
        } else {
            showToast('Erro: ID da atividade inválido', 'error');
        }
    };

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

    function formatarDataHora(dataHora) {
        return new Date(dataHora).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    }

    carregarMinhasAtividades();
});