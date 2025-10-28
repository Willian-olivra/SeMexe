// Espera o DOM (a página) carregar completamente
document.addEventListener('DOMContentLoaded', () => {
    
    const registerForm = document.getElementById('register-form');
    const loginForm = document.getElementById('login-form');
    // Vamos adicionar um elemento <p> para mostrar mensagens de status
    const statusMessage = document.getElementById('auth-status');

    // --- LÓGICA DE CADASTRO ---
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            // 1. Impede o formulário de recarregar a página
            e.preventDefault(); 
            if (statusMessage) {
                statusMessage.textContent = 'Cadastrando...';
                statusMessage.style.color = '#e9c46a'; // Amarelo (Enviando)
            }

            // 2. Pega os valores dos campos
            const nome = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            try {
                // 3. Envia os dados para a API de /register
                const res = await fetch('/api/users/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: nome, email, password })
                });

                const data = await res.json(); // Lê a resposta da API

                if (res.ok) {
                    // 4. Sucesso!
                    if (statusMessage) {
                        statusMessage.textContent = 'Cadastro realizado! Redirecionando para o login...';
                        statusMessage.style.color = '#2a9d8f'; // Verde (Sucesso)
                    }
                    // Espera 2 segundos e redireciona para o login
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 2000);
                } else {
                    // 5. Erro (Ex: email já existe)
                    throw new Error(data.error || 'Erro ao cadastrar.');
                }
            } catch (error) {
                if (statusMessage) {
                    statusMessage.textContent = error.message;
                    statusMessage.style.color = '#e76f51'; // Vermelho (Erro)
                }
            }
        });
    }

    // --- LÓGICA DE LOGIN ---
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // Impede o envio padrão
            if (statusMessage) {
                statusMessage.textContent = 'Entrando...';
                statusMessage.style.color = '#e9c46a';
            }
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            try {
                // 1. Envia os dados para a API de /login
                const res = await fetch('/api/users/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const data = await res.json();

                if (res.ok) {
                    // 2. SUCESSO!
                    // Armazenamos os dados do usuário no localStorage
                    // Isto permite que outras páginas saibam quem está logado
                    localStorage.setItem('userInfo', JSON.stringify(data.user));
                    
                    if (statusMessage) {
                        statusMessage.textContent = 'Login bem-sucedido! Redirecionando...';
                        statusMessage.style.color = '#2a9d8f';
                    }
                    // Redireciona para a página de "Minhas Atividades"
                    setTimeout(() => {
                        window.location.href = 'minhasAtividades.html';
                    }, 1500);

                } else {
                    // 3. Erro (Ex: credenciais inválidas)
                    throw new Error(data.error || 'Erro ao fazer login.');
                }
            } catch (error) {
                 if (statusMessage) {
                    statusMessage.textContent = error.message;
                    statusMessage.style.color = '#e76f51';
                }
            }
        });
    }
});