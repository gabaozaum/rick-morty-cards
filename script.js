// Rick and Morty API: https://rickandmortyapi.com/documentation
const API_URL = "https://rickandmortyapi.com/api/character";
const CHAVE_FAVORITOS = "rm_favoritos";

const grade = document.getElementById("grade");
const mensagem = document.getElementById("mensagem");
const campoBusca = document.getElementById("busca");
const campoStatus = document.getElementById("status");
const btnFavoritos = document.getElementById("btn-favoritos");
const contadorFav = document.getElementById("contador-fav");
const paginacao = document.getElementById("paginacao");
const btnAnterior = document.getElementById("anterior");
const btnProxima = document.getElementById("proxima");
const paginaInfo = document.getElementById("pagina-info");
const fatos = document.getElementById("fatos");

const TRADUCAO_STATUS = { Alive: "Vivo", Dead: "Morto", unknown: "Desconhecido" };
const TRADUCAO_GENERO = { Male: "Masculino", Female: "Feminino", Genderless: "Sem gênero", unknown: "Desconhecido" };

const estado = { pagina: 1, totalPaginas: 1, nome: "", status: "", soFavoritos: false };

/* ---------- Favoritos (guardados no navegador) ---------- */
function lerFavoritos() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_FAVORITOS)) || {};
  } catch {
    return {};
  }
}

function salvarFavoritos(favoritos) {
  try {
    localStorage.setItem(CHAVE_FAVORITOS, JSON.stringify(favoritos));
  } catch {
    /* armazenamento indisponível: segue sem persistir */
  }
}

function atualizarContador() {
  contadorFav.textContent = Object.keys(lerFavoritos()).length;
}

function alternarFavorito(personagem, botao) {
  const favoritos = lerFavoritos();
  if (favoritos[personagem.id]) {
    delete favoritos[personagem.id];
  } else {
    favoritos[personagem.id] = personagem;
  }
  salvarFavoritos(favoritos);

  const ativo = Boolean(favoritos[personagem.id]);
  botao.setAttribute("aria-pressed", ativo);
  botao.setAttribute("aria-label", `${ativo ? "Remover" : "Adicionar"} ${personagem.name} ${ativo ? "dos" : "aos"} favoritos`);
  atualizarContador();

  if (estado.soFavoritos) mostrarFavoritos();
}

/* ---------- Criação dos cards (DOM manipulation) ---------- */
function criarElemento(tag, classe, texto) {
  const el = document.createElement(tag);
  if (classe) el.className = classe;
  if (texto !== undefined) el.textContent = texto;
  return el;
}

function criarIconeCoracao() {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  const caminho = document.createElementNS(ns, "path");
  caminho.setAttribute("d", "M12 21s-7.5-4.6-9.6-9.2C.9 8.5 2.6 5 6 5c2.1 0 3.4 1.2 4 2.3h4c.6-1.1 1.9-2.3 4-2.3 3.4 0 5.1 3.5 3.6 6.8C19.5 16.4 12 21 12 21z");
  svg.appendChild(caminho);
  return svg;
}

function criarLinhaInfo(rotulo, valor) {
  const linha = document.createElement("div");
  linha.appendChild(criarElemento("dt", "", rotulo));
  linha.appendChild(criarElemento("dd", "", valor));
  return linha;
}

function criarCard(personagem) {
  const card = criarElemento("article", "card");

  const titulo = criarElemento("h3", "", personagem.name);

  const coracao = criarElemento("button", "coracao");
  coracao.type = "button";
  const favorito = Boolean(lerFavoritos()[personagem.id]);
  coracao.setAttribute("aria-pressed", favorito);
  coracao.setAttribute("aria-label", `${favorito ? "Remover" : "Adicionar"} ${personagem.name} ${favorito ? "dos" : "aos"} favoritos`);
  coracao.appendChild(criarIconeCoracao());
  coracao.addEventListener("click", () => alternarFavorito(personagem, coracao));

  const imagem = document.createElement("img");
  imagem.src = personagem.image;
  imagem.alt = `Imagem de ${personagem.name}`;
  imagem.loading = "lazy";
  imagem.width = 300;
  imagem.height = 300;

  const classeStatus = personagem.status === "Alive" ? "alive" : personagem.status === "Dead" ? "dead" : "unknown";
  const status = criarElemento("p", `status ${classeStatus}`, TRADUCAO_STATUS[personagem.status] || personagem.status);

  const detalhes = document.createElement("dl");
  detalhes.appendChild(criarLinhaInfo("Espécie", personagem.species));
  detalhes.appendChild(criarLinhaInfo("Gênero", TRADUCAO_GENERO[personagem.gender] || personagem.gender));
  detalhes.appendChild(criarLinhaInfo("Origem", personagem.origin.name));
  detalhes.appendChild(criarLinhaInfo("Local atual", personagem.location.name));

  card.appendChild(titulo);
  card.appendChild(coracao);
  card.appendChild(imagem);
  card.appendChild(status);
  card.appendChild(detalhes);
  return card;
}

function renderizarCards(personagens) {
  grade.replaceChildren();
  personagens.forEach((p) => grade.appendChild(criarCard(p)));
}

/* ---------- Estados da tela ---------- */
function mostrarCarregando() {
  grade.replaceChildren();
  for (let i = 0; i < 8; i++) grade.appendChild(criarElemento("div", "esqueleto"));
  mensagem.textContent = "Carregando personagens...";
  mensagem.className = "mensagem";
}

function mostrarMensagem(texto, erro = false) {
  mensagem.textContent = texto;
  mensagem.className = erro ? "mensagem erro" : "mensagem";
}

function atualizarPaginacao() {
  paginacao.classList.toggle("oculta", estado.soFavoritos);
  btnAnterior.disabled = estado.pagina <= 1;
  btnProxima.disabled = estado.pagina >= estado.totalPaginas;
  paginaInfo.textContent = `Página ${estado.pagina} de ${estado.totalPaginas}`;
}

/* ---------- Consumo da API com fetch ---------- */
async function buscarPersonagens() {
  estado.soFavoritos = false;
  btnFavoritos.setAttribute("aria-pressed", "false");
  mostrarCarregando();

  const params = new URLSearchParams({ page: estado.pagina });
  if (estado.nome) params.set("name", estado.nome);
  if (estado.status) params.set("status", estado.status);

  try {
    const resposta = await fetch(`${API_URL}?${params}`);

    if (resposta.status === 404) {
      // A API responde 404 quando nenhum personagem atende ao filtro
      estado.totalPaginas = 1;
      grade.replaceChildren();
      atualizarPaginacao();
      mostrarMensagem("Nenhum personagem encontrado. Tente outro nome ou status.");
      return;
    }
    if (!resposta.ok) throw new Error(`Erro HTTP ${resposta.status}`);

    const dados = await resposta.json();
    console.log("Resposta da API:", dados);

    estado.totalPaginas = dados.info.pages;
    renderizarCards(dados.results);
    atualizarPaginacao();
    mostrarMensagem(`${dados.info.count} personagens encontrados.`);
  } catch (erro) {
    console.error(erro);
    grade.replaceChildren();
    mostrarMensagem("Não foi possível carregar os personagens. Verifique sua conexão e tente de novo.", true);
  }
}

function mostrarFavoritos() {
  estado.soFavoritos = true;
  btnFavoritos.setAttribute("aria-pressed", "true");
  const lista = Object.values(lerFavoritos());
  renderizarCards(lista);
  atualizarPaginacao();
  mostrarMensagem(lista.length ? `${lista.length} favoritos.` : "Você ainda não tem favoritos. Toque no coração de um card para salvar.");
}

async function carregarFatos() {
  const itens = [
    { rotulo: "personagens", url: API_URL },
    { rotulo: "locais", url: "https://rickandmortyapi.com/api/location" },
    { rotulo: "episódios", url: "https://rickandmortyapi.com/api/episode" },
  ];
  try {
    const respostas = await Promise.all(itens.map((i) => fetch(i.url).then((r) => r.json())));
    respostas.forEach((dados, idx) => {
      const li = document.createElement("li");
      li.appendChild(criarElemento("b", "", String(dados.info.count)));
      li.appendChild(criarElemento("span", "", itens[idx].rotulo));
      fatos.appendChild(li);
    });
  } catch (erro) {
    console.error(erro);
  }
}

/* ---------- Eventos ---------- */
let temporizador;
campoBusca.addEventListener("input", () => {
  clearTimeout(temporizador);
  temporizador = setTimeout(() => {
    estado.nome = campoBusca.value.trim();
    estado.pagina = 1;
    buscarPersonagens();
  }, 400);
});

campoStatus.addEventListener("change", () => {
  estado.status = campoStatus.value;
  estado.pagina = 1;
  buscarPersonagens();
});

btnAnterior.addEventListener("click", () => {
  if (estado.pagina > 1) {
    estado.pagina--;
    buscarPersonagens();
    document.getElementById("personagens").scrollIntoView();
  }
});

btnProxima.addEventListener("click", () => {
  if (estado.pagina < estado.totalPaginas) {
    estado.pagina++;
    buscarPersonagens();
    document.getElementById("personagens").scrollIntoView();
  }
});

btnFavoritos.addEventListener("click", () => {
  if (estado.soFavoritos) {
    buscarPersonagens();
  } else {
    mostrarFavoritos();
  }
});

/* ---------- Início ---------- */
atualizarContador();
carregarFatos();
buscarPersonagens();
