// ======================================
// 🔐 CONFIG / ESTADO GLOBAL
// ======================================

let usuarioActual = null;
let ventaActual = [];
let totalVenta = 0;
let modoVenta = "catalogo"; // "catalogo", "libre" o "beta"

let data = JSON.parse(localStorage.getItem("dataPOS")) || {};
let inventario = JSON.parse(localStorage.getItem("inventarioPOS")) || [];

// ======================================
// 🔧 FUNCIONES UTILIDAD
// ======================================

function normalizarProducto(p) {
  return {
    id: p.id || Date.now(),
    nombre: (p.nombre || "").toLowerCase().trim(),
    stock: Number(p.stock ?? p.cantidad ?? 0),
    costo: p.costo !== null && p.costo !== undefined ? Number(p.costo) : null,
    precioVenta: p.precioVenta ?? p.precio ? Number(p.precioVenta ?? p.precio) : 0,
    unidad: p.unidad || "pieza",
    alias: Array.isArray(p.alias) ? p.alias : []
  };
}

function normalizar(texto) {
  return (texto || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s]/g, "");
}

function buscarProducto(nombre) {
  if (!nombre || !nombre.trim()) return null;

  const n = normalizar(nombre);

  return inventario.find(p => {
    const nombreBase = normalizar(p.nombre);

    const coincideNombre = n.includes(nombreBase) || nombreBase.includes(n);

    const coincideAlias = (p.alias || []).some(a => {
      const al = normalizar(a);
      return n.includes(al) || al.includes(n);
    });

    return coincideNombre || coincideAlias;
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
  inventario = inventario.map(p => normalizarProducto(p));
  localStorage.setItem("inventarioPOS", JSON.stringify(inventario));
  console.log("✓ Inventario sincronizado:", inventario.length, "productos");
}

function actualizarProductoInventario(nombre, precioVenta, unidad = "pieza", cantidad = 0) {
  const nombreNormalizado = nombre.toLowerCase().trim();
  
  let producto = buscarProducto(nombreNormalizado);

  if (producto) {
    console.log(`📦 Producto encontrado: "${producto.nombre}"`);

    const aliasNormal = normalizar(nombreNormalizado);
    if (!(producto.alias || []).some(a => normalizar(a) === aliasNormal)) {
      producto.alias.push(nombreNormalizado);
    }

    if (cantidad > 0) {
      producto.stock = (producto.stock || 0) + cantidad;
    }
  } else {
    console.log(`✨ Nuevo producto agregado: "${nombreNormalizado}" - $${precioVenta}`);
    producto = {
      id: Date.now(),
      nombre: nombreNormalizado,
      stock: cantidad || 0,
      costo: null,
      precioVenta: precioVenta || 0,
      unidad: unidad || "pieza",
      alias: [nombreNormalizado],
      creadoDesdeVenta: true,
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
// 🎯 ELEMENTOS DOM
// ======================================

const modal = document.getElementById("modal");
const selectProducto = document.getElementById("selectProducto");
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
  if (!selectProducto) {
    console.warn("selectProducto no encontrado");
    return;
  }

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
// 🔀 CAMBIAR MODO DE VENTA - CATÁLOGO
// ======================================

if (tabCatalogo) {
  tabCatalogo.onclick = () => {
    modoVenta = "catalogo";
    modoCatalogo.classList.remove("hidden");
    modoLibre.classList.add("hidden");
    modoBeta.classList.add("hidden");
    
    tabCatalogo.classList.add("border-b-2", "border-blue-600", "text-blue-600", "font-bold");
    tabCatalogo.classList.remove("text-gray-600", "border-transparent");
    
    tabLibre.classList.remove("border-b-2", "border-blue-600", "text-blue-600", "font-bold");
    tabLibre.classList.add("text-gray-600", "border-transparent");
    
    tabBeta.classList.remove("border-b-2", "border-blue-600", "text-blue-600", "font-bold");
    tabBeta.classList.add("text-gray-600", "border-transparent");
  };
}

// ======================================
// 🔀 CAMBIAR MODO DE VENTA - LIBRE
// ======================================

if (tabLibre) {
  tabLibre.onclick = () => {
    modoVenta = "libre";
    modoLibre.classList.remove("hidden");
    modoCatalogo.classList.add("hidden");
    modoBeta.classList.add("hidden");
    
    tabLibre.classList.add("border-b-2", "border-blue-600", "text-blue-600", "font-bold");
    tabLibre.classList.remove("text-gray-600", "border-transparent");
    
    tabCatalogo.classList.remove("border-b-2", "border-blue-600", "text-blue-600", "font-bold");
    tabCatalogo.classList.add("text-gray-600", "border-transparent");
    
    tabBeta.classList.remove("border-b-2", "border-blue-600", "text-blue-600", "font-bold");
    tabBeta.classList.add("text-gray-600", "border-transparent");
    
    inputNombreLibre.focus();
  };
}

// ======================================
// 🔀 CAMBIAR MODO DE VENTA - BETA
// ======================================

if (tabBeta) {
  tabBeta.onclick = () => {
    modoVenta = "beta";
    modoBeta.classList.remove("hidden");
    modoCatalogo.classList.add("hidden");
    modoLibre.classList.add("hidden");
    
    tabBeta.classList.add("border-b-2", "border-blue-600", "text-blue-600", "font-bold");
    tabBeta.classList.remove("text-gray-600", "border-transparent");
    
    tabCatalogo.classList.remove("border-b-2", "border-blue-600", "text-blue-600", "font-bold");
    tabCatalogo.classList.add("text-gray-600", "border-transparent");
    
    tabLibre.classList.remove("border-b-2", "border-blue-600", "text-blue-600", "font-bold");
    tabLibre.classList.add("text-gray-600", "border-transparent");
    
    inputBeta.focus();
  };
}

// ======================================
// 👀 PREVIEW CATÁLOGO
// ======================================

if (selectProducto) {
  selectProducto.addEventListener("change", () => {
    const nombreSeleccionado = selectProducto.value;
    
    if (!nombreSeleccionado) {
      previewCatalogo.textContent = "";
      return;
    }

    const producto = buscarProducto(nombreSeleccionado);
    
    if (producto) {
      const stock = producto.stock > 0 ? `(${producto.stock} en stock)` : "(sin stock)";
      previewCatalogo.innerHTML = `
        <div class="flex justify-between items-center">
          <span>📦 ${producto.nombre} - $${(producto.precioVenta || 0).toFixed(2)}</span>
          <span class="text-xs">${stock}</span>
        </div>
      `;
    }
  });

  inputCantidad.addEventListener("input", () => {
    const nombreSeleccionado = selectProducto.value;
    
    if (!nombreSeleccionado || !inputCantidad.value) {
      previewCatalogo.textContent = "";
      return;
    }

    const producto = buscarProducto(nombreSeleccionado);
    const cantidad = Number(inputCantidad.value) || 1;

    if (producto) {
      const subtotal = cantidad * (producto.precioVenta || 0);
      previewCatalogo.innerHTML = `
        <div class="flex justify-between">
          <span>${cantidad} × ${producto.nombre}</span>
          <span class="font-bold">$${subtotal.toFixed(2)}</span>
        </div>
      `;
    }
  });
}

// ======================================
// 👀 PREVIEW MODO LIBRE
// ======================================

if (inputNombreLibre) {
  inputNombreLibre.addEventListener("input", actualizarPreviewLibre);
}

if (inputCantidadLibre) {
  inputCantidadLibre.addEventListener("input", actualizarPreviewLibre);
}

if (inputPrecioLibre) {
  inputPrecioLibre.addEventListener("input", actualizarPreviewLibre);
}

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
      <div class="flex justify-between">
        <span>✨ ${cantidad} × ${nombre} @ $${precio}</span>
        <span class="font-bold">$${subtotal.toFixed(2)}</span>
      </div>
    `;
  } else {
    previewLibre.innerHTML = `<div>📝 ${nombre} (cantidad: ${cantidad})</div>`;
  }
}

// ======================================
// 🧪 PARSER INTELIGENTE - MODO BETA
// ======================================

function parserBeta(texto) {
  if (!texto.trim()) return null;

  let t = texto.toLowerCase().trim();
  
  // Patrones regex avanzados
  const patrones = [
    // Patrón 1: "3kg huevo a 20" → cantidad=3, unidad=kg, producto=huevo, precio=20
    /^(\d+(?:\.\d+)?)\s*(kg|g|l|litro|litros|pieza|pz|piezas|metro|m|docena|doc|pack|caja|bolsa|lata|bolsas|cajas|latas)?\s+(.+?)\s+a\s+(\d+(?:\.\d+)?)$/i,
    
    // Patrón 2: "huevo 20" → cantidad implícita=1, producto=huevo, precio=20
    /^(.+?)\s+(\d+(?:\.\d+)?)$/i
  ];

  for (let patron of patrones) {
    const match = texto.match(patron);
    
    if (match) {
      if (match.length === 5) {
        // Patrón 1 (completo)
        const cantidad = parseFloat(match[1]);
        const unidad = (match[2] || "pieza").toLowerCase();
        const producto = match[3].trim();
        const precio = parseFloat(match[4]);

        return { cantidad, unidad, producto, precio, esValido: true };
      } 
      else if (match.length === 3) {
        // Patrón 2 (producto y precio)
        const producto = match[1].trim();
        const precio = parseFloat(match[2]);

        return { cantidad: 1, unidad: "pieza", producto, precio, esValido: true };
      }
    }
  }

  return { esValido: false, error: "Formato no reconocido" };
}

// ======================================
// 👀 PREVIEW MODO BETA EN TIEMPO REAL
// ======================================

if (inputBeta) {
  inputBeta.addEventListener("input", () => {
    const resultado = parserBeta(inputBeta.value);

    if (!resultado || !resultado.esValido) {
      if (inputBeta.value.trim()) {
        previewBeta.innerHTML = `<span class="text-red-500">❌ ${resultado?.error || "Formato no válido"}</span>`;
      } else {
        previewBeta.textContent = "";
      }
      return;
    }

    const { cantidad, unidad, producto, precio } = resultado;
    const subtotal = cantidad * precio;
    const unidadLabel = unidad === "pieza" ? "" : ` ${unidad}`;

    previewBeta.innerHTML = `
      <div class="flex justify-between items-center">
        <span>⚡ ${cantidad}${unidadLabel} ${producto} @ $${precio}</span>
        <span class="font-bold text-green-600">$${subtotal.toFixed(2)}</span>
      </div>
    `;
  });
}

// ======================================
// ➕ AGREGAR PRODUCTO - CATÁLOGO
// ======================================

const btnAgregarCatalogo = document.getElementById("btnAgregarCatalogo");
if (btnAgregarCatalogo) {
  btnAgregarCatalogo.onclick = () => {
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

    let gananciaEstimada = 0;
    if (producto.costo && producto.costo > 0) {
      gananciaEstimada = subtotal - (producto.costo * cantidad);
    }

    ventaActual.push({
      id: Date.now(),
      usuario: usuarioActual,
      texto: `${cantidad} ${producto.unidad || "pieza"} ${producto.nombre}`,
      cantidad,
      unidad: producto.unidad || "pieza",
      precio: precioFinal,
      multi: true,
      subtotal,
      costoUnitario: producto.costo || 0,
      ganancia: gananciaEstimada
    });

    totalVenta += subtotal;
    actualizarTotalVenta();

    selectProducto.value = "";
    inputCantidad.value = "1";
    previewCatalogo.textContent = "";
    
    renderPreVenta();
    navigator.vibrate?.(30);
  };
}

// ======================================
// ➕ AGREGAR PRODUCTO - MODO LIBRE
// ======================================

const btnAgregarLibre = document.getElementById("btnAgregarLibre");
if (btnAgregarLibre) {
  btnAgregarLibre.onclick = () => {
    let nombre = inputNombreLibre.value.trim();
    let cantidad = Number(inputCantidadLibre.value) || 1;
    let precio = Number(inputPrecioLibre.value) || 0;

    if (!nombre) {
      alert("❌ Ingresa el nombre del producto");
      return;
    }

    // 🧠 PARSER INTELIGENTE: "huevo 10" → nombre: "huevo", precio: 10
    const match = nombre.match(/^(.+?)\s+(\d+(?:\.\d+)?)$/);
    if (match && !inputPrecioLibre.value) {
      nombre = match[1].trim();
      precio = parseFloat(match[2]);
      console.log(`✨ Parser detectó: "${nombre}" @ $${precio}`);
    }

    if (precio <= 0) {
      alert("❌ Ingresa un precio válido");
      return;
    }

    // 🔑 AGREGAR AL INVENTARIO
    const producto = actualizarProductoInventario(nombre, precio, "pieza", 0);
    
    const subtotal = cantidad * precio;

    let gananciaEstimada = 0;
    if (producto.costo && producto.costo > 0) {
      gananciaEstimada = subtotal - (producto.costo * cantidad);
    }

    ventaActual.push({
      id: Date.now(),
      usuario: usuarioActual,
      texto: `${cantidad} pieza ${producto.nombre}`,
      cantidad,
      unidad: "pieza",
      precio,
      multi: true,
      subtotal,
      costoUnitario: producto.costo || 0,
      ganancia: gananciaEstimada
    });

    totalVenta += subtotal;
    actualizarTotalVenta();

    inputNombreLibre.value = "";
    inputCantidadLibre.value = "1";
    inputPrecioLibre.value = "";
    previewLibre.textContent = "";
    
    // Actualizar select para que aparezca el nuevo producto
    actualizarSelectProductos();
    
    renderPreVenta();
    navigator.vibrate?.(30);
  };
}

// ======================================
// ➕ AGREGAR PRODUCTO - MODO BETA
// ======================================

if (btnAgregarBeta) {
  btnAgregarBeta.onclick = () => {
    const resultado = parserBeta(inputBeta.value);

    if (!resultado || !resultado.esValido) {
      alert(`❌ ${resultado?.error || "Formato no reconocido"}\n\nEjemplos válidos:\n• 3kg huevo a 20\n• 2 leches 15\n• huevo 25`);
      return;
    }

    const { cantidad, unidad, producto, precio } = resultado;
    const subtotal = cantidad * precio;

    // 🔑 AGREGAR AL INVENTARIO
    const productoObj = actualizarProductoInventario(producto, precio, unidad, 0);

    let gananciaEstimada = 0;
    if (productoObj.costo && productoObj.costo > 0) {
      gananciaEstimada = subtotal - (productoObj.costo * cantidad);
    }

    ventaActual.push({
      id: Date.now(),
      usuario: usuarioActual,
      texto: `${cantidad} ${unidad} ${productoObj.nombre}`,
      cantidad,
      unidad,
      precio,
      multi: true,
      subtotal,
      costoUnitario: productoObj.costo || 0,
      ganancia: gananciaEstimada
    });

    totalVenta += subtotal;
    actualizarTotalVenta();

    // Limpiar
    inputBeta.value = "";
    previewBeta.textContent = "";

    // Actualizar selects
    actualizarSelectProductos();
    renderPreVenta();

    navigator.vibrate?.(30);
    console.log(`✅ Producto agregado: ${cantidad} ${unidad} ${producto} @ $${precio}`);
  };
}

// Permitir Enter para agregar rápidamente en BETA
if (inputBeta) {
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
    preVenta.innerHTML = '<p class="text-center text-gray-400 text-sm py-4">Sin productos</p>';
    return;
  }

  ventaActual.forEach((item, i) => {
    const div = document.createElement("div");
    div.className = "flex justify-between bg-gray-50 p-2 rounded items-center border border-gray-200";

    div.innerHTML = `
      <span class="text-sm">${escaparHTML(item.texto)}</span>
      <div class="flex gap-2 items-center">
        <span class="font-bold">$${item.subtotal.toFixed(2)}</span>
        <button class="text-red-500 text-sm p-1 hover:bg-red-100 rounded transition">
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

const btnFinalizar = document.getElementById("btnFinalizar");
if (btnFinalizar) {
  btnFinalizar.onclick = () => {
    if (!ventaActual || ventaActual.length === 0) {
      alert("❌ No hay productos en la venta");
      return;
    }

    if (!usuarioActual) {
      alert("❌ No hay usuario activo");
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

    renderVenta(venta);

    reset();
    if (modal) modal.close();

    actualizarTotalDia();
    actualizarGanancias();
    renderHistorial();

    alert("✅ Venta guardada correctamente\n📦 Inventario actualizado");
  };
}

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
  inputCantidad.value = "1";
  inputNombreLibre.value = "";
  inputCantidadLibre.value = "1";
  inputPrecioLibre.value = "";
  inputBeta.value = "";
  previewCatalogo.textContent = "";
  previewLibre.textContent = "";
  previewBeta.textContent = "";
  modoVenta = "catalogo";
  
  // Reset tabs
  modoCatalogo.classList.remove("hidden");
  modoLibre.classList.add("hidden");
  modoBeta.classList.add("hidden");
  
  tabCatalogo.classList.add("border-b-2", "border-blue-600", "text-blue-600", "font-bold");
  tabCatalogo.classList.remove("text-gray-600", "border-transparent");
  
  tabLibre.classList.remove("border-b-2", "border-blue-600", "text-blue-600", "font-bold");
  tabLibre.classList.add("text-gray-600", "border-transparent");
  
  tabBeta.classList.remove("border-b-2", "border-blue-600", "text-blue-600", "font-bold");
  tabBeta.classList.add("text-gray-600", "border-transparent");
}

// ======================================
// 🧾 RENDER VENTA (CARD)
// ======================================

function renderVenta(v) {
  const div = document.createElement("div");
  div.className = "bg-yellow-100 p-4 rounded border-l-4 border-yellow-400";

  const itemsHTML = v.items
    .map(
      it => `
    <div class="flex justify-between text-sm border-b py-1">
      <span>${escaparHTML(it.texto)}</span>
      <span>$${(it.subtotal || 0).toFixed(2)}</span>
    </div>
  `
    )
    .join("");

  div.innerHTML = `
    <div class="font-bold text-gray-700 mb-1">🧾 ${escaparHTML(v.usuario)}</div>
    <div class="text-xs text-gray-500 mb-2">${escaparHTML(v.fecha)}</div>
    <div class="bg-white rounded p-2 mb-2">${itemsHTML}</div>
    <div class="font-bold text-right text-lg text-green-600">Total: $${(v.total || 0).toFixed(2)}</div>
    <div class="flex gap-3 mt-3">
      <button class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm transition">📄 Ticket</button>
      <button class="text-red-500 ml-auto hover:bg-red-100 p-1 rounded transition"><i class="bi bi-trash"></i></button>
    </div>
  `;

  const btnTicket = div.querySelector(".bg-blue-500");
  if (btnTicket && typeof html2canvas !== "undefined") {
    btnTicket.onclick = () => {
      html2canvas(div, { scale: 2, backgroundColor: "#fff" }).then(canvas => {
        const link = document.createElement("a");
        link.href = canvas.toDataURL("image/png");
        link.download = `ticket-${usuarioActual}-${Date.now()}.png`;
        link.click();
      }).catch(err => console.error("Error al descargar ticket:", err));
    };
  }

  const btnEliminar = div.querySelector(".text-red-500");
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
    listaVentas.innerHTML = '<p class="p-4 text-gray-500">Sin ventas</p>';
    return;
  }

  const ventas = data[usuarioActual].ventas || [];
  
  if (ventas.length === 0) {
    listaVentas.innerHTML = '<p class="p-4 text-gray-500 text-center">Sin ventas registradas</p>';
    return;
  }

  ventas.forEach(renderVenta);
  actualizarTotalDia();
}

// ======================================
// 🆕 NUEVA VENTA
// ======================================

const btnNuevaVenta = document.getElementById("btnNuevaVenta");
if (btnNuevaVenta) {
  btnNuevaVenta.onclick = () => {
    reset();
    if (modal) {
      modal.showModal();
      selectProducto.focus();
    }
  };
}

// ======================================
// ❌ CERRAR MODAL
// ======================================

const btnCerrar = document.getElementById("btnCerrar");
if (btnCerrar) {
  btnCerrar.onclick = () => {
    if (modal) modal.close();
  };
}

// ======================================
// 📄 PDF - USUARIO
// ======================================

const btnPDF = document.getElementById("btnPDF");
if (btnPDF) {
  btnPDF.onclick = () => {
    // Verificar que jsPDF está disponible
    if (!window.jspdf || !window.jspdf.jsPDF) {
      alert("❌ Error: Las librerías PDF no se han cargado correctamente\n\nIntenta recargando la página (F5)");
      console.error("jsPDF no disponible:", window.jspdf);
      return;
    }

    const jsPDF = window.jspdf.jsPDF;
    const doc = new jsPDF();

    if (!data[usuarioActual]) {
      alert("No hay datos para generar PDF");
      return;
    }

    const ventas = data[usuarioActual].ventas || [];
    
    if (ventas.length === 0) {
      alert("No hay ventas registradas");
      return;
    }

    let y = 15;
    let totalDia = 0;
    let totalGanancia = 0;
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();

    // HEADER
    doc.setFontSize(20);
    doc.setTextColor(31, 41, 55);
    doc.text("REPORTE DE VENTAS", pageWidth / 2, y, { align: "center" });
    y += 8;

    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text(`Usuario: ${usuarioActual.toUpperCase()}`, pageWidth / 2, y, { align: "center" });
    y += 5;
    doc.text(`Fecha: ${new Date().toLocaleDateString()} - ${new Date().toLocaleTimeString()}`, pageWidth / 2, y, { align: "center" });
    y += 7;

    // LÍNEA SEPARADORA
    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(0.5);
    doc.line(15, y, pageWidth - 15, y);
    y += 8;

    // TABLA DE VENTAS
    ventas.forEach((v, indiceVenta) => {
      // Verificar si hay espacio para la venta
      if (y > pageHeight - 40) {
        doc.addPage();
        y = 15;
      }

      // Encabezado de venta
      doc.setFontSize(11);
      doc.setTextColor(31, 41, 55);
      doc.setFont(undefined, "bold");
      doc.text(`Venta #${indiceVenta + 1}`, 15, y);
      
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.setFont(undefined, "normal");
      doc.text(`${v.fecha}`, pageWidth - 15, y, { align: "right" });
      y += 6;

      // Items
      doc.setFontSize(9);
      let ventaTotal = 0;
      let ventaGanancia = 0;

      v.items.forEach(item => {
        if (y > pageHeight - 15) {
          doc.addPage();
          y = 15;
        }

        doc.setTextColor(55, 65, 81);
        const linea = `${item.cantidad}x ${item.texto}`;
        const lineasTexto = doc.splitTextToSize(linea, pageWidth - 35);
        
        lineasTexto.forEach((texto, idx) => {
          if (idx === 0) {
            doc.text(texto, 20, y);
            doc.setTextColor(34, 197, 94);
            doc.setFont(undefined, "bold");
            doc.text(`$${item.subtotal.toFixed(2)}`, pageWidth - 15, y, { align: "right" });
            doc.setTextColor(55, 65, 81);
            doc.setFont(undefined, "normal");
          } else {
            doc.text(texto, 20, y);
          }
          y += 4;
        });

        ventaTotal += item.subtotal;
        if (item.ganancia) {
          ventaGanancia += item.ganancia;
        }
      });

      // Subtotal de venta
      y += 2;
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.line(15, y, pageWidth - 15, y);
      y += 4;

      doc.setFont(undefined, "bold");
      doc.setTextColor(31, 41, 55);
      doc.setFontSize(10);
      doc.text("Subtotal Venta:", 15, y);
      doc.setTextColor(34, 197, 94);
      doc.text(`$${ventaTotal.toFixed(2)}`, pageWidth - 15, y, { align: "right" });
      
      if (ventaGanancia > 0) {
        y += 5;
        doc.setTextColor(59, 130, 246);
        doc.setFontSize(9);
        doc.text("Ganancia:", 15, y);
        doc.text(`$${ventaGanancia.toFixed(2)}`, pageWidth - 15, y, { align: "right" });
      }

      y += 8;
      totalDia += ventaTotal;
      totalGanancia += ventaGanancia;
    });

    // TOTAL FINAL
    y += 5;
    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(1);
    doc.line(15, y, pageWidth - 15, y);
    y += 6;

    doc.setFontSize(12);
    doc.setFont(undefined, "bold");
    doc.setTextColor(31, 41, 55);
    doc.text("TOTAL DEL DÍA:", 15, y);
    doc.setTextColor(34, 197, 94);
    doc.setFontSize(14);
    doc.text(`$${totalDia.toFixed(2)}`, pageWidth - 15, y, { align: "right" });

    if (totalGanancia > 0) {
      y += 7;
      doc.setFontSize(11);
      doc.setTextColor(59, 130, 246);
      doc.text("GANANCIA TOTAL:", 15, y);
      doc.text(`$${totalGanancia.toFixed(2)}`, pageWidth - 15, y, { align: "right" });
    }

    // GUARDAR
    const fechaFormato = new Date().toISOString().split('T')[0];
    doc.save(`venta-${usuarioActual}-${fechaFormato}.pdf`);
    
    alert("✅ PDF generado correctamente");
  };
}

// ======================================
// 📄 PDF GLOBAL - TODOS LOS USUARIOS
// ======================================

const btnPDFGlobal = document.getElementById("btnPDFGlobal");
if (btnPDFGlobal) {
  btnPDFGlobal.onclick = () => {
    // Verificar que jsPDF está disponible
    if (!window.jspdf || !window.jspdf.jsPDF) {
      alert("❌ Error: Las librerías PDF no se han cargado correctamente\n\nIntenta recargando la página (F5)");
      console.error("jsPDF no disponible:", window.jspdf);
      return;
    }

    const jsPDF = window.jspdf.jsPDF;
    const doc = new jsPDF();

    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 15;

    // HEADER GLOBAL
    doc.setFontSize(22);
    doc.setTextColor(31, 41, 55);
    doc.text("REPORTE GLOBAL DE VENTAS", pageWidth / 2, y, { align: "center" });
    y += 8;

    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text(`Fecha: ${new Date().toLocaleDateString()} - ${new Date().toLocaleTimeString()}`, pageWidth / 2, y, { align: "center" });
    y += 10;

    // LÍNEA SEPARADORA
    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(1);
    doc.line(15, y, pageWidth - 15, y);
    y += 10;

    let totalGlobalVentas = 0;
    let totalGlobalGanancia = 0;
    let totalGlobalProductos = 0;

    // RECORRER CADA USUARIO
    Object.keys(data).forEach((usuario, indiceUsuario) => {
      const ventas = data[usuario]?.ventas || [];
      
      if (ventas.length === 0) return;

      // Verificar si cabe el encabezado del usuario
      if (y > pageHeight - 50) {
        doc.addPage();
        y = 15;
      }

      // ENCABEZADO DE USUARIO
      doc.setFontSize(14);
      doc.setTextColor(59, 130, 246);
      doc.setFont(undefined, "bold");
      doc.text(`👤 ${usuario}`, 15, y);
      y += 7;

      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.setFont(undefined, "normal");

      let usuarioTotal = 0;
      let usuarioGanancia = 0;
      let usuarioProductos = 0;

      // VENTAS DEL USUARIO
      ventas.forEach((v, indiceVenta) => {
        if (y > pageHeight - 20) {
          doc.addPage();
          y = 15;
        }

        // Venta compacta
        doc.setTextColor(55, 65, 81);
        doc.setFontSize(8);
        doc.text(`Venta #${indiceVenta + 1} - ${v.fecha}`, 20, y);
        y += 4;

        let ventaSubtotal = 0;
        let ventaGanancia = 0;

        v.items.forEach(item => {
          if (y > pageHeight - 10) {
            doc.addPage();
            y = 15;
          }

          doc.setTextColor(75, 85, 99);
          doc.setFontSize(7.5);
          const textoItem = `• ${item.cantidad}x ${item.texto}`;
          doc.text(textoItem, 25, y);
          
          doc.setTextColor(34, 197, 94);
          doc.setFont(undefined, "bold");
          doc.text(`$${item.subtotal.toFixed(2)}`, pageWidth - 15, y, { align: "right" });
          doc.setFont(undefined, "normal");
          
          y += 3;
          ventaSubtotal += item.subtotal;
          usuarioProductos++;

          if (item.ganancia) {
            ventaGanancia += item.ganancia;
          }
        });

        y += 1;
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(8);
        doc.setFont(undefined, "bold");
        doc.text(`Subtotal: $${ventaSubtotal.toFixed(2)}`, 20, y);
        
        if (ventaGanancia > 0) {
          doc.setTextColor(59, 130, 246);
          doc.text(`Ganancia: $${ventaGanancia.toFixed(2)}`, pageWidth - 50, y);
        }
        
        y += 5;
        usuarioTotal += ventaSubtotal;
        usuarioGanancia += ventaGanancia;
      });

      // TOTAL POR USUARIO
      y += 2;
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.line(15, y, pageWidth - 15, y);
      y += 5;

      doc.setFontSize(10);
      doc.setFont(undefined, "bold");
      doc.setTextColor(31, 41, 55);
      doc.text(`Total ${usuario}:`, 15, y);
      doc.setTextColor(34, 197, 94);
      doc.text(`$${usuarioTotal.toFixed(2)}`, pageWidth - 15, y, { align: "right" });

      if (usuarioGanancia > 0) {
        y += 5;
        doc.setTextColor(59, 130, 246);
        doc.text(`Ganancia ${usuario}:`, 15, y);
        doc.text(`$${usuarioGanancia.toFixed(2)}`, pageWidth - 15, y, { align: "right" });
      }

      y += 10;
      totalGlobalVentas += usuarioTotal;
      totalGlobalGanancia += usuarioGanancia;
      totalGlobalProductos += usuarioProductos;
    });

    // RESUMEN GLOBAL FINAL
    y += 5;
    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(1.5);
    doc.line(15, y, pageWidth - 15, y);
    y += 8;

    doc.setFontSize(13);
    doc.setFont(undefined, "bold");
    doc.setTextColor(31, 41, 55);
    doc.text("TOTAL GLOBAL:", 15, y);
    doc.setTextColor(34, 197, 94);
    doc.setFontSize(16);
    doc.text(`$${totalGlobalVentas.toFixed(2)}`, pageWidth - 15, y, { align: "right" });

    y += 8;
    doc.setFontSize(11);
    doc.setTextColor(59, 130, 246);
    doc.text(`Ganancia Global: $${totalGlobalGanancia.toFixed(2)}`, 15, y);
    doc.text(`Productos Vendidos: ${totalGlobalProductos}`, pageWidth - 15, y, { align: "right" });

    y += 8;
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text(`Usuarios: ${Object.keys(data).filter(u => (data[u]?.ventas || []).length > 0).length}`, 15, y);

    // GUARDAR
    const fechaFormato = new Date().toISOString().split('T')[0];
    doc.save(`reporte-global-${fechaFormato}.pdf`);
    
    alert("✅ PDF Global generado correctamente");
  };
}

// ======================================
// 👤 LOGOUT
// ======================================

const btnLogout = document.getElementById("btnLogout");
if (btnLogout) {
  btnLogout.onclick = () => {
    localStorage.removeItem("usuarioActivo");
    usuarioActual = null;
    location.reload();
  };
}

// ======================================
// 💰 GANANCIAS (ADMIN)
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
  const btnInstall = document.getElementById("btnInstall");
  if (btnInstall) btnInstall.style.display = "block";
});

window.addEventListener("appinstalled", () => {
  console.log("✓ PWA instalada");
  const btnInstall = document.getElementById("btnInstall");
  if (btnInstall) btnInstall.style.display = "none";
});

const btnInstall = document.getElementById("btnInstall");
if (btnInstall) {
  btnInstall.onclick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === "accepted") {
      console.log("✓ Instalada correctamente");
    }
    deferredPrompt = null;
  };
}

function checkInstallStatus() {
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;

  if (isStandalone) {
    const btnInstall = document.getElementById("btnInstall");
    if (btnInstall) btnInstall.style.display = "none";
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
    togglePin.innerHTML = visible 
      ? '<i class="bi bi-eye-slash"></i>' 
      : '<i class="bi bi-eye"></i>';
  };
}

// ======================================
// 🔄 SINCRONIZACIÓN EN TIEMPO REAL
// ======================================
window.addEventListener("storage", (event) => {
  if (event.key === "inventarioPOS") {
    console.log("📡 Inventario actualizado desde otra pestaña");
    inventario = JSON.parse(event.newValue) || [];
    actualizarSelectProductos();
  }
});

console.log("✅ Script cargado correctamente");
