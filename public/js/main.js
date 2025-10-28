document.addEventListener('DOMContentLoaded', () => {
    const feedbackForm = document.getElementById('feedback-form');
    const statusMessage = document.getElementById('feedback-status');

    if (feedbackForm) {
        feedbackForm.addEventListener('submit', async (event) => {
            event.preventDefault(); 

            const nome = document.getElementById('feedback-nome').value;
            const email = document.getElementById('feedback-email').value;
            const mensagem = document.getElementById('feedback-mensagem').value;

            statusMessage.textContent = 'Enviando...';
            statusMessage.style.color = '#e9c46a'; 

            try {
                const response = await fetch('/api/feedback', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ nome, email, mensagem }),
                });

                if (response.ok) {
                    statusMessage.textContent = 'Obrigado pelo seu feedback!';
                    statusMessage.style.color = '#2a9d8f';
                    feedbackForm.reset(); 
                } else {
                    throw new Error('Falha no envio.');
                }
            } catch (error) {
                statusMessage.textContent = 'Erro ao enviar. Tente novamente.';
                statusMessage.style.color = '#e76f51';
            }
        });
    }
});