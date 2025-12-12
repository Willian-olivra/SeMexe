document.addEventListener('DOMContentLoaded', () => {
    
    // --- LÓGICA DE CADASTRO ---
    const formCadastro = document.getElementById('cadastro-form');
    if (formCadastro) {
        formCadastro.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nome = document.getElementById('nome').value;
            const email = document.getElementById('email').value;
            const senha = document.getElementById('senha').value;
            const confirmar = document.getElementById('confirmarSenha').value;
            const btn = document.getElementById('btn-cadastrar');

            if (senha !== confirmar) {
                showToast('As senhas não coincidem!', 'error');
                return;
            }

            const originalText = btn.innerText;
            btn.disabled = true;
            btn.innerText = 'Cadastrando...';

            try {
                const res = await fetch('/api/users/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: nome, email, password: senha })
                });

                const data = await res.json();

                if (res.ok) {
                    showToast('Cadastro realizado com sucesso!', 'success');
                    setTimeout(() => window.location.href = 'login.html', 1500);
                } else {
                    showToast(data.error || 'Erro ao cadastrar.', 'error');
                    btn.disabled = false;
                    btn.innerText = originalText;
                }
            } catch (error) {
                console.error(error);
                showToast('Erro de conexão.', 'error');
                btn.disabled = false;
                btn.innerText = originalText;
            }
        });
    }

    const formLogin = document.getElementById('login-form');
    const step1 = document.getElementById('step-1');
    const step2 = document.getElementById('step-2');
    const btnVerificar = document.getElementById('btn-verificar');

    if (formLogin) {
        // Passo 1: Enviar Email e Senha
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const senha = document.getElementById('senha').value;
            const btn = document.getElementById('btn-entrar');

            const originalText = btn.innerText;
            btn.disabled = true;
            btn.innerText = 'Verificando...';

            try {
                const res = await fetch('/api/users/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password: senha })
                });

                const data = await res.json();

                if (res.ok && data.require2FA) {
                    // Sucesso no passo 1 -> Vai para passo 2
                    step1.classList.add('hidden');
                    step2.classList.remove('hidden');
                    showToast('Código enviado para seu e-mail!', 'info');
                    // Foca no campo de código
                    document.getElementById('codigo-2fa').focus();
                } else {
                    showToast(data.error || 'Login falhou.', 'error');
                    btn.disabled = false;
                    btn.innerText = originalText;
                }
            } catch (error) {
                console.error(error);
                showToast('Erro de conexão.', 'error');
                btn.disabled = false;
                btn.innerText = originalText;
            }
        });

        // Passo 2: Enviar Código 2FA
        if (btnVerificar) {
            btnVerificar.addEventListener('click', async () => {
                const email = document.getElementById('email').value; // Pega do passo 1
                const code = document.getElementById('codigo-2fa').value;
                
                if(!code || code.length < 6) {
                    showToast('Digite o código de 6 dígitos.', 'warning');
                    return;
                }

                btnVerificar.disabled = true;
                btnVerificar.innerText = 'Validando...';

                try {
                    const res = await fetch('/api/users/login/verify', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, code })
                    });

                    const data = await res.json();

                    if (res.ok) {
                        localStorage.setItem('token', data.token);
                        localStorage.setItem('userInfo', JSON.stringify(data.user));
                        showToast('Login realizado!', 'success');
                        setTimeout(() => window.location.href = 'index.html', 1000);
                    } else {
                        showToast(data.error || 'Código inválido.', 'error');
                        btnVerificar.disabled = false;
                        btnVerificar.innerText = 'Verificar Código';
                    }
                } catch (error) {
                    console.error(error);
                    showToast('Erro ao validar código.', 'error');
                    btnVerificar.disabled = false;
                    btnVerificar.innerText = 'Verificar Código';
                }
            });
        }
    }
});