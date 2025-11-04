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
            statusMessage.style.color = '#e9c46a';

            try {
                const response = await fetch('/api/feedback', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nome, email, mensagem }),
                });

                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const data = await response.json();
                    
                    if (response.ok) {
                        statusMessage.textContent = 'Obrigado pelo seu feedback!';
                        statusMessage.style.color = '#2a9d8f';
                        feedbackForm.reset();
                    } else {
                        throw new Error(data.error || 'Falha no envio.');
                    }
                } else {
                    throw new Error('Resposta inválida do servidor.');
                }
            } catch (error) {
                console.error('Erro:', error);
                statusMessage.textContent = error.message || 'Erro ao enviar. Tente novamente.';
                statusMessage.style.color = '#e76f51';
            }
        });
    }

    // --- CARREGAR E FILTRAR ATIVIDADES ---
    const eventList = document.querySelector('.event-list');
    const filterButtons = document.querySelectorAll('.filter-btn');
    let todasAtividades = [];

    async function carregarAtividades(esporte = 'Todos') {
        if (!eventList) return;

        try {
            const url = esporte === 'Todos' 
                ? '/api/atividades' 
                : `/api/atividades?esporte=${encodeURIComponent(esporte)}`;
            
            const response = await fetch(url);
            
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Resposta do servidor não é JSON');
            }

            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }

            const atividades = await response.json();
            todasAtividades = atividades;
            renderizarAtividades(atividades);
        } catch (error) {
            console.error('Erro ao carregar atividades:', error);
            eventList.innerHTML = `
                <div style="text-align: center; padding: 40px; grid-column: 1/-1; color: #e76f51;">
                    <i class="fa-solid fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 20px;"></i>
                    <p style="font-size: 1.1rem; margin-bottom: 10px;">Erro ao carregar atividades</p>
                    <p style="color: #666; font-size: 0.9rem;">${error.message}</p>
                    <button onclick="location.reload()" class="btn-submit" style="margin-top: 20px; width: auto; padding: 10px 20px;">
                        Tentar Novamente
                    </button>
                </div>
            `;
        }
    }

    function renderizarAtividades(atividades) {
        if (!eventList) return;

        if (atividades.length === 0) {
            eventList.innerHTML = `
                <div style="text-align: center; padding: 40px; grid-column: 1/-1;">
                    <i class="fa-solid fa-calendar-xmark" style="font-size: 4rem; color: #ccc; margin-bottom: 20px;"></i>
                    <p style="color: #666; font-size: 1.2rem;">Nenhuma atividade encontrada.</p>
                </div>
            `;
            return;
        }

        eventList.innerHTML = atividades.map(atividade => {
            const icone = getIconeEsporte(atividade.esporte);
            const dataFormatada = formatarDataHora(atividade.data_hora);
            
            // Determina a classe e texto das vagas
            let vagasClass = '';
            let vagasTexto = `${atividade.vagas_disponiveis}/${atividade.vagas} vagas`;
            
            if (atividade.lotada) {
                vagasClass = ' lotada';
                vagasTexto = 'LOTADA';
            } else if (atividade.vagas_disponiveis <= 2) {
                vagasClass = ' poucas';
                vagasTexto = `Últimas ${atividade.vagas_disponiveis} vagas!`;
            }

            return `
                <article class="event-card">
                    <div class="card-header">
                        <i class="${icone} card-icon"></i>
                        <h3>${atividade.titulo}</h3>
                    </div>
                    <div class="card-body">
                        <p><i class="fa-solid fa-futbol"></i> ${atividade.esporte}</p>
                        <p><i class="fa-solid fa-location-dot"></i> ${atividade.local}</p>
                        <p><i class="fa-solid fa-calendar-days"></i> ${dataFormatada}</p>
                        <p><i class="fa-solid fa-user"></i> ${atividade.criador_nome || 'Anônimo'}</p>
                    </div>
                    <div class="card-footer">
                        <span class="vacancies${vagasClass}">${vagasTexto}</span>
                        <a href="atividade.html?id=${atividade.id}" class="btn-details">
                            ${atividade.lotada ? 'Ver detalhes' : 'Participar'}
                        </a>
                    </div>
                </article>
            `;
        }).join('');
    }

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
        const data = new Date(dataHora);
        const opcoes = { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return data.toLocaleDateString('pt-BR', opcoes);
    }

    // Event listeners para filtros
    if (filterButtons.length > 0) {
        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                filterButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                const esporte = button.textContent.trim();
                carregarAtividades(esporte);
            });
        });

        // Carregar todas as atividades ao iniciar
        carregarAtividades();
    }
});