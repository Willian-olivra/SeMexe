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
      btn.innerHTML = '<i class="fa-solid fa-user-pen"></i> Você é o organizador';
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
    const resStatus = await fetch(`/api/atividades/${id}/status`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (resStatus.ok) {
      const { inscrito } = await resStatus.json();
      
      if (inscrito) {
        btn.innerHTML = '<i class="fa-solid fa-check"></i> Você está inscrito';
        btn.disabled = true;
        btn.style.backgroundColor = '#2a9d8f';
        
        // Adiciona botão para sair
        const btnSair = document.createElement('button');
        btnSair.id = 'sair-btn';
        btnSair.className = 'btn-danger';
        btnSair.innerHTML = '<i class="fa-solid fa-right-from-bracket"></i> Cancelar Inscrição';
        btn.parentElement.appendChild(btnSair);
        
        btnSair.addEventListener('click', () => cancelarInscricao(id, token));
      } else {
        configurarBotaoParticipar(btn, id, token, atividade);
      }
    }
    
    // Carrega lista de participantes
    await carregarParticipantes(id);
    
    // Renderiza mapa se houver coordenadas
    if (atividade.latitude && atividade.longitude) {
      renderizarMapa(atividade);
    }
    
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
  
  // Insere antes do botão de participar
  const btn = document.getElementById("participar-btn");
  btn.insertAdjacentHTML('beforebegin', detalhesHTML);
}

function configurarBotaoParticipar(btn, atividadeId, token, atividade) {
  btn.innerHTML = `<i class="fa-solid fa-user-plus"></i> Participar da Atividade (${atividade.vagas_disponiveis} vagas)`;
  btn.disabled = false;
  
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
        alert('✅ Inscrição confirmada com sucesso!');
        location.reload(); // Recarrega para atualizar status
      } else {
        throw new Error(data.error || 'Erro ao participar');
      }
    } catch (error) {
      console.error('Erro:', error);
      alert(error.message);
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Participar da Atividade';
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
      alert('✅ Inscrição cancelada com sucesso!');
      location.reload();
    } else {
      throw new Error(data.error || 'Erro ao cancelar inscrição');
    }
  } catch (error) {
    console.error('Erro:', error);
    alert(error.message);
  }
}

async function carregarParticipantes(atividadeId) {
  try {
    const res = await fetch(`/api/atividades/${atividadeId}/participantes`);
    
    if (!res.ok) return;
    
    const participantes = await res.json();
    
    if (participantes.length === 0) return;
    
    const listaHTML = `
      <div class="participantes-section">
        <h3><i class="fa-solid fa-users"></i> Participantes Inscritos (${participantes.length})</h3>
        <ul class="participantes-lista">
          ${participantes.map(p => `
            <li>
              <i class="fa-solid fa-user"></i>
              <span>${p.nome}</span>
              <small>Inscrito em ${new Date(p.data_inscricao).toLocaleDateString('pt-BR')}</small>
            </li>
          `).join('')}
        </ul>
      </div>
    `;
    
    const mapDiv = document.getElementById('map');
    mapDiv.insertAdjacentHTML('beforebegin', listaHTML);
    
  } catch (error) {
    console.error('Erro ao carregar participantes:', error);
  }
}

function renderizarMapa(atividade) {
  const mapDiv = document.getElementById("map");
  if (!mapDiv || typeof L === 'undefined') return;
  
  try {
    const map = L.map("map").setView([atividade.latitude, atividade.longitude], 15);
    
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);
    
    L.marker([atividade.latitude, atividade.longitude])
      .addTo(map)
      .bindPopup(`<strong>${atividade.titulo}</strong><br>${atividade.local}`)
      .openPopup();
  } catch (error) {
    console.error('Erro ao renderizar mapa:', error);
    mapDiv.style.display = 'none';
  }
}