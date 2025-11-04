document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');

    if (!token) {
        alert('Você precisa fazer login primeiro!');
        window.location.href = 'login.html';
        return;
    }

    const eventList = document.querySelector('.event-list');

    async function carregarMinhasAtividades() {
        try {
            const response = await fetch('/api/atividades/minhas', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Resposta do servidor não é JSON');
            }

            if (!response.ok) {
                if (response.status === 401) {
                    alert('Sessão expirada. Faça login novamente.');
                    localStorage.clear();
                    window.location.href = 'login.html';
                    return;
                }
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erro ao carregar atividades');
            }

            const atividades = await response.json();
            renderizarMinhasAtividades(atividades);
        } catch (error) {
            console.error('Erro:', error);
            eventList.innerHTML = `
                <div style="text-align: center; padding: 40px; grid-column: 1/-1;">
                    <i class="fa-solid fa-exclamation-triangle" style="font-size: 3rem; color: #e76f51; margin-bottom: 20px;"></i>
                    <p style="color: #e76f51; font-size: 1.1rem; margin-bottom: 10px;">Erro ao carregar suas atividades</p>
                    <p style="color: #666; font-size: 0.9rem;">${error.message}</p>
                    <button onclick="location.reload()" class="btn-submit" style="margin-top: 20px; width: auto; padding: 10px 20px;">
                        Tentar Novamente
                    </button>
                </div>
            `;
        }
    }

    function renderizarMinhasAtividades(atividades) {
        if (atividades.length === 0) {
            eventList.innerHTML = `
                <div style="text-align: center; padding: 40px; grid-column: 1/-1;">
                    <i class="fa-solid fa-calendar-xmark" style="font-size: 4rem; color: #ccc; margin-bottom: 20px;"></i>
                    <p style="color: #666; font-size: 1.2rem;">Você ainda não criou nenhuma atividade.</p>
                    <a href="criarAtividade.html" class="btn-submit" style="display: inline-block; margin-top: 20px; text-decoration: none;">
                        <i class="fa-solid fa-plus"></i> Criar Primeira Atividade
                    </a>
                </div>
            `;
            return;
        }

        eventList.innerHTML = atividades.map(atividade => {
            const icone = getIconeEsporte(atividade.esporte);
            const dataFormatada = formatarDataHora(atividade.data_hora);
            
            // Calcula informações de vagas
            const participantes = atividade.participantes_count || 0;
            const vagasDisponiveis = atividade.vagas_disponiveis || (atividade.vagas - participantes);
            const lotada = vagasDisponiveis <= 0;
            
            // Status da atividade
            const agora = new Date();
            const dataAtividade = new Date(atividade.data_hora);
            const isPassada = dataAtividade < agora;
            
            let statusBadge = '';
            if (isPassada) {
                statusBadge = '<span class="status-badge passada"><i class="fa-solid fa-check"></i> Realizada</span>';
            } else if (lotada) {
                statusBadge = '<span class="status-badge lotada"><i class="fa-solid fa-users"></i> Lotada</span>';
            } else if (vagasDisponiveis <= 2) {
                statusBadge = '<span class="status-badge alerta"><i class="fa-solid fa-exclamation-triangle"></i> Poucas vagas</span>';
            }

            return `
                <article class="event-card" data-id="${atividade.id}">
                    <div class="card-header">
                        <i class="${icone} card-icon"></i>
                        <div style="flex: 1;">
                            <h3>${atividade.titulo}</h3>
                            ${statusBadge}
                        </div>
                    </div>
                    <div class="card-body">
                        <p><i class="fa-solid fa-futbol"></i> ${atividade.esporte}</p>
                        <p><i class="fa-solid fa-location-dot"></i> ${atividade.local}</p>
                        <p><i class="fa-solid fa-calendar-days"></i> ${dataFormatada}</p>
                        <p>
                            <i class="fa-solid fa-users"></i> 
                            <strong>${participantes} ${participantes === 1 ? 'inscrito' : 'inscritos'}</strong>
                        </p>
                    </div>
                    <div class="card-footer">
                        <span class="vacancies ${lotada ? 'lotada' : ''}">
                            ${vagasDisponiveis}/${atividade.vagas} vagas
                        </span>
                        <div class="card-actions">
                            <button class="btn-details" onclick="window.location.href='atividade.html?id=${atividade.id}'">
                                <i class="fa-solid fa-eye"></i> Ver
                            </button>
                            <button class="btn-delete" onclick="deletarAtividade(${atividade.id})">
                                <i class="fa-solid fa-trash"></i> Excluir
                            </button>
                        </div>
                    </div>
                </article>
            `;
        }).join('');
        
        // Adiciona estilos para os badges
        if (!document.getElementById('status-badge-styles')) {
            const style = document.createElement('style');
            style.id = 'status-badge-styles';
            style.textContent = `
                .status-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                    padding: 4px 10px;
                    border-radius: 12px;
                    font-size: 0.8rem;
                    font-weight: 600;
                    margin-top: 5px;
                }
                .status-badge.passada {
                    background-color: #e0e0e0;
                    color: #666;
                }
                .status-badge.lotada {
                    background-color: #ffebee;
                    color: #c62828;
                }
                .status-badge.alerta {
                    background-color: #fff3e0;
                    color: #e65100;
                }
                .vacancies.poucas {
                    background-color: #fff3e0;
                    color: #e65100;
                }
            `;
            document.head.appendChild(style);
        }
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
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return data.toLocaleDateString('pt-BR', opcoes);
    }

    window.deletarAtividade = async function(id) {
        if (!confirm('Tem certeza que deseja excluir esta atividade?\n\nTodos os participantes inscritos serão removidos.')) {
            return;
        }

        try {
            const response = await fetch(`/api/atividades/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Resposta do servidor não é JSON');
            }

            const data = await response.json();

            if (response.ok) {
                // Remove visualmente o card antes de recarregar
                const card = document.querySelector(`[data-id="${id}"]`);
                if (card) {
                    card.style.opacity = '0';
                    card.style.transform = 'scale(0.9)';
                    setTimeout(() => carregarMinhasAtividades(), 300);
                }
                
                // Feedback visual
                const toast = document.createElement('div');
                toast.textContent = '✅ Atividade excluída com sucesso!';
                toast.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: #2a9d8f;
                    color: white;
                    padding: 15px 25px;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    z-index: 1000;
                    animation: slideIn 0.3s ease;
                `;
                document.body.appendChild(toast);
                setTimeout(() => toast.remove(), 3000);
            } else {
                throw new Error(data.error || 'Erro ao excluir atividade');
            }
        } catch (error) {
            console.error('Erro:', error);
            alert('❌ ' + error.message);
        }
    };

    // Adiciona animação
    if (!document.getElementById('toast-animation')) {
        const style = document.createElement('style');
        style.id = 'toast-animation';
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);
    }

    const logoutButtons = document.querySelectorAll('.btn-logout');
    logoutButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.clear();
            window.location.href = 'index.html';
        });
    });

    carregarMinhasAtividades();
});