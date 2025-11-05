document.addEventListener("DOMContentLoaded", async () => {
  atualizarMenu();
  
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  
  if (!id) {
    alert("Atividade não encontrada!");
    window.location.href = 'index.html';
    return;
  }
  
  const token = localStorage.getItem("token");
  const userInfo = getUsuarioLogado();
  
  try {
    // Busca dados da atividade
    const resAtividade = await fetch(`/api/atividades/${id}`);
    
    if (!resAtividade.ok) {
      throw new Error('Atividade não encontrada');
    }
    
    const atividade = await resAtividade.json();
    
    // Renderiza informações da atividade
    renderizarAtividade(atividade);
    
    // Configura botão de participar
    await configurarBotaoParticipacao(atividade, token, userInfo);
    
    // Carrega lista de participantes
    await carregarParticipantes(id);
    
    // Renderiza mapa (APENAS GOOGLE MAPS)
    renderizarMapa(atividade);
    
  } catch (error) {
    console.error('Erro:', error);
    alert(error.message || 'Erro ao carregar atividade');
    window.location.href = 'index.html';
  }
});

function renderizarAtividade(atividade) {
  document.getElementById("titulo-atividade").innerText = atividade.titulo;
  
  const detalhesHTML = `
    <div class="atividade-info">
      <div class="info-item">
        <i class="fa-solid fa-futbol"></i>
        <div>
          <strong>Esporte</strong>
          <span>${atividade.esporte}</span>
        </div>
      </div>
      
      <div class="info-item">
        <i class="fa-solid fa-location-dot"></i>
        <div>
          <strong>Local</strong>
          <span id="local-atividade">${atividade.local}</span>
        </div>
      </div>
      
      <div class="info-item">
        <i class="fa-solid fa-calendar-days"></i>
        <div>
          <strong>Data e Hora</strong>
          <span id="data-atividade">${formatarDataHora(atividade.data_hora)}</span>
        </div>
      </div>
      
      <div class="info-item">
        <i class="fa-solid fa-users"></i>
        <div>
          <strong>Vagas</strong>
          <span class="vagas-info ${atividade.lotada ? 'lotada' : ''}">
            ${atividade.vagas_disponiveis} de ${atividade.vagas} disponíveis
            ${atividade.lotada ? ' - <strong>LOTADA</strong>' : ''}
          </span>
        </div>
      </div>
      
      <div class="info-item">
        <i class="fa-solid fa-user"></i>
        <div>
          <strong>Organizador</strong>
          <span>${atividade.criador_nome || 'Anônimo'}</span>
        </div>
      </div>
    </div>
  `;
  
  document.getElementById('atividade-info-container').innerHTML = detalhesHTML;
}

async function configurarBotaoParticipacao(atividade, token, userInfo) {
  const btn = document.getElementById("participar-btn");
  
  if (!token) {
    btn.innerHTML = '<i class="fa-solid fa-lock"></i> Faça login para participar';
    btn.disabled = true;
    btn.style.opacity = '0.6';
    btn.style.cursor = 'not-allowed';
    return;
  }
  
  // Verifica se é o criador
  if (userInfo && atividade.id_usuario === userInfo.id) {
    btn.innerHTML = '<i class="fa-solid fa-user-pen"></i> Você é o organizador desta atividade';
    btn.disabled = true;
    btn.style.backgroundColor = '#264653';
    return;
  }
  
  // Verifica se está lotada
  if (atividade.lotada) {
    btn.innerHTML = '<i class="fa-solid fa-users"></i> Atividade Lotada';
    btn.disabled = true;
    btn.style.backgroundColor = '#e76f51';
    return;
  }
  
  // Verifica status de inscrição
  try {
    const resStatus = await fetch(`/api/atividades/${atividade.id}/status`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (resStatus.ok) {
      const { inscrito } = await resStatus.json();
      
      if (inscrito) {
        btn.innerHTML = '<i class="fa-solid fa-check"></i> Você está inscrito nesta atividade';
        btn.disabled = true;
        btn.style.backgroundColor = '#2a9d8f';
        
        // Adiciona botão para sair
        const btnSair = document.createElement('button');
        btnSair.id = 'sair-btn';
        btnSair.className = 'btn-danger';
        btnSair.innerHTML = '<i class="fa-solid fa-right-from-bracket"></i> Cancelar Minha Inscrição';
        btn.parentElement.insertBefore(btnSair, btn.nextSibling);
        
        btnSair.addEventListener('click', () => cancelarInscricao(atividade.id, token));
      } else {
        configurarBotaoParticipar(btn, atividade.id, token, atividade);
      }
    }
  } catch (error) {
    console.error('Erro ao verificar status:', error);
    configurarBotaoParticipar(btn, atividade.id, token, atividade);
  }
}

function configurarBotaoParticipar(btn, atividadeId, token, atividade) {
  btn.innerHTML = `<i class="fa-solid fa-user-plus"></i> Participar desta Atividade (${atividade.vagas_disponiveis} ${atividade.vagas_disponiveis === 1 ? 'vaga' : 'vagas'})`;
  btn.disabled = false;
  btn.style.backgroundColor = '#2a9d8f';
  btn.style.cursor = 'pointer';
  btn.style.opacity = '1';
  
  btn.addEventListener('click', async () => {
    if (!confirm(`Confirma sua inscrição em "${atividade.titulo}"?`)) {
      return;
    }
    
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Inscrevendo...';
    
    try {
      const res = await fetch(`/api/atividades/${atividadeId}/participar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await res.json();
      
      if (res.ok) {
        alert('Inscrição confirmada com sucesso!');
        location.reload();
      } else {
        throw new Error(data.error || 'Erro ao participar');
      }
    } catch (error) {
      console.error('Erro:', error);
      alert('' + error.message);
      btn.disabled = false;
      btn.innerHTML = `<i class="fa-solid fa-user-plus"></i> Participar desta Atividade`;
    }
  });
}

async function cancelarInscricao(atividadeId, token) {
  if (!confirm('Tem certeza que deseja cancelar sua inscrição?')) {
    return;
  }
  
  try {
    const res = await fetch(`/api/atividades/${atividadeId}/sair`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await res.json();
    
    if (res.ok) {
      alert('Inscrição cancelada com sucesso!');
      location.reload();
    } else {
      throw new Error(data.error || 'Erro ao cancelar inscrição');
    }
  } catch (error) {
    console.error('Erro:', error);
    alert('' + error.message);
  }
}

async function carregarParticipantes(atividadeId) {
  try {
    const res = await fetch(`/api/atividades/${atividadeId}/participantes`);
    
    if (!res.ok) {
      console.log('Não foi possível carregar participantes');
      return;
    }
    
    const participantes = await res.json();
    
    if (participantes.length === 0) {
      document.getElementById('participantes-container').innerHTML = `
        <div class="participantes-section">
          <h3><i class="fa-solid fa-users"></i> Participantes Inscritos</h3>
          <p style="text-align: center; color: #666; padding: 20px;">
            <i class="fa-solid fa-user-slash" style="font-size: 2rem; display: block; margin-bottom: 10px;"></i>
            Nenhum participante inscrito ainda. Seja o primeiro!
          </p>
        </div>
      `;
      return;
    }
    
    const listaHTML = `
      <div class="participantes-section">
        <h3>
          <i class="fa-solid fa-users"></i> 
          Participantes Inscritos (${participantes.length})
        </h3>
        <ul class="participantes-lista">
          ${participantes.map(p => `
            <li>
              <i class="fa-solid fa-user-check"></i>
              <span>${p.nome}</span>
              <small>Inscrito em ${new Date(p.data_inscricao).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
              })}</small>
            </li>
          `).join('')}
        </ul>
      </div>
    `;
    
    document.getElementById('participantes-container').innerHTML = listaHTML;
    
  } catch (error) {
    console.error('Erro ao carregar participantes:', error);
  }
}

//RENDERIZA MAPA - APENAS GOOGLE MAPS
function renderizarMapa(atividade) {
  const mapSection = document.getElementById("mapa-section");
  const mapDiv = document.getElementById("map");
  
  if (!mapSection || !mapDiv) {
    console.error('Elementos do mapa não encontrados');
    return;
  }
  
  console.log('Renderizando Google Maps para:', atividade.local);
  
  mapSection.style.display = 'block';
  
  // Monta query de busca
  let query;
  
  // Se tem coordenadas, usa elas (mais preciso)
  if (atividade.latitude && atividade.longitude) {
    query = `${atividade.latitude},${atividade.longitude}`;
    console.log('Usando coordenadas:', query);
  } else {
    // Se não tem, usa o nome do local
    query = encodeURIComponent(`${atividade.local}, Pelotas, RS, Brasil`);
    console.log('Usando endereço:', atividade.local);
  }
  
  // Cria iframe do Google Maps
  mapDiv.innerHTML = `
    <iframe
      width="100%"
      height="400"
      frameborder="0"
      style="border:0; border-radius: 8px;"
      referrerpolicy="no-referrer-when-downgrade"
      src="https://maps.google.com/maps?q=${query}&output=embed&z=15"
      allowfullscreen
      loading="lazy">
    </iframe>
  `;
  
  // Adiciona botões de ação
  adicionarBotoesGoogleMaps(atividade);
}

/**
 * Adiciona botões para abrir Google Maps e obter direções
 */
function adicionarBotoesGoogleMaps(atividade) {
  const mapSection = document.getElementById("mapa-section");
  
  // Remove botões anteriores se existirem
  const botoesExistentes = document.getElementById('btn-maps-container');
  if (botoesExistentes) {
    botoesExistentes.remove();
  }
  
  // Monta URLs do Google Maps
  let urlBusca, urlDirecoes;
  
  if (atividade.latitude && atividade.longitude) {
    // Com coordenadas
    urlBusca = `https://www.google.com/maps/search/?api=1&query=${atividade.latitude},${atividade.longitude}`;
    urlDirecoes = `https://www.google.com/maps/dir/?api=1&destination=${atividade.latitude},${atividade.longitude}`;
  } else {
    // Sem coordenadas - busca por texto
    const query = encodeURIComponent(`${atividade.local}, Pelotas, RS`);
    urlBusca = `https://www.google.com/maps/search/?api=1&query=${query}`;
    urlDirecoes = `https://www.google.com/maps/dir/?api=1&destination=${query}`;
  }
  
  // Cria container de botões
  const btnContainer = document.createElement('div');
  btnContainer.id = 'btn-maps-container';
  btnContainer.style.cssText = `
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-top: 15px;
  `;
  
  btnContainer.innerHTML = `
    <a href="${urlBusca}" 
       target="_blank" 
       rel="noopener noreferrer"
       class="btn-google-maps"
       style="
         background: linear-gradient(135deg, #4285f4 0%, #3367d6 100%);
         color: white;
         padding: 14px 20px;
         border-radius: 8px;
         text-decoration: none;
         font-weight: 600;
         display: flex;
         align-items: center;
         justify-content: center;
         gap: 10px;
         transition: all 0.3s ease;
         box-shadow: 0 2px 8px rgba(66, 133, 244, 0.3);
       ">
      <i class="fa-brands fa-google" style="font-size: 1.2rem;"></i>
      <span>Abrir no Google Maps</span>
    </a>
    
    <a href="${urlDirecoes}"
       target="_blank"
       rel="noopener noreferrer"
       class="btn-directions"
       style="
         background: linear-gradient(135deg, #34a853 0%, #2d9249 100%);
         color: white;
         padding: 14px 20px;
         border-radius: 8px;
         text-decoration: none;
         font-weight: 600;
         display: flex;
         align-items: center;
         justify-content: center;
         gap: 10px;
         transition: all 0.3s ease;
         box-shadow: 0 2px 8px rgba(52, 168, 83, 0.3);
       ">
      <i class="fa-solid fa-route" style="font-size: 1.1rem;"></i>
      <span>Como Chegar</span>
    </a>
  `;
  
  mapSection.appendChild(btnContainer);
  
  // Adiciona efeitos de hover
  const botoes = btnContainer.querySelectorAll('a');
  botoes.forEach(btn => {
    btn.addEventListener('mouseenter', () => {
      btn.style.transform = 'translateY(-2px)';
      btn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
    });
    
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'translateY(0)';
      btn.style.boxShadow = btn.classList.contains('btn-google-maps') 
        ? '0 2px 8px rgba(66, 133, 244, 0.3)'
        : '0 2px 8px rgba(52, 168, 83, 0.3)';
    });
  });
  
  console.log('Mapa Google e botões renderizados com sucesso');
}