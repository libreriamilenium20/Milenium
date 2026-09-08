const ADMIN_PASSWORD = "mileniumadmin"; 

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

    firebase.initializeApp(firebaseConfig);
    const db = firebase.database();

    let misLibros = [];
    let configuracionSitio = {};
    let categoriaSeleccionada = "Todas";
    let adminAutenticado = false;

    let limiteLibrosPorPagina = 8;
    let paginaActual = 1;

    let carouselIndex = 0;
    let autoPlayInterval = null;

    function lanzarToast(mensaje) {
      const container = document.getElementById('toast-container');
      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.innerHTML = `<i class="fa-solid fa-circle-info"></i> <span>${mensaje}</span>`;
      container.appendChild(toast);
      setTimeout(() => { toast.remove(); }, 3500);
    }

    function conectarBaseDeDatos() {
      db.ref('configuracion').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) configuracionSitio = data;
        aplicarConfiguracionVisual();
        cargarValoresAjustesEnForm();
      });

      db.ref('libros').on('value', (snapshot) => {
        const data = snapshot.val();
        misLibros = [];
        if (data) {
          Object.keys(data).forEach(key => {
            misLibros.push({ idFirebase: key, ...data[key] });
          });
        }
        calcularEstadisticasAdmin();
        renderizarCategorias();
        renderizarCatalogo();
        renderizarTablaAdmin();
        iniciarAutoPlayCarrusel();
      });
    }

    function inicializarWeb() {
      const temaGuardado = localStorage.getItem("milenium-theme");
      if (temaGuardado) {
        document.documentElement.setAttribute("data-theme", temaGuardado);
      } else {
        const prefiereOscuro = window.matchMedia("(prefers-color-scheme: dark)").matches;
        document.documentElement.setAttribute("data-theme", prefiereOscuro ? "dark" : "light");
      }

      const listContenedor = document.getElementById('book-list');
      let htmlSkeletons = "";
      for(let i=0; i<4; i++) {
        htmlSkeletons += `
          <div class="skeleton-card">
            <div class="skeleton-pulse" style="height:280px; width:100%"></div>
            <div class="skeleton-pulse" style="height:22px; width:80%"></div>
            <div class="skeleton-pulse" style="height:14px; width:50%"></div>
          </div>`;
      }
      listContenedor.innerHTML = htmlSkeletons;

      conectarBaseDeDatos();
      iniciarLibrosFlotantes();
      configurarBuscadorInteligente();
    }

    function conmutarModoOscuro() {
      const temaActual = document.documentElement.getAttribute("data-theme");
      const nuevoTema = temaActual === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", nuevoTema);
      localStorage.setItem("milenium-theme", nuevoTema);
      lanzarToast(`Modo ${nuevoTema === 'dark' ? 'oscuro' : 'claro'} activado`);
    }

    function aplicarConfiguracionVisual() {
      document.documentElement.style.setProperty('--color-primario', configuracionSitio.color1 || '#1e3c72');
      document.documentElement.style.setProperty('--color-secundario', configuracionSitio.color2 || '#2a5298');
      document.documentElement.style.setProperty('--border-book-card', configuracionSitio.colorRecuadro || '#e2e8f0');
      document.getElementById('main-logo').src = configuracionSitio.logo || 'https://i.postimg.cc/ZYGd9Hh8/l-OGO-TERMINADO.png';
      
      const urlActual = window.location.href;
      document.getElementById('main-qr').src = configuracionSitio.qr ? configuracionSitio.qr : `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(urlActual)}`;
      document.getElementById('link-wa').href = configuracionSitio.whatsapp || '#';
      document.getElementById('link-fb').href = configuracionSitio.facebook || '#';
      document.getElementById('link-ig').href = configuracionSitio.instagram || '#';

      if (configuracionSitio.direccion) {
        document.getElementById('footer-direccion-txt').innerText = configuracionSitio.direccion;
      }
      if (configuracionSitio.horario) {
        document.getElementById('footer-horarios-txt').innerHTML = configuracionSitio.horario.replace(/\n/g, '<br>');
      }
      if (configuracionSitio.mapaUrl) {
        document.getElementById('footer-mapa-box').innerHTML = `<iframe src="${configuracionSitio.mapaUrl}" allowfullscreen="" loading="lazy"></iframe>`;
      }

      const numeroWa = configuracionSitio.whatsapp ? configuracionSitio.whatsapp.replace(/\D/g, "") : "521234567890";
      const textoPedido = encodeURIComponent("¡Hola Librería Milenium! Me gustaría cotizar o pedir un libro que no encontré en su catálogo web.");
      document.getElementById('btn-pedir-wa').href = `https://wa.me/${numeroWa}?text=${textoPedido}`;
    }

    function cargarValoresAjustesEnForm() {
      if(!configuracionSitio.color1) return;
      document.getElementById('input-url-logo').value = configuracionSitio.logo || "";
      document.getElementById('input-url-qr').value = configuracionSitio.qr || "";
      document.getElementById('input-color-primario').value = configuracionSitio.color1;
      document.getElementById('input-color-secundario').value = configuracionSitio.color2;
      document.getElementById('input-color-recuadro').value = configuracionSitio.colorRecuadro || "#e2e8f0";
      
      document.getElementById('input-local-direccion').value = configuracionSitio.direccion || "";
      document.getElementById('input-local-mapa').value = configuracionSitio.mapaUrl || "";
      document.getElementById('input-local-horario').value = configuracionSitio.horario || "";

      document.getElementById('input-social-wa').value = configuracionSitio.whatsapp || "";
      document.getElementById('input-social-fb').value = configuracionSitio.facebook || "";
      document.getElementById('input-social-ig').value = configuracionSitio.instagram || "";
    }

    function actualizarLivePreview(url) {
      const img = document.getElementById('form-live-img');
      img.src = url ? url : "https://via.placeholder.com/140x200?text=Sin+Portada";
    }

    function calcularEstadisticasAdmin() {
      let total = misLibros.length;
      let disponibles = 0; let agotados = 0; let descontinuados = 0;

      misLibros.forEach(l => {
        if(l.available === "discontinued") descontinuados++;
        else if(l.available === false || l.available === "false") agotados++;
        else disponibles++;
      });

      document.getElementById('stat-total').innerText = total;
      document.getElementById('stat-disp').innerText = disponibles;
      document.getElementById('stat-agot').innerText = agotados;
      document.getElementById('stat-desc').innerText = descontinuados;
    }

    function actualizarTextoPrecio(val) {
      document.getElementById('texto-precio-max').innerText = `$${val}`;
      renderizarCatalogo();
    }

    function guardarAjustes(event) {
      event.preventDefault();
      if(!adminAutenticado) return;
      const nuevosAjustes = {
        logo: document.getElementById('input-url-logo').value,
        qr: document.getElementById('input-url-qr').value,
        color1: document.getElementById('input-color-primario').value,
        color2: document.getElementById('input-color-secundario').value,
        colorRecuadro: document.getElementById('input-color-recuadro').value,
        direccion: document.getElementById('input-local-direccion').value,
        mapaUrl: document.getElementById('input-local-mapa').value,
        horario: document.getElementById('input-local-horario').value,
        whatsapp: document.getElementById('input-social-wa').value,
        facebook: document.getElementById('input-social-fb').value,
        instagram: document.getElementById('input-social-ig').value
      };
      db.ref('configuracion').set(nuevosAjustes).then(() => {
        cerrarAdminPanel();
        lanzarToast("Ajustes e información del local guardados con éxito");
      });
    }

    function cambiarPestañaAdmin(tabId, boton) {
      document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
      document.querySelectorAll('.admin-tab').forEach(at => at.classList.remove('active'));
      document.getElementById(tabId).classList.add('active');
      boton.classList.add('active');
    }

    function solicitarAccesoAdmin() {
      if (adminAutenticado) { abrirAdminPanel(); return; }
      const passIngresada = prompt("Introduce la contraseña de administrador:");
      if (passIngresada === ADMIN_PASSWORD) {
        adminAutenticado = true;
        lanzarToast("Autenticación exitosa como Administrador");
        abrirAdminPanel();
      } else if (passIngresada !== null) {
        lanzarToast("Acceso Denegado: Contraseña errónea");
      }
    }

    function cerrarSesionAdmin() {
      adminAutenticado = false;
      cerrarAdminPanel();
      lanzarToast("Sesión de administrador finalizada");
    }

    function respaldarInventario(e) {
      e.preventDefault();
      if(!adminAutenticado) return;
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(misLibros, null, 2));
      const downloadAnchorElement = document.createElement('a');
      downloadAnchorElement.setAttribute("href", dataStr);
      downloadAnchorElement.setAttribute("download", "respaldo_inventario_milenium.json");
      document.body.appendChild(downloadAnchorElement);
      downloadAnchorElement.click();
      downloadAnchorElement.remove();
      lanzarToast("Archivo JSON de respaldo generado");
    }

    function toggleDropdownCategorias() {
      const menu = document.getElementById('dropdown-categories-menu');
      const icon = document.getElementById('dropdown-cat-icon');
      menu.classList.toggle('show');
      icon.style.transform = menu.classList.contains('show') ? 'rotate(180deg)' : 'rotate(0deg)';
    }

    function renderizarCategorias() {
      const contenedorFiltros = document.getElementById('categories-filter-box');
      const conteoCategorias = {};

      misLibros.forEach(l => {
        if(l.categoria) {
          const c1 = l.categoria.trim();
          conteoCategorias[c1] = (conteoCategorias[c1] || 0) + 1;
        }
        if(l.categoria2) {
          const c2 = l.categoria2.trim();
          conteoCategorias[c2] = (conteoCategorias[c2] || 0) + 1;
        }
      });

      let htmlBotones = `
        <button class="category-btn ${categoriaSeleccionada === 'Todas' ? 'active' : ''}" onclick="filtrarPorCategoria('Todas')">
          Todas <span class="cat-count-badge">${misLibros.length}</span>
        </button>`;

      Object.keys(conteoCategorias).sort().forEach(cat => {
        htmlBotones += `
          <button class="category-btn ${categoriaSeleccionada === cat ? 'active' : ''}" onclick="filtrarPorCategoria('${cat}')">
            ${cat} <span class="cat-count-badge">${conteoCategorias[cat]}</span>
          </button>`;
      });

      contenedorFiltros.innerHTML = htmlBotones;
    }

    function filtrarPorCategoria(categoria) {
      categoriaSeleccionada = categoria;
      paginaActual = 1; 
      document.getElementById('cat-selected-label').innerText = `(${categoria})`;
      renderizarCategorias();
      renderizarCatalogo();
      
      const menu = document.getElementById('dropdown-categories-menu');
      if(menu.classList.contains('show')) toggleDropdownCategorias();
    }

    function autocompletarLibroIA() {
      const titulo = document.getElementById('form-titulo').value.trim();
      const autor = document.getElementById('form-autor').value.trim();

      if (!titulo) {
        lanzarToast("Escribe al menos el título para buscar datos.");
        return;
      }

      lanzarToast("🔍 Obteniendo información...");
      const query = encodeURIComponent(`${titulo} ${autor}`);
      
      fetch(`https://www.googleapis.com/books/v1/volumes?q=${query}`)
        .then(res => res.json())
        .then(data => {
          if (data.items && data.items.length > 0) {
            const info = data.items[0].volumeInfo;
            
            if (info.description) document.getElementById('form-resumen').value = info.description;
            if (info.categories && info.categories.length > 0) {
              const cats = info.categories[0].split('/');
              document.getElementById('form-categoria').value = cats[0].trim();
              if (cats[1]) document.getElementById('form-categoria2').value = cats[1].trim();
            }

            if (info.imageLinks) {
              const imgUrl = info.imageLinks.thumbnail || info.imageLinks.smallThumbnail;
              const imgHD = imgUrl.replace('http:', 'https:').replace('&edge=curl', '');
              document.getElementById('form-imagen').value = imgHD;
              actualizarLivePreview(imgHD);
            }

            lanzarToast("✨ Datos auto-completados exitosamente");
          } else {
            lanzarToast("No se halló información automática.");
          }
        })
        .catch(() => lanzarToast("Error de conexión al buscar datos."));
    }

    function configurarBuscadorInteligente() {
      const inputBuscar = document.getElementById('search-input');
      const listaSugerencias = document.getElementById('autocomplete-list');

      inputBuscar.addEventListener('input', function() {
        const texto = this.value.toLowerCase().trim();
        listaSugerencias.innerHTML = "";
        if (texto === "") { listaSugerencias.style.display = "none"; renderizarCatalogo(); return; }

        const coincidencias = misLibros.filter(l => 
          l.titulo.toLowerCase().includes(texto) || 
          l.autor.toLowerCase().includes(texto)
        );

        if (coincidencias.length > 0) {
          coincidencias.slice(0, 5).forEach(libro => {
            const item = document.createElement('div');
            item.className = "suggestion-item";
            item.innerHTML = `<img src="${libro.imagen}"><div><strong>${libro.titulo}</strong></div>`;
            item.addEventListener('click', () => {
              inputBuscar.value = libro.titulo;
              listaSugerencias.style.display = "none";
              paginaActual = 1;
              renderizarCatalogo(libro.titulo); 
            });
            listaSugerencias.appendChild(item);
          });
          listaSugerencias.style.display = "block";
        }
        paginaActual = 1;
        renderizarCatalogo(texto);
      });

      document.addEventListener('click', (e) => {
        if(e.target !== inputBuscar) listaSugerencias.style.display = "none";
      });
    }

    function abrirVistaRapida(idFirebase) {
      const libro = misLibros.find(l => l.idFirebase === idFirebase);
      if(!libro) return;
      document.getElementById('qv-img').src = libro.imagen;
      document.getElementById('qv-title').innerText = libro.titulo;
      document.getElementById('qv-author').innerText = `de ${libro.autor}`;
      
      const catGroup = document.getElementById('qv-cat-group');
      catGroup.innerHTML = `<span class="book-category">${libro.categoria}</span>`;
      if (libro.categoria2) catGroup.innerHTML += `<span class="book-category">${libro.categoria2}</span>`;

      document.getElementById('qv-resume').innerText = libro.resumen || "Sin descripción disponible.";
      document.getElementById('qv-price').innerText = `$${libro.precio}`;
      
      const numeroWa = configuracionSitio.whatsapp ? configuracionSitio.whatsapp.replace(/\D/g, "") : "521234567890";
      const textoMsj = encodeURIComponent(`Hola, me interesa apartar el libro "${libro.titulo}" del autor ${libro.autor} que vi en la web de Librería Milenium.`);
      document.getElementById('qv-btn-wa').href = `https://wa.me/${numeroWa}?text=${textoMsj}`;
      
      document.getElementById('quickview-modal').style.display = "block";
    }

    function cerrarVistaRapida(e, forzar = false) {
      if(e.target === document.getElementById('quickview-modal') || forzar) {
        document.getElementById('quickview-modal').style.display = "none";
      }
    }

    function renderizarCatalogo(textoFiltro = "") {
      const listaContenedor = document.getElementById('book-list');
      const carruselContenedor = document.getElementById('new-books-carousel');
      const paginacionBox = document.getElementById('pagination-box');
      listaContenedor.innerHTML = ""; carruselContenedor.innerHTML = "";

      misLibros.slice(-6).reverse().forEach(libro => {
        carruselContenedor.innerHTML += `
          <div class="carousel-item" onclick="abrirVistaRapida('${libro.idFirebase}')">
            <div class="carousel-item-img-box"><img src="${libro.imagen}"></div>
            <h4>${libro.titulo}</h4>
          </div>`;
      });

      let librosFiltrados = misLibros.filter(libro => {
        const cumpleCategoria = (
          categoriaSeleccionada === "Todas" || 
          libro.categoria === categoriaSeleccionada || 
          libro.categoria2 === categoriaSeleccionada
        );
        
        const texto = textoFiltro ? textoFiltro.toLowerCase() : document.getElementById('search-input').value.toLowerCase().trim();
        const cumpleTexto = (
          texto === "" || 
          libro.titulo.toLowerCase().includes(texto) || 
          libro.autor.toLowerCase().includes(texto) || 
          (libro.categoria && libro.categoria.toLowerCase().includes(texto)) ||
          (libro.categoria2 && libro.categoria2.toLowerCase().includes(texto))
        );
        
        const precioMaximo = parseFloat(document.getElementById('control-precio-rango').value);
        const cumplePrecio = libro.precio <= precioMaximo;

        return cumpleCategoria && cumpleTexto && cumplePrecio;
      });

      const orden = document.getElementById('control-ordenar').value;
      if (orden === "price-asc") librosFiltrados.sort((a,b) => a.precio - b.precio);
      if (orden === "price-desc") librosFiltrados.sort((a,b) => b.precio - a.precio);
      if (orden === "alpha") librosFiltrados.sort((a,b) => a.titulo.localeCompare(b.titulo));

      if(librosFiltrados.length === 0) {
        listaContenedor.innerHTML = `<div class="no-results"><i class="fa-solid fa-face-frown" style="font-size:2rem; margin-bottom:10px; display:block"></i> No encontramos títulos con esas especificaciones.</div>`;
        paginacionBox.innerHTML = "";
        return;
      }

      let indiceMaximo = paginaActual * limiteLibrosPorPagina;
      let fragmentoMostrar = librosFiltrados.slice(0, indiceMaximo);

      fragmentoMostrar.forEach(libro => {
        let textoDisp = "Disponible"; let claseDisp = "available";
        if (libro.available === false || libro.available === "false") { textoDisp = "Agotado"; claseDisp = "not-available"; } 
        else if (libro.available === "discontinued") { textoDisp = "Descontinuado"; claseDisp = "discontinued"; }

        const numeroWa = configuracionSitio.whatsapp ? configuracionSitio.whatsapp.replace(/\D/g, "") : "521234567890";
        const textoMsj = encodeURIComponent(`Hola, me interesa apartar el libro "${libro.titulo}" que vi en la web de Librería Milenium.`);

        let htmlCategoriasTag = `<span class="book-category">${libro.categoria}</span>`;
        if (libro.categoria2) htmlCategoriasTag += `<span class="book-category">${libro.categoria2}</span>`;

        listaContenedor.innerHTML += `
          <div class="book" onclick="abrirVistaRapida('${libro.idFirebase}')">
            <div class="book-image-container"><img src="${libro.imagen}" loading="lazy"></div>
            <h4>${libro.titulo}</h4>
            <p class="book-author">de ${libro.autor}</p>
            <p class="book-resume">${libro.resumen || 'Sin descripción.'}</p>
            <div class="book-details">
              <div class="categories-tag-group">${htmlCategoriasTag}</div>
              <span class="book-availability ${claseDisp}">${textoDisp}</span>
            </div>
            <div class="book-footer-row" onclick="event.stopPropagation()">
              <div class="book-price">$${libro.precio}</div>
              <a href="https://wa.me/${numeroWa}?text=${textoMsj}" target="_blank" class="btn-order-wa"><i class="fa-brands fa-whatsapp"></i> Apartar</a>
            </div>
          </div>`;
      });

      if (librosFiltrados.length > indiceMaximo) {
        paginacionBox.innerHTML = `<button class="btn-load-more" onclick="cargarMasLibros()">Ver más títulos</button>`;
      } else {
        paginacionBox.innerHTML = "";
      }
    }

    function cargarMasLibros() {
      paginaActual++;
      renderizarCatalogo();
    }

    function filtrarTablaAdmin(texto) {
      renderizarTablaAdmin(texto.toLowerCase().trim());
    }

    function renderizarTablaAdmin(filtroTexto = "") {
      const tbody = document.getElementById('management-table-body');
      tbody.innerHTML = "";

      let listaMostrar = misLibros.filter(l => 
        l.titulo.toLowerCase().includes(filtroTexto) || 
        l.autor.toLowerCase().includes(filtroTexto)
      );

      document.getElementById('count-tabla-admin').innerText = listaMostrar.length;

      listaMostrar.forEach((libro) => {
        const indexOriginal = misLibros.findIndex(m => m.idFirebase === libro.idFirebase);
        
        let estaDisponible = libro.available === true || libro.available === "true";
        let badgeHtml = estaDisponible 
          ? `<span class="tbl-badge disp">Disponible</span>` 
          : `<span class="tbl-badge agot">Agotado</span>`;

        tbody.innerHTML += `
          <tr>
            <td><img src="${libro.imagen}" class="tbl-thumb"></td>
            <td><strong>${libro.titulo}</strong></td>
            <td>${libro.autor}</td>
            <td>$${libro.precio}</td>
            <td>${badgeHtml}</td>
            <td class="action-btns">
              <button class="toggle-disp-btn" title="Cambiar Estado Rápido" onclick="conmutarEstadoRapido('${libro.idFirebase}', ${estaDisponible})"><i class="fa-solid fa-arrows-rotate"></i></button>
              <button class="edit-btn" onclick="cargarLibroEnFormulario(${indexOriginal})"><i class="fa-solid fa-pen"></i></button>
              <button class="delete-btn" onclick="eliminarLibro('${libro.idFirebase}', '${libro.titulo}')"><i class="fa-solid fa-trash"></i></button>
            </td>
          </tr>`;
      });
    }

    function conmutarEstadoRapido(idFirebase, estadoActual) {
      if(!adminAutenticado) return;
      db.ref('libros/' + idFirebase + '/available').set(!estadoActual).then(() => {
        lanzarToast("Estado actualizado correctamente");
      });
    }

    function abrirAdminPanel() { 
      document.getElementById('admin-overlay').style.display = 'block'; 
      document.getElementById('admin-panel').style.display = 'block'; 
    }
    
    function cerrarAdminPanel() { 
      document.getElementById('admin-overlay').style.display = 'none'; 
      document.getElementById('admin-panel').style.display = 'none'; 
      document.getElementById('book-form').reset(); 
      document.getElementById('edit-idFirebase').value = ""; 
      document.getElementById('form-live-img').src = "https://via.placeholder.com/140x200?text=Sin+Portada";
      document.getElementById('panel-title').innerHTML = `<i class="fa-solid fa-plus-circle"></i> Agregar Nuevo Libro`;
    }

    function guardarLibro(event) {
      event.preventDefault();
      if(!adminAutenticado) return;
      const idFirebase = document.getElementById('edit-idFirebase').value;
      
      const valorDisp = document.getElementById('form-disponible').value;
      let valorGuardarDisp = valorDisp;
      if (valorDisp === "true") valorGuardarDisp = true;
      if (valorDisp === "false") valorGuardarDisp = false;

      const nuevoLibro = {
        titulo: document.getElementById('form-titulo').value,
        autor: document.getElementById('form-autor').value,
        imagen: document.getElementById('form-imagen').value,
        resumen: document.getElementById('form-resumen').value,
        precio: parseFloat(document.getElementById('form-precio').value),
        categoria: document.getElementById('form-categoria').value,
        categoria2: document.getElementById('form-categoria2').value || "",
        available: valorGuardarDisp
      };

      if (idFirebase === "") {
        db.ref('libros').push(nuevoLibro).then(() => {
          cerrarAdminPanel();
          lanzarToast("Nuevo libro agregado");
        });
      } else {
        db.ref('libros/' + idFirebase).set(nuevoLibro).then(() => {
          cerrarAdminPanel();
          lanzarToast("Registro de libro modificado");
        });
      }
    }

    function cargarLibroEnFormulario(index) {
      const libro = misLibros[index];
      document.getElementById('edit-idFirebase').value = libro.idFirebase;
      document.getElementById('form-titulo').value = libro.titulo;
      document.getElementById('form-autor').value = libro.autor;
      document.getElementById('form-imagen').value = libro.imagen;
      document.getElementById('form-live-img').src = libro.imagen;
      document.getElementById('form-resumen').value = libro.resumen;
      document.getElementById('form-precio').value = libro.precio;
      document.getElementById('form-categoria').value = libro.categoria;
      document.getElementById('form-categoria2').value = libro.categoria2 || "";
      
      document.getElementById('panel-title').innerHTML = `<i class="fa-solid fa-pen-to-square"></i> Editando: ${libro.titulo}`;

      if (libro.available === true || libro.available === "true") {
        document.getElementById('form-disponible').value = "true";
      } else if (libro.available === false || libro.available === "false") {
        document.getElementById('form-disponible').value = "false";
      } else {
        document.getElementById('form-disponible').value = libro.available; 
      }
      
      document.getElementById('admin-panel').scrollTo({top: 0, behavior: 'smooth'});
    }

    function eliminarLibro(idFirebase, titulo) {
      if(!adminAutenticado) return;
      if(confirm(`¿Eliminar permanentemente "${titulo}"?`)) {
        db.ref('libros/' + idFirebase).remove().then(() => {
          lanzarToast(`"${titulo}" fue removido`);
        });
      }
    }

    function actualizarDesplazamientoCarrusel() {
      const carousel = document.getElementById('new-books-carousel');
      const items = document.querySelectorAll('.carousel-item');
      if (items.length === 0) return;

      const itemWidth = items[0].offsetWidth + parseInt(window.getComputedStyle(items[0]).marginLeft) + parseInt(window.getComputedStyle(items[0]).marginRight);
      const contenedorWrapper = document.querySelector('.carousel-wrapper');
      const itemsVisibles = Math.floor(contenedorWrapper.offsetWidth / itemWidth) || 1;
      const maxIndex = items.length - itemsVisibles;

      if (carouselIndex > maxIndex) { carouselIndex = 0; } 
      else if (carouselIndex < 0) { carouselIndex = maxIndex >= 0 ? maxIndex : 0; }

      carousel.style.transform = `translateX(${-carouselIndex * itemWidth}px)`;
    }

    function moveCarousel(direction) {
      carouselIndex += direction;
      actualizarDesplazamientoCarrusel();
    }

    function iniciarAutoPlayCarrusel() {
      pausarCarrusel(); 
      autoPlayInterval = setInterval(() => {
        carouselIndex++;
        actualizarDesplazamientoCarrusel();
      }, 3500); 
    }

    function pausarCarrusel() { if (autoPlayInterval) clearInterval(autoPlayInterval); }
    function reanudarCarrusel() { iniciarAutoPlayCarrusel(); }

    window.addEventListener('resize', () => { actualizarDesplazamientoCarrusel(); });

    function iniciarLibrosFlotantes() {
      const canvas = document.getElementById('background-canvas');
      const ctx = canvas.getContext('2d');
      function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
      window.addEventListener('resize', resize); resize();

      const libros = [];
      for (let i = 0; i < 10; i++) {
        libros.push({ x: Math.random() * canvas.width, y: canvas.height + Math.random() * 200, w: 30, h: 20, speed: Math.random() * 0.4 + 0.2, angle: 0 });
      }

      function drawRealisticBook(ctx, w, h) {
        ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-secundario') || '#4a6fa5'; 
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(w, h); ctx.stroke();
      }

      function anim() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        libros.forEach(l => {
          l.y -= l.speed;
          ctx.save(); ctx.translate(l.x, l.y); drawRealisticBook(ctx, l.w, l.h); ctx.restore();
          if (l.y < -50) { l.y = canvas.height + 50; l.x = Math.random() * canvas.width; }
        });
        requestAnimationFrame(anim);
      }
      anim();
    }

    document.addEventListener('DOMContentLoaded', inicializarWeb);
