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

function normalizarTexto(texto) {
  return (texto || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
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

const carritoContainer = document.getElementById("carritoContainer");
const btnFinalizarContainer = document.getElementById("btnFinalizarContainer");

// Modal de cambio (AHORA OPCIONAL)
const modalCambio = document.getElementById("modalCambio");
const inputMontoPagado = document.getElementById("inputMontoPagado");
const totalVentaCambio = document.getElementById("totalVentaCambio");
const cambioSpan = document.getElementById("cambio");

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
// 🔍 BÚSQUEDA DE PRODUCTOS
// ======================================

if (searchProducto) {
  searchProducto.addEventListener("input", (e) => {
    const query = normalizarTexto(searchProducto.value);
    const opciones = selectProducto.querySelectorAll("option");
    let primeraCoincidencia = null;
    
    opciones.forEach((opt, idx) => {
      if (idx === 0) return;
      const texto = normalizarTexto(opt.textContent);
      const esCoincidencia = texto.includes(query);
      opt.style.display = esCoincidencia ? "block" : "none";
      
      if (esCoincidencia && !primeraCoincidencia) {
        primeraCoincidencia = opt.value;
      }
    });

    if (primeraCoincidencia) {
      selectProducto.value = primeraCoincidencia;
      actualizarPreviewCatalogo();
    }
  });

  searchProducto.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      document.getElementById("btnAgregarCatalogo").click();
      searchProducto.value = "";
      searchProducto.focus();
    }
  });
}

// ======================================
// 👀 PREVIEW CATÁLOGO
// ======================================

if (selectProducto) {
  selectProducto.addEventListener("change", actualizarPreviewCatalogo);
  inputCantidad.addEventListener("input", actualizarPreviewCatalogo);
}

function actualizarPreviewCatalogo() {
  const nombreSeleccionado = selectProducto.value;
  
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
        <span class="text-lg font-bold text-green-600">$${subtotal.toFixed(2)}</span>
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
// 🧠 PARSER IA MEJORADO (INTELIGENCIA REAL)
// ======================================

function parseIA(texto) {
  if (!texto.trim()) return null;

  const resultado = parseOrder(texto);

  if (!resultado.success) {
    return { esValido: false, error: resultado.error };
  }

  if (resultado.data.length === 0) {
    return { esValido: false, error: "No reconozco el formato" };
  }

  const ventas = formatearParaVenta(resultado.data);

  return {
    esValido: true,
    productos: ventas,
    preview: resultado.preview
  };
}

// ======================================
// 👀 PREVIEW BETA MEJORADO
// ======================================

if (inputBeta) {
  inputBeta.addEventListener("input", () => {
    const resultado = parseIA(inputBeta.value);

    if (!resultado.esValido) {
      if (inputBeta.value.trim()) {
        previewBeta.classList.remove("hidden");
        previewBeta.innerHTML = `<span class="text-red-500">❌ ${resultado.error}</span>`;
      } else {
        previewBeta.classList.add("hidden");
      }
      return;
    }

    previewBeta.classList.remove("hidden");

    let total = 0;
    let html = '<div class="space-y-1 text-xs">';

    resultado.productos.forEach((p) => {
      const precioFinal = p.precioTotal || (p.cantidad * (p.precioPorUnidad || 0));
      total += precioFinal;

      html += `
        <div class="flex justify-between border-b pb-1">
          <span>${p.descripcion}</span>
          <span class="text-green-600 font-bold">$${precioFinal.toFixed(2)}</span>
        </div>
      `;
    });

    html += `
      <div class="border-t pt-1 mt-1 font-bold flex justify-between">
        <span>Total:</span>
        <span class="text-green-600">$${total.toFixed(2)}</span>
      </div>
    </div>`;

    previewBeta.innerHTML = html;
  });
}

// ======================================
// ➕ AGREGAR - BETA (IA)
// ======================================

if (btnAgregarBeta) {
  btnAgregarBeta.onclick = () => {
    if (!checkDemoLimit()) {
      document.getElementById("licenseModal").classList.add("active");
      return;
    }

    const resultado = parseIA(inputBeta.value);

    if (!resultado.esValido) {
      alert(`❌ ${resultado.error}\n\nFormatos válidos:\n• "90 de salchicha" ($90)\n• "3 de 9" (3×$9=$27)\n• "2 litros de leche" (sin precio)\n• "5 elotes de a 5" (5×$5)`);
      return;
    }

    resultado.productos.forEach(p => {
      // Solo guardar en inventario si hay nombre de producto
      if (p.producto && p.producto.trim() !== "") {
        const productoObj = actualizarProductoInventario(
          p.producto,
          p.precioPorUnidad || (p.precioTotal / p.cantidad),
          p.unidad || "pieza",
          0
        );

        const precioFinal = p.precioPorUnidad || (p.precioTotal / p.cantidad);
        const subtotal = p.precioTotal || (p.cantidad * precioFinal);
        let ganancia = 0;

        if (productoObj.costo && productoObj.costo > 0) {
          ganancia = subtotal - (productoObj.costo * p.cantidad);
        }

        ventaActual.push({
          id: Date.now() + Math.random(),
          usuario: usuarioActual,
          texto: p.descripcion,
          cantidad: p.cantidad || 1,
          unidad: p.unidad || "pieza",
          precio: precioFinal,
          subtotal,
          costo: productoObj.costo || 0,
          ganancia
        });
      } else {
        // Sin nombre de producto, solo registra la venta
        const subtotal = p.precioTotal || (p.cantidad * (p.precioPorUnidad || 0));

        ventaActual.push({
          id: Date.now() + Math.random(),
          usuario: usuarioActual,
          texto: p.descripcion,
          cantidad: p.cantidad || 1,
          unidad: p.unidad || "pieza",
          precio: p.precioPorUnidad || 0,
          subtotal,
          costo: 0,
          ganancia: 0
        });
      }

      totalVenta += p.precioTotal || (p.cantidad * (p.precioPorUnidad || 0));
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
    }
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

  const nombreSeleccionado = selectProducto.value;
  
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
  selectProducto.value = "";
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
// 🧾 PREVENTA (CARRITO MEJOR OPTIMIZADO)
// ======================================

function renderPreVenta() {
  if (!preVenta) return;

  preVenta.innerHTML = "";

  if (ventaActual.length === 0) {
    preVenta.innerHTML = '<p class="text-center text-gray-400 text-xs py-2">Carrito vacío</p>';
    return;
  }

  ventaActual.forEach((item, i) => {
    const div = document.createElement("div");
    div.className = "flex justify-between items-center bg-gray-50 p-2 rounded border border-gray-200 text-xs sm:text-sm";

    div.innerHTML = `
      <span class="truncate flex-1">${escaparHTML(item.texto)}</span>
      <div class="flex gap-1 items-center flex-shrink-0 ml-2">
        <span class="font-bold text-green-600">$${item.subtotal.toFixed(2)}</span>
        <button class="text-red-500 p-1 hover:bg-red-100 rounded transition text-xs">
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
// 💰 FINALIZAR VENTA (FLUJO CORRECTO)
// ======================================

function finalizarVenta() {
  if (!ventaActual || ventaActual.length === 0) {
    alert("❌ Carrito vacío");
    return;
  }

  const venta = {
    items: JSON.parse(JSON.stringify(ventaActual)),
    total: totalVenta,
    usuario: usuarioActual,
    fecha: new Date().toLocaleString(),
    id: Date.now()
  };

  if (!data[usuarioActual]) {
    data[usuarioActual] = { ventas: [] };
  }

  // GUARDAR VENTA PRIMERO
  data[usuarioActual].ventas.push(venta);
  localStorage.setItem("dataPOS", JSON.stringify(data));

  // RENDERIZAR EN HISTORIAL
  renderVenta(venta);
  
  // LIMPIAR
  reset();
  if (modal) modal.close();

  // ACTUALIZAR TOTALES
  actualizarTotalDia();
  actualizarGanancias();
  renderHistorial();

  // VERIFICAR LÍMITE DEMO
  if (!checkDemoLimit()) {
    setTimeout(() => {
      document.getElementById("licenseModal").classList.add("active");
    }, 500);
  }

  alert("✅ Venta registrada");

  // OFERTAR CAMBIO DE FORMA OPCIONAL
  setTimeout(() => {
    mostrarModalCambio();
  }, 500);
}

// ======================================
// 💰 MODAL DE CAMBIO (AUXILIAR, NO OBLIGATORIO)
// ======================================

function mostrarModalCambio() {
  if (!modalCambio) return;

  totalVentaCambio.textContent = `$${totalVenta.toFixed(2)}`;
  inputMontoPagado.value = "";
  cambioSpan.textContent = "$0.00";
  cambioSpan.className = "text-xl font-bold";

  modalCambio.showModal();
  inputMontoPagado.focus();
}

function calcularCambio() {
  const montoPagado = parseFloat(inputMontoPagado.value) || 0;

  if (montoPagado <= 0) {
    alert("❌ Ingresa un monto válido");
    return;
  }

  if (montoPagado < totalVenta) {
    cambioSpan.textContent = "❌ Monto insuficiente";
    cambioSpan.className = "text-xl font-bold text-red-600";
    return;
  }

  const cambio = montoPagado - totalVenta;
  cambioSpan.textContent = `$${cambio.toFixed(2)}`;
  cambioSpan.className = "text-2xl font-bold text-green-600";
}

if (inputMontoPagado) {
  inputMontoPagado.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      calcularCambio();
    }
  });

  inputMontoPagado.addEventListener("input", () => {
    cambioSpan.textContent = "$0.00";
    cambioSpan.className = "text-xl font-bold";
  });
}

document.getElementById("btnCalcularCambio").onclick = calcularCambio;

document.getElementById("btnFinalizar").onclick = finalizarVenta;

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
  selectProducto.value = "";
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
        <span class="truncate flex-1">${escaparHTML(it.texto)}</span>
        <span class="ml-2 flex-shrink-0">$${(it.subtotal || 0).toFixed(2)}</span>
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
    <div class="bg-white rounded p-2 mb-2 text-sm max-h-32 overflow-y-auto">${itemsHTML}</div>
    <div class="font-bold text-right text-lg text-green-600">Total: $${(v.total || 0).toFixed(2)}</div>
    <div class="flex gap-2 mt-3 flex-wrap">
      <button class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm transition btnTicket">📄 Ticket</button>
      <button class="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded text-sm transition btnQR">📱 QR</button>
      <button class="text-red-500 ml-auto hover:bg-red-100 p-1 rounded transition btnEliminar"><i class="bi bi-trash"></i></button>
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

  const btnQR = div.querySelector(".btnQR");
  if (btnQR) {
    btnQR.onclick = () => {
      generarQRVenta(v);
    };
  }

  const btnEliminar = div.querySelector(".btnEliminar");
  if (btnEliminar) {
    btnEliminar.onclick = () => {
      if (!data[usuarioActual]) return;
      const arr = data[usuarioActual].ventas || [];
      const idx = arr.findIndex(venta => venta.id === v.id);
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
// 📱 GENERAR QR
// ======================================

function generarQRVenta(v) {
  const datosVenta = {
    usuario: v.usuario,
    fecha: v.fecha,
    total: v.total,
    items: v.items.map(i => ({
      descripcion: i.texto,
      cantidad: i.cantidad,
      precio: i.precio,
      subtotal: i.subtotal
    }))
  };

  const datosJSON = JSON.stringify(datosVenta);
  const urlQR = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(datosJSON)}`;

  const modalQR = document.createElement("div");
  modalQR.className = "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4";
  modalQR.innerHTML = `
    <div class="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full">
      <h2 class="text-lg font-bold mb-4 text-center">📱 Código QR de Venta</h2>
      <img src="${urlQR}" alt="QR Code" class="w-full mb-4 p-4 bg-gray-50 rounded">
      <p class="text-xs text-center text-gray-600 mb-3">Venta: $${v.total.toFixed(2)}</p>
      <div class="flex gap-2">
        <button onclick="this.closest('.fixed').remove()" class="flex-1 bg-gray-400 hover:bg-gray-500 text-white px-3 py-2 rounded transition">
          Cerrar
        </button>
        <a href="${urlQR}" download="qr-${v.usuario}-${v.id}.png" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded transition text-center">
          ⬇️ Descargar
        </a>
      </div>
    </div>
  `;

  document.body.appendChild(modalQR);
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
    selectProducto.focus();
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

  let totalDia = 0;

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

    totalDia += v.total;
  });

  y += 5;
  doc.setFontSize(14);
  doc.setFont(undefined, "bold");
  doc.text(`TOTAL: $${totalDia.toFixed(2)}`, pageWidth / 2, y, { align: "center" });

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

document.addEventListener("DOMContentLoaded", () => {
  const demoHint = document.getElementById("demoHint");
  if (demoHint && !localStorage.getItem("usuarioActivo")) {
    setTimeout(() => {
      demoHint.classList.add("show");
    }, 2000);
  }
});

console.log("✅ POS Pro v2.0 - Sistema optimizado para móvil");
