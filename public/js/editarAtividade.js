document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const atividadeId = params.get('id');

    if (!atividadeId) {
        showToast('ID da atividade não encontrado.', 'error');
        setTimeout(() => window.location.href = 'minhasAtividades.html', 1500);
        return;
    }

    const form = document.getElementById('form-editar');
    const btnSalvar = document.getElementById('btn-salvar');

    // --- CARREGAR DADOS ---
    try {
        const res = await fetch(`/api/atividades/${atividadeId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error('Erro ao carregar atividade.');

        const atividade = await res.json();

        // Preencher Campos
        document.getElementById('atividade-id').value = atividade._id || atividade.id;
        document.getElementById('sport').value = atividade.esporte;
        document.getElementById('title').value = atividade.titulo;
        document.getElementById('location').value = atividade.local;
        document.getElementById('vacancies').value = atividade.vagas;

        // Formatar Data para input datetime-local (YYYY-MM-DDTHH:mm)
        if (atividade.data_hora) {
            const dataObj = new Date(atividade.data_hora);
            // Ajuste de fuso horário simples para garantir que o input mostre a hora correta
            dataObj.setMinutes(dataObj.getMinutes() - dataObj.getTimezoneOffset());
            document.getElementById('datetime').value = dataObj.toISOString().slice(0, 16);
        }

        // Radio Buttons (Visibilidade)
        const radios = document.getElementsByName('visibility');
        const visibilidadeAlvo = atividade.privada ? 'friends' : 'public';
        for (const radio of radios) {
            if (radio.value === visibilidadeAlvo) {
                radio.checked = true;
            }
        }

    } catch (error) {
        console.error(error);
        showToast('Erro ao carregar dados.', 'error');
    }

    // --- SALVAR ALTERAÇÕES ---
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const originalText = btnSalvar.innerText;
            btnSalvar.disabled = true;
            btnSalvar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';

            const visibilidade = document.querySelector('input[name="visibility"]:checked').value;
            const dataHora = document.getElementById('datetime').value;

            const dadosAtualizados = {
                esporte: document.getElementById('sport').value,
                titulo: document.getElementById('title').value,
                local: document.getElementById('location').value,
                data_hora: dataHora,
                vagas: parseInt(document.getElementById('vacancies').value),
                privada: visibilidade === 'friends'
            };

            try {
                const res = await fetch(`/api/atividades/${atividadeId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(dadosAtualizados)
                });

                if (res.ok) {
                    showToast('Atividade atualizada com sucesso!', 'success');
                    setTimeout(() => window.location.href = 'minhasAtividades.html', 1500);
                } else {
                    const err = await res.json();
                    showToast(err.error || 'Erro ao atualizar.', 'error');
                    btnSalvar.disabled = false;
                    btnSalvar.innerText = originalText;
                }
            } catch (error) {
                console.error(error);
                showToast('Erro de conexão.', 'error');
                btnSalvar.disabled = false;
                btnSalvar.innerText = originalText;
            }
        });
    }
});