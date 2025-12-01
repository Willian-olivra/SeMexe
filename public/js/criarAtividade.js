document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        showToast('Você precisa fazer login primeiro!', 'error');
        setTimeout(() => window.location.href = 'login.html', 2000);
        return;
    }

    const datetimeInput = document.getElementById('datetime');
    if (datetimeInput) {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        datetimeInput.min = now.toISOString().slice(0, 16);
    }

    const form = document.getElementById('form-criar');
    if (!form) {
        console.error('Formulário não encontrado!');
        return;
    }
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const btnSubmit = document.getElementById('btn-publicar');
        const textoOriginal = btnSubmit.innerHTML;
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Publicando...';
        btnSubmit.classList.add('opacity-70', 'cursor-not-allowed');

        try {
            const esporte = document.getElementById('sport').value.trim();
            const titulo = document.getElementById('title').value.trim();
            const local = document.getElementById('location').value.trim();
            const data_hora = document.getElementById('datetime').value;
            const vagas = parseInt(document.getElementById('vacancies').value);
            
            // CAPTURA A VISIBILIDADE SELECIONADA
            const visibilityInput = document.querySelector('input[name="visibility"]:checked');
            const visibilidade = visibilityInput ? visibilityInput.value : 'public';

            if (!esporte || !titulo || !local || !data_hora || !vagas) {
                throw new Error('Por favor, preencha todos os campos!');
            }

            if (vagas < 2) {
                throw new Error('O número de vagas deve ser no mínimo 2.');
            }

            const dataEscolhida = new Date(data_hora);
            if (dataEscolhida <= new Date()) {
                throw new Error('A data e hora devem ser no futuro!');
            }

            // PAYLOAD COM VISIBILIDADE
            const payload = { 
                esporte, 
                titulo, 
                local, 
                data_hora, 
                vagas,
                visibilidade // Enviado para o backend
            };

            const response = await fetch('/api/atividades', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const contentType = response.headers.get('content-type');
            let data;
            
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                throw new Error('Erro no servidor. Verifique se o backend está rodando.');
            }

            if (response.ok) {
                btnSubmit.innerHTML = '<i class="fa-solid fa-check"></i> Sucesso!';
                btnSubmit.classList.remove('bg-neon-blue', 'text-black');
                btnSubmit.classList.add('bg-green-500', 'text-white');
                
                showToast('Atividade criada com sucesso! 🚀', 'success');
                setTimeout(() => window.location.href = 'minhasAtividades.html', 1500);
            } else {
                if (response.status === 401) {
                    showToast('Sessão expirada. Faça login novamente.', 'error');
                    localStorage.clear();
                    setTimeout(() => window.location.href = 'login.html', 1500);
                } else {
                    throw new Error(data.error || 'Erro ao criar atividade.');
                }
            }

        } catch (error) {
            console.error('Erro:', error);
            showToast(error.message, 'error');
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = textoOriginal;
            btnSubmit.classList.remove('opacity-70', 'cursor-not-allowed', 'bg-green-500', 'text-white');
            btnSubmit.classList.add('bg-neon-blue', 'text-black');
        }
    });
});