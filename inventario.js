// ======================================
// 📦 INVENTARIO - JAVASCRIPT
// ======================================

let inventario = JSON.parse(localStorage.getItem("inventarioPOS")) || [];
let productoEditando = null;
let filtroActual = "todos";

const tablaInventario = document.getElementById("tablaInventario");
const tarjetasInventario = document.getElementById("tarjetasInventario");
const searchInventario = document.getElementById("searchInventario");
const modalEditar = document.getElementById("modalEditar");
const modalNuevo = document.getElementById("modalNuevo");

// ======================================
// 🎨 RENDER TABLA (Desktop)
// ======================================

function renderTabla(productos = inventario) {
  if (productos.length === 0) {
    tablaInventario.innerHTML = `
      <tr>
        <td colspan="6" class="text-center p-8 text-gray-400">
          <i class="bi bi-inbox" style="font-size: 2rem;"></i><br>
          Sin productos
        </td>
      </tr>
    `;
    return;
  }

  tablaInventario.innerHTML = productos.map(p => {
    const ganancia = (p.precioVenta || 0) - (p.costo || 0);
    const margen = p.precioVenta > 0 ? Math.round((ganancia / p.precioVenta) * 100) : 0;
    
    let stockBadge = p.stock <= 5 
      ? `<span class="badge badge-stock-bajo">⚠️ ${p.stock}</span>`
      : `<span class="badge badge-stock-ok">✅ ${p.stock}</span>`;

    let costoBadge = !p.costo || p.costo === 0
      ? `<span class="badge badge-sin-costo">Sin definir</span>`
      : `$${p.costo}`;

    const ganananciaColor = ganancia > 0 ? "text-green-600" : ganancia === 0 ? "text-gray-600" : "text-red-600";

    return `
      <tr class="border-b hover:bg-gray-50 transition">
        <td class="px-4 py-3 font-bold text-gray-800">${p.nombre.toUpperCase()}</td>
        <td class="px-4 py-3 text-center">${stockBadge}</td>
        <td class="px-4 py-3 text-right">${costoBadge}</td>
        <td class="px-4 py-3 text-right font-bold">$${p.precioVenta || 0}</td>
        <td class="px-4 py-3 text-center ${ganananciaColor} font-bold">
          $${ganancia} <span class="text-xs">(${margen}%)</span>
        </td>
        <td class="px-4 py-3 text-center">
          <button class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm transition" onclick="abrirEdicion('${p.id}')">
            ✏️ Editar
          </button>
        </td>
      </tr>
    `;
  }).join("");

  actualizarStats();
}

// ======================================
// 📱 RENDER TARJETAS (Mobile)
// ======================================

function renderTarjetas(productos = inventario) {
  if (productos.length === 0) {
    tarjetasInventario.innerHTML = `
      <div class="text-center py-8 text-gray-400">
        <i class="bi bi-inbox" style="font-size: 2rem;"></i><br>
        <p>Sin productos</p>
      </div>
    `;
    return;
  }

  tarjetasInventario.innerHTML = productos.map(p => {
    const ganancia = (p.precioVenta || 0) - (p.costo || 0);
    const margen = p.precioVenta > 0 ? Math.round((ganancia / p.precioVenta) * 100) : 0;
    
    let stockBadge = p.stock <= 5 
      ? `<span class="badge badge-stock-bajo">⚠️ ${p.stock}</span>`
      : `<span class="badge badge-stock-ok">✅ ${p.stock}</span>`;

    let costoBadge = !p.costo || p.costo === 0
      ? `Sin definir`
      : `$${p.costo}`;

    const ganananciaColor = ganancia > 0 ? "text-green-600" : ganancia === 0 ? "text-gray-600" : "text-red-600";

    return `
      <div class="producto-card">
        <div class="producto-card-header">
          <div class="producto-card-titulo">${p.nombre.toUpperCase()}</div>
          <div>${stockBadge}</div>
        </div>

        <div class="producto-card-body">
          <div class="producto-card-field">
            <span class="producto-card-label">Costo</span>
            <span class="producto-card-value">${costoBadge}</span>
          </div>
          <div class="producto-card-field">
            <span class="producto-card-label">Venta</span>
            <span class="producto-card-value">$${p.precioVenta || 0}</span>
          </div>
        </div>

        <div class="producto-card-ganancia">
          <strong>Ganancia/U:</strong> <span class="${ganananciaColor}">$${ganancia}</span> 
          <span class="text-gray-600">(${margen}%)</span>
        </div>

        <div class="producto-card-acciones">
          <button class="btn-editar-mobile" onclick="abrirEdicion('${p.id}')">
            ✏️ Editar
          </button>
          <button class="btn-excel-mobile" onclick="exportarProductoExcel('${p.id}')">
            📊 Excel
          </button>
        </div>
      </div>
    `;
  }).join("");

  actualizarStats();
}

// ======================================
// 📊 ACTUALIZAR STATS
// ======================================

function actualizarStats() {
  const filtrados = filtrarInventario();
  const bajosStock = inventario.filter(p => p.stock <= 5).length;
  const sinCosto = inventario.filter(p => !p.costo || p.costo === 0).length;
  const valorTotal = inventario.reduce((sum, p) => sum + ((p.costo || 0) * p.stock), 0);

  document.getElementById("statTotal").textContent = inventario.length;
  document.getElementById("statBajo").textContent = bajosStock;
  document.getElementById("statSinCosto").textContent = sinCosto;
  document.getElementById("statValor").textContent = "$" + valorTotal.toFixed(0);
}

// ======================================
// 🔍 FILTRAR
// ======================================

function filtrarInventario() {
  let productos = inventario;

  if (filtroActual === "bajo") {
    productos = productos.filter(p => p.stock <= 5);
  } else if (filtroActual === "sincosto") {
    productos = productos.filter(p => !p.costo || p.costo === 0);
  }

  if (searchInventario.value) {
    const query = searchInventario.value.toLowerCase();
    productos = productos.filter(p => p.nombre.toLowerCase().includes(query));
  }

  return productos;
}

// ======================================
// 🔄 RENDER CON FILTROS (Desktop + Mobile)
// ======================================

function renderConFiltros() {
  renderTabla(filtrarInventario());
  renderTarjetas(filtrarInventario());
}

searchInventario.addEventListener("input", renderConFiltros);

document.getElementById("filterTodos").onclick = () => {
  filtroActual = "todos";
  document.querySelectorAll("[id^=filter]").forEach(btn => btn.classList.remove("bg-blue-100", "text-blue-700"));
  document.getElementById("filterTodos").classList.add("bg-blue-100", "text-blue-700");
  renderConFiltros();
};

document.getElementById("filterBajoStock").onclick = () => {
  filtroActual = "bajo";
  document.querySelectorAll("[id^=filter]").forEach(btn => btn.classList.remove("bg-blue-100", "text-blue-700"));
  document.getElementById("filterBajoStock").classList.add("bg-blue-100", "text-blue-700");
  renderConFiltros();
};

document.getElementById("filterSinCosto").onclick = () => {
  filtroActual = "sincosto";
  document.querySelectorAll("[id^=filter]").forEach(btn => btn.classList.remove("bg-blue-100", "text-blue-700"));
  document.getElementById("filterSinCosto").classList.add("bg-blue-100", "text-blue-700");
  renderConFiltros();
};

// ======================================
// ✏️ EDITAR PRODUCTO
// ======================================

function abrirEdicion(id) {
  const p = inventario.find(x => x.id == id);
  if (!p) return;

  productoEditando = p;

  document.getElementById("editNombre").value = p.nombre;
  document.getElementById("editStock").value = p.stock || 0;
  document.getElementById("editCosto").value = p.costo || "";
  document.getElementById("editPrecio").value = p.precioVenta || 0;

  actualizarCalculosEdicion();
  modalEditar.showModal();
}

function actualizarCalculosEdicion() {
  const costo = Number(document.getElementById("editCosto").value) || 0;
  const precio = Number(document.getElementById("editPrecio").value) || 0;
  const ganancia = precio - costo;
  const margen = precio > 0 ? Math.round((ganancia / precio) * 100) : 0;

  document.getElementById("editGanancia").textContent = `$${ganancia}`;
  document.getElementById("editMargen").textContent = `${margen}%`;
}

document.getElementById("editCosto").addEventListener("input", actualizarCalculosEdicion);
document.getElementById("editPrecio").addEventListener("input", actualizarCalculosEdicion);

document.getElementById("btnCalcularCosto").onclick = () => {
  const precio = Number(document.getElementById("editPrecio").value) || 0;
  if (precio > 0) {
    const costoSugerido = Math.round(precio * 0.6); // 40% margen
    document.getElementById("editCosto").value = costoSugerido;
    actualizarCalculosEdicion();
  }
};

document.getElementById("btnGuardarEdicion").onclick = () => {
  if (!productoEditando) return;

  productoEditando.nombre = document.getElementById("editNombre").value.toLowerCase().trim() || productoEditando.nombre;
  productoEditando.stock = Number(document.getElementById("editStock").value) || 0;
  productoEditando.costo = Number(document.getElementById("editCosto").value) || null;
  productoEditando.precioVenta = Number(document.getElementById("editPrecio").value) || 0;

  localStorage.setItem("inventarioPOS", JSON.stringify(inventario));
  renderConFiltros();
  modalEditar.close();
  alert("✅ Producto actualizado");
};

document.getElementById("btnEliminarProducto").onclick = () => {
  if (!productoEditando) return;
  
  if (confirm("⚠️ ¿Eliminar este producto?\n\nEsta acción no se puede deshacer.")) {
    inventario = inventario.filter(p => p.id !== productoEditando.id);
    localStorage.setItem("inventarioPOS", JSON.stringify(inventario));
    renderConFiltros();
    modalEditar.close();
    alert("✅ Producto eliminado");
  }
};

document.getElementById("btnCancelarEdicion").onclick = () => {
  modalEditar.close();
};

// ======================================
// ➕ NUEVO PRODUCTO
// ======================================

document.getElementById("btnNuevoProducto").onclick = () => {
  document.getElementById("nuevoNombre").value = "";
  document.getElementById("nuevoStock").value = "0";
  document.getElementById("nuevoCosto").value = "";
  document.getElementById("nuevoPrecio").value = "";
  document.getElementById("nuevaUnidad").value = "pieza";
  modalNuevo.showModal();
};

document.getElementById("btnGuardarNuevo").onclick = () => {
  const nombre = document.getElementById("nuevoNombre").value.toLowerCase().trim();
  const precio = Number(document.getElementById("nuevoPrecio").value);

  if (!nombre) {
    alert("❌ Ingresa nombre del producto");
    return;
  }

  if (precio <= 0) {
    alert("❌ Ingresa precio válido");
    return;
  }

  if (inventario.find(p => p.nombre === nombre)) {
    alert("❌ Producto ya existe");
    return;
  }

  const nuevoProducto = {
    id: Date.now(),
    nombre,
    stock: Number(document.getElementById("nuevoStock").value) || 0,
    costo: Number(document.getElementById("nuevoCosto").value) || null,
    precioVenta: precio,
    unidad: document.getElementById("nuevaUnidad").value,
    alias: [nombre],
    fechaCreacion: new Date().toLocaleString()
  };

  inventario.push(nuevoProducto);
  localStorage.setItem("inventarioPOS", JSON.stringify(inventario));
  renderConFiltros();
  modalNuevo.close();
  alert("✅ Producto creado");
};

document.getElementById("btnCancelarNuevo").onclick = () => {
  modalNuevo.close();
};

// ======================================
// 📊 EXPORTAR A EXCEL
// ======================================

function generarCSV() {
  const productos = filtrarInventario();
  
  if (productos.length === 0) {
    alert("❌ No hay productos para exportar");
    return;
  }

  // Headers
  let csv = "NOMBRE,STOCK,COSTO,PRECIO VENTA,GANANCIA/U,MARGEN %\n";

  // Data
  productos.forEach(p => {
    const ganancia = (p.precioVenta || 0) - (p.costo || 0);
    const margen = p.precioVenta > 0 ? Math.round((ganancia / p.precioVenta) * 100) : 0;
    const costo = p.costo || "";

    csv += `"${p.nombre.toUpperCase()}",${p.stock || 0},${costo},${p.precioVenta || 0},${ganancia},${margen}%\n`;
  });

  return csv;
}

function descargarCSV(contenido, nombreArchivo) {
  const blob = new Blob([contenido], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  
  if (navigator.msSaveBlob) {
    // IE 10+
    navigator.msSaveBlob(blob, nombreArchivo);
  } else {
    link.href = URL.createObjectURL(blob);
    link.download = nombreArchivo;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

function exportarProductoExcel(id) {
  const p = inventario.find(x => x.id == id);
  if (!p) return;

  const ganancia = (p.precioVenta || 0) - (p.costo || 0);
  const margen = p.precioVenta > 0 ? Math.round((ganancia / p.precioVenta) * 100) : 0;
  const costo = p.costo || "Sin definir";

  const csv = `NOMBRE,STOCK,COSTO,PRECIO VENTA,GANANCIA/U,MARGEN %\n"${p.nombre.toUpperCase()}",${p.stock || 0},${costo},${p.precioVenta || 0},${ganancia},${margen}%`;

  descargarCSV(csv, `producto-${p.nombre}-${new Date().toISOString().split('T')[0]}.csv`);
}

document.getElementById("btnExportarExcel").onclick = () => {
  const csv = generarCSV();
  if (csv) {
    descargarCSV(csv, `inventario-${new Date().toISOString().split('T')[0]}.csv`);
  }
};

// ======================================
// 🚀 INICIALIZAR
// ======================================

renderTabla();
renderTarjetas();
actualizarStats();

console.log("✅ Inventario cargado - Responsive + Excel activado");
