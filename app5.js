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
    costo: p.costo !== null && p.costo !== undefined ? Number(p.costo) : null,
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

/**
 * 🔑 SINCRONIZA INVENTARIO CON LOCALSTORAGE
 */
function sincronizarInventario() {
  inventario = inventario.map(p => normalizarProducto(p));
  localStorage.setItem("inventarioPOS", JSON.stringify(inventario));
  console.log("✓ Inventario sincronizado:", inventario.length, "productos");
}

/**
 * 🆕 AGREGAR O ACTUALIZAR PRODUCTO EN INVENTARIO
 */
function actualizarProductoInventario(nombre, precioVenta, unidad = "pieza", cantidad = 0) {
  const nombreNormalizado = nombre.toLowerCase().trim();
  
  let producto = buscarProducto(nombreNormalizado);

  if (producto) {
    console.log(`📦 Producto encontrado: "${producto.nombre}"`);

    // Agregar alias si no existe
    const aliasNormal = normalizar(nombreNormalizado);
    if (!(producto.alias || []).some(a => normalizar(a) === aliasNormal)) {
      producto.alias.push(nombreNormalizado);
    }

    // Actualizar stock si se especifica
    if (cantidad > 0) {
      producto.stock = (producto.stock || 0) + cantidad;
    }
  } else {
    // Crear nuevo producto en inventario
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

  checkInstallStatus();
  renderHistorial();
  actualizarTotalDia();
  actualizarSugerencias();
  actualizarSelectProductos();
  actualizarGanancias();
}

/**
 * 🆕 ACTUALIZAR SELECT DE PRODUCTOS
 */
function actualizarSelectProductos() {
  if (!selectProducto) {
    console.warn("selectProducto no encontrado");
    return;
  }

  // Remover opciones excepto la primera
  const opcionesExistentes = selectProducto.querySelectorAll("option:not(:first-child)");
  opcionesExistentes.forEach(opt => opt.remove());

  // Agrupar por primera letra para mejor organización
  const productosOrdenados = [...inventario].sort((a, b) => a.nombre.localeCompare(b.nombre));

  productosOrdenados.forEach(p => {
    const option = document.createElement("option");
    option.value = p.nombre;
    option.textContent = `${p.nombre.toUpperCase()} - $${(p.precioVenta || 0).toFixed(2)} (${p.stock || 0})`;
    selectProducto.appendChild(option);
  });
}

/**
 * Actualiza la lista de sugerencias del datalist
 */
function actualizarSugerencias() {
  const datalist = document.getElementById("sugerencias");
  if (!datalist) return;

  datalist.innerHTML = "";
  
  // Agregar todos los nombres de productos
  inventario.forEach(p => {
    const option = document.createElement("option");
    option.value = p.nombre;
    datalist.appendChild(option);
  });

  // Agregar todos los alias
  inventario.forEach(p => {
    (p.alias || []).forEach(alias => {
      if (alias !== p.nombre) {
        const option = document.createElement("option");
        option.value = alias;
        datalist.appendChild(option);
      }
    });
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
  } else if (t.includes("g") && !t.includes("kg")) {
    unidad = "g";
  } else if (t.includes("litro") || t.includes("l")) {
    unidad = "l";
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
    .replace(/\b(kilos?|kg|gramos?|g|litros?|l|pieza?s?|pzas?|de|a|x|cada|uno|por|pesos?)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ======================================
// 👀 PREVIEW Y EVENTOS
// ======================================

/**
 * Cuando selecciona producto del SELECT
 */
if (selectProducto) {
  selectProducto.addEventListener("change", () => {
    const nombreSeleccionado = selectProducto.value;
    
    if (!nombreSeleccionado) {
      input.value = "";
      preview.textContent = "";
      return;
    }

    const producto = buscarProducto(nombreSeleccionado);
    
    if (producto) {
      const stock = producto.stock > 0 ? `(${producto.stock} en stock)` : "(sin stock)";
      preview.innerHTML = `
        <div class="flex justify-between items-center">
          <span>📦 ${producto.nombre} - $${(producto.precioVenta || 0).toFixed(2)}</span>
          <span class="text-xs">${stock}</span>
        </div>
      `;
      
      // Auto-llenar cantidad en el input
      input.value = "1";
      input.focus();
    }
  });
}

/**
 * Cuando escribe en el input de cantidad/precio
 */
if (input) {
  input.addEventListener("input", () => {
    const v = input.value.trim().toLowerCase();
    
    if (!v || !selectProducto || selectProducto.value === "") {
      preview.textContent = "";
      return;
    }

    const d = parsear(v);

    if (d.precioUnitario > 0) {
      const nombreSeleccionado = selectProducto.value;
      const producto = buscarProducto(nombreSeleccionado);

      if (producto) {
        const totalCalc = d.cantidad * d.precioUnitario;
        preview.innerHTML = `
          <div class="flex justify-between">
            <span>${d.cantidad} × ${producto.nombre}</span>
            <span class="font-bold">$${totalCalc.toFixed(2)}</span>
          </div>
        `;
      }
    }
  });
}

// ======================================
// ➕ AGREGAR PRODUCTO
// ======================================

function agregar() {
  if (!selectProducto) {
    alert("❌ Error: SELECT no encontrado");
    return;
  }

  const nombreSeleccionado = selectProducto.value;
  
  if (!nombreSeleccionado) {
    alert("❌ Selecciona un producto primero");
    return;
  }

  const cantidadInput = input.value.trim();
  
  if (!cantidadInput) {
    alert("❌ Ingresa cantidad o precio");
    return;
  }

  const d = parsear(cantidadInput);
  
  if (d.precioUnitario <= 0 && d.cantidad <= 0) {
    alert("❌ Valores inválidos");
    return;
  }

  const producto = buscarProducto(nombreSeleccionado);
  
  if (!producto) {
    alert("❌ Producto no encontrado");
    return;
  }

  // Usar el precio del producto del inventario si no especificó precio
  let precioFinal = d.precioUnitario > 0 ? d.precioUnitario : (producto.precioVenta || 0);
  let cantidadFinal = d.cantidad > 0 ? d.cantidad : 1;
  const subtotal = cantidadFinal * precioFinal;

  // 🆕 PREGUNTAR SI DESEA ACTUALIZAR PRECIO
  if (d.precioUnitario > 0 && producto.precioVenta > 0 && producto.precioVenta !== d.precioUnitario) {
    const confirmar = confirm(
      `⚠️ El precio de "${producto.nombre}" en inventario es $${producto.precioVenta.toFixed(2)}\n\n¿Deseas actualizarlo a $${d.precioUnitario.toFixed(2)}?\n\nSí = Actualizar\nNo = Usar precio anterior`
    );

    if (confirmar) {
      producto.precioVenta = d.precioUnitario;
      sincronizarInventario();
      actualizarSelectProductos();
      console.log(`✅ Precio actualizado: $${producto.precioVenta}`);
    } else {
      precioFinal = producto.precioVenta;
    }
  }

  // Si es nuevo producto pero ingresó precio, agregarlo
  if (producto.precioVenta === 0 && d.precioUnitario > 0) {
    actualizarProductoInventario(
      nombreSeleccionado,
      d.precioUnitario,
      producto.unidad,
      0
    );
  }

  // Calcular ganancia solo si hay costo válido
  let gananciaEstimada = 0;
  if (producto.costo && producto.costo > 0) {
    gananciaEstimada = subtotal - (producto.costo * cantidadFinal);
  }

  // Agregar a venta actual
  ventaActual.push({
    id: Date.now(),
    usuario: usuarioActual,
    texto: `${cantidadFinal} ${producto.unidad || "pieza"} ${producto.nombre}`,
    cantidad: cantidadFinal,
    unidad: producto.unidad || "pieza",
    precio: precioFinal,
    multi: true,
    subtotal,
    costoUnitario: producto.costo || 0,
    ganancia: gananciaEstimada
  });

  totalVenta += subtotal;
  actualizarTotalVenta();

  // Limpiar
  selectProducto.value = "";
  input.value = "";
  preview.textContent = "";
  
  renderPreVenta();
  actualizarSelectProductos();

  navigator.vibrate?.(30);
}

if (input) {
  input.addEventListener("keydown", e => {
    if (e.key === "Enter") agregar();
  });
}

// Buscar y configurar botón de agregar
let btnAdd = document.getElementById("btnAdd");
if (btnAdd) {
  btnAdd.onclick = agregar;
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
    console.log("btnFinalizar clicked");
    console.log("ventaActual:", ventaActual);

    if (!ventaActual || ventaActual.length === 0) {
      alert("❌ No hay productos en la venta");
      return;
    }

    if (!usuarioActual) {
      alert("❌ No hay usuario activo");
      return;
    }

    // Crear objeto de venta
    const venta = {
      items: JSON.parse(JSON.stringify(ventaActual)),
      total: totalVenta,
      usuario: usuarioActual,
      fecha: new Date().toLocaleString()
    };

    console.log("Venta a guardar:", venta);

    // Asegurar que el usuario existe en data
    if (!data[usuarioActual]) {
      data[usuarioActual] = { ventas: [] };
    }

    // Guardar venta
    data[usuarioActual].ventas.push(venta);
    localStorage.setItem("dataPOS", JSON.stringify(data));

    console.log("Venta guardada en localStorage");

    // Renderizar la tarjeta
    renderVenta(venta);

    // Limpiar y cerrar
    reset();
    if (modal) modal.close();

    // Actualizar totales
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
  if (selectProducto) selectProducto.value = "";
  if (input) input.value = "";
  if (preview) preview.textContent = "";
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

  // Descargar ticket como imagen
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

  // Eliminar venta
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
    console.log("btnNuevaVenta clicked");
    reset();
    if (modal) {
      modal.showModal();
      console.log("Modal abierto");
      if (selectProducto) {
        selectProducto.focus();
      }
    } else {
      console.error("Modal no encontrado");
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

  if (!data[usuarioActual]) {
    return;
  }

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
    actualizarSugerencias();
    actualizarSelectProductos();
  }
});

console.log("✅ Script cargado correctamente");
