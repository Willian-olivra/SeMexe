document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form');
    const loginForm = document.getElementById('login-form');

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
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('userInfo', JSON.stringify(data.user || data.usuario));
                    showToast(`Bem-vindo, ${(data.user || data.usuario).nome.split(' ')[0]}!`, 'success');
                    setTimeout(() => window.location.href = 'minhasAtividades.html', 1000);
                } else {
                    throw new Error(data.error || 'Erro no login');
                }
            } catch (error) { showToast(error.message, 'error'); }
        });
    }
});