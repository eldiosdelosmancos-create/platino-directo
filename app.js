const DATA_URL = "data/catalog.json";
const searchInput = document.querySelector("#search");
const gamesEl = document.querySelector("#games");
const emptyEl = document.querySelector("#empty");
const dialog = document.querySelector("#game-dialog");
let catalog = [];
let currentFilter = "all";

const clean = value => (value || "").toString().toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const fmtDate = value => value ? new Intl.DateTimeFormat("es-ES",{day:"numeric",month:"short",year:"numeric"}).format(new Date(value)) : "";
const escapeHtml = s => (s || "").toString().replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

async function init(){
  document.querySelector("#year").textContent = new Date().getFullYear();
  try {
    const response = await fetch(DATA_URL);
    if(!response.ok) throw new Error("No se pudo cargar el catálogo");
    const data = await response.json();
    catalog = data.games || [];
    const channel = data.channelUrl || "https://www.youtube.com/";
    document.querySelector("#channel-link").href = channel;
    document.querySelector(".youtube-link").href = channel;
    document.querySelector("#game-count").textContent = catalog.length.toLocaleString("es-ES");
    document.querySelector("#video-count").textContent = catalog.reduce((n,g)=>n+(g.videos||[]).length,0).toLocaleString("es-ES");
    render();
  } catch(err) {
    gamesEl.innerHTML = '<div class="empty"><h3>No se ha podido cargar el catálogo</h3><p>Comprueba que data/catalog.json está disponible.</p></div>';
    console.error(err);
  }
}
function render(){
  const q = clean(searchInput.value.trim());
  let games = catalog.filter(g => clean(g.title+" "+(g.description||"")+" "+(g.videos||[]).map(v=>v.title).join(" ")).includes(q));
  if(currentFilter==="recent") games = [...games].sort((a,b)=>new Date(b.updatedAt||0)-new Date(a.updatedAt||0));
  gamesEl.innerHTML = games.map(g=>`<article class="game-card" tabindex="0" role="button" data-id="${escapeHtml(g.id)}" aria-label="Abrir guía de ${escapeHtml(g.title)}">
    <div class="cover">${g.thumbnail ? `<img loading="lazy" src="${escapeHtml(g.thumbnail)}" alt="" onerror="this.remove()">` : ""}<span class="cover-fallback">${escapeHtml((g.title||"G").split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase())}</span><span class="cover-tag">GUÍA DE PLATINO</span></div>
    <div class="card-body"><h3 class="game-title">${escapeHtml(g.title)}</h3><div class="game-meta"><span>${(g.videos||[]).length} vídeos</span><span>${g.updatedAt ? "Actualizado "+fmtDate(g.updatedAt) : "Guía disponible"}</span></div><div class="card-bottom"><span>Ver guía</span><span class="arrow">↗</span></div></div>
  </article>`).join("");
  emptyEl.classList.toggle("hidden",games.length!==0);
  gamesEl.querySelectorAll(".game-card").forEach(card=>{
    const open=()=>showGame(card.dataset.id);
    card.addEventListener("click",open);
    card.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();open();}});
  });
}

function showGame(id){
  const g = catalog.find(x => x.id === id);
  if(!g) return;

  const videos = [...(g.videos || [])].sort(
    (a,b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0)
  );

  document.querySelector("#dialog-content").innerHTML = `
    <h2 class="dialog-heading">${escapeHtml(g.title)}</h2>
    <p class="dialog-desc">${escapeHtml(g.description || "Guías y vídeos de este juego.")}</p>

    <input
      type="search"
      id="video-search"
      class="video-search"
      placeholder="Buscar vídeos de este juego..."
      aria-label="Buscar vídeos de este juego"
      autocomplete="off"
    >

    <p id="video-search-count" class="video-search-count"></p>

    <div class="video-list" id="game-video-list">
      ${videos.length ? videos.map(v => `
        <a class="video-item"
           href="${escapeHtml(v.url)}"
           target="_blank"
           rel="noopener"
           data-title="${escapeHtml(clean(v.title))}">
          <img class="video-thumb"
               loading="lazy"
               src="${escapeHtml(v.thumbnail || "")}"
               alt="">
          <div>
            <div class="video-title">${escapeHtml(v.title)}</div>
            <div class="video-date">${fmtDate(v.publishedAt)}</div>
          </div>
          <span class="video-go">↗</span>
        </a>
      `).join("") : '<div class="no-videos">Todavía no hay vídeos añadidos para este juego.</div>'}
    </div>
  `;

  const videoSearch = document.querySelector("#video-search");
  const videoItems = document.querySelectorAll("#game-video-list .video-item");
  const count = document.querySelector("#video-search-count");

  function filterVideos(){
    const query = clean(videoSearch.value.trim());
    let visible = 0;

    videoItems.forEach(item => {
      const matches = item.dataset.title.includes(query);
      item.classList.toggle("hidden", !matches);
      if(matches) visible++;
    });

    count.textContent = query
      ? `${visible} de ${videos.length} vídeos`
      : `${videos.length} vídeos`;

    let noResults = document.querySelector("#video-no-results");

    if(visible === 0 && videos.length > 0){
      if(!noResults){
        noResults = document.createElement("div");
        noResults.id = "video-no-results";
        noResults.className = "no-videos";
        noResults.textContent = "No se han encontrado vídeos con esa búsqueda.";
        document.querySelector("#game-video-list").appendChild(noResults);
      }
    } else if(noResults){
      noResults.remove();
    }
  }

  videoSearch.addEventListener("input", filterVideos);
  filterVideos();
  dialog.showModal();
  videoSearch.focus();
}

searchInput.addEventListener("input",render);
document.querySelectorAll(".filter").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll(".filter").forEach(x=>x.classList.remove("active"));b.classList.add("active");currentFilter=b.dataset.filter;render();}));
document.querySelector("#close-dialog").addEventListener("click",()=>dialog.close());
dialog.addEventListener("click",e=>{if(e.target===dialog)dialog.close();});
document.addEventListener("keydown",e=>{if(e.key==="/" && !["INPUT","TEXTAREA"].includes(document.activeElement.tagName)){e.preventDefault();searchInput.focus();}});
init();
