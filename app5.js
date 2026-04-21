
// ======================================
// 🔐 CONFIG / ESTADO GLOBAL
// ======================================

let usuarioActual = null;
let ventaActual = [];
let totalVenta = 0;

let data = JSON.parse(localStorage.getItem("dataPOS")) || {};

let inventario = JSON.parse(localStorage.getItem("inventarioPOS")) || [];

function normalizar(texto) {
  return texto
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s]/g, "");
}

function buscarProducto(nombre) {

  const n = normalizar(nombre);

  return inventario.find(p => {

    const nombreBase = normalizar(p.nombre);

    // coincidencia fuerte
    const coincideNombre =
      n.includes(nombreBase) ||
      nombreBase.includes(n);

    // coincidencia por alias
    const coincideAlias =
      (p.alias || []).some(a => {
        const al = normalizar(a);
        return n.includes(al) || al.includes(n);
      });

    return coincideNombre || coincideAlias;
  });
}


// PINs
const VALID_PINS = {
  "4829": "ADMIN",
  "7391": "TURNO 1",
  "6158": "TURNO 2"
};


// ======================================
// 🎯 DOM
// ======================================

const modal = document.getElementById("modal");
const input = document.getElementById("inputProducto");
const preview = document.getElementById("preview");

const totalVentaSpan = document.getElementById("totalVenta");
const totalDiaSpan = document.getElementById("totalDia");
const listaVentas = document.getElementById("listaVentas");
const preVenta = document.getElementById("preVenta");


// ======================================
// 🔐 LOGIN
// ======================================

document.getElementById("btnLogin").onclick = () => {

  const pin = document.getElementById("pinInput").value;

  if (!VALID_PINS[pin]) return alert("PIN incorrecto");

  const nombreUsuario = VALID_PINS[pin];

  usuarioActual = nombreUsuario;

  if (!data[nombreUsuario]) data[nombreUsuario] = { ventas: [] };

  localStorage.setItem("usuarioActivo", nombreUsuario);

  document.getElementById("loginScreen").style.display = "none";

  init();
};


// ======================================
// 🚀 INIT
// ======================================

function init() {

  checkInstallStatus();

  const user = localStorage.getItem("usuarioActivo");

  if (!user) {
    document.getElementById("loginScreen").style.display = "flex";
    return;
  }

  usuarioActual = user;

  // 👇 ocultar login correctamente
  document.getElementById("loginScreen").style.display = "none";

  document.getElementById("userLabel").textContent = usuarioActual;

  const btnGlobal = document.getElementById("btnPDFGlobal");

  if (btnGlobal) {
    btnGlobal.style.display = usuarioActual === "ADMIN" ? "block" : "none";
  }

  renderHistorial();
  actualizarTotalDia();
  actualizarSugerencias();

  const panel = document.getElementById("panelGanancias");

if (panel) {
  panel.style.display = usuarioActual === "ADMIN" ? "block" : "none";
}

actualizarGanancias();

  
}

function actualizarSugerencias() {

  const datalist = document.getElementById("sugerencias");
  if (!datalist) return;

  datalist.innerHTML = "";

  inventario.forEach(p => {
    const option = document.createElement("option");
    option.value = p.nombre;
    datalist.appendChild(option);
  });
}


init();


// ======================================
// 🧠 PARSER INTELIGENTE
// ======================================

function parsear(texto) {

  const t = texto.toLowerCase();

  const nums = t.match(/\d+(\.\d+)?/g)?.map(Number) || [];

  let cantidad = 1;
  let precioUnitario = 0;
  let unidad = "pieza";
  let modoLote = false;

  // 🧠 detectar unidad
  if (t.includes("kg") || t.includes("kilo")) {
    unidad = "kg";
  } else if (t.includes("pieza") || t.includes("pza")) {
    unidad = "pieza";
  }

  // 🧠 detectar patrones de venta
  const esMultiplicacion =
    t.includes(" x ") ||
    t.includes("cada") ||
    t.includes("c/u");

  const esPrecioTotal =
    t.includes("por") ||
    t.includes("total") ||
    t.includes("son");

  if (nums.length === 1) {
    precioUnitario = nums[0];
  }

  if (nums.length >= 2) {
    cantidad = nums[0];
    precioUnitario = nums[1];

    if (esMultiplicacion) modoLote = true;
    else if (esPrecioTotal) modoLote = false;
    else modoLote = true;
  }

  const subtotal = modoLote
    ? cantidad * precioUnitario
    : precioUnitario;

  return {
    texto,
    cantidad,
    precioUnitario,
    unidad,
    subtotal,
    modoLote
  };
}


function extraerNombre(texto) {
  return texto
    .toLowerCase()
    .replace(/\d+/g, "")
    .replace(/\b(kilos?|kg|pieza?s?|pzas?|de|a|x|cada|uno|por|pesos?)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}


// ======================================
// 👀 PREVIEW
// ======================================

input.addEventListener("input", () => {

 

  const v = input.value.trim().toLowerCase();
  if (!v) {
    preview.textContent = "";
    actualizarSugerencias();
    return;
  }

  const d = parsear(v);

// 🔎 detectar producto en inventario
const nombreDetectado = extraerNombre(v);

const productoEncontrado = buscarProducto(nombreDetectado);

  // preview inteligente único (sin pisarse)
if (productoEncontrado) {

  preview.textContent =
    `📦 ${productoEncontrado.nombre} | 💰 Costo: $${productoEncontrado.costo || 0}`;

} else if (d.multi) {

  preview.textContent =
    `${d.cantidad} x ${d.precio} = $${d.cantidad * d.precio}`;

} else {

  preview.textContent = "";
}

  // 🔍 FILTRAR sugerencias inteligentes
  const datalist = document.getElementById("sugerencias");
  datalist.innerHTML = "";

const n = normalizar(v);

const filtrados = inventario
  .map(p => {

    let score = 0;

    const nombre = normalizar(p.nombre);

    // coincidencia directa
    if (nombre.includes(n)) score += 3;
    if (n.includes(nombre)) score += 2;

    // coincidencia por alias
    p.alias?.forEach(a => {
      const al = normalizar(a);
      if (al.includes(n) || n.includes(al)) {
        score += 1;
      }
    });

    return { ...p, score };
  })
  .filter(p => p.score > 0)
  .sort((a, b) => b.score - a.score)
  .slice(0, 5);

  filtrados.forEach(p => {
    const option = document.createElement("option");
    option.value = p.nombre;
    datalist.appendChild(option);
  });

});


// ======================================
// ➕ AGREGAR PRODUCTO
// ======================================

function agregar() {

  const v = input.value.trim();
  if (!v) return;

  const d = parsear(v);

  let subtotal;

if (d.unidad === "kg") {
  subtotal = d.cantidad * d.precio;
} else {
  subtotal = d.multi ? d.cantidad * d.precio : d.precio;
}

const nombre = extraerNombre(d.texto);

let producto = buscarProducto(nombre);

// 🧠 si no existe, se crea automáticamente desde la venta
if (!producto) {

  producto = {
    nombre: nombre.trim(),
    stock: d.cantidad, // se asume que “existe porque se vendió”
    unidad: unidadDetectada(nombre),
    costo: null,
    precioVenta: null,
    alias: [nombre]
  };

  inventario.push(producto);

} else {

  // si existe, solo descuenta stock
  if (typeof producto.stock !== "number") {
    producto.stock = d.cantidad;
  } else {
    producto.stock -= d.cantidad;
  }

  if (producto.stock < 0) producto.stock = 0;
}

  // 🧠 NORMALIZAR INVENTARIO (unificar stock base)
if (producto) {
  if (typeof producto.cantidad !== "number") {
    producto.cantidad = producto.stock || 0;
  }
}
  

let costoBase = 0;

if (producto && producto.costo != null) {
  costoBase = Number(producto.costo) || 0;
}
  

if (!producto) {

  const nombreNormalizado = normalizar(nombre);

producto = {
  nombre: nombre.trim(),
  stock: 0,
  costo: Number(d.precio) > 0 ? Number(d.precio) : 0,
  unidad: d.unidad,
  alias: [nombre]
};

  // si no hay costo real, dejarlo null para detectar errores
if (!producto.costo) producto.costo = null;
  
  inventario.push(producto);
} else {

 // 🧠 asegurar stock válido
if (typeof producto.stock !== "number") {
  producto.stock = 0;
}

// 📉 descontar inventario correctamente
if (d.unidad === "kg") {
  producto.stock -= d.cantidad; // stock en kg
} else {
  producto.stock -= d.cantidad; // piezas igual
}

// 🚫 evitar negativos
if (producto.stock < 0) {
  producto.stock = 0;
}

// 💰 SOLO actualizar precio de venta, NO costo


  // 🧠 agregar alias inteligente
  const aliasNormal = normalizar(nombre);

  const existeAlias = (producto.alias || []).some(a =>
    normalizar(a) === aliasNormal
  );

  if (!existeAlias) {
    producto.alias.push(nombre);
  }
}

// 🔒 limpiar datos corruptos antes de guardar
inventario = inventario.map(p => ({
  nombre: p.nombre,
  stock: Number(p.stock || 0),
  costo: Number(p.costo || 0),
  precio: Number(p.precio || 0),
  unidad: p.unidad || "pieza",
  alias: p.alias || []
}));

localStorage.setItem("inventarioPOS", JSON.stringify(inventario));
  
const unidades = d.cantidad;

let gananciaEstimada = 0;

// 🧠 solo calcular si hay costo real válido
if (costoBase > 0) {

  if (d.unidad === "kg") {
    gananciaEstimada = subtotal - (costoBase * d.cantidad);
  } else {
    gananciaEstimada = subtotal - (costoBase * d.cantidad);
  }

}
  

ventaActual.push({
  id: Date.now(),
  usuario: usuarioActual,
  texto: d.texto,
  cantidad: d.cantidad,
  unidad: "pieza",
  precio: d.precio,
  multi: d.multi,
  subtotal,
  costoUnitario: costoBase,
  ganancia: gananciaEstimada
});

  totalVenta += subtotal;

  actualizarTotalVenta();

  input.value = "";
  preview.textContent = "";

  renderPreVenta();

  navigator.vibrate?.(30);
}


// ENTER + BOTÓN
input.addEventListener("keydown", e => {
  if (e.key === "Enter") agregar();
});

document.getElementById("btnAdd").onclick = agregar;


// ======================================
// 🧾 PREVENTA
// ======================================

function renderPreVenta() {

  preVenta.innerHTML = "";

  ventaActual.forEach((item, i) => {

    const div = document.createElement("div");

    div.className = "flex justify-between bg-gray-100 p-2 rounded items-center";

    div.innerHTML = `
     <span>${escaparHTML(item.texto)}</span>

      <div class="flex gap-3 items-center">
        <span>$${item.subtotal}</span>

        <button class="text-red-500">
          <i class="bi bi-trash"></i>
        </button>
      </div>
    `;

    div.querySelector("button").onclick = () => {
      totalVenta -= item.subtotal;
      ventaActual.splice(i, 1);
      actualizarTotalVenta();
      renderPreVenta();
    };

    preVenta.appendChild(div);
  });
}


// ======================================
// 💰 FINALIZAR VENTA
// ======================================

document.getElementById("btnFinalizar").onclick = () => {

  actualizarGanancias();

  if (!ventaActual.length) return;

  const venta = {
    items: ventaActual,
    total: totalVenta,
    usuario: usuarioActual,
    fecha: new Date().toLocaleString()
  };

  data[usuarioActual].ventas.push(venta);

  localStorage.setItem("dataPOS", JSON.stringify(data));

  renderVenta(venta);

  reset();
  modal.close();
actualizarTotalDia();
  
};


// ======================================
// 📊 TOTALES
// ======================================

function actualizarTotalVenta() {
  totalVentaSpan.textContent = "$" + totalVenta;
}

function actualizarTotalDia() {

  const ventas = data[usuarioActual]?.ventas || [];

  const total = ventas.reduce((a, v) => a + v.total, 0);

  totalDiaSpan.textContent = "$" + total;
}


// ======================================
// 🔄 RESET
// ======================================

function reset() {
  ventaActual = [];
  totalVenta = 0;
  actualizarTotalVenta();
  renderPreVenta();
}


// ======================================
// 🧾 RENDER VENTA (CARD)
// ======================================

function renderVenta(v) {

  const div = document.createElement("div");
  div.className = "bg-yellow-100 p-4 rounded";

  const itemsHTML = v.items.map(it => `
    <div class="flex justify-between text-sm border-b py-1">
      <span>${escaparHTML(it.texto)}</span>
      <span>$${it.subtotal}</span>
    </div>
  `).join("");

  div.innerHTML = `
    <div class="font-bold text-gray-700 mb-1">🧾 ${v.usuario}</div>
    <div class="text-xs text-gray-500 mb-2">${v.fecha}</div>

    <div class="bg-white rounded p-2 mb-2">
      ${itemsHTML}
    </div>

    <div class="font-bold text-right text-lg">
      Total: $${v.total}
    </div>

    <div class="flex gap-3 mt-2">
      <button class="bg-blue-500 text-white px-3 py-1 rounded">
        📄 Ticket
      </button>

      <button class="text-red-500 ml-auto">
        <i class="bi bi-trash"></i>
      </button>
    </div>
  `;

  // 📄 Descargar ticket imagen
  div.querySelector(".bg-blue-500").onclick = () => {

    html2canvas(div, { scale: 2, backgroundColor: "#fff" })
      .then(canvas => {

        const link = document.createElement("a");
        link.href = canvas.toDataURL("image/png");
        link.download = `ticket-${v.usuario}-${Date.now()}.png`;
        link.click();
      });
  };

  // 🗑 eliminar venta
  div.querySelector(".text-red-500").onclick = () => {

    const arr = data[usuarioActual].ventas;
    const i = arr.indexOf(v);

    if (i !== -1) {
      arr.splice(i, 1);
      localStorage.setItem("dataPOS", JSON.stringify(data));
      renderHistorial();
      actualizarTotalDia();
    }
  };

  listaVentas.prepend(div);
}


// ======================================
// 📚 HISTORIAL
// ======================================

function renderHistorial() {

  listaVentas.innerHTML = "";

  const ventas = data[usuarioActual]?.ventas || [];

  ventas.forEach(renderVenta);

actualizarTotalDia();
  
}


// ======================================
// 🆕 NUEVA VENTA
// ======================================

document.getElementById("btnNuevaVenta").onclick = () => {
  reset();
  modal.showModal();
};


// ======================================
// ❌ CERRAR MODAL
// ======================================

document.getElementById("btnCerrar").onclick = () => {
  modal.close();
};


// ======================================
// 📄 PDF BONITO
// ======================================

document.getElementById("btnPDF").onclick = () => {

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const ventas = data[usuarioActual]?.ventas || [];

  let y = 10;
  let total = 0;

  doc.setFontSize(18);
  doc.text("REPORTE DE VENTAS", 10, y);
  y += 8;

  doc.setFontSize(12);
  doc.text(`Usuario: ${usuarioActual}`, 10, y);
  y += 8;

  doc.line(10, y, 200, y);
  y += 8;

  ventas.forEach((v, i) => {

    doc.setFontSize(12);
    doc.text(`Venta #${i + 1}`, 10, y);
    y += 6;

    doc.setFontSize(10);

    v.items.forEach(it => {
      doc.text(`• ${it.texto}   $${it.subtotal}`, 10, y);
      y += 5;
    });

    doc.setFontSize(11);
    doc.text(`Total: $${v.total}`, 10, y);
    y += 8;

    doc.line(10, y, 200, y);
    y += 6;

    total += v.total;

    if (y > 270) {
      doc.addPage();
      y = 10;
    }
  });

  doc.setFontSize(14);
  doc.text(`TOTAL DEL DÍA: $${total}`, 10, y + 10);

  doc.save(`reporte-${usuarioActual}.pdf`);
};



document.getElementById("btnLogout").onclick = () => {

  localStorage.removeItem("usuarioActivo");

  usuarioActual = null;

  location.reload();
};






document.getElementById("btnPDFGlobal").onclick = () => {

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  let y = 10;
  let totalGlobal = 0;

  doc.setFontSize(18);
  doc.text("REPORTE GLOBAL DE VENTAS", 10, y);
  y += 10;

  // recorrer todos los usuarios
  Object.keys(data).forEach(usuario => {

    const ventas = data[usuario].ventas || [];

    if (!ventas.length) return;

    doc.setFontSize(14);
    doc.text(`Usuario: ${usuario}`, 10, y);
    y += 8;

    ventas.forEach((v, i) => {

      doc.setFontSize(10);
      doc.text(`Venta ${i + 1}`, 10, y);
      y += 6;

      v.items.forEach(it => {
        doc.text(`- ${it.texto} = $${it.subtotal}`, 10, y);
        y += 5;
      });

      doc.setFontSize(11);
      doc.text(`Total: $${v.total}`, 10, y);
      y += 8;

      totalGlobal += v.total;

      if (y > 270) {
        doc.addPage();
        y = 10;
      }
    });

    y += 5;
  });

  doc.setFontSize(14);
  doc.text(`TOTAL GLOBAL: $${totalGlobal}`, 10, y + 10);

  doc.save("reporte-global.pdf");
};



if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js")
    .then(() => console.log("Service Worker activo"))
    .catch(err => console.log("Error SW:", err));
}






const pinInput = document.getElementById("pinInput");
const togglePin = document.getElementById("togglePin");

let visible = false;

togglePin.onclick = () => {

  visible = !visible;

  pinInput.type = visible ? "text" : "password";

  togglePin.innerHTML = visible
    ? '<i class="bi bi-eye-slash"></i>'
    : '<i class="bi bi-eye"></i>';
};



let deferredPrompt;

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;

  document.getElementById("btnInstall").style.display = "block";
});




window.addEventListener("appinstalled", () => {
  console.log("PWA instalada");

  document.getElementById("btnInstall").style.display = "none";
});



document.getElementById("btnInstall").onclick = async () => {

  if (!deferredPrompt) return;

  deferredPrompt.prompt();

  const result = await deferredPrompt.userChoice;

  if (result.outcome === "accepted") {
    console.log("Instalada");
  }

  deferredPrompt = null;
};


function checkInstallStatus() {

  const isStandalone = window.matchMedia("(display-mode: standalone)").matches
    || window.navigator.standalone === true;

  if (isStandalone) {
    document.getElementById("btnInstall").style.display = "none";
  }
}


function escaparHTML(texto) {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function actualizarGanancias() {

  if (usuarioActual !== "ADMIN") return;

  const ventas = data[usuarioActual]?.ventas || [];

  let ingresos = 0;
  let ganancia = 0;

  ventas.forEach(v => {

    ingresos += v.total;

    v.items.forEach(i => {
      if (i.ganancia) {
        ganancia += i.ganancia;
      }
    });

  });

  const ventasCount = ventas.length;

  const elIngresos = document.getElementById("gananciaIngresos");
  const elGanancia = document.getElementById("gananciaTotal");
  const elVentas = document.getElementById("gananciaVentas");

  if (elIngresos) elIngresos.textContent = `$${ingresos}`;
  if (elGanancia) elGanancia.textContent = `$${ganancia}`;
  if (elVentas) elVentas.textContent = ventasCount;
}


