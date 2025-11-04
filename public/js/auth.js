document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form');
    const loginForm = document.getElementById('login-form');
    const statusMessage = document.getElementById('auth-status');

    // --- LÓGICA DE CADASTRO ---
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (statusMessage) {
                statusMessage.textContent = 'Cadastrando...';
                statusMessage.style.color = '#e9c46a';
            }

            const nome = document.getElementById('name').value.trim();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;

            try {
                const res = await fetch('/api/users/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: nome, email, password })
                });

                const contentType = res.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    throw new Error('Resposta inválida do servidor. Verifique se o backend está rodando.');
                }

                const data = await res.json();

                if (res.ok) {
                    if (statusMessage) {
                        statusMessage.textContent = 'Cadastro realizado! Redirecionando para o login...';
                        statusMessage.style.color = '#2a9d8f';
                    }
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 2000);
                } else {
                    throw new Error(data.error || 'Erro ao cadastrar.');
                }
            } catch (error) {
                console.error('Erro no cadastro:', error);
                if (statusMessage) {
                    statusMessage.textContent = error.message;
                    statusMessage.style.color = '#e76f51';
                }
            }
        });
    }

    // --- LÓGICA DE LOGIN ---
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (statusMessage) {
                statusMessage.textContent = 'Entrando...';
                statusMessage.style.color = '#e9c46a';
            }
            
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;

            try {
                const res = await fetch('/api/users/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const contentType = res.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    throw new Error('Resposta inválida do servidor. Verifique se o backend está rodando.');
                }

                const data = await res.json();

                if (res.ok) {
                    // 🔧 Corrigido: salva corretamente tanto data.user quanto data.usuario
                    const usuario = data.user || data.usuario;
                    if (!usuario || !data.token) {
                        throw new Error('Resposta inválida do servidor. Dados de login incompletos.');
                    }

                    localStorage.setItem('token', data.token);
                    localStorage.setItem('userInfo', JSON.stringify(usuario));
                    
                    if (statusMessage) {
                        statusMessage.textContent = 'Login bem-sucedido! Redirecionando...';
                        statusMessage.style.color = '#2a9d8f';
                    }
                    
                    setTimeout(() => {
                        window.location.href = 'minhasAtividades.html';
                    }, 1500);

                } else {
                    throw new Error(data.error || 'Erro ao fazer login.');
                }
            } catch (error) {
                console.error('Erro no login:', error);
                if (statusMessage) {
                    statusMessage.textContent = error.message;
                    statusMessage.style.color = '#e76f51';
                }
            }
        });
    }
});
