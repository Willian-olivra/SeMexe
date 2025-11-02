document.addEventListener('DOMContentLoaded', () => {
    // Verificar autenticação
    const token = localStorage.getItem('token');
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');

    if (!token) {
        alert('Você precisa fazer login primeiro!');
        window.location.href = 'login.html';
        return;
    }

    const eventList = document.querySelector('.event-list');

    // Carregar atividades do usuário
    async function carregarMinhasAtividades() {
        try {
            const response = await fetch('/api/atividades/minhas', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            // Verificar content-type
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
                    <a href="criarAtividade.html" class="btn-submit" style="display: inline-block; margin-top: 20px; text-decoration: none;">Criar Primeira Atividade</a>
                </div>
            `;
            return;
        }

        eventList.innerHTML = atividades.map(atividade => {
            const icone = getIconeEsporte(atividade.esporte);
            const dataFormatada = formatarDataHora(atividade.data_hora);

            return `
                <article class="event-card" data-id="${atividade.id}">
                    <div class="card-header">
                        <i class="${icone} card-icon"></i>
                        <h3>${atividade.titulo}</h3>
                    </div>
                    <div class="card-body">
                        <p><i class="fa-solid fa-futbol"></i> ${atividade.esporte}</p>
                        <p><i class="fa-solid fa-location-dot"></i> ${atividade.local}</p>
                        <p><i class="fa-solid fa-calendar-days"></i> ${dataFormatada}</p>
                    </div>
                    <div class="card-footer">
                        <span class="vacancies">Vagas: ${atividade.vagas}</span>
                        <div class="card-actions">
                            <button class="btn-delete" onclick="deletarAtividade(${atividade.id})">
                                <i class="fa-solid fa-trash"></i> Excluir
                            </button>
                        </div>
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
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return data.toLocaleDateString('pt-BR', opcoes);
    }

    // Função global para deletar atividade
    window.deletarAtividade = async function(id) {
        if (!confirm('Tem certeza que deseja excluir esta atividade?')) {
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

            // Verificar content-type
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Resposta do servidor não é JSON');
            }

            const data = await response.json();

            if (response.ok) {
                alert('Atividade excluída com sucesso!');
                carregarMinhasAtividades();
            } else {
                throw new Error(data.error || 'Erro ao excluir atividade');
            }
        } catch (error) {
            console.error('Erro:', error);
            alert(error.message);
        }
    };

    // Logout
    const logoutButtons = document.querySelectorAll('.btn-logout');
    logoutButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.clear();
            window.location.href = 'index.html';
        });
    });

    // Carregar atividades ao iniciar
    carregarMinhasAtividades();
});