document.addEventListener('DOMContentLoaded', () => {
    // Verificar autenticação
    const token = localStorage.getItem('token');
    
    if (!token) {
        alert('Você precisa fazer login primeiro!');
        window.location.href = 'login.html';
        return;
    }

    const form = document.querySelector('form');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const esporte = document.getElementById('sport').value.trim();
        const titulo = document.getElementById('title').value.trim();
        const local = document.getElementById('location').value.trim();
        const data_hora = document.getElementById('datetime').value;
        const vagas = parseInt(document.getElementById('vacancies').value);

        // Validações
        if (!esporte || !titulo || !local || !data_hora || !vagas) {
            alert('Por favor, preencha todos os campos!');
            return;
        }

        if (vagas < 2) {
            alert('O número de vagas deve ser no mínimo 2!');
            return;
        }

        // Verificar se a data é futura
        const dataEscolhida = new Date(data_hora);
        const agora = new Date();
        if (dataEscolhida <= agora) {
            alert('A data e hora devem ser no futuro!');
            return;
        }

        // Desabilitar botão durante envio
        const btnSubmit = form.querySelector('.btn-submit');
        const textoOriginal = btnSubmit.textContent;
        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Criando...';

        try {
            const response = await fetch('/api/atividades', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    esporte,
                    titulo,
                    local,
                    data_hora,
                    vagas
                })
            });

            // Verificar content-type antes de fazer parse
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Resposta inválida do servidor. Verifique se o backend está rodando.');
            }

            const data = await response.json();

            if (response.ok) {
                alert('Atividade criada com sucesso!');
                window.location.href = 'minhasAtividades.html';
            } else {
                if (response.status === 401) {
                    alert('Sessão expirada. Faça login novamente.');
                    localStorage.clear();
                    window.location.href = 'login.html';
                } else {
                    throw new Error(data.error || 'Erro ao criar atividade');
                }
            }
        } catch (error) {
            console.error('Erro ao criar atividade:', error);
            alert(error.message);
            btnSubmit.disabled = false;
            btnSubmit.textContent = textoOriginal;
        }
    });

    // Logout
    const logoutButtons = document.querySelectorAll('.btn-logout');
    logoutButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.clear();
            window.location.href = 'index.html';
        });
    });

    // Definir data mínima como agora
    const datetimeInput = document.getElementById('datetime');
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    datetimeInput.min = now.toISOString().slice(0, 16);
});