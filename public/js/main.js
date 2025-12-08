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
        
        // --- CÓDIGO DE DEPURAÇÃO (MANTIDO) ---
        if (atividades.length > 0) {
            console.log("🔍 --- INÍCIO DA INSPEÇÃO ---");
            console.log("🔍 OBJETO COMPLETO:", atividades[0]);
            console.log("🔍 TENTANDO LER OS IDS:");
            console.log("👉 id:", atividades[0].id);
            console.log("👉 _id:", atividades[0]._id);
            console.log("👉 id_atividade:", atividades[0].id_atividade);
            console.log("🔍 --- FIM DA INSPEÇÃO ---");
        }
        // -------------------------------------------------------------

        if (atividades.length === 0) {
            eventList.innerHTML = `<div class="col-span-full text-center py-10"><p class="text-gray-500">Nenhuma atividade.</p></div>`;
            return;
        }

        eventList.innerHTML = atividades.map(a => {
            // Tenta pegar o ID de todas as formas possíveis
            const atividadeId = a._id || a.id || a.id_atividade;

            const icone = getIconeEsporte(a.esporte);
            const dataF = formatarDataHora(a.data_hora);
            const badgeClass = a.lotada ? 'bg-neon-pink/10 text-neon-pink' : 'bg-neon-blue/10 text-neon-blue';
            const iconeVisibilidade = a.visibilidade === 'friends' ? `<i class="fa-solid fa-user-group text-neon-pink ml-2" title="Amigos"></i>` : '';

            // Se não tiver ID, coloca '#' para não quebrar a página, mas avisa no console
            const linkHref = atividadeId ? `atividade.html?id=${atividadeId}` : '#';
            if (!atividadeId) console.error("❌ ERRO: Atividade sem ID gerando link quebrado!", a);

            // ADICIONEI capitalize NAS CLASSES ABAIXO (Título, Esporte, Local e Org)
            return `
                <article class="bg-dark-surface border border-gray-800 rounded-xl shadow-lg hover:-translate-y-2 hover:border-neon-blue/50 transition duration-300 flex flex-col h-full">
                    <div class="p-5 border-b border-gray-800 flex items-center gap-4 bg-black/20">
                        <i class="${icone} text-3xl text-neon-blue"></i>
                        <div class="flex-1 min-w-0">
                            <h3 class="text-xl font-bold text-white truncate capitalize" title="${a.titulo}">${a.titulo}</h3>
                            ${iconeVisibilidade}
                        </div>
                    </div>
                    <div class="p-5 flex-grow space-y-3">
                        <p class="text-gray-400 flex items-center gap-3 capitalize"><i class="fa-solid fa-futbol w-5 text-gray-600"></i> ${a.esporte}</p>
                        <p class="text-gray-400 flex items-center gap-3 capitalize"><i class="fa-solid fa-location-dot w-5 text-gray-600"></i> ${a.local}</p>
                        <p class="text-gray-400 flex items-center gap-3"><i class="fa-solid fa-calendar-days w-5 text-gray-600"></i> ${dataF}</p>
                        <p class="text-gray-400 flex items-center gap-3">
                            <i class="fa-solid fa-user w-5 text-gray-600"></i> 
                            <span class="text-sm">Org: 
                                <a href="perfilUsuario.html?id=${a.id_usuario}" class="text-white hover:text-neon-blue hover:underline transition font-bold capitalize">
                                    ${a.criador_nome || 'Anônimo'}
                                </a>
                            </span>
                        </p>
                    </div>
                    <div class="p-5 bg-black/40 flex justify-between items-center gap-3 border-t border-gray-800">
                        <span class="${badgeClass} border px-3 py-1 rounded-full text-xs font-bold uppercase">${a.vagas_disponiveis}/${a.vagas} vagas</span>
                        <a href="${linkHref}" class="text-neon-blue hover:text-white font-semibold transition border border-neon-blue hover:bg-neon-blue px-4 py-1.5 rounded-md text-sm">Ver Detalhes</a>
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