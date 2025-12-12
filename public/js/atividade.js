document.addEventListener("DOMContentLoaded", async () => {
    // Carrega o menu principal (se a função existir em utils.js)
    if (typeof atualizarMenu === 'function') atualizarMenu();
    
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
  
    // 1. Proteção: Verifica se tem ID na URL
    if (!id || id === 'undefined') { 
        console.warn('ID inválido ou inexistente. Redirecionando para a home.');
        window.location.href = 'index.html'; 
        return; 
    }
  
    const token = localStorage.getItem("token");
    const userInfo = getUsuarioLogado();
  
    try {
        // Busca os dados da atividade
        const resAtividade = await fetch(`/api/atividades/${id}`);
        if (!resAtividade.ok) throw new Error('Atividade não encontrada');
        
        const atividade = await resAtividade.json();

        // Garante que o objeto tenha um ID válido
        if (!atividade.id) {
            atividade.id = id;
        }
        
        // Renderiza os componentes da página
        renderizarAtividade(atividade);
        
        // INICIA O CHAT SE O USUÁRIO ESTIVER INSCRITO OU FOR O DONO
        const inscrito = await verificarInscricao(id, token);
        if (inscrito || (userInfo && atividade.criador === userInfo.id)) {
            iniciarChatAtividade(id, token, userInfo);
        }
        
        await configurarBotaoParticipacao(atividade, token, userInfo);
        
        // Passamos 'atividade' aqui para verificar a data sem precisar buscar de novo
        await carregarParticipantes(id, atividade); 
        
        renderizarMapa(atividade);

        // --- CONFIGURAÇÃO DO FORMULÁRIO DE FAIRPLAY (Se existir na tela) ---
        configurarFormularioFairplay();
        
    } catch (error) {
        console.error('Erro:', error);
        const container = document.getElementById('atividade-info-container');
        if (container) {
             container.innerHTML = `<p class="text-neon-pink">Erro ao carregar detalhes: ${error.message}</p>`;
        }
    }
});

function renderizarAtividade(atividade) {
    const container = document.getElementById('atividade-info-container');
    if (!container) return;

    const tituloEl = document.getElementById("titulo-atividade");
    tituloEl.innerText = atividade.titulo || "Sem Título";
    tituloEl.classList.add('capitalize');

    const iconeEsporte = getIconeEsporte(atividade.esporte);
    const dataFormatada = formatarDataHora(atividade.data_hora);

    // HTML Base
    const html = `
        <div class="bg-dark-highlight p-4 rounded-lg flex items-start gap-4 border border-gray-700">
            <i class="${iconeEsporte} text-2xl text-neon-blue mt-1"></i>
            <div><strong class="block text-gray-400 text-xs uppercase">Esporte</strong><span class="text-white text-lg capitalize">${atividade.esporte || '-'}</span></div>
        </div>
        <div class="bg-dark-highlight p-4 rounded-lg flex items-start gap-4 border border-gray-700">
            <i class="fa-solid fa-location-dot text-2xl text-neon-blue mt-1"></i>
            <div><strong class="block text-gray-400 text-xs uppercase">Local</strong><span class="text-white text-lg capitalize">${atividade.local || '-'}</span></div>
        </div>
        <div class="bg-dark-highlight p-4 rounded-lg flex items-start gap-4 border border-gray-700">
            <i class="fa-solid fa-calendar-days text-2xl text-neon-blue mt-1"></i>
            <div><strong class="block text-gray-400 text-xs uppercase">Data</strong><span class="text-white text-lg">${dataFormatada}</span></div>
        </div>
        
        <div id="card-clima" class="bg-gradient-to-br from-gray-800 to-gray-900 p-4 rounded-lg flex items-center gap-4 border border-gray-700 shadow-lg relative overflow-hidden group">
            <div class="absolute right-[-20px] top-[-20px] text-6xl text-white/5 rotate-12 group-hover:rotate-0 transition duration-500">
                <i class="fa-solid fa-cloud"></i>
            </div>
            <div id="clima-icone" class="text-3xl text-gray-500"><i class="fa-solid fa-spinner fa-spin"></i></div>
            <div>
                <strong class="block text-gray-400 text-xs uppercase">Previsão do Tempo</strong>
                <span id="clima-texto" class="text-white text-sm font-bold">Carregando...</span>
                <span id="clima-chuva" class="block text-xs text-neon-blue mt-0.5"></span>
            </div>
        </div>

        <div class="bg-dark-highlight p-4 rounded-lg flex items-start gap-4 border border-gray-700">
            <i class="fa-solid fa-users text-2xl text-neon-blue mt-1"></i>
            <div><strong class="block text-gray-400 text-xs uppercase">Vagas</strong><span class="text-white text-lg">${atividade.vagas_disponiveis}/${atividade.vagas} ${atividade.lotada ? '(LOTADA)' : ''}</span></div>
        </div>
        <div class="bg-dark-highlight p-4 rounded-lg flex items-start gap-4 border border-gray-700 col-span-1 md:col-span-2">
            <i class="fa-solid fa-user-astronaut text-2xl text-neon-blue mt-1"></i>
            <div><strong class="block text-gray-400 text-xs uppercase">Organizador</strong><span class="text-white text-lg capitalize">${atividade.criador_nome || 'Anônimo'}</span></div>
        </div>
    `;
    container.innerHTML = html;

    // CHAMA A FUNÇÃO DE BUSCAR O CLIMA (ASSÍNCRONA)
    carregarPrevisaoTempo(atividade.local, atividade.data_hora);
}

async function configurarBotaoParticipacao(atividade, token, userInfo) {
    const btn = document.getElementById("participar-btn");
    if (!btn) return;
  
    if (!atividade.id) {
        btn.disabled = true;
        btn.innerHTML = "Erro ao carregar ID";
        return;
    }

    if (!token) {
        btn.innerHTML = '<i class="fa-solid fa-lock"></i> Faça login para participar';
        btn.disabled = true;
        btn.className = "w-full bg-gray-800 text-gray-500 py-4 rounded-lg font-bold text-lg flex justify-center items-center gap-2 cursor-not-allowed";
        return;
    }
  
    if (userInfo && atividade.id_usuario === userInfo.id) {
        btn.innerHTML = '<i class="fa-solid fa-user-pen"></i> Você é o organizador';
        btn.disabled = true;
        btn.className = "w-full bg-dark-highlight text-neon-blue border border-neon-blue py-4 rounded-lg font-bold text-lg flex justify-center items-center gap-2 opacity-80 cursor-default";
        return;
    }
  
    const inscrito = await verificarInscricao(atividade.id, token);
    
    if (inscrito) {
        btn.innerHTML = '<i class="fa-solid fa-right-from-bracket"></i> Cancelar Inscrição';
        btn.className = "w-full bg-transparent border border-neon-pink text-neon-pink py-4 rounded-lg font-bold text-lg flex justify-center items-center gap-2 hover:bg-neon-pink hover:text-white transition shadow-[0_0_10px_rgba(255,0,127,0.3)]";
        btn.disabled = false;
        
        const novoBtn = btn.cloneNode(true);
        if(btn.parentNode) btn.parentNode.replaceChild(novoBtn, btn);
        novoBtn.addEventListener('click', () => cancelarInscricao(atividade.id, token));
    } else {
        if (atividade.lotada) {
            btn.innerHTML = '<i class="fa-solid fa-ban"></i> Lotada';
            btn.disabled = true;
            btn.className = "w-full bg-red-900/20 text-neon-pink border border-neon-pink py-4 rounded-lg font-bold text-lg flex justify-center items-center gap-2 cursor-not-allowed";
        } else {
            configurarBotaoParticipar(btn, atividade.id, token, atividade);
        }
    }
}

async function verificarInscricao(atividadeId, token) {
    if (!atividadeId || atividadeId === 'undefined') return false;

    try {
        const res = await fetch(`/api/atividades/${atividadeId}/status`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            return data.inscrito;
        }
    } catch (e) { console.error(e); }
    return false;
}

function configurarBotaoParticipar(btn, atividadeId, token, atividade) {
    btn.innerHTML = `<i class="fa-solid fa-user-plus"></i> Confirmar Presença`;
    btn.className = "w-full bg-neon-blue text-black py-4 rounded-lg font-bold text-lg flex justify-center items-center gap-2 hover:bg-white hover:shadow-[0_0_20px_rgba(0,229,255,0.6)] transition shadow-lg cursor-pointer transform hover:-translate-y-1";
    btn.disabled = false;
  
    const novoBtn = btn.cloneNode(true);
    if(btn.parentNode) btn.parentNode.replaceChild(novoBtn, btn);

    novoBtn.addEventListener('click', async () => {
        if (!atividadeId || atividadeId === 'undefined') {
            showToast('Erro: ID da atividade inválido.', 'error');
            return;
        }

        const confirmado = await showConfirmModal(`Confirmar inscrição em "${atividade.titulo}"?`, 'Sim, Participar');
        if (!confirmado) return;
        
        novoBtn.disabled = true;
        novoBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processando...';
        
        try {
            const res = await fetch(`/api/atividades/${atividadeId}/participar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
            });
            
            if (res.ok) {
                showToast('Inscrição realizada!', 'success');
                setTimeout(() => location.reload(), 1000);
            } else {
                const data = await res.json();
                throw new Error(data.error || 'Erro ao participar');
            }
        } catch (e) { 
            showToast(e.message, 'error');
            novoBtn.disabled = false;
            novoBtn.innerHTML = `<i class="fa-solid fa-user-plus"></i> Tentar Novamente`;
        }
    });
}

async function cancelarInscricao(atividadeId, token) {
    if (!atividadeId || atividadeId === 'undefined') return;

    const confirmado = await showConfirmModal('Deseja cancelar sua inscrição?', 'Sim, Cancelar');
    if (!confirmado) return;
    
    try {
        const res = await fetch(`/api/atividades/${atividadeId}/sair`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
            showToast('Inscrição cancelada.', 'warning');
            setTimeout(() => location.reload(), 1000);
        } else {
            showToast('Erro ao cancelar.', 'error');
        }
    } catch (error) {
        showToast('Erro de conexão.', 'error');
    }
}

// --- FUNÇÃO ATUALIZADA COM FAIRPLAY ---
async function carregarParticipantes(atividadeId, atividadeDados) {
    const container = document.getElementById('participantes-container');
    if(!container) return;
    if (!atividadeId || atividadeId === 'undefined') return;

    try {
        const token = localStorage.getItem('token');
        
        // 1. Verifica se a atividade já passou
        let atividadeFinalizada = false;
        if (atividadeDados && atividadeDados.data_hora) {
            atividadeFinalizada = new Date() > new Date(atividadeDados.data_hora);
        }

        // 2. Busca participantes
        const resPart = await fetch(`/api/atividades/${atividadeId}/participantes`);
        const participantes = await resPart.json();

        // 3. Busca quem eu já avaliei
        let jaAvaliei = [];
        if (token && atividadeFinalizada) {
            try {
                const resStatus = await fetch(`/api/fairplay/status/${atividadeId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (resStatus.ok) {
                    jaAvaliei = await resStatus.json(); // Array de IDs
                }
            } catch (e) { console.error('Erro ao buscar status fairplay', e); }
        }
        
        const meuUser = getUsuarioLogado();
        const meuId = meuUser ? (meuUser.id || meuUser._id) : null;

        if (!participantes || participantes.length === 0) {
            container.innerHTML = `<div class="text-center py-6 border border-dashed border-gray-800 rounded-lg text-gray-500">Nenhum participante ainda.</div>`;
            return;
        }

        container.innerHTML = `
            <h3 class="text-white font-bold mb-4 flex items-center gap-2 text-lg">
                <i class="fa-solid fa-users text-neon-blue"></i> Inscritos (${participantes.length})
            </h3>
            <ul class="grid grid-cols-1 md:grid-cols-2 gap-3">
                ${participantes.map(p => {
                    const pId = p._id || p.id;
                    const ehVoce = pId === meuId;
                    
                    let actionArea = '';
                    
                    if (atividadeFinalizada && !ehVoce && meuUser) {
                        if (jaAvaliei.includes(pId)) {
                            actionArea = `
                                <span class="ml-auto text-xs bg-green-500/10 border border-green-500 text-green-500 px-2 py-1 rounded flex items-center gap-1 cursor-default">
                                    <i class="fa-solid fa-check"></i> Avaliado
                                </span>
                            `;
                        } else {
                            actionArea = `
                                <button onclick="window.abrirModalFairplay('${pId}', '${p.nome}', '${atividadeId}')" 
                                        class="ml-auto text-xs bg-dark-base border border-gray-600 text-neon-blue px-2 py-1 rounded hover:bg-neon-blue hover:text-black transition flex items-center gap-1" title="Avaliar Fairplay">
                                    <i class="fa-solid fa-star"></i> Avaliar
                                </button>
                            `;
                        }
                    }

                    return `
                    <li class="flex items-center gap-3 bg-dark-highlight p-3 rounded border border-gray-700 animate-fade-in">
                        <div class="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-neon-blue font-bold border border-gray-600 cursor-pointer" onclick="window.location.href='perfilUsuario.html?id=${pId}'">
                            ${p.nome ? p.nome.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div class="flex flex-col">
                            <span class="text-gray-200 font-medium text-sm cursor-pointer hover:underline" onclick="window.location.href='perfilUsuario.html?id=${pId}'">
                                ${p.nome || 'Usuário'} ${ehVoce ? '(Você)' : ''}
                            </span>
                        </div>
                        ${actionArea}
                    </li>
                `}).join('')}
            </ul>
        `;
    } catch (e) { console.error(e); }
}

function renderizarMapa(atividade) {
    const mapSection = document.getElementById("mapa-section");
    const mapDiv = document.getElementById("map");
    if (!mapSection || !mapDiv) return;
    
    mapSection.classList.remove('hidden');
    mapSection.style.display = 'block';
    
    let query = (atividade.latitude && atividade.longitude) 
        ? `${atividade.latitude},${atividade.longitude}`
        : encodeURIComponent(`${atividade.local}, Pelotas, RS, Brasil`);
    
    mapDiv.innerHTML = `<iframe width="100%" height="100%" frameborder="0" style="border:0; width: 100%; height: 100%; min-height: 400px; border-radius: 0.5rem;" src="https://maps.google.com/maps?q=${query}&t=m&z=15&output=embed&iwloc=near" allowfullscreen loading="lazy"></iframe>`;
}

function getUsuarioLogado() {
    try { return JSON.parse(localStorage.getItem('userInfo')); } catch { return null; }
}

function formatarDataHora(data) {
    if (!data) return "Data a definir";
    return new Date(data).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function getIconeEsporte(esporte) {
    const icones = { 'Futebol': 'fa-solid fa-futbol', 'Vôlei': 'fa-solid fa-volleyball', 'Basquete': 'fa-solid fa-basketball', 'Corrida': 'fa-solid fa-person-running', 'Natação': 'fa-solid fa-person-swimming' };
    return icones[esporte] || 'fa-solid fa-person-running';
}

// --- FUNÇÕES GLOBAIS DO MODAL FAIRPLAY ---
window.abrirModalFairplay = function(userId, userName, atividadeId) {
    const modalFP = document.getElementById('modal-fairplay');
    const formFP = document.getElementById('form-fairplay');

    if(!modalFP) {
        console.error('ERRO: Modal "modal-fairplay" não encontrado no HTML.');
        alert('Erro: O modal de avaliação não foi encontrado na página. Verifique se o HTML foi atualizado.');
        return;
    }

    if(!formFP) {
        console.error('ERRO: Formulário "form-fairplay" não encontrado.');
        return;
    }

    // Preenche os dados no modal
    const elNome = document.getElementById('fp-nome-jogador');
    const elId = document.getElementById('fp-avaliado-id');
    
    if(elNome) elNome.innerText = userName;
    if(elId) elId.value = userId;
    
    // Guarda o ID da atividade no dataset do formulário
    formFP.dataset.atividadeId = atividadeId;

    // Exibe o modal
    modalFP.classList.remove('hidden');
    setTimeout(() => {
        modalFP.classList.remove('opacity-0');
        const content = modalFP.querySelector('div');
        if(content) {
            content.classList.remove('scale-95');
            content.classList.add('scale-100');
        }
    }, 10);
};

window.fecharModalFairplay = function() {
    const modalFP = document.getElementById('modal-fairplay');
    if(!modalFP) return;

    modalFP.classList.add('opacity-0');
    const content = modalFP.querySelector('div');
    if(content) {
        content.classList.remove('scale-100');
        content.classList.add('scale-95');
    }
    
    setTimeout(() => modalFP.classList.add('hidden'), 300);
};

// --- CONFIGURAÇÃO DOS EVENTOS DO FORMULÁRIO ---
function configurarFormularioFairplay() {
    const formFP = document.getElementById('form-fairplay');
    
    if(formFP) {
        // Toggle visual dos critérios
        const radios = document.querySelectorAll('input[name="fp-compareceu"]');
        radios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                const divCriterios = document.getElementById('fp-criterios');
                if(divCriterios) {
                    if (e.target.value === 'false') {
                        divCriterios.classList.add('opacity-50', 'pointer-events-none');
                    } else {
                        divCriterios.classList.remove('opacity-50', 'pointer-events-none');
                    }
                }
            });
        });

        // Envio da avaliação
        formFP.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btnSubmit = formFP.querySelector('button[type="submit"]');
            const originalText = btnSubmit.innerHTML;
            btnSubmit.disabled = true;
            btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Enviando...';

            try {
                const token = localStorage.getItem('token');
                const avaliadoId = document.getElementById('fp-avaliado-id').value;
                const atividadeId = formFP.dataset.atividadeId;
                const compareceu = document.querySelector('input[name="fp-compareceu"]:checked').value === 'true';
                const respeito = parseInt(document.getElementById('fp-respeito').value);
                const jogoLimpo = parseInt(document.getElementById('fp-jogolimpo').value);
                const comentario = document.getElementById('fp-comentario').value;

                const res = await fetch('/api/fairplay', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ avaliadoId, atividadeId, compareceu, respeito, jogoLimpo, comentario })
                });

                const data = await res.json();
                
                if (res.ok) {
                    showToast('Avaliação enviada!', 'success');
                    window.fecharModalFairplay();
                    
                    const fakeAtvData = { data_hora: new Date(0).toISOString() }; 
                    await carregarParticipantes(atividadeId, fakeAtvData);
                    
                } else {
                    showToast(data.error || 'Erro ao avaliar.', 'error');
                }
            } catch (error) {
                console.error(error);
                showToast('Erro de conexão.', 'error');
            } finally {
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = originalText;
            }
        });
    }
}

// --- LÓGICA DO CHAT DA ATIVIDADE ---
let socketAtividade = null;

async function iniciarChatAtividade(atividadeId, token, userInfo) {
    const container = document.getElementById('chat-atividade-container');
    const boxMensagens = document.getElementById('box-mensagens');
    const form = document.getElementById('form-chat-atividade');
    const input = document.getElementById('input-msg-atividade');
    const badge = document.getElementById('chat-status-badge');
    const aviso = document.getElementById('aviso-expiracao');

    if (!container) return;
    
    // EVITA DUPLICIDADE
    if (socketAtividade) return;

    // Mostra o chat
    container.classList.remove('hidden');

    // 1. Conecta ao Socket
    if (typeof io !== 'undefined') {
        socketAtividade = io({ auth: { token } });
        socketAtividade.emit('entrar_sala_atividade', atividadeId);

        // OUVINTE: Quando chega mensagem do servidor
        socketAtividade.on('receber_msg_atividade', (msg) => {
            const remetenteId = msg.remetente._id || msg.remetente;
            const meuId = userInfo.id || userInfo._id;
            const souEu = remetenteId.toString() === meuId.toString();

            // Ignora eco se fui eu
            if (souEu) return;

            renderizarMensagem(msg, false);
            boxMensagens.scrollTop = boxMensagens.scrollHeight;
        });
    }

    // 2. Carrega Histórico
    try {
        const res = await fetch(`/api/chat/atividade/${atividadeId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (data.expirado) {
            input.disabled = true;
            input.placeholder = "Chat encerrado.";
            form.querySelector('button').disabled = true;
            form.classList.add('opacity-50');
            
            badge.className = "text-xs font-bold px-2 py-1 rounded bg-red-500/20 text-red-400 border border-red-500";
            badge.innerText = "Encerrado";
            aviso.classList.remove('hidden');
        }

        boxMensagens.innerHTML = '';
        if (data.mensagens.length === 0) {
            boxMensagens.innerHTML = '<p class="text-center text-gray-600 text-sm mt-10" id="msg-vazia">Inicie a conversa!</p>';
        } else {
            data.mensagens.forEach(msg => {
                const remetenteId = msg.remetente._id || msg.remetente;
                const meuId = userInfo.id || userInfo._id;
                const souEu = remetenteId.toString() === meuId.toString();
                renderizarMensagem(msg, souEu);
            });
            boxMensagens.scrollTop = boxMensagens.scrollHeight;
        }

    } catch (e) { console.error("Erro chat:", e); }

    // 3. Enviar Mensagem
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const texto = input.value.trim();
        if (!texto) return;

        input.value = '';

        // UI OTIMISTA
        const msgTemp = {
            texto: texto,
            data_envio: new Date(),
            remetente: {
                nome: userInfo.nome,
                avatar: userInfo.avatar
            }
        };
        renderizarMensagem(msgTemp, true);
        boxMensagens.scrollTop = boxMensagens.scrollHeight;

        try {
            const res = await fetch('/api/chat/atividade/enviar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ atividadeId, texto })
            });

            if (res.ok) {
                const msgSalva = await res.json();
                socketAtividade.emit('enviar_msg_atividade', {
                    atividadeId,
                    texto: msgSalva.texto,
                    remetente: msgSalva.remetente,
                    data_envio: msgSalva.data_envio
                });
            } else {
                const err = await res.json();
                showToast(err.error, 'error');
                if (err.error.includes('encerrado')) setTimeout(() => location.reload(), 2000);
            }
        } catch (e) { console.error(e); }
    });
}

function renderizarMensagem(msg, souEu) {
    const box = document.getElementById('box-mensagens');
    if (box.innerText === 'Inicie a conversa!') box.innerHTML = '';

    const div = document.createElement('div');
    div.className = `flex gap-3 mb-3 ${souEu ? 'flex-row-reverse' : ''}`;
    
    const hora = new Date(msg.data_envio).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    const avatar = msg.remetente.avatar && msg.remetente.avatar.includes('fa-') 
        ? `<div class="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center border border-gray-600"><i class="${msg.remetente.avatar} text-xs text-white"></i></div>`
        : `<div class="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center border border-gray-600 font-bold text-xs">${msg.remetente.nome.charAt(0)}</div>`;

    div.innerHTML = `
        ${avatar}
        <div class="flex flex-col max-w-[75%] ${souEu ? 'items-end' : 'items-start'}">
            <span class="text-[10px] text-gray-500 mb-0.5">${souEu ? 'Você' : msg.remetente.nome.split(' ')[0]} • ${hora}</span>
            <div class="${souEu ? 'bg-neon-blue text-black' : 'bg-dark-highlight border border-gray-700 text-gray-200'} px-3 py-2 rounded-lg text-sm break-words shadow-md">
                ${msg.texto || msg.conteudo}
            </div>
        </div>
    `;
    box.appendChild(div);
}

// --- SISTEMA DE PREVISÃO DO TEMPO (Com GPS) ---

// Função auxiliar para transformar o navigator.geolocation em Promise
function obterLocalizacaoUsuario() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocalização não suportada pelo navegador.'));
        } else {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        lat: position.coords.latitude,
                        lon: position.coords.longitude
                    });
                },
                (error) => {
                    reject(error);
                }
            );
        }
    });
}

async function carregarPrevisaoTempo(local, dataHoraString) {
    const elIcone = document.getElementById('clima-icone');
    const elTexto = document.getElementById('clima-texto');
    const elChuva = document.getElementById('clima-chuva');
    const card = document.getElementById('card-clima');

    if (!local || !dataHoraString) return;

    const dataAtividade = new Date(dataHoraString);
    const hoje = new Date();
    
    // Diferença em dias
    const diffTime = dataAtividade - hoje;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        atualizarUIClima('fa-solid fa-clock-rotate-left', 'Atividade já realizada', '', 'text-gray-400');
        return;
    } 
    if (diffDays > 14) {
        atualizarUIClima('fa-solid fa-calendar-plus', 'Previsão indisponível (muito distante)', '', 'text-gray-500');
        return;
    }

    let lat, lon;

    try {
        // TENTATIVA 1: Busca pelo Nome do Local
        let queryLocal = local;
        // Se quiser "ajudar" a busca: 
        // if (!queryLocal.toLowerCase().includes('brasil')) queryLocal += ', Brasil';

        let resGeo = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(queryLocal)}&format=json&limit=1`);
        let dataGeo = await resGeo.json();

        if (dataGeo && dataGeo.length > 0) {
            // Achou pelo nome!
            lat = dataGeo[0].lat;
            lon = dataGeo[0].lon;
        } else {
            // TENTATIVA 2: Não achou o nome? Pede o GPS do usuário!
            console.warn(`Local "${local}" não encontrado. Solicitando GPS...`);
            
            if(elTexto) elTexto.innerText = "Localizando você...";
            
            try {
                const posicao = await obterLocalizacaoUsuario();
                lat = posicao.lat;
                lon = posicao.lon;
                
                if(elTexto) elTexto.innerText += " (Sua Localização)";
                showToast('Local do evento não encontrado. Usando sua localização.', 'warning');

            } catch (gpsError) {
                // TENTATIVA 3 (Fallback Final): Pelotas
                console.warn("GPS negado ou indisponível. Usando Pelotas como fallback.");
                const resFallback = await fetch(`https://nominatim.openstreetmap.org/search?q=Pelotas, RS&format=json&limit=1`);
                const dataFallback = await resFallback.json();
                
                if(dataFallback.length > 0) {
                    lat = dataFallback[0].lat;
                    lon = dataFallback[0].lon;
                    if(elTexto) elTexto.innerText += " (Pelotas)";
                } else {
                    throw new Error('Localização impossível de determinar.');
                }
            }
        }

        // --- 3. Busca Clima (Open-Meteo) com as coordenadas obtidas ---
        const dateStr = dataAtividade.toISOString().split('T')[0];
        const hour = dataAtividade.getHours();

        const urlMeteo = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,precipitation_probability,weathercode&start_date=${dateStr}&end_date=${dateStr}&timezone=America%2FSao_Paulo`;

        const resMeteo = await fetch(urlMeteo);
        const dataMeteo = await resMeteo.json();

        if(!dataMeteo.hourly) throw new Error('Dados de clima incompletos');

        const temp = dataMeteo.hourly.temperature_2m[hour];
        const probChuva = dataMeteo.hourly.precipitation_probability[hour];
        const code = dataMeteo.hourly.weathercode[hour];

        const infoWMO = getWMOInfo(code);
        
        let corIcone = 'text-white';
        if (code <= 3) corIcone = 'text-yellow-400';
        else if (code >= 51) corIcone = 'text-neon-blue';

        // Recupera o texto base (caso tenha adicionado "(Sua Localização)")
        let textoBase = elTexto ? elTexto.innerText.replace('Carregando...', '').replace('Localizando você...', '') : '';
        if(textoBase === '') textoBase = infoWMO.texto; 
        else textoBase = `${infoWMO.texto} ${textoBase.includes('(') ? textoBase.substring(textoBase.indexOf('(')) : ''}`;

        atualizarUIClima(
            infoWMO.icone, 
            `${Math.round(temp)}°C - ${textoBase}`, 
            `Chuva: ${probChuva}%`,
            corIcone
        );

        if (probChuva > 50 && card) {
            card.classList.remove('from-gray-800', 'to-gray-900', 'border-gray-700');
            card.classList.add('from-red-900/40', 'to-black', 'border-neon-pink');
        }

    } catch (error) {
        console.error('Erro clima:', error);
        atualizarUIClima('fa-solid fa-cloud-question', 'Clima indisponível', 'Verifique a localização', 'text-gray-500');
    }
}

function atualizarUIClima(icone, texto, chuva, corIcone) {
    const elIcone = document.getElementById('clima-icone');
    const elTexto = document.getElementById('clima-texto');
    const elChuva = document.getElementById('clima-chuva');

    if(elIcone) elIcone.innerHTML = `<i class="${icone} ${corIcone}"></i>`;
    if(elTexto) elTexto.textContent = texto;
    if(elChuva) elChuva.textContent = chuva;
}

function getWMOInfo(code) {
    const map = {
        0: { texto: 'Céu Limpo', icone: 'fa-solid fa-sun' },
        1: { texto: 'Predom. Ensolarado', icone: 'fa-solid fa-cloud-sun' },
        2: { texto: 'Parcial. Nublado', icone: 'fa-solid fa-cloud-sun' },
        3: { texto: 'Nublado', icone: 'fa-solid fa-cloud' },
        45: { texto: 'Nevoeiro', icone: 'fa-solid fa-smog' },
        48: { texto: 'Nevoeiro com Geada', icone: 'fa-solid fa-smog' },
        51: { texto: 'Garoa Leve', icone: 'fa-solid fa-cloud-rain' },
        53: { texto: 'Garoa Moderada', icone: 'fa-solid fa-cloud-rain' },
        55: { texto: 'Garoa Densa', icone: 'fa-solid fa-cloud-showers-heavy' },
        61: { texto: 'Chuva Leve', icone: 'fa-solid fa-cloud-rain' },
        63: { texto: 'Chuva Moderada', icone: 'fa-solid fa-cloud-showers-heavy' },
        65: { texto: 'Chuva Forte', icone: 'fa-solid fa-cloud-showers-water' },
        71: { texto: 'Neve', icone: 'fa-regular fa-snowflake' },
        80: { texto: 'Pancadas de Chuva', icone: 'fa-solid fa-cloud-showers-heavy' },
        81: { texto: 'Pancadas Fortes', icone: 'fa-solid fa-cloud-bolt' },
        82: { texto: 'Tempestade', icone: 'fa-solid fa-bolt' },
        95: { texto: 'Trovoadas', icone: 'fa-solid fa-bolt' },
        96: { texto: 'Trovoadas com Granizo', icone: 'fa-solid fa-cloud-meatball' }
    };
    return map[code] || { texto: 'Indefinido', icone: 'fa-solid fa-cloud' };
}