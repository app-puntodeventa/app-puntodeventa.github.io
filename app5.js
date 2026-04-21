// ======================================
// 🔐 CONFIG / ESTADO GLOBAL
// ======================================

let usuarioActual = null;
let ventaActual = [];
let totalVenta = 0;
let modoVenta = "catalogo"; // "catalogo" o "libre"

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

const totalVentaSpan = document.getElementById("totalVenta");
const totalDiaSpan = document.getElementById("totalDia");
const listaVentas = document.getElementById("listaVentas");
const preVenta = document.getElementById("preVenta");

const tabCatalogo = document.getElementById("tabCatalogo");
const tabLibre = document.getElementById("tabLibre");
const modooCatalogo = document.getElementById("modooCatalogo");
const modoLibre = document.getElementById("modoLibre");

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
// 🔀 CAMBIAR MODO DE VENTA
// ======================================

if (tabCatalogo) {
  tabCatalogo.onclick = () => {
    modoVenta = "catalogo";
    modooCatalogo.classList.remove("hidden");
    modoLibre.classList.add("hidden");
    
    tabCatalogo.classList.add("border-b-2", "border-blue-600", "text-blue-600", "font-bold");
    tabCatalogo.classList.remove("text-gray-600", "border-transparent");
    
    tabLibre.classList.remove("border-b-2", "border-blue-600", "text-blue-600", "font-bold");
    tabLibre.classList.add("text-gray-600", "border-transparent");
  };
}

if (tabLibre) {
  tabLibre.onclick = () => {
    modoVenta = "libre";
    modoLibre.classList.remove("hidden");
    modooCatalogo.classList.add("hidden");
    
    tabLibre.classList.add("border-b-2", "border-blue-600", "text-blue-600", "font-bold");
    tabLibre.classList.remove("text-gray-600", "border-transparent");
    
    tabCatalogo.classList.remove("border-b-2", "border-blue-600", "text-blue-600", "font-bold");
    tabCatalogo.classList.add("text-gray-600", "border-transparent");
    
    inputNombreLibre.focus();
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
// ➕ AGREGAR PRODUCTO
// ======================================

// Agregar desde catálogo
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

// Agregar desde modo libre
const btnAgregarLibre = document.getElementById("btnAgregarLibre");
if (btnAgregarLibre) {
  btnAgregarLibre.onclick = () => {
    const nombre = inputNombreLibre.value.trim();
    const cantidad = Number(inputCantidadLibre.value) || 1;
    const precio = Number(inputPrecioLibre.value) || 0;

    if (!nombre) {
      alert("❌ Ingresa el nombre del producto");
      return;
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
  previewCatalogo.textContent = "";
  previewLibre.textContent = "";
  modoVenta = "catalogo";
  
  // Reset tabs
  modooCatalogo.classList.remove("hidden");
  modoLibre.classList.add("hidden");
  tabCatalogo.classList.add("border-b-2", "border-blue-600", "text-blue-600", "font-bold");
  tabCatalogo.classList.remove("text-gray-600", "border-transparent");
  tabLibre.classList.remove("border-b-2", "border-blue-600", "text-blue-600", "font-bold");
  tabLibre.classList.add("text-gray-600", "border-transparent");
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
// 📄 PDF REPORTES
// ======================================

const btnPDF = document.getElementById("btnPDF");
if (btnPDF) {
  btnPDF.onclick = () => {
    if (typeof jsPDF === "undefined") {
      alert("Error: jsPDF no está cargado");
      return;
    }

    const { jsPDF: jsPDFClass } = window.jspdf;
    const doc = new jsPDFClass();

    if (!data[usuarioActual]) {
      alert("No hay datos para generar PDF");
      return;
    }

    const ventas = data[usuarioActual].ventas || [];
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
        doc.text(`• ${it.texto} = $${(it.subtotal || 0).toFixed(2)}`, 10, y);
        y += 5;
      });

      doc.setFontSize(11);
      doc.text(`Total: $${(v.total || 0).toFixed(2)}`, 10, y);
      y += 8;

      doc.line(10, y, 200, y);
      y += 6;

      total += v.total || 0;

      if (y > 270) {
        doc.addPage();
        y = 10;
      }
    });

    doc.setFontSize(14);
    doc.text(`TOTAL DEL DÍA: $${total.toFixed(2)}`, 10, y + 10);

    doc.save(`reporte-${usuarioActual}.pdf`);
  };
}

const btnPDFGlobal = document.getElementById("btnPDFGlobal");
if (btnPDFGlobal) {
  btnPDFGlobal.onclick = () => {
    if (typeof jsPDF === "undefined") {
      alert("Error: jsPDF no está cargado");
      return;
    }

    const { jsPDF: jsPDFClass } = window.jspdf;
    const doc = new jsPDFClass();

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
          doc.text(`- ${it.texto} = $${(it.subtotal || 0).toFixed(2)}`, 10, y);
          y += 5;
        });

        doc.setFontSize(11);
        doc.text(`Total: $${(v.total || 0).toFixed(2)}`, 10, y);
        y += 8;

        totalGlobal += v.total || 0;

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
