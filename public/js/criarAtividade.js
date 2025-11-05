document.addEventListener('DOMContentLoaded', () => {
    // Verificar autenticação
    const token = localStorage.getItem('token');
    
    console.log('Token encontrado:', token ? 'SIM' : 'NÃO');
    
    if (!token) {
        alert('Você precisa fazer login primeiro!');
        window.location.href = 'login.html';
        return;
    }

    const form = document.querySelector('form');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('Formulário submetido');

        const esporte = document.getElementById('sport').value.trim();
        const titulo = document.getElementById('title').value.trim();
        const local = document.getElementById('location').value.trim();
        const data_hora = document.getElementById('datetime').value;
        const vagas = parseInt(document.getElementById('vacancies').value);

        console.log('Dados do formulário:', { esporte, titulo, local, data_hora, vagas });

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

        console.log('Validações passaram');

        // Desabilitar botão durante envio
        const btnSubmit = form.querySelector('.btn-submit');
        const textoOriginal = btnSubmit.textContent;
        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Criando...';

        const payload = {
            esporte,
            titulo,
            local,
            data_hora,
            vagas
        };

        console.log('Enviando para API:', payload);
        console.log('Token:', token.substring(0, 20) + '...');

        try {
            const response = await fetch('/api/atividades', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            console.log('Resposta recebida:', {
                status: response.status,
                statusText: response.statusText,
                ok: response.ok
            });

            // Verificar content-type antes de fazer parse
            const contentType = response.headers.get('content-type');
            console.log('Content-Type:', contentType);

            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                console.error('Resposta não é JSON:', text);
                throw new Error('Resposta inválida do servidor. Verifique se o backend está rodando.');
            }

            const data = await response.json();
            console.log('Dados recebidos:', data);

            if (response.ok) {
                console.log('Atividade criada com sucesso!');
                alert('Atividade criada com sucesso!');
                window.location.href = 'minhasAtividades.html';
            } else {
                if (response.status === 401) {
                    console.error('Token inválido ou expirado');
                    alert('Sessão expirada. Faça login novamente.');
                    localStorage.clear();
                    window.location.href = 'login.html';
                } else {
                    throw new Error(data.error || 'Erro ao criar atividade');
                }
            }
        } catch (error) {
            console.error('Erro ao criar atividade:', error);
            console.error('Stack:', error.stack);
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
            fazerLogout(event);
        });
    });

    // Definir data mínima como agora
    const datetimeInput = document.getElementById('datetime');
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    datetimeInput.min = now.toISOString().slice(0, 16);
    
    console.log('Página carregada e pronta');
});