document.addEventListener('DOMContentLoaded', async () => {
    // 1. Verifica autenticação
    const token = localStorage.getItem('token');
    if (!token) {
        showToast('Você precisa fazer login!', 'error');
        setTimeout(() => window.location.href = 'login.html', 2000);
        return;
    }

    // 2. Pega o ID da URL
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    // CORREÇÃO: Bloqueia IDs inválidos ou undefined
    if (!id || id === 'undefined') {
        showToast('Atividade não encontrada ou link inválido.', 'error');
        setTimeout(() => window.location.href = 'minhasAtividades.html', 2000);
        return;
    }

    const form = document.getElementById('form-editar');
    const loadingOverlay = document.getElementById('loading-overlay');

    // 3. Carrega os dados atuais da atividade
    try {
        const response = await fetch(`/api/atividades/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Erro ao buscar dados.');

        const atividade = await response.json();

        // Preenche o formulário
        document.getElementById('atividade-id').value = atividade._id || atividade.id; // Garante ID
        document.getElementById('sport').value = atividade.esporte;
        document.getElementById('title').value = atividade.titulo;
        document.getElementById('location').value = atividade.local;
        document.getElementById('vacancies').value = atividade.vagas;

        // Preenche a visibilidade
        if (atividade.visibilidade === 'friends') {
            document.getElementById('vis-friends').checked = true;
        } else {
            document.getElementById('vis-public').checked = true;
        }

        // Formata data para o input datetime-local (YYYY-MM-DDTHH:MM)
        if (atividade.data_hora) {
            const date = new Date(atividade.data_hora);
            date.setMinutes(date.getMinutes() - date.getTimezoneOffset()); 
            document.getElementById('datetime').value = date.toISOString().slice(0, 16);
        }

        // Esconde o loading
        if(loadingOverlay) loadingOverlay.classList.add('hidden');

    } catch (error) {
        console.error(error);
        showToast('Erro ao carregar atividade.', 'error');
        setTimeout(() => window.location.href = 'minhasAtividades.html', 2000);
    }

    // 4. Salvar Alterações
    if(form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const btnSalvar = document.getElementById('btn-salvar');
            const originalText = btnSalvar.innerHTML;
            btnSalvar.disabled = true;
            btnSalvar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';

            try {
                const payload = {
                    esporte: document.getElementById('sport').value,
                    titulo: document.getElementById('title').value,
                    local: document.getElementById('location').value,
                    data_hora: document.getElementById('datetime').value,
                    vagas: parseInt(document.getElementById('vacancies').value),
                    // Captura visibilidade
                    visibilidade: document.querySelector('input[name="visibility"]:checked').value
                };

                // Valida data futura
                const dataEscolhida = new Date(payload.data_hora);
                if (dataEscolhida <= new Date()) {
                    throw new Error('A data deve ser no futuro!');
                }

                // Envia atualização (PUT)
                const response = await fetch(`/api/atividades/${id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    showToast('Atividade atualizada com sucesso!', 'success');
                    setTimeout(() => window.location.href = 'minhasAtividades.html', 1500);
                } else {
                    const data = await response.json();
                    throw new Error(data.error || 'Erro ao atualizar.');
                }

            } catch (error) {
                console.error(error);
                showToast(error.message, 'error');
                btnSalvar.disabled = false;
                btnSalvar.innerHTML = originalText;
            }
        });
    }
});