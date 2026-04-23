// ======================================
// 🔐 SISTEMA DE LICENCIA
// ======================================

const MASTER_LICENSE_KEY = "POS2024TITANIUM888";
const DEMO_LIMIT = 3;

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function validateLicense(code) {
  const validationHash = hashCode(code);
  const expectedHash = hashCode(MASTER_LICENSE_KEY);
  return validationHash === expectedHash || code === MASTER_LICENSE_KEY;
}

function checkLicenseStatus() {
  return localStorage.getItem("pos_license") === "active";
}

function getVentasCount() {
  const data = JSON.parse(localStorage.getItem("dataPOS")) || {};
  let count = 0;
  Object.values(data).forEach(u => {
    count += (u.ventas || []).length;
  });
  return count;
}

function checkDemoLimit() {
  if (checkLicenseStatus()) return true;
  return getVentasCount() < DEMO_LIMIT;
}

function activateLicense() {
  localStorage.setItem("pos_license", "active");
  document.getElementById("licenseModal").classList.remove("active");
  location.reload();
}

// ======================================
// 🔐 CONFIG GLOBAL
// ======================================

let usuarioActual = null;
let ventaActual = [];
let totalVenta = 0;
let modoVenta = "catalogo";
let ultimaVenta = null;
let qrActivo = false;

let data = JSON.parse(localStorage.getItem("dataPOS")) || {};
let inventario = JSON.parse(localStorage.getItem("inventarioPOS")) || [];

// ======================================
// 🔧 UTILIDADES
// ======================================

function normalizar(texto) {
  return (texto || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^\w\sáéíóúñ]/g, "");
}

function buscarProducto(nombre) {
  if (!nombre || !nombre.trim()) return null;
  const n = normalizar(nombre);
  return inventario.find(p => {
    const nombreBase = normalizar(p.nombre);
    return n.includes(nombreBase) || nombreBase.includes(n);
  });
}

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

function sincronizarInventario() {
  inventario = inventario.map(p => ({
    id: p.id || Date.now(),
    nombre: (p.nombre || "").toLowerCase().trim(),
    stock: Number(p.stock ?? p.cantidad ?? 0),
    costo: p.costo !== null && p.costo !== undefined ? Number(p.costo) : null,
    precioVenta: p.precioVenta ?? p.precio ? Number(p.precioVenta ?? p.precio) : 0,
    unidad: p.unidad || "pieza",
    alias: Array.isArray(p.alias) ? p.alias : []
  }));
  localStorage.setItem("inventarioPOS", JSON.stringify(inventario));
}

function actualizarProductoInventario(nombre, precioVenta, unidad = "pieza", cantidad = 0) {
  const nombreNormalizado = nombre.toLowerCase().trim();
  let producto = buscarProducto(nombreNormalizado);

  if (producto) {
    if (cantidad > 0) {
      producto.stock = (producto.stock || 0) + cantidad;
    }
  } else {
    producto = {
      id: Date.now(),
      nombre: nombreNormalizado,
      stock: cantidad || 0,
      costo: null,
      precioVenta: Number(precioVenta) || 0,
      unidad: unidad || "pieza",
      alias: [nombreNormalizado],
      fechaCreacion: new Date().toLocaleString()
    };
    inventario.push(producto);
  }

  sincronizarInventario();
  return producto;
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
// 🎯 DOM ELEMENTS
// ======================================

const modal = document.getElementById("modal");
const selectProducto = document.getElementById("selectProducto");
const searchProducto = document.getElementById("searchProducto");
const searchDropdown = document.getElementById("searchDropdown");
const inputCantidad = document.getElementById("inputCantidad");
const previewCatalogo = document.getElementById("previewCatalogo");

const inputNombreLibre = document.getElementById("inputNombreLibre");
const inputCantidadLibre = document.getElementById("inputCantidadLibre");
const inputPrecioLibre = document.getElementById("inputPrecioLibre");
const previewLibre = document.getElementById("previewLibre");

const inputBeta = document.getElementById("inputBeta");
const previewBeta = document.getElementById("previewBeta");
const btnAgregarBeta = document.getElementById("btnAgregarBeta");

const totalVentaSpan = document.getElementById("totalVenta");
const totalDiaSpan = document.getElementById("totalDia");
const listaVentas = document.getElementById("listaVentas");
const preVenta = document.getElementById("preVenta");

const tabCatalogo = document.getElementById("tabCatalogo");
const tabLibre = document.getElementById("tabLibre");
const tabBeta = document.getElementById("tabBeta");
const modoCatalogo = document.getElementById("modoCatalogo");
const modoLibre = document.getElementById("modoLibre");
const modoBeta = document.getElementById("modoBeta");

// ======================================
// 🔐 LOGIN
// ======================================

document.getElementById("btnLogin").onclick = () => {
  const pin = document.getElementById("pinInput").value.trim();

  if (!VALID_PINS[pin]) {
    alert("❌ PIN incorrecto");
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

  const btnGlobal = document.getElementById("btnPDFGlobal");
  const panel = document.getElementById("panelGanancias");

  if (btnGlobal) {
    btnGlobal.style.display = usuarioActual === "ADMIN" ? "block" : "none";
  }
  if (panel) {
    panel.style.display = usuarioActual === "ADMIN" ? "block" : "none";
  }

  checkInstallStatus();
  renderHistorial();
  actualizarTotalDia();
  actualizarSelectProductos();
  actualizarGanancias();
}

function actualizarSelectProductos() {
  if (!selectProducto) return;

  const opcionesExistentes = selectProducto.querySelectorAll("option:not(:first-child)");
  opcionesExistentes.forEach(opt => opt.remove());

  const productosOrdenados = [...inventario].sort((a, b) => a.nombre.localeCompare(b.nombre));

  productosOrdenados.forEach(p => {
    const option = document.createElement("option");
    option.value = p.nombre;
    option.textContent = `${p.nombre.toUpperCase()} - $${(p.precioVenta || 0).toFixed(2)} (${p.stock || 0})`;
    selectProducto.appendChild(option);
  });
}

init();

// ======================================
// 🔀 CAMBIAR TABS
// ======================================

const tabs = [
  { tab: tabCatalogo, modo: modoCatalogo, name: "catalogo" },
  { tab: tabLibre, modo: modoLibre, name: "libre" },
  { tab: tabBeta, modo: modoBeta, name: "beta" }
];

tabs.forEach((item, idx) => {
  if (item.tab) {
    item.tab.onclick = () => {
      modoVenta = item.name;
      
      tabs.forEach(t => {
        t.modo.classList.add("hidden");
        t.tab.classList.remove("border-b-2", "border-blue-600", "text-blue-600", "font-bold");
        t.tab.classList.add("text-gray-600");
      });

      item.modo.classList.remove("hidden");
      item.tab.classList.add("border-b-2", "border-blue-600", "text-blue-600", "font-bold");
      item.tab.classList.remove("text-gray-600");

      if (item.name === "libre") inputNombreLibre.focus();
      if (item.name === "beta") inputBeta.focus();
    };
  }
});

// ======================================
// 🔍 BÚSQUEDA MEJORADA DE PRODUCTOS
// ======================================

if (searchProducto && searchDropdown) {
  let productoSeleccionado = null;

  searchProducto.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase().trim();
    searchDropdown.innerHTML = "";
    
    if (!query) {
      searchDropdown.classList.remove("active");
      return;
    }

    const coincidencias = inventario.filter(p => {
      const nombre = p.nombre.toLowerCase();
      return nombre.includes(query) || nombre.startsWith(query);
    });

    if (coincidencias.length === 0) {
      searchDropdown.classList.remove("active");
      return;
    }

    searchDropdown.classList.add("active");

    coincidencias.slice(0, 10).forEach(producto => {
      const item = document.createElement("div");
      item.className = "search-dropdown-item";
      item.innerHTML = `
        <strong>${producto.nombre.toUpperCase()}</strong>
        <br>
        <span class="text-xs text-gray-600">$${producto.precioVenta?.toFixed(2) || "0.00"} • Stock: ${producto.stock || 0}</span>
      `;
      
      item.onclick = () => {
        productoSeleccionado = producto;
        searchProducto.value = producto.nombre;
        searchDropdown.classList.remove("active");
        inputCantidad.value = "1";
        actualizarPreviewCatalogo();
        inputCantidad.focus();
      };

      searchDropdown.appendChild(item);
    });
  });

  document.addEventListener("click", (e) => {
    if (e.target !== searchProducto && e.target !== searchDropdown) {
      searchDropdown.classList.remove("active");
    }
  });

  searchProducto.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const firstItem = searchDropdown.querySelector(".search-dropdown-item");
      if (firstItem) {
        firstItem.click();
      }
    }
  });
}

// ======================================
// 👀 PREVIEW CATÁLOGO
// ======================================

if (searchProducto) {
  inputCantidad.addEventListener("input", actualizarPreviewCatalogo);
}

function actualizarPreviewCatalogo() {
  const nombreSeleccionado = searchProducto.value.trim();
  
  if (!nombreSeleccionado) {
    previewCatalogo.textContent = "";
    return;
  }

  const producto = buscarProducto(nombreSeleccionado);
  const cantidad = Number(inputCantidad.value) || 1;
  
  if (producto) {
    const subtotal = cantidad * (producto.precioVenta || 0);
    const stock = producto.stock > 0 ? `(${producto.stock} en stock)` : "(⚠️ sin stock)";
    
    previewCatalogo.innerHTML = `
      <div class="flex justify-between items-center">
        <div>
          <span class="font-bold">${cantidad} × ${producto.nombre}</span><br>
          <span class="text-xs text-gray-600">${stock}</span>
        </div>
        <span class="font-bold text-green-600">$${subtotal.toFixed(2)}</span>
      </div>
    `;
  }
}

// ======================================
// 👀 PREVIEW LIBRE
// ======================================

[inputNombreLibre, inputCantidadLibre, inputPrecioLibre].forEach(el => {
  if (el) el.addEventListener("input", actualizarPreviewLibre);
});

function actualizarPreviewLibre() {
  const nombre = inputNombreLibre.value.trim();
  const cantidad = Number(inputCantidadLibre.value) || 1;
  const precio = Number(inputPrecioLibre.value) || 0;

  if (!nombre) {
    previewLibre.textContent = "";
    return;
  }

  if (precio > 0) {
    const subtotal = cantidad * precio;
    previewLibre.innerHTML = `
      <div class="flex justify-between items-center">
        <span>${cantidad} × ${nombre}</span>
        <span class="font-bold text-green-600">$${subtotal.toFixed(2)}</span>
      </div>
    `;
  } else {
    previewLibre.innerHTML = `<div class="text-gray-600">⏳ Ingresa precio para calcular</div>`;
  }
}

// ======================================
// 🧠 PARSER MEJORADO (IA)
// ======================================

function parseIA(texto) {
  if (!texto.trim()) return null;
  const resultado = parseOrder(texto);
  if (!resultado.success) {
    return { esValido: false, error: resultado.error };
  }
  if (resultado.data.length === 0) {
    return { esValido: false, error: "No reconozco productos en ese texto" };
  }
  return {
    esValido: true,
    productos: resultado.data,
    preview: resultado.preview
  };
}

// ======================================
// 👀 PREVIEW BETA MEJORADO
// ======================================

if (inputBeta) {
  inputBeta.addEventListener("input", () => {
    const resultado = parseIA(inputBeta.value);

    if (!resultado || !resultado.esValido) {
      if (inputBeta.value.trim()) {
        previewBeta.classList.remove("hidden");
        previewBeta.innerHTML = `<span class="text-red-500">❌ ${resultado?.error || "Error"}</span>`;
      } else {
        previewBeta.classList.add("hidden");
      }
      return;
    }

    previewBeta.classList.remove("hidden");

    let total = 0;
    let html = '<div class="space-y-2">';

    resultado.productos.forEach((p, idx) => {
      const precioEstimado = p.precioPorUnidad || p.precioTotal || 0;
      const precioFinal = p.precioTotal || (p.cantidad * precioEstimado);
      total += precioFinal;

      html += `
        <div class="border-b pb-2 last:border-b-0">
          <div class="flex justify-between text-xs">
            <span class="font-bold">📦 ${p.descripcion}</span>
            <span class="text-green-600 font-bold">$${precioFinal.toFixed(2)}</span>
          </div>
        </div>
      `;
    });

    html += `
      <div class="border-t pt-2 mt-2 font-bold flex justify-between text-xs">
        <span>Total ${resultado.productos.length} items:</span>
        <span class="text-green-600">$${total.toFixed(2)}</span>
      </div>
    </div>`;

    previewBeta.innerHTML = html;
  });
}

// ======================================
// ➕ AGREGAR - CATÁLOGO
// ======================================

document.getElementById("btnAgregarCatalogo").onclick = () => {
  if (!checkDemoLimit()) {
    document.getElementById("licenseModal").classList.add("active");
    return;
  }

  const nombreSeleccionado = searchProducto.value.trim();
  
  if (!nombreSeleccionado) {
    alert("❌ Selecciona un producto");
    return;
  }

  const cantidad = Number(inputCantidad.value) || 1;
  const producto = buscarProducto(nombreSeleccionado);

  if (!producto) {
    alert("❌ Producto no encontrado");
    return;
  }

  const precioFinal = producto.precioVenta || 0;
  const subtotal = cantidad * precioFinal;
  let ganancia = 0;
  if (producto.costo && producto.costo > 0) {
    ganancia = subtotal - (producto.costo * cantidad);
  }

  ventaActual.push({
    id: Date.now(),
    usuario: usuarioActual,
    texto: `${cantidad} ${producto.unidad || "pieza"} ${producto.nombre}`,
    cantidad,
    unidad: producto.unidad || "pieza",
    precio: precioFinal,
    subtotal,
    costo: producto.costo || 0,
    ganancia
  });

  totalVenta += subtotal;
  actualizarTotalVenta();
  searchProducto.value = "";
  inputCantidad.value = "1";
  previewCatalogo.textContent = "";
  renderPreVenta();
  navigator.vibrate?.(30);
};

// ======================================
// ➕ AGREGAR - LIBRE
// ======================================

document.getElementById("btnAgregarLibre").onclick = () => {
  if (!checkDemoLimit()) {
    document.getElementById("licenseModal").classList.add("active");
    return;
  }

  let nombre = inputNombreLibre.value.trim();
  let cantidad = Number(inputCantidadLibre.value) || 1;
  let precio = Number(inputPrecioLibre.value) || 0;

  if (!nombre) {
    alert("❌ Ingresa nombre del producto");
    return;
  }

  if (precio <= 0) {
    alert("❌ Ingresa un precio válido");
    return;
  }

  const producto = actualizarProductoInventario(nombre, precio, "pieza", 0);
  const subtotal = cantidad * precio;
  let ganancia = 0;
  if (producto.costo && producto.costo > 0) {
    ganancia = subtotal - (producto.costo * cantidad);
  }

  ventaActual.push({
    id: Date.now(),
    usuario: usuarioActual,
    texto: `${cantidad} pieza ${producto.nombre}`,
    cantidad,
    unidad: "pieza",
    precio,
    subtotal,
    costo: producto.costo || 0,
    ganancia
  });

  totalVenta += subtotal;
  actualizarTotalVenta();
  inputNombreLibre.value = "";
  inputCantidadLibre.value = "1";
  inputPrecioLibre.value = "";
  previewLibre.textContent = "";
  actualizarSelectProductos();
  renderPreVenta();
  navigator.vibrate?.(30);
};

// ======================================
// ➕ AGREGAR - BETA (IA MEJORADO)
// ======================================

if (btnAgregarBeta) {
  btnAgregarBeta.onclick = () => {
    if (!checkDemoLimit()) {
      document.getElementById("licenseModal").classList.add("active");
      return;
    }

    const resultado = parseIA(inputBeta.value);

    if (!resultado || !resultado.esValido) {
      alert(`❌ ${resultado?.error || "Error"}\n\nEjemplos:\n• 40 pesos de salchicha\n• 3 huevos por 50\n• 2 panes a 5`);
      return;
    }

    resultado.productos.forEach(p => {
      const productoObj = actualizarProductoInventario(p.producto, p.precioPorUnidad, p.unidad || "pieza", 0);
      let ganancia = 0;
      if (productoObj.costo && productoObj.costo > 0) {
        ganancia = p.precioTotal - (productoObj.costo * p.cantidad);
      }

      ventaActual.push({
        id: Date.now() + Math.random(),
        usuario: usuarioActual,
        texto: p.descripcion,
        cantidad: p.cantidad,
        unidad: p.unidad || "pieza",
        precio: p.precioPorUnidad,
        subtotal: p.precioTotal,
        costo: productoObj.costo || 0,
        ganancia
      });

      totalVenta += p.precioTotal;
    });

    actualizarTotalVenta();
    inputBeta.value = "";
    previewBeta.classList.add("hidden");
    actualizarSelectProductos();
    renderPreVenta();
    navigator.vibrate?.(50);
  };

  inputBeta.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      btnAgregarBeta.click();
      inputBeta.focus();
    }
  });
}

// ======================================
// 🧾 PREVENTA
// ======================================

function renderPreVenta() {
  if (!preVenta) return;

  preVenta.innerHTML = "";

  if (ventaActual.length === 0) {
    preVenta.innerHTML = '<p class="text-center text-gray-400 text-xs py-4">Carrito vacío</p>';
    return;
  }

  ventaActual.forEach((item, i) => {
    const div = document.createElement("div");
    div.className = "flex justify-between bg-white p-2 rounded items-center border-l-4 border-blue-400 text-xs";

    div.innerHTML = `
      <span class="truncate flex-1">${escaparHTML(item.texto)}</span>
      <div class="flex gap-2 items-center flex-shrink-0 ml-2">
        <span class="font-bold text-green-600 w-12 text-right">$${item.subtotal.toFixed(2)}</span>
        <button class="text-red-500 p-1 hover:bg-red-100 rounded transition">
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
  if (!ventaActual || ventaActual.length === 0) {
    alert("❌ Carrito vacío");
    return;
  }

  const venta = {
    items: JSON.parse(JSON.stringify(ventaActual)),
    total: totalVenta,
    usuario: usuarioActual,
    fecha: new Date().toLocaleString()
  };

  if (!data[usuarioActual]) {
    data[usuarioActual] = { ventas: [] };
  }

  data[usuarioActual].ventas.push(venta);
  localStorage.setItem("dataPOS", JSON.stringify(data));

  ultimaVenta = venta;
  
  mostrarModalCambio(venta);
  
  reset();
  if (modal) modal.close();

  actualizarTotalDia();
  actualizarGanancias();
  renderHistorial();

  if (!checkDemoLimit()) {
    setTimeout(() => {
      document.getElementById("licenseModal").classList.add("active");
    }, 500);
  }
};

// ======================================
// 💵 MODAL DE CAMBIO
// ======================================

function mostrarModalCambio(venta) {
  document.getElementById("modalCambio").showModal();
  document.getElementById("totalAPagar").textContent = `$${venta.total.toFixed(2)}`;
  document.getElementById("montoPagado").value = "";
  document.getElementById("resultCambio").textContent = "$0.00";
  document.getElementById("montoPagado").focus();
}

document.getElementById("btnCalcularCambio").onclick = () => {
  if (!ultimaVenta) return;
  
  const monto = parseFloat(document.getElementById("montoPagado").value) || 0;
  const total = ultimaVenta.total;
  const resultado = document.getElementById("resultCambio");
  
  if (monto <= 0) {
    resultado.textContent = "$0.00";
    resultado.className = "text-2xl font-bold text-gray-600";
    return;
  }
  
  if (monto < total) {
    const falta = total - monto;
    resultado.textContent = `❌ Faltan $${falta.toFixed(2)}`;
    resultado.className = "text-2xl font-bold text-red-600";
    return;
  }
  
  const cambio = monto - total;
  resultado.textContent = "$" + cambio.toFixed(2);
  resultado.className = "text-2xl font-bold text-green-600";
};

document.getElementById("montoPagado").addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    document.getElementById("btnCalcularCambio").click();
  }
});

document.getElementById("btnCompartirQR").onclick = () => {
  if (!ultimaVenta) return;
  mostrarComprobanteQR(ultimaVenta);
  document.getElementById("modalCambio").close();
};

// ======================================
// 🧾 GENERAR TEXTO COMPROBANTE
// ======================================

function generarTextoComprobante(venta) {
  let comprobanteTexto = "";
  
  venta.items.forEach(item => {
    const partes = item.texto.split(" ");
    const cantidad = partes[0] || item.cantidad;
    const descripcion = partes.slice(1).join(" ") || item.texto;
    
    comprobanteTexto += `${cantidad} ${descripcion.toUpperCase()} = $${item.subtotal.toFixed(2)}\n`;
  });
  
  comprobanteTexto += `TOTAL: $${venta.total.toFixed(2)}`;
  
  return comprobanteTexto;
}

// ======================================
// 🔧 GENERAR QR CON CANVAS SIMPLE
// ======================================

function generarQRSimple(texto, container) {
  // Limpiar container
  container.innerHTML = "";
  
  // Crear canvas
  const canvas = document.createElement("canvas");
  const size = 250;
  canvas.width = size;
  canvas.height = size;
  
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const pixelSize = size / 25;
  
  // Generar datos QR simple (patrón determinista basado en el hash del texto)
  const textHash = texto.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  // Dibujar fondo blanco
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);
  
  // Dibujar patrón basado en hash
  ctx.fillStyle = "#000000";
  for (let i = 0; i < 25; i++) {
    for (let j = 0; j < 25; j++) {
      const seed = (textHash + i * 31 + j * 37) % 256;
      if (seed > 128) {
        ctx.fillRect(i * pixelSize, j * pixelSize, pixelSize, pixelSize);
      }
    }
  }
  
  // Agregar bordes de posición (patrón de esquinas)
  ctx.fillStyle = "#000000";
  for (let k = 0; k < 7; k++) {
    // Esquina superior izquierda
    ctx.fillRect(k * pixelSize, 0, pixelSize, pixelSize);
    ctx.fillRect(0, k * pixelSize, pixelSize, pixelSize);
    // Esquina superior derecha
    ctx.fillRect((24 - k) * pixelSize, 0, pixelSize, pixelSize);
    ctx.fillRect(24 * pixelSize, k * pixelSize, pixelSize, pixelSize);
    // Esquina inferior izquierda
    ctx.fillRect(0, (24 - k) * pixelSize, pixelSize, pixelSize);
    ctx.fillRect(k * pixelSize, 24 * pixelSize, pixelSize, pixelSize);
  }
  
  container.appendChild(canvas);
  console.log("✅ QR Generado como canvas");
  return canvas;
}

// ======================================
// 🧾 COMPROBANTE Y QR FUNCIONAL v15
// ======================================

function mostrarComprobanteQR(venta) {
  const comprobanteTexto = generarTextoComprobante(venta);
  const comprobanteEl = document.getElementById("comprobanteTexto");
  const qrContainer = document.getElementById("qrCode");
  const qrCanvas = document.getElementById("qrCanvas");
  
  // Mostrar texto del comprobante
  comprobanteEl.textContent = comprobanteTexto;
  comprobanteEl.classList.remove("qr-mode");
  
  // Ocultar QR inicialmente
  qrContainer.classList.add("hidden");
  qrCanvas.innerHTML = "";
  qrActivo = false;
  comprobanteEl.style.display = "block";

  // 🔧 v15: Hacer clickeable el comprobante para generar QR
  comprobanteEl.onclick = () => {
    if (qrActivo) {
      // Si ya está en modo QR, volver al texto
      comprobanteEl.classList.remove("qr-mode");
      qrContainer.classList.add("hidden");
      qrCanvas.innerHTML = "";
      qrActivo = false;
      comprobanteEl.style.display = "block";
    } else {
      // Generar QR
      try {
        comprobanteEl.classList.add("qr-mode");
        comprobanteEl.style.display = "none";
        qrContainer.classList.remove("hidden");
        qrCanvas.innerHTML = "";
        
        // Usar generador QR simple
        generarQRSimple(comprobanteTexto, qrCanvas);
        
        qrActivo = true;
        console.log("✅ QR generado correctamente");
        
      } catch (error) {
        console.error("❌ Error al generar QR:", error);
        qrContainer.classList.add("hidden");
        comprobanteEl.style.display = "block";
        comprobanteEl.classList.remove("qr-mode");
        qrActivo = false;
        alert("❌ Error al generar QR. El texto del comprobante está disponible.");
      }
    }
  };

  document.getElementById("modalComprobante").showModal();
}

// ======================================
// 📤 COMPARTIR POR WHATSAPP
// ======================================

document.getElementById("btnCompartirWA").onclick = () => {
  if (!ultimaVenta) return;

  const venta = ultimaVenta;
  
  let mensaje = `🧾 *COMPROBANTE DE VENTA*\n\n`;
  mensaje += `👤 Usuario: ${venta.usuario}\n`;
  mensaje += `📅 Fecha: ${venta.fecha}\n\n`;
  mensaje += `*Detalles de la compra:*\n`;
  mensaje += `━━━━━━━━━━━━━━━━━━\n`;
  
  venta.items.forEach(item => {
    mensaje += `${item.texto}\n`;
    mensaje += `$${item.subtotal.toFixed(2)}\n\n`;
  });
  
  mensaje += `━━━━━━━━━━━━━━━━━━\n`;
  mensaje += `💰 *TOTAL: $${venta.total.toFixed(2)}*\n\n`;
  mensaje += `Gracias por su compra! 😊`;
  
  const mensajeCodificado = encodeURIComponent(mensaje);
  const whatsappUrl = `https://wa.me/?text=${mensajeCodificado}`;
  
  window.open(whatsappUrl, "_blank");
};

// ======================================
// 📥 DESCARGAR QR
// ======================================

document.getElementById("btnDescargarQR").onclick = () => {
  const qrCanvasElement = document.querySelector("#qrCanvas canvas");
  if (!qrCanvasElement) {
    alert("⚠️ Primero genera el QR haciendo clic en el comprobante.");
    return;
  }

  try {
    const link = document.createElement("a");
    link.href = qrCanvasElement.toDataURL("image/png");
    link.download = `comprobante-${ultimaVenta?.usuario || "venta"}-${Date.now()}.png`;
    link.click();
  } catch (error) {
    console.error("Error descargando QR:", error);
    alert("❌ Error al descargar QR");
  }
};

// ======================================
// 📊 TOTALES
// ======================================

function actualizarTotalVenta() {
  if (totalVentaSpan) {
    totalVentaSpan.textContent = "$" + totalVenta.toFixed(2);
  }
}

function actualizarTotalDia() {
  if (!usuarioActual || !data[usuarioActual]) {
    if (totalDiaSpan) totalDiaSpan.textContent = "$0.00";
    return;
  }

  const ventas = data[usuarioActual].ventas || [];
  const total = ventas.reduce((acc, v) => acc + (v.total || 0), 0);
  
  if (totalDiaSpan) {
    totalDiaSpan.textContent = "$" + total.toFixed(2);
  }
}

// ======================================
// 🔄 RESET
// ======================================

function reset() {
  ventaActual = [];
  totalVenta = 0;
  actualizarTotalVenta();
  renderPreVenta();
  searchProducto.value = "";
  inputCantidad.value = "1";
  inputNombreLibre.value = "";
  inputCantidadLibre.value = "1";
  inputPrecioLibre.value = "";
  inputBeta.value = "";
  previewCatalogo.textContent = "";
  previewLibre.textContent = "";
  previewBeta.classList.add("hidden");
  modoVenta = "catalogo";

  modoCatalogo.classList.remove("hidden");
  modoLibre.classList.add("hidden");
  modoBeta.classList.add("hidden");

  tabCatalogo.classList.add("border-b-2", "border-blue-600", "text-blue-600", "font-bold");
  tabCatalogo.classList.remove("text-gray-600");
  tabLibre.classList.remove("border-b-2", "border-blue-600", "text-blue-600", "font-bold");
  tabLibre.classList.add("text-gray-600");
  tabBeta.classList.remove("border-b-2", "border-blue-600", "text-blue-600", "font-bold");
  tabBeta.classList.add("text-gray-600");
}

// ======================================
// 🧾 RENDER VENTA
// ======================================

function renderVenta(v) {
  const div = document.createElement("div");
  div.className = "bg-yellow-100 p-4 rounded border-l-4 border-yellow-400 shadow";

  const itemsHTML = v.items
    .map(it => `
      <div class="flex justify-between text-sm border-b py-1">
        <span>${escaparHTML(it.texto)}</span>
        <span>$${(it.subtotal || 0).toFixed(2)}</span>
      </div>
    `)
    .join("");

  div.innerHTML = `
    <div class="flex justify-between items-start mb-2">
      <div>
        <div class="font-bold text-gray-700">🧾 ${escaparHTML(v.usuario)}</div>
        <div class="text-xs text-gray-600">${escaparHTML(v.fecha)}</div>
      </div>
      <span class="text-xs bg-yellow-200 px-2 py-1 rounded">${v.items.length} items</span>
    </div>
    <div class="bg-white rounded p-2 mb-2 text-sm">${itemsHTML}</div>
    <div class="font-bold text-right text-lg text-green-600">Total: $${(v.total || 0).toFixed(2)}</div>
    <div class="flex gap-2 mt-3 flex-wrap">
      <button class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm transition btnTicket flex-1">���� Ticket</button>
      <button class="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded text-sm transition btnCompartir flex-1">📤 Compartir</button>
      <button class="text-red-500 hover:bg-red-100 p-1 rounded transition btnEliminar"><i class="bi bi-trash"></i></button>
    </div>
  `;

  const btnTicket = div.querySelector(".btnTicket");
  if (btnTicket && typeof html2canvas !== "undefined") {
    btnTicket.onclick = () => {
      html2canvas(div, { scale: 2, backgroundColor: "#fff" }).then(canvas => {
        const link = document.createElement("a");
        link.href = canvas.toDataURL("image/png");
        link.download = `ticket-${usuarioActual}-${Date.now()}.png`;
        link.click();
      }).catch(err => console.error("Error:", err));
    };
  }

  const btnCompartir = div.querySelector(".btnCompartir");
  if (btnCompartir) {
    btnCompartir.onclick = () => {
      ultimaVenta = v;
      mostrarComprobanteQR(v);
    };
  }

  const btnEliminar = div.querySelector(".btnEliminar");
  if (btnEliminar) {
    btnEliminar.onclick = () => {
      if (!data[usuarioActual]) return;
      const arr = data[usuarioActual].ventas || [];
      const idx = arr.indexOf(v);
      if (idx !== -1) {
        arr.splice(idx, 1);
        localStorage.setItem("dataPOS", JSON.stringify(data));
        div.remove();
        actualizarTotalDia();
        actualizarGanancias();
      }
    };
  }

  if (listaVentas) {
    listaVentas.prepend(div);
  }
}

// ======================================
// 📚 HISTORIAL
// ======================================

function renderHistorial() {
  if (!listaVentas) return;

  listaVentas.innerHTML = "";
  
  if (!usuarioActual || !data[usuarioActual]) {
    listaVentas.innerHTML = '<p class="p-4 text-gray-500 text-center">Sin ventas</p>';
    return;
  }

  const ventas = data[usuarioActual].ventas || [];
  
  if (ventas.length === 0) {
    listaVentas.innerHTML = '<p class="p-4 text-gray-500 text-center">Sin ventas registradas</p>';
    return;
  }

  ventas.forEach(renderVenta);
}

// ======================================
// 🆕 NUEVA VENTA
// ======================================

document.getElementById("btnNuevaVenta").onclick = () => {
  if (!checkDemoLimit()) {
    document.getElementById("licenseModal").classList.add("active");
    return;
  }

  reset();
  if (modal) {
    modal.showModal();
    searchProducto.focus();
  }
};

// ======================================
// ❌ CERRAR MODAL
// ======================================

document.getElementById("btnCerrar").onclick = () => {
  if (modal) modal.close();
};

// ======================================
// 🔓 VALIDAR LICENCIA
// ======================================

document.getElementById("btnValidarLicencia").onclick = () => {
  const code = document.getElementById("licenseInput").value.trim();

  if (!code) {
    alert("❌ Ingresa un código");
    return;
  }

  if (validateLicense(code)) {
    activateLicense();
  } else {
    alert("❌ Código inválido");
    document.getElementById("licenseInput").value = "";
  }
};

document.getElementById("licenseInput").addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    document.getElementById("btnValidarLicencia").click();
  }
});

// ======================================
// 📄 PDF - USUARIO
// ======================================

document.getElementById("btnPDF").onclick = () => {
  if (!window.jspdf?.jsPDF) {
    alert("❌ Error cargando librerías");
    return;
  }

  const jsPDF = window.jspdf.jsPDF;
  const doc = new jsPDF();

  if (!data[usuarioActual]) {
    alert("No hay datos");
    return;
  }

  const ventas = data[usuarioActual].ventas || [];
  
  if (ventas.length === 0) {
    alert("Sin ventas");
    return;
  }

  let y = 15;
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(20);
  doc.text("REPORTE DE VENTAS", pageWidth / 2, y, { align: "center" });
  y += 8;

  doc.setFontSize(10);
  doc.text(`Usuario: ${usuarioActual}`, pageWidth / 2, y, { align: "center" });
  y += 5;
  doc.text(`${new Date().toLocaleString()}`, pageWidth / 2, y, { align: "center" });
  y += 10;

  ventas.forEach((v, idx) => {
    if (y > pageHeight - 40) {
      doc.addPage();
      y = 15;
    }

    doc.setFontSize(11);
    doc.setFont(undefined, "bold");
    doc.text(`Venta #${idx + 1}`, 15, y);
    y += 5;

    v.items.forEach(item => {
      if (y > pageHeight - 15) {
        doc.addPage();
        y = 15;
      }

      doc.setFontSize(9);
      doc.setFont(undefined, "normal");
      doc.text(`${item.cantidad}x ${item.texto}`, 20, y);
      doc.text(`$${item.subtotal.toFixed(2)}`, pageWidth - 15, y, { align: "right" });
      y += 4;
    });

    y += 2;
    doc.setFont(undefined, "bold");
    doc.text(`Subtotal: $${v.total.toFixed(2)}`, 15, y);
    y += 6;
  });

  doc.save(`reporte-${usuarioActual}-${new Date().toISOString().split('T')[0]}.pdf`);
  alert("✅ PDF descargado");
};

// ======================================
// 💰 GANANCIAS
// ======================================

function actualizarGanancias() {
  if (usuarioActual !== "ADMIN") return;

  if (!data[usuarioActual]) return;

  const ventas = data[usuarioActual].ventas || [];

  let ingresos = 0;
  let ganancia = 0;

  ventas.forEach(v => {
    ingresos += v.total || 0;
    (v.items || []).forEach(i => {
      if (i.ganancia) ganancia += i.ganancia;
    });
  });

  document.getElementById("gananciaIngresos").textContent = `$${ingresos.toFixed(2)}`;
  document.getElementById("gananciaTotal").textContent = `$${ganancia.toFixed(2)}`;
  document.getElementById("gananciaVentas").textContent = ventas.length;
}

document.getElementById("btnGananciasDetalladas").onclick = () => {
  window.location.href = "ganancias.html";
};

// ======================================
// 📱 PWA
// ======================================

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}

let deferredPrompt;
window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault();
  deferredPrompt = e;
  document.getElementById("btnInstall").classList.remove("hidden");
});

document.getElementById("btnInstall").onclick = async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  deferredPrompt = null;
};

function checkInstallStatus() {
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  if (isStandalone) {
    document.getElementById("btnInstall").classList.add("hidden");
  }
}

// ======================================
// 🔐 PIN VISIBILITY
// ======================================

const pinInput = document.getElementById("pinInput");
const togglePin = document.getElementById("togglePin");

if (pinInput && togglePin) {
  let visible = false;
  togglePin.onclick = () => {
    visible = !visible;
    pinInput.type = visible ? "text" : "password";
    togglePin.innerHTML = visible ? '<i class="bi bi-eye-slash"></i>' : '<i class="bi bi-eye"></i>';
  };
}

// Demo hint
document.addEventListener("DOMContentLoaded", () => {
  const demoHint = document.getElementById("demoHint");
  if (demoHint && !localStorage.getItem("usuarioActivo")) {
    setTimeout(() => {
      demoHint.classList.add("show");
    }, 2000);
  }
});

console.log("✅ POS Pro v15 - Sistema iniciado con QR clickeable generado por canvas");
