// CONFIGURACIÓN FIREBASE REALTIME DATABASE
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

// ESTADOS DE NAVEGACIÓN Y PAGINACIÓN POR LOTES
let librosGlobal = [];
let filtradosGlobal = [];
let displayedCount = 0;
const itemsPerBatch = 8;

let comentariosGlobal = [];
let configGlobal = {};
let categoriaActiva = 'Todas';
let filtroNovedadesActivo = false;
let carruselPosicion = 0;
let carruselInterval = null;

document.addEventListener('DOMContentLoaded', () => {
  cargarFondoAnimado();
  escucharBaseDeDatos();
  escucharConfiguracion();
  escucharComentarios();
  iniciarCarruselAuto();
});

// 1. SINCRONIZACIÓN EN TIEMPO REAL DE LIBROS
function escucharBaseDeDatos() {
  booksRef.on('value', (snapshot) => {
    const data = snapshot.val();
    librosGlobal = [];
    if (data) {
      Object.keys(data).forEach(key => {
        const item = data[key];
        // Ocultar libros marcados como "discontinued" o descontinuados
        if (item.available !== "discontinued") {
          librosGlobal.push({ id: key, ...item });
        }
      });
    }
    actualizarCategoriasDinamicas();
    renderizarCatalogo();
    renderizarCarrusel();
  });
}

// SINCRONIZACIÓN COMPLETA DE CONFIGURACIÓN (QR, REDES, MAPA, HORARIOS, DIRECCIÓN)
function escucharConfiguracion() {
  configRef.on('value', (snapshot) => {
    configGlobal = snapshot.val() || {};

    // Logos
    if (configGlobal.logoLeft) {
      const logoLeft = document.getElementById('main-logo-left');
      if (logoLeft) logoLeft.src = configGlobal.logoLeft;
    }
    if (configGlobal.logoRight) {
      const logoRight = document.getElementById('main-logo-right');
      if (logoRight) logoRight.src = configGlobal.logoRight;
    }

    // Colores personalizados
    if (configGlobal.colorPrimary) {
      document.documentElement.style.setProperty('--color-primario', configGlobal.colorPrimary);
    }
    if (configGlobal.colorSecondary) {
      document.documentElement.style.setProperty('--color-secundario', configGlobal.colorSecondary);
    }
    if (configGlobal.colorAccent) {
      document.documentElement.style.setProperty('--color-acento', configGlobal.colorAccent);
    }

    // Dirección física (Banner, Barra Superior y Pie de página)
    const direccionFinal = configGlobal.direccion || configGlobal.ubicacion;
    if (direccionFinal) {
      const storeAddr = document.getElementById('store-address-text');
      const footerAddr = document.getElementById('footer-direccion-txt');
      const topBenefitStore = document.querySelector('.top-benefits-container .benefit-item:first-child');
      const btnGmapsLink = document.getElementById('btn-gmaps-link');

      if (storeAddr) storeAddr.textContent = `${direccionFinal}. Pasa a explorar nuestras repisas o a recoger tu pedido apartado online.`;
      if (footerAddr) footerAddr.innerText = direccionFinal;
      if (topBenefitStore) topBenefitStore.innerHTML = `<i class="fa-solid fa-store"></i> ${direccionFinal}`;
      if (btnGmapsLink) btnGmapsLink.href = `https://maps.google.com/?q=${encodeURIComponent(direccionFinal)}`;
    }

    // Mapa de Google Maps (compatible con mapaUrl, iframeMap y mapa)
    const mapaFinal = configGlobal.iframeMap || configGlobal.mapaUrl || configGlobal.mapa;
    if (mapaFinal) {
      const iframeEl = document.getElementById('store-iframe');
      if (iframeEl) {
        // Si pegaron un <iframe> completo por error, extraemos solo el src
        if (mapaFinal.includes('<iframe') && mapaFinal.includes('src=')) {
          const match = mapaFinal.match(/src=["']([^"']+)["']/i);
          if (match && match[1]) iframeEl.src = match[1];
        } else {
          iframeEl.src = mapaFinal;
        }
      }
    }

    // Horarios de atención (compatible con horario y horarios)
    const horarioFinal = configGlobal.horarios || configGlobal.horario;
    if (horarioFinal) {
      const topHorario = document.getElementById('top-bar-horarios');
      if (topHorario) {
        topHorario.innerHTML = `<i class="fa-regular fa-clock"></i> ${horarioFinal}`;
      }
    }

    // WhatsApp (Actualiza botones del Hero, Pedidos Especiales, Footer y Tarjetas de libros)
    if (configGlobal.whatsapp) {
      const rawWa = configGlobal.whatsapp.trim();
      const soloDigitos = rawWa.replace(/\D/g, '');
      const waUrlLimpia = rawWa.startsWith('http') ? rawWa.split('?')[0] : `https://wa.me/${soloDigitos}`;
      configGlobal.whatsappUrlLimpia = waUrlLimpia;

      const heroWa = document.getElementById('hero-btn-wa');
      const pedirWa = document.getElementById('btn-pedir-wa');
      const footerWa = document.getElementById('footer-wa');

      if (heroWa) heroWa.href = waUrlLimpia;
      if (pedirWa) pedirWa.href = `${waUrlLimpia}?text=${encodeURIComponent('Hola, busco un libro sobre pedido')}`;
      if (footerWa) footerWa.href = waUrlLimpia;

      // Re-renderizar tarjetas para que usen el nuevo número de WhatsApp
      if (librosGlobal.length > 0) {
        renderizarCatalogo();
      }
    }

    // Facebook (¡Antes faltaba en script.js!)
    const fbFinal = configGlobal.facebook || configGlobal.facebookUrl || configGlobal.fb;
    if (fbFinal) {
      const footerFb = document.getElementById('footer-fb');
      if (footerFb) {
        footerFb.href = fbFinal.startsWith('http') ? fbFinal : `https://${fbFinal}`;
      }
    }

    // Instagram (¡Antes faltaba en script.js!)
    const igFinal = configGlobal.instagram || configGlobal.instagramUrl || configGlobal.ig;
    if (igFinal) {
      const footerIg = document.getElementById('footer-ig');
      if (footerIg) {
        footerIg.href = igFinal.startsWith('http') ? igFinal : `https://${igFinal}`;
      }
    }

    // Imagen del Código QR (¡Antes faltaba en script.js!)
    const qrFinal = configGlobal.qr || configGlobal.qrImage || configGlobal.qrUrl || configGlobal.codigoQr;
    if (qrFinal) {
      const qrImgElement = document.getElementById('footer-qr-img') || document.querySelector('.qr-box img');
      if (qrImgElement) {
        qrImgElement.src = qrFinal;
      }
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

// Auxiliar para saber si un libro está disponible según cómo lo guarda admin.html
function esLibroDisponible(libro) {
  if (libro.available !== undefined) {
    return libro.available === true || libro.available === "true";
  }
  if (libro.estado !== undefined) {
    return libro.estado === 'Disponible';
  }
  return true;
}

// 2. RENDERING Y FILTRADO CON PAGINACIÓN "VER MÁS"
function renderizarCatalogo() {
  const inputBusqueda = document.getElementById('search-input');
  const busqueda = inputBusqueda ? inputBusqueda.value.toLowerCase().trim() : '';
  const orden = document.getElementById('control-ordenar').value;
  const precioMax = parseFloat(document.getElementById('control-precio-rango').value);

  let listaOrigen = filtroNovedadesActivo ? librosGlobal.slice(-8).reverse() : librosGlobal;

  filtradosGlobal = listaOrigen.filter(libro => {
    const cat1 = libro.categoria || '';
    const cat2 = libro.categoria2 || '';
    const coincideCat = (categoriaActiva === 'Todas') || cat1.includes(categoriaActiva) || cat2.includes(categoriaActiva);
    const coincideBusqueda = (libro.titulo && libro.titulo.toLowerCase().includes(busqueda)) || 
                             (libro.autor && libro.autor.toLowerCase().includes(busqueda)) ||
                             (cat1.toLowerCase().includes(busqueda)) ||
                             (cat2.toLowerCase().includes(busqueda));
    const precioValido = parseFloat(libro.precio || 0) <= precioMax;
    return coincideCat && coincideBusqueda && precioValido;
  });

  if (orden === 'price-asc') filtradosGlobal.sort((a,b) => parseFloat(a.precio) - parseFloat(b.precio));
  if (orden === 'price-desc') filtradosGlobal.sort((a,b) => parseFloat(b.precio) - parseFloat(a.precio));
  if (orden === 'alpha') filtradosGlobal.sort((a,b) => (a.titulo || '').localeCompare(b.titulo || ''));

  displayedCount = 0;
  document.getElementById('book-list').innerHTML = '';
  loadMoreProducts();
}

function loadMoreProducts() {
  const container = document.getElementById('book-list');
  const loadMoreBtn = document.getElementById('load-more-btn');

  if (filtradosGlobal.length === 0) {
    container.innerHTML = `<div class="no-results">No se encontraron libros que coincidan con el criterio.</div>`;
    loadMoreBtn.classList.add('hidden');
    return;
  }

  const nextBatch = filtradosGlobal.slice(displayedCount, displayedCount + itemsPerBatch);
  const waBase = configGlobal.whatsappUrlLimpia || configGlobal.whatsapp || "https://wa.me/5217220000000";

  nextBatch.forEach(libro => {
    const disponible = esLibroDisponible(libro);
    const estadoClase = disponible ? 'available' : 'not-available';
    const estadoTexto = disponible ? 'Disponible' : 'Agotado';
    const msgWa = encodeURIComponent(`Hola, quiero apartar el libro "${libro.titulo}" de ${libro.autor}.`);
    
    const card = document.createElement('div');
    card.className = 'book';
    card.onclick = () => abrirVistaRapida(libro);
    card.innerHTML = `
      <div class="book-image-container">
        <img src="${libro.imagen || 'https://via.placeholder.com/150x220'}" alt="${libro.titulo}" loading="lazy">
      </div>
      <h4>${libro.titulo}</h4>
      <p class="book-author">${libro.autor}</p>
      <p class="book-resume">${libro.resumen || 'Sin descripción disponible.'}</p>
      <div class="book-details">
        <div class="categories-tag-group">
          <span class="book-category">${libro.categoria || 'General'}</span>
          ${libro.categoria2 ? `<span class="book-category">${libro.categoria2}</span>` : ''}
        </div>
        <span class="book-availability ${estadoClase}">${estadoTexto}</span>
      </div>
      <div class="book-footer-row" onclick="event.stopPropagation()">
        <span class="book-price">$${parseFloat(libro.precio || 0).toFixed(2)}</span>
        <a href="${waBase}?text=${msgWa}" target="_blank" class="btn-order-wa"><i class="fa-brands fa-whatsapp"></i> Apartar</a>
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

// 3. CATEGORÍAS & NOVEDADES
function toggleFiltroNovedades() {
  filtroNovedadesActivo = !filtroNovedadesActivo;
  const btn = document.getElementById('btn-filtro-novedades');
  
  if (filtroNovedadesActivo) {
    btn.classList.add('active');
    mostrarToast("Mostrando sólo novedades recientes");
  } else {
    btn.classList.remove('active');
  }
  renderizarCatalogo();
}

function actualizarCategoriasDinamicas() {
  const container = document.getElementById('categories-filter-box');
  const categoriasMap = {};

  librosGlobal.forEach(l => {
    [l.categoria, l.categoria2].forEach(catField => {
      if (catField) {
        catField.split(',').forEach(c => {
          const trimmed = c.trim();
          if (trimmed) categoriasMap[trimmed] = (categoriasMap[trimmed] || 0) + 1;
        });
      }
    });
  });

  container.innerHTML = `
    <button class="category-btn ${categoriaActiva === 'Todas' ? 'active' : ''}" onclick="seleccionarCategoria('Todas')">
      Todas <span class="cat-count-badge">${librosGlobal.length}</span>
    </button>
  `;

  Object.keys(categoriasMap).forEach(cat => {
    container.innerHTML += `
      <button class="category-btn ${categoriaActiva === cat ? 'active' : ''}" onclick="seleccionarCategoria('${cat}')">
        ${cat} <span class="cat-count-badge">${categoriasMap[cat]}</span>
      </button>
    `;
  });
}

function seleccionarCategoria(cat) {
  categoriaActiva = cat;
  document.getElementById('cat-selected-label').textContent = `(${cat})`;
  actualizarCategoriasDinamicas();
  renderizarCatalogo();
  document.getElementById('dropdown-categories-menu').classList.remove('show');
}

function toggleDropdownCategorias() {
  document.getElementById('dropdown-categories-menu').classList.toggle('show');
}

function filtrarCatalogo() { renderizarCatalogo(); }

function actualizarTextoPrecio(val) {
  document.getElementById('texto-precio-max').textContent = `$${val}`;
  renderizarCatalogo();
}

// 4. CARRUSEL
function renderizarCarrusel() {
  const carrusel = document.getElementById('new-books-carousel');
  carrusel.innerHTML = '';
  const recientes = librosGlobal.slice(-8).reverse();

  recientes.forEach(libro => {
    const item = document.createElement('div');
    item.className = 'carousel-item';
    item.onclick = () => abrirVistaRapida(libro);
    item.innerHTML = `
      <div class="carousel-item-img-box">
        <img src="${libro.imagen}" alt="${libro.titulo}" loading="lazy">
      </div>
      <h4>${libro.titulo}</h4>
    `;
    carrusel.appendChild(item);
  });
}

function moveCarousel(direction) {
  const carousel = document.getElementById('new-books-carousel');
  carruselPosicion += direction * 220;
  const maxScroll = -(carousel.scrollWidth - carousel.parentElement.clientWidth);
  if (carruselPosicion < maxScroll) carruselPosicion = 0;
  if (carruselPosicion > 0) carruselPosicion = maxScroll;
  carousel.style.transform = `translateX(${carruselPosicion}px)`;
}

function iniciarCarruselAuto() { carruselInterval = setInterval(() => moveCarousel(-1), 4000); }
function pausarCarrusel() { clearInterval(carruselInterval); }
function reanudarCarrusel() { iniciarCarruselAuto(); }

// 5. RESEÑAS
function renderizarComentarios() {
  const container = document.getElementById('comments-container');
  container.innerHTML = '';

  if (comentariosGlobal.length === 0) {
    container.innerHTML = `<p style="grid-column: 1/-1; text-align:center; color: var(--text-muted);">Aún no hay opiniones registradas. ¡Sé el primero en compartir la tuya!</p>`;
    return;
  }

  comentariosGlobal.slice().reverse().forEach(c => {
    const estrellasHtml = '<i class="fa-solid fa-star"></i>'.repeat(c.rating || 5);
    const card = document.createElement('div');
    card.className = 'testimonial-card';
    card.innerHTML = `
      <div class="stars">${estrellasHtml}</div>
      <p>"${c.texto}"</p>
      <div class="testimonial-author">- ${c.autor}</div>
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

// 6. VISTA RÁPIDA
function abrirVistaRapida(libro) {
  document.getElementById('qv-img').src = libro.imagen;
  document.getElementById('qv-title').textContent = libro.titulo;
  document.getElementById('qv-author').textContent = `Por: ${libro.autor}`;
  document.getElementById('qv-resume').textContent = libro.resumen || 'Sin resumen disponible.';
  document.getElementById('qv-price').textContent = `$${parseFloat(libro.precio).toFixed(2)}`;
  
  const waBase = configGlobal.whatsappUrlLimpia || configGlobal.whatsapp || "https://wa.me/5217220000000";
  const msgWa = encodeURIComponent(`Hola, me interesa apartar "${libro.titulo}" de ${libro.autor}.`);
  document.getElementById('qv-btn-wa').href = `${waBase}?text=${msgWa}`;
  
  document.getElementById('quickview-modal').style.display = 'block';
}

function cerrarVistaRapida(e, forzar = false) {
  if (forzar || e.target.id === 'quickview-modal') {
    document.getElementById('quickview-modal').style.display = 'none';
  }
}

// UTILERÍAS Y EFECTOS
function toggleTheme() {
  const body = document.body;
  const isDark = body.getAttribute('data-theme') === 'dark';
  body.setAttribute('data-theme', isDark ? 'light' : 'dark');
  document.getElementById('theme-icon').className = isDark ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
}

function mostrarToast(msg) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${msg}`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function cargarFondoAnimado() {
  const canvas = document.getElementById('background-canvas');
  const ctx = canvas.getContext('2d');
  let width = canvas.width = window.innerWidth;
  let height = canvas.height = window.innerHeight;

  const particles = Array.from({ length: 25 }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    size: Math.random() * 14 + 10,
    speedY: -(Math.random() * 0.5 + 0.2),
    opacity: Math.random() * 0.5 + 0.2
  }));

  function draw() {
    ctx.clearRect(0, 0, width, height);
    particles.forEach(p => {
      ctx.fillStyle = `rgba(30, 60, 114, ${p.opacity})`;
      ctx.font = `${p.size}px FontAwesome`;
      ctx.fillText('📖', p.x, p.y);
      p.y += p.speedY;
      if (p.y < -20) p.y = height + 20;
    });
    requestAnimationFrame(draw);
  }
  draw();
  window.onresize = () => { width = canvas.width = window.innerWidth; height = canvas.height = window.innerHeight; };
}
