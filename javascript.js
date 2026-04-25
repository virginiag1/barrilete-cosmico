const SHEETS_PRODUCTOS = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRWq8ZnjnQloYGqIi0ziC_dWISbTL_nA-m8y8RFRzg0G97wEI3rlXZmagfmv1QcGesFrzaemjNsb_G2/pub?output=csv';
const SHEETS_CONFIG = SHEETS_PRODUCTOS.replace('output=csv', 'output=csv&gid=1');
const NUMERO_WSP = "543456020641";

let equipoActivo = 'TODO';
let edadActiva   = 'Todos';
let catActiva    = 'Todos';

function parsearCSV(fila) {
    const res = [];
    let campo = '', enComillas = false;
    for (let i = 0; i < fila.length; i++) {
        const c = fila[i];
        if (c === '"') { enComillas = !enComillas; }
        else if (c === ',' && !enComillas) { res.push(campo.trim()); campo = ''; }
        else { campo += c; }
    }
    res.push(campo.trim());
    return res;
}

function driveUrl(url) {
    if (!url) return '';
    url = url.trim();
    if (url.includes('drive.google.com')) {
        let id = '';
        if (url.includes('/d/'))      id = url.split('/d/')[1]?.split('/')[0];
        else if (url.includes('id=')) id = url.split('id=')[1]?.split('&')[0];
        if (id) return `https://lh3.googleusercontent.com/d/${id}`;
    }
    return url;
}

function fmt(p) {
    if (!p) return '';
    const n = parseFloat(String(p).replace(/[^0-9.]/g, ''));
    return isNaN(n) ? '' : '$' + Math.round(n).toLocaleString('es-AR');
}

async function cargarProductos() {
    try {
        const r = await fetch(SHEETS_PRODUCTOS);
        if (!r.ok) throw new Error('Error fetch');
        const txt = await r.text();
        const filas = txt.split('\n').slice(1).filter(f => f.trim());
       window._productos = filas.map(fila => {
    const c = parsearCSV(fila);
    return {
        nombre:    c[0] || '',
        talle:     c[1] || '',
        precio:    c[2] || '',
        oferta:    c[3] || '',
        imagenes:  [c[4],c[5],c[6],c[7],c[8]].filter(x => x && x.trim()),
        equipo:    (c[9]  || '').toUpperCase(),
        categoria: c[10] || '',
        edad:      c[11] || '',
        stock:     (c[12] || '').toLowerCase()
    };
});
        aplicarFiltros();
    } catch (e) {
        document.getElementById('grid-productos').innerHTML =
            '<p class="sin-productos">No se pudieron cargar los productos.<br>Verificá que el Sheets esté publicado como CSV.</p>';
        console.error(e);
    }
}

function aplicarFiltros() {
    if (!window._productos) return;

    let lista = window._productos.filter(p => p.nombre && p.stock === 'disponible');

    if (equipoActivo === 'OUTLET') {
        lista = lista.filter(p => p.oferta && !isNaN(parseFloat(p.oferta)));
    } else if (equipoActivo !== 'TODO') {
        lista = lista.filter(p => p.equipo === equipoActivo);
    }

    if (edadActiva !== 'Todos') {
        lista = lista.filter(p => p.edad.toLowerCase() === edadActiva.toLowerCase());
    }

    if (catActiva !== 'Todos') {
        lista = lista.filter(p => p.categoria.toLowerCase() === catActiva.toLowerCase());
    }

    renderizar(lista);
}

function renderizar(lista) {
    const cont = document.getElementById('grid-productos');
    if (!lista.length) {
        cont.innerHTML = '<p class="sin-productos">No hay productos con ese filtro.<br>Probá otra combinación.</p>';
        return;
    }
    cont.innerHTML = lista.map(p => {
        const pct    = p.oferta && !isNaN(+p.oferta) ? Math.round(+p.oferta) : null;
        const precio = parseFloat(p.precio.replace(/[^0-9.]/g, ''));
        const transf = !isNaN(precio) ? '$' + Math.round(precio * 0.85).toLocaleString('es-AR') : null;
        const msg    = encodeURIComponent(`Hola Flor! 👋 Quiero consultar por *${p.nombre}*. ¿Tenés disponible?`);
        const esNino = p.edad.toLowerCase().includes('ni');
        const talles = p.talle ? p.talle.split(' ').join(' · ') : 'Consultar talles';
        return `<div class="card">
            ${pct ? `<div class="badge-off">${pct}% OFF</div>` : ''}
            ${p.edad ? `<div class="badge-edad${esNino ? ' nino' : ''}">${p.edad}</div>` : ''}
            ${(() => {
    const imgs = p.imagenes.filter(x => x);
    if (!imgs.length) return `<img src="https://via.placeholder.com/300x400/111111/c9a227?text=Sin+imagen" alt="${p.nombre}">`;
    if (imgs.length === 1) return `<img src="${driveUrl(imgs[0])}" alt="${p.nombre}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x400/111111/c9a227?text=Sin+imagen'">`;
    const id = 'car' + Math.random().toString(36).slice(2,7);
    return `<div class="carrusel" id="${id}">
        ${imgs.map((img,i) => `<img src="${driveUrl(img)}" class="car-img${i===0?' active':''}" alt="${p.nombre}" loading="lazy" onerror="this.style.display='none'">`).join('')}
        <button class="car-prev" onclick="moverCar('${id}',-1)">‹</button>
        <button class="car-next" onclick="moverCar('${id}',1)">›</button>
        <div class="car-dots">${imgs.map((_,i)=>`<span class="car-dot${i===0?' active':''}" onclick="irFoto('${id}',${i})"></span>`).join('')}</div>
    </div>`;
})()}
            <div class="card-body">
                <h3>${p.nombre}</h3>
                <p class="card-talle">${talles}</p>
                <div class="precio-final">${fmt(p.precio)}</div>
                ${transf ? `<div class="precio-transferencia">${transf} por transferencia</div>` : ''}
                <a href="https://wa.me/${NUMERO_WSP}?text=${msg}" target="_blank" class="btn-consultar">
                    <i class="fab fa-whatsapp" style="font-size:15px;"></i> Consultar
                </a>
            </div>
        </div>`;
    }).join('');
}

function setEquipo(equipo) {
    equipoActivo = equipo;
    edadActiva   = 'Todos';
    catActiva    = 'Todos';
    resetChips();

    const nombres = {
        'TODO':'Todos los productos','OUTLET':'Outlet / Liquidación',
        'ARGENTINA':'Argentina','RIVER PLATE':'River Plate',
        'BOCA JUNIORS':'Boca Juniors','SAN LORENZO':'San Lorenzo',
        'INDEPENDIENTE':'Independiente','RACING':'Racing',
        'ROSARIO CENTRAL':'Rosario Central','EUROPEAS':'Europeas',
        'IMPORTADAS':'Importadas','TERMICOS':'Térmicos'
    };
    const nombre = nombres[equipo] || equipo;

    const tituloEl = document.getElementById('equipo-activo-titulo');
    if (tituloEl) tituloEl.textContent = nombre;

    const zonaChips = document.getElementById('zona-chips');
    if (zonaChips) zonaChips.style.display = (equipo !== 'TODO') ? 'block' : 'none';

    // Mostrar sección productos y scrollear
    const secProd = document.getElementById('productos');
    if (secProd) {
        secProd.style.display = 'block';
        aplicarFiltros();
        setTimeout(() => secProd.scrollIntoView({ behavior: 'smooth' }), 50);
    }
}

function resetChips() {
    ['chips-edad', 'chips-categoria'].forEach(id => {
        document.querySelectorAll(`#${id} .chip`).forEach((c, i) => {
            c.classList.toggle('active', i === 0);
        });
    });
}

function cerrarMenu() {
    document.getElementById('side-menu').classList.remove('open');
    document.getElementById('menu-overlay').style.display = 'none';
    document.body.style.overflow = '';
}

function moverCarrusel(btn, direccion) {
    const car = btn.closest('.carrusel');
    const imgs = car.querySelectorAll('.car-img');
    const dots = car.querySelectorAll('.car-dot');
    let actual = [...imgs].findIndex(i => i.classList.contains('active'));
    imgs[actual].classList.remove('active');
    dots[actual].classList.remove('active');
    actual = (actual + direccion + imgs.length) % imgs.length;
    imgs[actual].classList.add('active');
    dots[actual].classList.add('active');
}

function cambiarFoto(dot, idx) {
    const car = dot.closest('.carrusel');
    car.querySelectorAll('.car-img').forEach((i,n) => i.classList.toggle('active', n===idx));
    car.querySelectorAll('.car-dot').forEach((d,n) => d.classList.toggle('active', n===idx));
}
function moverCar(id, dir) {
    const car = document.getElementById(id);
    const imgs = car.querySelectorAll('.car-img');
    const dots = car.querySelectorAll('.car-dot');
    let actual = [...imgs].findIndex(i => i.classList.contains('active'));
    imgs[actual].classList.remove('active');
    dots[actual].classList.remove('active');
    actual = (actual + dir + imgs.length) % imgs.length;
    imgs[actual].classList.add('active');
    dots[actual].classList.add('active');
}

function irFoto(id, idx) {
    const car = document.getElementById(id);
    car.querySelectorAll('.car-img').forEach((i,n) => i.classList.toggle('active', n===idx));
    car.querySelectorAll('.car-dot').forEach((d,n) => d.classList.toggle('active', n===idx));
}

function setupEventListeners() {
    document.getElementById('btn-menu').addEventListener('click', () => {
        document.getElementById('side-menu').classList.add('open');
        document.getElementById('menu-overlay').style.display = 'block';
        document.body.style.overflow = 'hidden';
    });

    document.getElementById('btn-close-menu').addEventListener('click', cerrarMenu);
    document.getElementById('menu-overlay').addEventListener('click', cerrarMenu);

    document.querySelectorAll('.menu-item').forEach(el => {
        el.addEventListener('click', () => {
            cerrarMenu();
            if (el.dataset.action === 'todo')        setEquipo('TODO');
            else if (el.dataset.action === 'outlet') setEquipo('OUTLET');
            else if (el.dataset.equipo)              setEquipo(el.dataset.equipo);
        });
    });

    document.querySelectorAll('.chip').forEach(el => {
        el.addEventListener('click', () => {
            const tipo  = el.dataset.tipo;
            const valor = el.dataset.valor;
            document.querySelectorAll(`#chips-${tipo} .chip`).forEach(c => c.classList.remove('active'));
            el.classList.add('active');
            if (tipo === 'edad')      edadActiva = valor;
            if (tipo === 'categoria') catActiva  = valor;
            aplicarFiltros();
        });
    });

    document.getElementById('btn-ver-coleccion').addEventListener('click', () => {
        const secProd = document.getElementById('productos');
        secProd.style.display = 'block';
        setEquipo('TODO');
        secProd.scrollIntoView({ behavior: 'smooth' });
    });
}
async function cargarConfig() {
    try {
        const r = await fetch(SHEETS_CONFIG);
        const txt = await r.text();
        const filas = txt.split('\n').filter(f => f.trim());
        const config = {};
        filas.forEach(fila => {
            const c = parsearCSV(fila);
            if (c[0] && c[1]) config[c[0].trim()] = c[1].trim();
        });

        const anuncios = [
            config['anuncio1'] || 'Envíos a todo el país',
            config['anuncio2'] || '3 cuotas sin interés',
            config['anuncio3'] || '10% off transferencia'
        ];

        // Lo duplicamos para que el marquee sea infinito sin cortes
        const texto = [...anuncios, ...anuncios]
            .map(a => `<span>✦ ${a}</span>`)
            .join('');
        document.getElementById('marquee-track').innerHTML = texto;
        if (config['imagen_fondo']) {
    document.querySelector('.hero').style.backgroundImage = 
        `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url('${driveUrl(config['imagen_fondo'])}')`;
}

    } catch(e) {
        document.getElementById('marquee-track').innerHTML =
            '<span>✦ Envíos a todo el país</span><span>✦ 3 cuotas sin interés</span>';
    }
}

window.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    cargarConfig();
    cargarProductos();
});
