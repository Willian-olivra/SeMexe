document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    // Precisamos saber quem é o usuário logado para comparar com o criador da atividade
    const userInfo = JSON.parse(localStorage.getItem('userInfo')) || {};
    const meuId = userInfo.id || userInfo._id;
    
    if (!token) {
        window.location.href = 'login.html';
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
                <div class="col-span-full text-center py-16 bg-dark-surface/50 backdrop-blur border border-gray-700 rounded-2xl">
                    <div class="w-20 h-20 bg-dark-base rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-600">
                        <i class="fa-solid fa-person-running text-4xl text-gray-500"></i>
                    </div>
                    <h3 class="text-xl font-bold text-white mb-2">Nenhuma atividade</h3>
                    <p class="text-gray-400 mb-6">Você ainda não criou ou entrou em nenhuma atividade.</p>
                    <a href="criarAtividade.html" class="inline-block bg-neon-blue text-black font-bold px-6 py-3 rounded-full hover:bg-white transition shadow-lg shadow-neon-blue/20">
                        Criar Agora
                    </a>
                </div>
            `;
            return;
        }

        eventList.innerHTML = atividades.map(atividade => {
            const id = atividade._id || atividade.id;
            const criadorId = atividade.criador._id || atividade.criador; // Pode vir populado ou só ID
            const souDono = criadorId.toString() === meuId.toString();
            
            const icone = getIconeEsporte(atividade.esporte);
            const dataObj = new Date(atividade.data_hora);
            const dataFormatada = dataObj.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
            
            // Verifica se já passou (para mudar o visual)
            const jaPassou = new Date() > dataObj;
            
            const participantes = atividade.participantes ? atividade.participantes.length : 0;
            const vagasDisp = atividade.vagas - participantes;

            // --- ESTILOS TEMÁTICOS ---
            let bgClass = "from-gray-800 to-gray-900";
            let borderClass = "border-gray-700";
            let iconColor = "text-gray-400";

            // Se já passou, deixa o card mais "apagado"
            if (jaPassou) {
                bgClass = "from-gray-900 to-black opacity-80 grayscale-[50%]";
                borderClass = "border-gray-800";
            } else {
                switch(atividade.esporte) {
                    case 'Futebol': bgClass = "from-green-900/40 to-gray-900"; borderClass = "border-green-800/50 hover:border-green-500"; iconColor = "text-green-400"; break;
                    case 'Vôlei': bgClass = "from-yellow-900/40 to-gray-900"; borderClass = "border-yellow-800/50 hover:border-yellow-500"; iconColor = "text-yellow-400"; break;
                    case 'Basquete': bgClass = "from-orange-900/40 to-gray-900"; borderClass = "border-orange-800/50 hover:border-orange-500"; iconColor = "text-orange-400"; break;
                    case 'Natação': bgClass = "from-cyan-900/40 to-gray-900"; borderClass = "border-cyan-800/50 hover:border-cyan-500"; iconColor = "text-cyan-400"; break;
                    case 'Corrida': bgClass = "from-red-900/40 to-gray-900"; borderClass = "border-red-800/50 hover:border-red-500"; iconColor = "text-red-400"; break;
                }
            }

            // Botões de Ação (Lógica de Permissão)
            let botoesAcao = `
                <button onclick="window.location.href='atividade.html?id=${id}'" class="w-full py-2 rounded-lg bg-dark-base border border-gray-600 text-gray-300 hover:text-white hover:border-white transition flex items-center justify-center gap-2" title="Ver Detalhes">
                    <i class="fa-solid fa-eye"></i> Ver Detalhes
                </button>
            `;

            if (souDono && !jaPassou) {
                botoesAcao = `
                    <button onclick="window.location.href='atividade.html?id=${id}'" class="w-10 h-10 rounded-lg bg-dark-base border border-gray-600 text-gray-300 hover:text-white hover:border-white transition flex items-center justify-center" title="Ver Detalhes">
                        <i class="fa-solid fa-eye"></i>
                    </button>
                    <button onclick="editarAtividade('${id}')" class="w-10 h-10 rounded-lg bg-dark-base border border-gray-600 text-gray-300 hover:text-neon-blue hover:border-neon-blue transition flex items-center justify-center" title="Editar">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button onclick="deletarAtividade('${id}')" class="w-10 h-10 rounded-lg bg-dark-base border border-gray-600 text-gray-300 hover:text-neon-pink hover:border-neon-pink transition flex items-center justify-center" title="Excluir">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                `;
            }

            return `
                <article class="relative group bg-gradient-to-br ${bgClass} border ${borderClass} rounded-2xl shadow-xl overflow-hidden hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 flex flex-col h-full" data-id="${id}">
                    
                    <div class="absolute top-4 right-4 z-20">
                        ${souDono 
                            ? '<span class="bg-neon-blue/20 text-neon-blue border border-neon-blue text-[10px] font-bold px-2 py-1 rounded uppercase">Organizador</span>' 
                            : '<span class="bg-white/10 text-gray-300 border border-gray-500 text-[10px] font-bold px-2 py-1 rounded uppercase">Participante</span>'
                        }
                    </div>

                    <div class="p-6 pb-2 flex items-center justify-between relative overflow-hidden">
                        <i class="${icone} absolute -right-6 -top-6 text-9xl opacity-5 transform rotate-12 group-hover:rotate-0 transition-transform duration-500 pointer-events-none"></i>
                        
                        <div class="z-10">
                            <span class="text-xs font-bold uppercase tracking-wider ${iconColor} mb-1 block">${atividade.esporte} ${jaPassou ? '(Encerrado)' : ''}</span>
                            <h3 class="text-xl font-bold text-white truncate capitalize leading-tight w-48" title="${atividade.titulo}">${atividade.titulo}</h3>
                        </div>
                    </div>

                    <div class="px-6 py-4 flex-grow space-y-3">
                        <div class="flex items-start gap-3 text-gray-300 text-sm">
                            <i class="fa-solid fa-location-dot w-4 mt-0.5 text-gray-500"></i> 
                            <span class="capitalize line-clamp-2">${atividade.local}</span>
                        </div>
                        <div class="flex items-center gap-3 text-gray-300 text-sm">
                            <i class="fa-solid fa-calendar-days w-4 text-gray-500"></i> 
                            <span>${dataFormatada}</span>
                        </div>
                        <div class="flex items-center gap-3 text-gray-300 text-sm">
                            <i class="fa-solid fa-users w-4 text-gray-500"></i> 
                            <span><strong class="text-white">${participantes}</strong> inscritos</span>
                        </div>
                    </div>

                    <div class="p-4 bg-black/20 flex justify-between items-center mt-auto border-t border-white/5">
                        <div class="flex flex-col">
                            <span class="text-[10px] text-gray-500 uppercase font-bold">Vagas</span>
                            <div class="flex items-baseline gap-1">
                                <span class="text-lg font-bold text-white">${vagasDisp >= 0 ? vagasDisp : 0}</span>
                                <span class="text-xs text-gray-500">/ ${atividade.vagas}</span>
                            </div>
                        </div>

                        <div class="flex gap-2 w-auto">
                            ${botoesAcao}
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
        if(id && id !== 'undefined') window.location.href = `editarAtividade.html?id=${id}`;
    };

    function getIconeEsporte(esporte) {
        const icones = {
            'Futebol': 'fa-solid fa-futbol',
            'Vôlei': 'fa-solid fa-volleyball',
            'Basquete': 'fa-solid fa-basketball',
            'Corrida': 'fa-solid fa-person-running',
            'Natação': 'fa-solid fa-person-swimming',
            'Academia': 'fa-solid fa-dumbbell'
        };
        return icones[esporte] || 'fa-solid fa-person-running';
    }

    carregarMinhasAtividades();
});