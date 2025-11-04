document.addEventListener("DOMContentLoaded", async () => {
  atualizarMenu();
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  if (!id) return alert("Atividade não encontrada!");
  const token = localStorage.getItem("token");
  const res = await fetch(`/api/atividades/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const atividade = await res.json();
  document.getElementById("titulo-atividade").innerText = atividade.titulo;
  document.getElementById("esporte-atividade").innerText = `Esporte: ${atividade.esporte}`;
  document.getElementById("local-atividade").innerText = atividade.local;
  document.getElementById("data-atividade").innerText = new Date(atividade.data_hora).toLocaleString();
  const btn = document.getElementById("participar-btn");
  if (!token) { btn.style.display = "none"; return; }
  btn.addEventListener("click", async () => {
    const res = await fetch(`/api/atividades/${id}/participar`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (res.ok) { alert("Inscrição confirmada!"); btn.disabled = true; btn.innerText = "Inscrito ✅"; }
    else alert(data.message || "Erro ao participar");
  });
  if (atividade.latitude && atividade.longitude) {
    const map = L.map("map").setView([atividade.latitude, atividade.longitude], 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: '&copy; OpenStreetMap' }).addTo(map);
    L.marker([atividade.latitude, atividade.longitude]).addTo(map).bindPopup(atividade.titulo).openPopup();
  }
});
