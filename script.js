// =========================================================
// CONFIGURACIÓN FIREBASE REALTIME DATABASE - LIBRERÍA MILENIUM
// =========================================================
const firebaseConfig = {
  apiKey: "AIzaSyDkxZO_rT-_3yy1JdekkQmiStQNkqzwGYI",
  authDomain: "libreria-milenium.firebaseapp.com",
  databaseURL: "https://libreria-milenium-default-rtdb.firebaseio.com",
  projectId: "libreria-milenium",
  storageBucket: "libreria-milenium.firebasestorage.app",
  messagingSenderId: "691981895582",
  appId: "1:691981895582:web:b3af21222d14f7e8af788f",
  measurementId: "G-0BW3PRC67M"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();
const booksRef = db.ref('libros');
const configRef = db.ref('configuracion');
const commentsRef = db.ref('comentarios');

// Catálogo de respaldo por si hay desconexión temporal
const fallbackLibros = [
  { id: 'fb1', titulo: "Hábitos Atómicos", autor: "James Clear", precio: 290, categoria: "Autoayuda", estado: "Disponible", resumen: "Un método sencillo y comprobado para desarrollar buenos hábitos y eliminar los malos.", imagen: "https://placehold.co/300x450/1e3c72/f59e0b?text=H%C3%A1bitos+At%C3%B3micos" },
  { id: 'fb2', titulo: "Cien Años de Soledad", autor: "Gabriel García Márquez", precio: 240, categoria: "Novelas", estado: "Disponible", resumen: "La obra maestra del realismo mágico sobre la familia Buendía en el mítico pueblo de Macondo.", imagen: "https://placehold.co/300x450/0f172a/f8fafc?text=Cien+A%C3%B1os+de+Soledad" },
  { id: 'fb3', titulo: "El Principito", autor: "Antoine de Saint-Exupéry", precio: 120, categoria: "Infantil", estado: "Disponible", resumen: "Un clásico imprescindible para niños y adultos. Lo esencial es invisible a los ojos.", imagen: "https://placehold.co/300x450/0284c7/ffffff?text=El+Principito" },
  { id: 'fb4', titulo: "Alas de Sangre", autor: "Rebecca Yarros", precio: 380, categoria: "Juvenil", estado: "Disponible", resumen: "Violet Sorrengail debe sobrevivir al letal Colegio de Guerra de Basgiath de jinetes de dragones.", imagen: "https://placehold.co/300x450/881337/f59e0b?text=Alas+de+Sangre" }
];

// ESTADOS DE NAVEGACIÓN Y PAGINACIÓN POR LOTES
let librosGlobal = [];
let filtradosGlobal = [];
let displayedCount = 0;
const itemsPerBatch = 8; // Cantidad de libros cargados por cada bloque o clic en "Ver más"

let comentariosGlobal = [];
let configGlobal = {};
let categoriaActiva = 'Todas';
let filtroNovedadesActivo = false;
let carruselInterval = null;

document.addEventListener('DOMContentLoaded', () => {
  cargarFondoAnimado();
  escucharBaseDeDatos();
  escucharConfiguracion();
  escucharComentarios();
  iniciarCarruselAuto();
});

// 1. SINCRONIZACIÓN EN TIEMPO REAL CON FIREBASE
function escucharBaseDeDatos() {
  booksRef.on('value', (snapshot) => {
    const data = snapshot.val();
    librosGlobal = [];
    if (data) {
      Object.keys(data).forEach(key => {
        librosGlobal.push({ id: key, ...data[key] });
      });
    } else {
      librosGlobal = fallbackLibros;
    }

    const skeleton = document.getElementById('loading-skeleton');
    if (skeleton) skeleton.classList.add('hidden');

    actualizarCategoriasDinamicas();
    renderizarCatalogo();
    renderizarCarrusel();
  }, (error) => {
    console.warn("Cargando catálogo de respaldo:", error);
    librosGlobal = fallbackLibros;
    const skeleton = document.getElementById('loading-skeleton');
    if (skeleton) skeleton.classList.add('hidden');
    actualizarCategoriasDinamicas();
    renderizarCatalogo();
    renderizarCarrusel();
  });
}

function escucharConfiguracion() {
  configRef.on('value', (snapshot) => {
    configGlobal = snapshot.val() || {};
    
    if (configGlobal.logoLeft) {
      const logoL = document.getElementById('main-logo-left');
      if (logoL) logoL.src = configGlobal.logoLeft;
    }
    if (configGlobal.logoRight) {
      const logoR = document.getElementById('main-logo-right');
      if (logoR) logoR.src = configGlobal.logoRight;
    }

    if (configGlobal.colorPrimary) {
      document.documentElement.style.setProperty('--color-primario', configGlobal.colorPrimary);
    }
    if (configGlobal.colorSecondary) {
      document.documentElement.style.setProperty('--color-secundario', configGlobal.colorSecondary);
    }
    if (configGlobal.colorAccent) {
      document.documentElement.style.setProperty('--color-acento', configGlobal.colorAccent);
    }

    if (configGlobal.direccion) {
      const addrText = document.getElementById('store-address-text');
      const footerAddr = document.getElementById('footer-direccion-txt');
      if (addrText) addrText.textContent = configGlobal.direccion;
      if (footerAddr) footerAddr.innerText = configGlobal.direccion;
    }
    if (configGlobal.iframeMap) {
      const iframe = document.getElementById('store-iframe');
      if (iframe) iframe.src = configGlobal.iframeMap;
    }
    if (configGlobal.horarios) {
      const topHorarios = document.getElementById('top-bar-horarios');
      const modalHorarios = document.getElementById('modal-horarios-txt');
      if (topHorarios) {
        topHorarios.innerHTML = `<i class="fa-regular fa-clock text-[10px] md:text-xs"></i> <span class="underline decoration-amber-500/50">${configGlobal.horarios}</span>`;
      }
      if (modalHorarios) {
        modalHorarios.textContent = configGlobal.horarios;
      }
    }
    if (configGlobal.whatsapp) {
      const heroWa = document.getElementById('hero-btn-wa');
      const pedirWa = document.getElementById('btn-pedir-wa');
      const footerWa = document.getElementById('footer-wa');
      const fabWa = document.getElementById('fab-wa-link');

      if (heroWa) heroWa.href = configGlobal.whatsapp;
      if (pedirWa) pedirWa.href = `${configGlobal.whatsapp}?text=Hola,%20busco%20un%20libro%20sobre%20pedido`;
      if (footerWa) footerWa.href = configGlobal.whatsapp;
      if (fabWa) fabWa.href = `${configGlobal.whatsapp}?text=Hola%20Librer%C3%ADa%20Milenium,%20busco%20informaci%C3%B3n%20sobre%20un%20libro`;
    }
  });
}

function escucharComentarios() {
  commentsRef.on('value', (snapshot) => {
    const data = snapshot.val();
    comentariosGlobal = [];
    if (data) {
      Object.keys(data).forEach(key => {
        comentariosGlobal.push({ id: key, ...data[key] });
      });
    }
    renderizarComentarios();
  });
}

// 2. RENDERING Y FILTRADO EN CUADRÍCULA DE 2 COLUMNAS (MÓVIL) / 4 COLUMNAS (PC)
function renderizarCatalogo() {
  const inputEl = document.getElementById('search-input');
  const busqueda = inputEl ? inputEl.value.toLowerCase().trim() : '';
  const clearBtn = document.getElementById('clear-search');
  
  if (clearBtn) {
    if (busqueda.length > 0) {
      clearBtn.classList.remove('hidden');
    } else {
      clearBtn.classList.add('hidden');
    }
  }

  const orden = document.getElementById('control-ordenar').value;
  const precioMax = parseFloat(document.getElementById('control-precio-rango').value);

  let listaOrigen = filtroNovedadesActivo ? librosGlobal.slice(-8).reverse() : librosGlobal;

  filtradosGlobal = listaOrigen.filter(libro => {
    const coincideCat = (categoriaActiva === 'Todas') || (libro.categoria && libro.categoria.includes(categoriaActiva));
    const coincideBusqueda = !busqueda ||
                             (libro.titulo && libro.titulo.toLowerCase().includes(busqueda)) || 
                             (libro.autor && libro.autor.toLowerCase().includes(busqueda)) ||
                             (libro.categoria && libro.categoria.toLowerCase().includes(busqueda));
    const precioValido = parseFloat(libro.precio || 0) <= precioMax;
    return coincideCat && coincideBusqueda && precioValido;
  });

  if (orden === 'price-asc') filtradosGlobal.sort((a,b) => parseFloat(a.precio) - parseFloat(b.precio));
  if (orden === 'price-desc') filtradosGlobal.sort((a,b) => parseFloat(b.precio) - parseFloat(a.precio));
  if (orden === 'alpha') filtradosGlobal.sort((a,b) => (a.titulo || '').localeCompare(b.titulo || ''));

  const resultsCount = document.getElementById('results-count');
  if (resultsCount) {
    resultsCount.innerHTML = `Mostrando <strong>${filtradosGlobal.length}</strong> ${filtradosGlobal.length === 1 ? 'libro disponible' : 'libros disponibles'}`;
  }

  displayedCount = 0;
  document.getElementById('book-list').innerHTML = '';
  loadMoreProducts();
}

function loadMoreProducts() {
  const container = document.getElementById('book-list');
  const loadMoreBtn = document.getElementById('load-more-btn');
  const waBase = configGlobal.whatsapp || "https://wa.me/5217220000000";
  const busquedaActual = document.getElementById('search-input').value.trim();

  if (filtradosGlobal.length === 0) {
    const msgEspecial = encodeURIComponent(`Hola Librería Milenium, busco el libro "${busquedaActual || 'sobre pedido'}". ¿Me ayudan a conseguirlo?`);
    container.innerHTML = `
      <div class="col-span-full bg-white dark:bg-slate-800 rounded-2xl p-6 text-center border-2 border-dashed border-emerald-600/50 shadow-sm my-2 max-w-lg mx-auto">
        <div class="w-12 h-12 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2.5 text-xl">
          <i class="fa-solid fa-book-medical"></i>
        </div>
        <h3 class="font-serif font-bold text-base text-gray-900 dark:text-white">
          ¿No ves "${busquedaActual || 'ese libro'}" en el inventario?
        </h3>
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
          Te lo conseguimos sobre pedido. Pregúntanos disponibilidad por WhatsApp.
        </p>
        <a href="${waBase}?text=${msgEspecial}" target="_blank" class="mt-3.5 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl shadow-sm flex items-center justify-center gap-2 text-xs transition">
          <i class="fa-brands fa-whatsapp text-base"></i> Solicitar sobre pedido
        </a>
      </div>
    `;
    loadMoreBtn.classList.add('hidden');
    return;
  }

  const nextBatch = filtradosGlobal.slice(displayedCount, displayedCount + itemsPerBatch);

  nextBatch.forEach(libro => {
    const isAvailable = (libro.estado || 'Disponible') === 'Disponible';
    const badgeClass = isAvailable ? 'bg-emerald-600 text-white' : 'bg-red-500 text-white';
    const msgWa = encodeURIComponent(`Hola, quiero apartar el libro "${libro.titulo}" de ${libro.autor} ($${parseFloat(libro.precio || 0).toFixed(2)}).`);
    const imgUrl = libro.imagen || 'https://placehold.co/200x300/1e3c72/ffffff?text=Librer%C3%ADa+Milenium';

    const card = document.createElement('article');
    card.className = 'bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200/80 dark:border-slate-700 overflow-hidden flex flex-col justify-between transition tap-card cursor-pointer hover:shadow-md';
    card.onclick = () => abrirVistaRapida(libro);
    card.innerHTML = `
      <div>
        <!-- Contenedor de Portada Uniforme -->
        <div class="relative h-44 sm:h-52 w-full bg-gray-50 dark:bg-slate-900/60 p-2.5 flex items-center justify-center overflow-hidden border-b border-gray-100 dark:border-slate-700/60">
          <span class="absolute top-2 left-2 z-10 ${badgeClass} text-[9px] font-bold px-2 py-0.5 rounded-full shadow-xs">
            ${libro.estado || 'Disponible'}
          </span>
          <span class="absolute bottom-1.5 right-1.5 z-10 bg-black/55 backdrop-blur-xs text-white text-[9px] px-1.5 py-0.5 rounded-md">
            ${libro.categoria ? libro.categoria.split(',')[0] : 'General'}
          </span>
          <img src="${imgUrl}" 
               alt="${libro.titulo}" 
               loading="lazy" 
               class="max-h-full max-w-full object-contain drop-shadow-md transition-transform duration-300 hover:scale-105"
               onerror="this.onerror=null; this.src='https://placehold.co/200x300/1e3c72/ffffff?text=Libro';">
        </div>

        <!-- Datos del Libro -->
        <div class="p-3 pb-1">
          <h4 class="font-serif font-bold text-gray-900 dark:text-white text-xs sm:text-sm leading-snug line-clamp-2 min-h-[2.2rem]" title="${libro.titulo}">
            ${libro.titulo}
          </h4>
          <p class="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5 font-medium">${libro.autor || 'Autor'}</p>
        </div>
      </div>

      <!-- Pie de Tarjeta: Precio y Botón WhatsApp -->
      <div class="p-3 pt-1.5 mt-auto" onclick="event.stopPropagation()">
        <div class="flex items-baseline justify-between mb-1.5">
          <span class="text-sm sm:text-base font-extrabold text-navy-800 dark:text-amber-400">$${parseFloat(libro.precio || 0).toFixed(2)}</span>
          <span class="text-[9px] text-gray-400">MXN</span>
        </div>
        <a href="${waBase}?text=${msgWa}" target="_blank" class="w-full min-h-[38px] bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-xs py-2 px-3 rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition">
          <i class="fa-brands fa-whatsapp text-sm"></i> Apartar
        </a>
      </div>
    `;
    container.appendChild(card);
  });

  displayedCount += nextBatch.length;

  if (displayedCount >= filtradosGlobal.length) {
    loadMoreBtn.classList.add('hidden');
  } else {
    loadMoreBtn.classList.remove('hidden');
  }
}

// 3. CATEGORÍAS DINÁMICAS EN CARRUSEL DE PÍLDORAS Y FILTRO DE NOVEDADES
function toggleFiltroNovedades() {
  filtroNovedadesActivo = !filtroNovedadesActivo;
  const btn = document.getElementById('btn-filtro-novedades');
  
  if (filtroNovedadesActivo) {
    btn.classList.add('ring-2', 'ring-amber-400', 'scale-105');
    mostrarToast("Mostrando sólo novedades recientes");
  } else {
    btn.classList.remove('ring-2', 'ring-amber-400', 'scale-105');
  }
  renderizarCatalogo();
}

function actualizarCategoriasDinamicas() {
  const container = document.getElementById('categories-filter-box');
  const categoriasMap = {};

  librosGlobal.forEach(l => {
    if (l.categoria) {
      const cats = l.categoria.split(',');
      cats.forEach(c => {
        const trimmed = c.trim();
        if (trimmed) categoriasMap[trimmed] = (categoriasMap[trimmed] || 0) + 1;
      });
    }
  });

  const pillBase = "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer";
  const pillActive = "bg-navy-800 text-white shadow-xs ring-2 ring-amber-400 font-semibold";
  const pillInactive = "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 border border-gray-200 dark:border-slate-700";

  let html = `
    <button class="${pillBase} ${categoriaActiva === 'Todas' ? pillActive : pillInactive}" onclick="seleccionarCategoria('Todas')">
      <span>📚 Todas</span>
      <span class="text-[10px] opacity-80 bg-black/10 px-1.5 py-0.2 rounded-full">${librosGlobal.length}</span>
    </button>
  `;

  Object.keys(categoriasMap).forEach(cat => {
    const isAct = categoriaActiva === cat;
    html += `
      <button class="${pillBase} ${isAct ? pillActive : pillInactive}" onclick="seleccionarCategoria('${cat}')">
        <span>${cat}</span>
        <span class="text-[10px] opacity-80 bg-black/10 px-1.5 py-0.2 rounded-full">${categoriasMap[cat]}</span>
      </button>
    `;
  });

  container.innerHTML = html;
}

function seleccionarCategoria(cat) {
  categoriaActiva = cat;
  const label = document.getElementById('cat-selected-label');
  if (label) label.textContent = `(${cat})`;
  actualizarCategoriasDinamicas();
  renderizarCatalogo();
}

function filtrarCatalogo() {
  renderizarCatalogo();
}

function limpiarBusqueda() {
  document.getElementById('search-input').value = '';
  categoriaActiva = 'Todas';
  const label = document.getElementById('cat-selected-label');
  if (label) label.textContent = '(Todas)';
  actualizarCategoriasDinamicas();
  renderizarCatalogo();
}

function actualizarTextoPrecio(val) {
  document.getElementById('texto-precio-max').textContent = `$${val}`;
  renderizarCatalogo();
}

function toggleAdvancedFilters() {
  const panel = document.getElementById('advanced-filters-panel');
  if (panel) panel.classList.toggle('hidden');
}

// 4. CARRUSEL DE NOVEDADES EN TENDENCIA
function renderizarCarrusel() {
  const carrusel = document.getElementById('new-books-carousel');
  if (!carrusel) return;
  carrusel.innerHTML = '';
  const recientes = librosGlobal.slice(-8).reverse();

  recientes.forEach(libro => {
    const imgUrl = libro.imagen || 'https://placehold.co/150x220/1e3c72/ffffff?text=Libro';
    const item = document.createElement('div');
    item.className = 'w-28 sm:w-36 shrink-0 bg-white dark:bg-slate-800 rounded-xl p-2 border border-gray-200/80 dark:border-slate-700 shadow-xs text-center cursor-pointer tap-card hover:shadow-md transition';
    item.onclick = () => abrirVistaRapida(libro);
    item.innerHTML = `
      <div class="h-28 sm:h-32 w-full flex items-center justify-center overflow-hidden mb-1.5">
        <img src="${imgUrl}" alt="${libro.titulo}" loading="lazy" class="max-h-full max-w-full object-contain drop-shadow-xs" onerror="this.src='https://placehold.co/150x220/1e3c72/ffffff?text=Libro'">
      </div>
      <h4 class="font-serif font-bold text-[11px] sm:text-xs text-gray-800 dark:text-gray-100 truncate">${libro.titulo}</h4>
      <span class="text-[10px] sm:text-xs font-bold text-amber-600 dark:text-amber-400">$${parseFloat(libro.precio || 0).toFixed(0)}</span>
    `;
    carrusel.appendChild(item);
  });

  // Pausar auto-movimiento cuando el usuario toca o pasa el cursor sobre el carrusel
  carrusel.onmouseenter = pausarCarrusel;
  carrusel.onmouseleave = reanudarCarrusel;
  carrusel.ontouchstart = pausarCarrusel;
  carrusel.ontouchend = reanudarCarrusel;
}

function scrollTrendingCarousel(direction) {
  const carrusel = document.getElementById('new-books-carousel');
  if (!carrusel) return;

  const step = 160; // Avance de tarjeta hacia la izquierda (direction = 1 avanza el scroll)
  const maxScrollLeft = carrusel.scrollWidth - carrusel.clientWidth;

  if (direction > 0) {
    // Si ya llegó al final de los libros de novedad, regresa al principio
    if (carrusel.scrollLeft >= maxScrollLeft - 10) {
      carrusel.scrollTo({ left: 0, behavior: 'smooth' });
    } else {
      carrusel.scrollBy({ left: step, behavior: 'smooth' });
    }
  } else {
    if (carrusel.scrollLeft <= 10) {
      carrusel.scrollTo({ left: maxScrollLeft, behavior: 'smooth' });
    } else {
      carrusel.scrollBy({ left: -step, behavior: 'smooth' });
    }
  }
}

function iniciarCarruselAuto() {
  if (carruselInterval) clearInterval(carruselInterval);
  carruselInterval = setInterval(() => {
    scrollTrendingCarousel(1);
  }, 4000);
}

function pausarCarrusel() {
  if (carruselInterval) clearInterval(carruselInterval);
}

function reanudarCarrusel() {
  iniciarCarruselAuto();
}

// 5. RESEÑAS Y COMENTARIOS CON FIREBASE
function renderizarComentarios() {
  const container = document.getElementById('comments-container');
  if (!container) return;
  container.innerHTML = '';

  if (comentariosGlobal.length === 0) {
    container.innerHTML = `<p class="col-span-full text-center text-xs text-gray-400 py-3">Aún no hay opiniones registradas. ¡Sé el primero en compartir la tuya!</p>`;
    return;
  }

  comentariosGlobal.slice().reverse().forEach(c => {
    const estrellasHtml = '<i class="fa-solid fa-star text-amber-400 text-[10px]"></i>'.repeat(c.rating || 5);
    const card = document.createElement('div');
    card.className = 'bg-gray-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-gray-200/70 dark:border-slate-700';
    card.innerHTML = `
      <div class="flex justify-between items-center mb-1">
        <div class="flex gap-0.5">${estrellasHtml}</div>
        <span class="text-[10px] font-bold text-navy-800 dark:text-amber-400">- ${c.autor}</span>
      </div>
      <p class="text-xs italic text-gray-700 dark:text-gray-300">"${c.texto}"</p>
    `;
    container.appendChild(card);
  });
}

function guardarComentario(e) {
  e.preventDefault();
  const autor = document.getElementById('comment-author').value.trim();
  const texto = document.getElementById('comment-text').value.trim();
  const rating = parseInt(document.getElementById('comment-rating').value);

  if (!autor || !texto) return;

  commentsRef.push({
    autor: autor,
    texto: texto,
    rating: rating,
    fecha: new Date().toISOString()
  }).then(() => {
    mostrarToast("¡Gracias por tu reseña!");
    document.getElementById('public-comment-form').reset();
  }).catch(err => mostrarToast("Error al publicar: " + err.message));
}

// 6. VISTA RÁPIDA (BOTTOM SHEET EN CELULAR / MODAL EN ESCRITORIO)
function abrirVistaRapida(libro) {
  document.getElementById('qv-img').src = libro.imagen || 'https://placehold.co/150x220/1e3c72/ffffff?text=Libro';
  document.getElementById('qv-title').textContent = libro.titulo;
  document.getElementById('qv-author').textContent = `Por: ${libro.autor || 'Autor'}`;
  document.getElementById('qv-resume').textContent = libro.resumen || 'Sin resumen disponible.';
  document.getElementById('qv-price').textContent = `$${parseFloat(libro.precio || 0).toFixed(2)}`;
  
  const catGroup = document.getElementById('qv-cat-group');
  if (catGroup) {
    catGroup.innerHTML = `<span class="bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full">${libro.categoria || 'General'}</span>`;
  }

  const waBase = configGlobal.whatsapp || "https://wa.me/5217220000000";
  const msgWa = encodeURIComponent(`Hola, me interesa apartar "${libro.titulo}" de ${libro.autor}.`);
  document.getElementById('qv-btn-wa').href = `${waBase}?text=${msgWa}`;
  
  const modal = document.getElementById('quickview-modal');
  modal.classList.remove('hidden');
}

function cerrarVistaRapida(e, forzar = false) {
  if (forzar || e.target.id === 'quickview-modal') {
    document.getElementById('quickview-modal').classList.add('hidden');
  }
}

// 7. UTILERÍAS, MODO OSCURO Y CANVAS ANIMADO
function toggleTheme() {
  const htmlEl = document.documentElement;
  const isDark = htmlEl.classList.toggle('dark');
  document.body.setAttribute('data-theme', isDark ? 'dark' : 'light');
  document.getElementById('theme-icon').className = isDark ? 'fa-solid fa-sun text-sm md:text-base' : 'fa-solid fa-moon text-sm md:text-base';
}

function mostrarToast(msg) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'bg-gray-900 text-white text-xs font-medium px-4 py-2.5 rounded-full shadow-xl flex items-center gap-2 border border-amber-500 animate-bounce';
  toast.innerHTML = `<i class="fa-solid fa-circle-check text-emerald-400"></i> <span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function openStoreInfoModal() {
  document.getElementById('store-modal-backdrop').classList.remove('hidden');
}

function closeStoreInfoModal() {
  document.getElementById('store-modal-backdrop').classList.add('hidden');
}

function scrollToSection(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}

function cargarFondoAnimado() {
  const canvas = document.getElementById('background-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let width = canvas.width = window.innerWidth;
  let height = canvas.height = window.innerHeight;

  const particles = Array.from({ length: 18 }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    size: Math.random() * 12 + 10,
    speedY: -(Math.random() * 0.4 + 0.15),
    opacity: Math.random() * 0.4 + 0.15
  }));

  function draw() {
    ctx.clearRect(0, 0, width, height);
    particles.forEach(p => {
      ctx.fillStyle = `rgba(30, 60, 114, ${p.opacity})`;
      ctx.font = `${p.size}px sans-serif`;
      ctx.fillText('📖', p.x, p.y);
      p.y += p.speedY;
      if (p.y < -20) p.y = height + 20;
    });
    requestAnimationFrame(draw);
  }
  draw();
  window.onresize = () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  };
}
