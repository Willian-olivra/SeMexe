document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form');
    const loginForm = document.getElementById('login-form');

    // LÓGICA DE CADASTRO
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nome = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            try {
                const res = await fetch('/api/users/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: nome, email, password })
                });
                const data = await res.json();
                
                if (res.ok) {
                    showToast('Cadastro realizado!', 'success');
                    setTimeout(() => window.location.href = 'login.html', 1500);
                } else {
                    throw new Error(data.error || 'Erro no cadastro');
                }
            } catch (error) { showToast(error.message, 'error'); }
        });
    }

    // LÓGICA DE LOGIN (CORRIGIDA PARA MONGODB)
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            try {
                const res = await fetch('/api/users/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const data = await res.json();
                
                if (res.ok) {
                    // LIMPA DADOS ANTIGOS
                    localStorage.clear();

                    // SALVA O TOKEN
                    localStorage.setItem('token', data.token);

                    // AJUSTA O USUÁRIO PARA GARANTIR QUE TENHA .id (E NÃO SÓ ._id)
                    const userRaw = data.user || data.usuario;
                    const userFix = {
                        ...userRaw,
                        id: userRaw.id || userRaw._id // Garante que .id exista
                    };

                    localStorage.setItem('userInfo', JSON.stringify(userFix));
                    
                    showToast(`Bem-vindo, ${userFix.nome.split(' ')[0]}!`, 'success');
                    setTimeout(() => window.location.href = 'minhasAtividades.html', 1000);
                } else {
                    throw new Error(data.error || 'Erro no login');
                }
            } catch (error) { showToast(error.message, 'error'); }
        });
    }
});