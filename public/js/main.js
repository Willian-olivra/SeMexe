document.addEventListener('DOMContentLoaded', () => {
    // --- FEEDBACK FORM ---
    const feedbackForm = document.getElementById('feedback-form');
    const statusMessage = document.getElementById('feedback-status');

    if (feedbackForm) {
        feedbackForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const nome = document.getElementById('feedback-nome').value.trim();
            const email = document.getElementById('feedback-email').value.trim();
            const mensagem = document.getElementById('feedback-mensagem').value.trim();

            statusMessage.textContent = 'Enviando...';
            statusMessage.className = 'text-yellow-400 text-sm mt-2';

            try {
                const response = await fetch('/api/feedback', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nome, email, mensagem }),
                });

                if (response.ok) {
                    statusMessage.textContent = 'Obrigado pelo feedback!';
                    statusMessage.className = 'text-neon-blue text-sm mt-2';
                    feedbackForm.reset();
                } else {
                    throw new Error('Falha no envio.');
                }
            } catch (error) {
                statusMessage.textContent = 'Erro ao enviar.';
                statusMessage.className = 'text-neon-pink text-sm mt-2';
            }
        });
    }

    // --- CARREGAR ATIVIDADES ---
    const eventList = document.querySelector('.event-list');
    const filterButtons = document.querySelectorAll('.filter-btn, button.rounded-full');
    
    async function carregarAtividades(esporte = 'Todos') {
        if (!eventList) return;
        eventList.innerHTML = `<p class="col-span-full text-center text-gray-500 py-10 animate-pulse">Carregando...</p>`;

        const token = localStorage.getItem('token');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        try {
            const url = esporte === 'Todos' ? '/api/atividades' : `/api/atividades?esporte=${encodeURIComponent(esporte)}`;
            const response = await fetch(url, { headers });
            
            if (!response.ok) throw new Error(`Erro: ${response.status}`);
            const atividades = await response.json();
            renderizarAtividades(atividades);
        } catch (error) {
            console.error(error);
            eventList.innerHTML = `<p class="col-span-full text-center text-gray-400">Erro ao carregar.</p>`;
        }
    }

   function renderizarAtividades(atividades) {
        if (!eventList) return;
        
        if (atividades.length === 0) {
            eventList.innerHTML = `<div class="col-span-full text-center py-10"><p class="text-gray-500">Nenhuma atividade encontrada.</p></div>`;
            return;
        }

        eventList.innerHTML = atividades.map(a => {
            const atividadeId = a._id || a.id || a.id_atividade;
            const linkHref = atividadeId ? `atividade.html?id=${atividadeId}` : '#';
            
            const icone = getIconeEsporte(a.esporte);
            const dataF = formatarDataHora(a.data_hora);
            
            // --- NOVO: Lógica de Estilo por Esporte ---
            let bgClass = "from-gray-800 to-gray-900"; // Padrão
            let borderClass = "border-gray-700";
            let iconColor = "text-gray-400";

            switch(a.esporte) {
                case 'Futebol':
                    bgClass = "from-green-900/40 to-gray-900"; // Gradiente Verde sutil
                    borderClass = "border-green-800/50 hover:border-green-500";
                    iconColor = "text-green-400";
                    break;
                case 'Vôlei':
                    bgClass = "from-yellow-900/40 to-gray-900"; // Gradiente Amarelo
                    borderClass = "border-yellow-800/50 hover:border-yellow-500";
                    iconColor = "text-yellow-400";
                    break;
                case 'Basquete':
                    bgClass = "from-orange-900/40 to-gray-900"; // Gradiente Laranja
                    borderClass = "border-orange-800/50 hover:border-orange-500";
                    iconColor = "text-orange-400";
                    break;
                case 'Natação':
                    bgClass = "from-cyan-900/40 to-gray-900"; // Gradiente Ciano
                    borderClass = "border-cyan-800/50 hover:border-cyan-500";
                    iconColor = "text-cyan-400";
                    break;
                case 'Corrida':
                    bgClass = "from-red-900/40 to-gray-900"; // Gradiente Vermelho
                    borderClass = "border-red-800/50 hover:border-red-500";
                    iconColor = "text-red-400";
                    break;
            }
            // ------------------------------------------

            // Ícone de visibilidade (Amigos)
            const iconeVisibilidade = a.visibilidade === 'friends' 
                ? `<div class="absolute top-3 right-3 bg-black/50 backdrop-blur rounded-full p-1.5 border border-gray-600" title="Só Amigos"><i class="fa-solid fa-user-group text-neon-pink text-xs"></i></div>` 
                : '';

            return `
                <article class="relative group bg-gradient-to-br ${bgClass} border ${borderClass} rounded-2xl shadow-xl overflow-hidden hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 flex flex-col h-full">
                    
                    ${iconeVisibilidade}

                    <div class="p-6 pb-2 flex items-center justify-between relative overflow-hidden">
                        <i class="${icone} absolute -right-6 -top-6 text-9xl opacity-5 transform rotate-12 group-hover:rotate-0 transition-transform duration-500 pointer-events-none"></i>
                        
                        <div class="z-10">
                            <span class="text-xs font-bold uppercase tracking-wider ${iconColor} mb-1 block">${a.esporte}</span>
                            <h3 class="text-xl font-bold text-white truncate capitalize leading-tight w-48" title="${a.titulo}">${a.titulo}</h3>
                        </div>
                        
                        <div class="z-10 w-12 h-12 rounded-full bg-black/30 flex items-center justify-center border border-white/10 shadow-inner">
                            <i class="${icone} text-2xl ${iconColor}"></i>
                        </div>
                    </div>

                    <div class="px-6 py-4 flex-grow space-y-3">
                        <div class="flex items-start gap-3 text-gray-300 text-sm">
                            <i class="fa-solid fa-location-dot w-4 mt-0.5 text-gray-500"></i> 
                            <span class="capitalize line-clamp-2">${a.local}</span>
                        </div>
                        <div class="flex items-center gap-3 text-gray-300 text-sm">
                            <i class="fa-solid fa-calendar-days w-4 text-gray-500"></i> 
                            <span>${dataF}</span>
                        </div>
                        <div class="flex items-center gap-3 text-gray-400 text-xs pt-2 border-t border-white/5">
                            <div class="flex items-center gap-1">
                                <i class="fa-solid fa-user-astronaut"></i>
                                <span class="capitalize hover:text-white transition">${a.criador_nome || 'Anônimo'}</span>
                            </div>
                        </div>
                    </div>

                    <div class="p-4 bg-black/20 flex justify-between items-center mt-auto border-t border-white/5">
                        <div class="flex flex-col">
                            <span class="text-[10px] text-gray-500 uppercase font-bold">Vagas</span>
                            <div class="flex items-baseline gap-1">
                                <span class="text-lg font-bold ${a.lotada ? 'text-red-500' : 'text-white'}">${a.vagas_disponiveis}</span>
                                <span class="text-xs text-gray-500">/ ${a.vagas}</span>
                            </div>
                        </div>

                        <a href="${linkHref}" class="group/btn relative overflow-hidden bg-dark-base border border-gray-600 text-white px-5 py-2 rounded-lg text-sm font-bold transition-all hover:border-neon-blue hover:text-neon-blue hover:shadow-[0_0_15px_rgba(0,229,255,0.3)]">
                            <span class="relative z-10 flex items-center gap-2">
                                Entrar <i class="fa-solid fa-arrow-right group-hover/btn:translate-x-1 transition-transform"></i>
                            </span>
                        </a>
                    </div>
                </article>
            `;
        }).join('');
    }

    function getIconeEsporte(esporte) {
        const icones = { 'Futebol': 'fa-solid fa-futbol', 'Vôlei': 'fa-solid fa-volleyball', 'Basquete': 'fa-solid fa-basketball', 'Corrida': 'fa-solid fa-person-running', 'Natação': 'fa-solid fa-person-swimming' };
        return icones[esporte] || 'fa-solid fa-person-running';
    }

    function formatarDataHora(data) {
        return new Date(data).toLocaleDateString('pt-BR', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    if (filterButtons.length > 0) {
        filterButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                filterButtons.forEach(btn => btn.className = "px-5 py-2 rounded-full border border-gray-700 bg-dark-surface text-gray-300 hover:border-neon-blue hover:text-neon-blue font-medium transition cursor-pointer");
                e.target.className = "px-5 py-2 rounded-full border border-neon-blue bg-neon-blue text-black font-bold shadow transition hover:scale-105 cursor-pointer";
                carregarAtividades(button.textContent.trim());
            });
        });
        carregarAtividades();
    }
});