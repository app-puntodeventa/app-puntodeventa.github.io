// ======================================
// 🔐 CONFIG / ESTADO GLOBAL
// ======================================

let usuarioActual = null;
let ventaActual = [];
let totalVenta = 0;

let data = JSON.parse(localStorage.getItem("dataPOS")) || {};
let inventario = JSON.parse(localStorage.getItem("inventarioPOS")) || [];

// ======================================
// 🔧 FUNCIONES UTILIDAD
// ======================================

/**
 * Normaliza un producto asegurando tipos de datos correctos
 */
function normalizarProducto(p) {
  return {
    id: p.id || Date.now(),
    nombre: (p.nombre || "").toLowerCase().trim(),
    stock: Number(p.stock ?? p.cantidad ?? 0),
    costo: p.costo !== null ? Number(p.costo) : null,
    precioVenta: p.precioVenta ?? p.precio ? Number(p.precioVenta ?? p.precio) : 0,
    unidad: p.unidad || "pieza",
    alias: Array.isArray(p.alias) ? p.alias : []
  };
}

/**
 * Normaliza texto para búsquedas
 */
function normalizar(texto) {
  return (texto || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s]/g, "");
}

/**
 * Busca un producto en inventario por nombre o alias
 */
function buscarProducto(nombre) {
  if (!nombre || !nombre.trim()) return null;

  const n = normalizar(nombre);

  return inventario.find(p => {
    const nombreBase = normalizar(p.nombre);

    // Coincidencia fuerte por nombre
    const coincideNombre = n.includes(nombreBase) || nombreBase.includes(n);

    // Coincidencia por alias
    const coincideAlias = (p.alias || []).some(a => {
      const al = normalizar(a);
      return n.includes(al) || al.includes(n);
    });

    return coincideNombre || coincideAlias;
  });
}

/**
 * Escapa caracteres HTML para prevenir XSS
 */
function escaparHTML(texto) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  };
  return (texto || "").replace(/[&<>"']/g, char => map[char]);
}

// ======================================
// 🔐 PINs
// ======================================

const VALID_PINS = {
  "4829": "ADMIN",
  "7391": "TURNO 1",
  "6158": "TURNO 2"
};

// ======================================
// 🎯 ELEMENTOS DOM
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
  const pin = document.getElementById("pinInput").value.trim();

  if (!VALID_PINS[pin]) {
    alert("PIN incorrecto");
    return;
  }

  const nombreUsuario = VALID_PINS[pin];
  usuarioActual = nombreUsuario;

  if (!data[nombreUsuario]) {
    data[nombreUsuario] = { ventas: [] };
  }

  localStorage.setItem("usuarioActivo", nombreUsuario);
  document.getElementById("loginScreen").style.display = "none";

  init();
};

// ======================================
// 🚀 INICIALIZACIÓN
// ======================================

function init() {
  const user = localStorage.getItem("usuarioActivo");

  if (!user) {
    document.getElementById("loginScreen").style.display = "flex";
    return;
  }

  usuarioActual = user;
  document.getElementById("loginScreen").style.display = "none";
  document.getElementById("userLabel").textContent = usuarioActual;

  // Mostrar botones solo si es ADMIN
  const btnGlobal = document.getElementById("btnPDFGlobal");
  const panel = document.getElementById("panelGanancias");

  if (btnGlobal) {
    btnGlobal.style.display = usuarioActual === "ADMIN" ? "block" : "none";
  }
  if (panel) {
    panel.style.display = usuarioActual === "ADMIN" ? "block" : "none";
  }

  renderProductosRapidos();
  checkInstallStatus();
  renderHistorial();
  actualizarTotalDia();
  actualizarSugerencias();
  actualizarGanancias();
}

/**
 * Actualiza la lista de sugerencias del datalist
 */
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

/**
 * Parsea texto de entrada para extraer cantidad, precio y unidad
 */
function parsear(texto) {
  const t = (texto || "").toLowerCase();
  const nums = t.match(/\d+(\.\d+)?/g)?.map(Number) || [];

  let cantidad = 1;
  let precioUnitario = 0;
  let unidad = "pieza";
  let modoLote = false;

  // Detectar unidad
  if (t.includes("kg") || t.includes("kilo")) {
    unidad = "kg";
  } else if (t.includes("pieza") || t.includes("pza")) {
    unidad = "pieza";
  }

  // Detectar patrones de venta
  const esMultiplicacion = t.includes(" x ") || t.includes("cada") || t.includes("c/u");
  const esPrecioTotal = t.includes("por") || t.includes("total") || t.includes("son");

  if (nums.length === 1) {
    precioUnitario = nums[0];
  } else if (nums.length >= 2) {
    cantidad = nums[0];
    precioUnitario = nums[1];
    modoLote = esMultiplicacion ? true : !esPrecioTotal;
  }

  const subtotal = modoLote ? cantidad * precioUnitario : precioUnitario;

  return {
    texto,
    cantidad,
    precioUnitario,
    unidad,
    subtotal,
    modoLote
  };
}

/**
 * Extrae el nombre del producto del texto ingresado
 */
function extraerNombre(texto) {
  return (texto || "")
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
  const nombreDetectado = extraerNombre(v);
  const productoEncontrado = buscarProducto(nombreDetectado);

  // Preview inteligente
  if (productoEncontrado) {
    preview.textContent = `📦 ${productoEncontrado.nombre} | 💰 Venta: $${productoEncontrado.precioVenta || 0}`;
  } else if (d.modoLote) {
    preview.textContent = `${d.cantidad} x ${d.precioUnitario} = $${d.cantidad * d.precioUnitario}`;
  } else {
    preview.textContent = "";
  }

  // Filtrar sugerencias inteligentes
  const datalist = document.getElementById("sugerencias");
  datalist.innerHTML = "";

  const n = normalizar(v);
  const filtrados = inventario
    .map(p => {
      let score = 0;
      const nombre = normalizar(p.nombre);

      if (nombre.includes(n)) score += 3;
      if (n.includes(nombre)) score += 2;

      (p.alias || []).forEach(a => {
        const al = normalizar(a);
        if (al.includes(n) || n.includes(al)) score += 1;
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
  const nombre = extraerNombre(d.texto);
  let producto = buscarProducto(nombre);

  const subtotal = d.modoLote ? d.cantidad * d.precioUnitario : d.precioUnitario;

  // Si no existe, crear automáticamente
  if (!producto) {
    producto = {
      id: Date.now(),
      nombre: nombre.trim(),
      stock: 0,
      unidad: d.unidad,
      costo: null,
      precioVenta: d.precioUnitario,
      alias: [nombre],
      creadoDesdeVenta: true
    };
    inventario.push(producto);
  } else {
    // Descontar stock solo si existe
    if (typeof producto.stock === "number") {
      producto.stock = Math.max(0, producto.stock - d.cantidad);
    }

    // Confirmar actualización de precio si es diferente
    if (producto.precioVenta && producto.precioVenta !== d.precioUnitario) {
      const confirmar = confirm(
        `¿Actualizar precio de ${producto.nombre} de $${producto.precioVenta} a $${d.precioUnitario}?`
      );
      if (confirmar) {
        producto.precioVenta = d.precioUnitario;
      }
    }

    // Agregar alias si no existe
    const aliasNormal = normalizar(nombre);
    if (!(producto.alias || []).some(a => normalizar(a) === aliasNormal)) {
      (producto.alias || []).push(nombre);
    }
  }

  // Limpiar datos antes de guardar
  inventario = inventario.map(p => normalizarProducto(p));
  localStorage.setItem("inventarioPOS", JSON.stringify(inventario));

  // Calcular ganancia solo si hay costo válido
  let gananciaEstimada = 0;
  if (producto.costo && producto.costo > 0) {
    gananciaEstimada = subtotal - (producto.costo * d.cantidad);
  }

  // Agregar a venta actual
  ventaActual.push({
    id: Date.now(),
    usuario: usuarioActual,
    texto: d.texto,
    cantidad: d.cantidad,
    unidad: d.unidad,
    precio: d.precioUnitario,
    multi: d.modoLote,
    subtotal,
    costoUnitario: producto.costo || 0,
    ganancia: gananciaEstimada
  });

  totalVenta += subtotal;
  actualizarTotalVenta();

  input.value = "";
  preview.textContent = "";
  renderPreVenta();
  renderProductosRapidos();

  navigator.vibrate?.(30);
}

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
  actualizarGanancias();
};

// ======================================
// 📊 TOTALES
// ======================================

function actualizarTotalVenta() {
  totalVentaSpan.textContent = "$" + totalVenta.toFixed(2);
}

function actualizarTotalDia() {
  const ventas = data[usuarioActual]?.ventas || [];
  const total = ventas.reduce((acc, v) => acc + v.total, 0);
  totalDiaSpan.textContent = "$" + total.toFixed(2);
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

  const itemsHTML = v.items
    .map(
      it => `
    <div class="flex justify-between text-sm border-b py-1">
      <span>${escaparHTML(it.texto)}</span>
      <span>$${it.subtotal}</span>
    </div>
  `
    )
    .join("");

  div.innerHTML = `
    <div class="font-bold text-gray-700 mb-1">🧾 ${escaparHTML(v.usuario)}</div>
    <div class="text-xs text-gray-500 mb-2">${escaparHTML(v.fecha)}</div>
    <div class="bg-white rounded p-2 mb-2">${itemsHTML}</div>
    <div class="font-bold text-right text-lg">Total: $${v.total.toFixed(2)}</div>
    <div class="flex gap-3 mt-2">
      <button class="bg-blue-500 text-white px-3 py-1 rounded">📄 Ticket</button>
      <button class="text-red-500 ml-auto"><i class="bi bi-trash"></i></button>
    </div>
  `;

  // Descargar ticket como imagen
  div.querySelector(".bg-blue-500").onclick = () => {
    html2canvas(div, { scale: 2, backgroundColor: "#fff" }).then(canvas => {
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `ticket-${usuarioActual}-${Date.now()}.png`;
      link.click();
    });
  };

  // Eliminar venta
  div.querySelector(".text-red-500").onclick = () => {
    const arr = data[usuarioActual]?.ventas || [];
    const idx = arr.indexOf(v);
    if (idx !== -1) {
      arr.splice(idx, 1);
      localStorage.setItem("dataPOS", JSON.stringify(data));
      renderHistorial();
      actualizarTotalDia();
      actualizarGanancias();
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
// 📄 PDF REPORTES
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
      doc.text(`• ${it.texto} = $${it.subtotal.toFixed(2)}`, 10, y);
      y += 5;
    });

    doc.setFontSize(11);
    doc.text(`Total: $${v.total.toFixed(2)}`, 10, y);
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
  doc.text(`TOTAL DEL DÍA: $${total.toFixed(2)}`, 10, y + 10);

  doc.save(`reporte-${usuarioActual}.pdf`);
};

document.getElementById("btnPDFGlobal").onclick = () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  let y = 10;
  let totalGlobal = 0;

  doc.setFontSize(18);
  doc.text("REPORTE GLOBAL DE VENTAS", 10, y);
  y += 10;

  Object.keys(data).forEach(usuario => {
    const ventas = data[usuario]?.ventas || [];
    if (!ventas.length) return;

    doc.setFontSize(14);
    doc.text(`Usuario: ${usuario}`, 10, y);
    y += 8;

    ventas.forEach((v, i) => {
      doc.setFontSize(10);
      doc.text(`Venta ${i + 1}`, 10, y);
      y += 6;

      v.items.forEach(it => {
        doc.text(`- ${it.texto} = $${it.subtotal.toFixed(2)}`, 10, y);
        y += 5;
      });

      doc.setFontSize(11);
      doc.text(`Total: $${v.total.toFixed(2)}`, 10, y);
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
  doc.text(`TOTAL GLOBAL: $${totalGlobal.toFixed(2)}`, 10, y + 10);

  doc.save("reporte-global.pdf");
};

// ======================================
// 👤 LOGOUT
// ======================================

document.getElementById("btnLogout").onclick = () => {
  localStorage.removeItem("usuarioActivo");
  usuarioActual = null;
  location.reload();
};

// ======================================
// 💰 GANANCIAS (ADMIN)
// ======================================

function actualizarGanancias() {
  if (usuarioActual !== "ADMIN") return;

  const ventas = data[usuarioActual]?.ventas || [];

  let ingresos = 0;
  let ganancia = 0;

  ventas.forEach(v => {
    ingresos += v.total;
    v.items.forEach(i => {
      if (i.ganancia && i.ganancia > 0) {
        ganancia += i.ganancia;
      }
    });
  });

  const ventasCount = ventas.length;

  const elIngresos = document.getElementById("gananciaIngresos");
  const elGanancia = document.getElementById("gananciaTotal");
  const elVentas = document.getElementById("gananciaVentas");

  if (elIngresos) elIngresos.textContent = `$${ingresos.toFixed(2)}`;
  if (elGanancia) elGanancia.textContent = `$${ganancia.toFixed(2)}`;
  if (elVentas) elVentas.textContent = ventasCount;
}

// ======================================
// ⚡ PRODUCTOS RÁPIDOS
// ======================================

function renderProductosRapidos() {
  const panel = document.getElementById("panelProductos");
  if (!panel) return;

  panel.innerHTML = "";

  inventario.slice(0, 20).forEach(p => {
    const btn = document.createElement("button");
    btn.className = "bg-white border rounded p-2 text-left shadow hover:bg-gray-50";

    btn.innerHTML = `
      <div class="font-bold">${escaparHTML(p.nombre)}</div>
      <div class="text-sm text-gray-500">$${(p.precioVenta || 0).toFixed(2)}</div>
    `;

    btn.onclick = () => agregarRapido(p);
    panel.appendChild(btn);
  });
}

function agregarRapido(producto) {
  const cantidad = 1;
  const precio = producto.precioVenta || 0;
  const subtotal = cantidad * precio;

  // Descontar stock
  if (typeof producto.stock === "number") {
    producto.stock = Math.max(0, producto.stock - 1);
  }

  localStorage.setItem("inventarioPOS", JSON.stringify(inventario));

  ventaActual.push({
    id: Date.now(),
    usuario: usuarioActual,
    texto: `${cantidad} ${producto.unidad} ${producto.nombre}`,
    cantidad,
    unidad: producto.unidad,
    precio,
    multi: true,
    subtotal,
    costoUnitario: producto.costo || 0,
    ganancia: producto.costo && producto.costo > 0 ? subtotal - producto.costo : 0
  });

  totalVenta += subtotal;
  actualizarTotalVenta();
  renderPreVenta();
  renderProductosRapidos();

  navigator.vibrate?.(30);
}

// ======================================
// 📱 PWA
// ======================================

if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("./sw.js")
    .then(() => console.log("✓ Service Worker activo"))
    .catch(err => console.log("✗ Error SW:", err));
}

let deferredPrompt;

window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault();
  deferredPrompt = e;
  document.getElementById("btnInstall").style.display = "block";
});

window.addEventListener("appinstalled", () => {
  console.log("✓ PWA instalada");
  document.getElementById("btnInstall").style.display = "none";
});

document.getElementById("btnInstall").onclick = async () => {
  if (!deferredPrompt) return;

  deferredPrompt.prompt();
  const result = await deferredPrompt.userChoice;

  if (result.outcome === "accepted") {
    console.log("✓ Instalada correctamente");
  }

  deferredPrompt = null;
};

function checkInstallStatus() {
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;

  if (isStandalone) {
    document.getElementById("btnInstall").style.display = "none";
  }
}

// ======================================
// 🔐 PIN VISIBILITY
// ======================================

const pinInput = document.getElementById("pinInput");
const togglePin = document.getElementById("togglePin");

let visible = false;

if (togglePin) {
  togglePin.onclick = () => {
    visible = !visible;
    pinInput.type = visible ? "text" : "password";
    togglePin.innerHTML = visible ? '<i class="bi bi-eye-slash"></i>' : '<i class="bi bi-eye"></i>';
  };
}
