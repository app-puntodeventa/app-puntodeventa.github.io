// ======================================
// 📦 INVENTARIO - JAVASCRIPT (FIXED SAFE)
// ======================================

let inventario = JSON.parse(localStorage.getItem("inventarioPOS")) || [];
let productoEditando = null;
let filtroActual = "todos";

const tablaInventario = document.getElementById("tablaInventario");
const searchInventario = document.getElementById("searchInventario");
const modalEditar = document.getElementById("modalEditar");
const modalNuevo = document.getElementById("modalNuevo");

// ======================================
// 🎨 RENDER TABLA
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

    const gananciaColor = ganancia > 0 ? "text-green-600" : ganancia === 0 ? "text-gray-600" : "text-red-600";

    return `
      <tr class="border-b hover:bg-gray-50 transition">
        <td class="px-4 py-3 font-bold text-gray-800">${p.nombre.toUpperCase()}</td>
        <td class="px-4 py-3 text-center">${stockBadge}</td>
        <td class="px-4 py-3 text-right">${costoBadge}</td>
        <td class="px-4 py-3 text-right font-bold">$${p.precioVenta || 0}</td>
        <td class="px-4 py-3 text-center ${gananciaColor} font-bold">
          $${ganancia} <span class="text-xs">(${margen}%)</span>
        </td>
        <td class="px-4 py-3 text-center">
          <button class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm transition"
            onclick="abrirEdicion('${p.id}')">
            ✏️ Editar
          </button>
        </td>
      </tr>
    `;
  }).join("");

  actualizarStats();
}

// ======================================
// 📊 STATS
// ======================================

function actualizarStats() {
  const bajosStock = inventario.filter(p => p.stock <= 5).length;
  const sinCosto = inventario.filter(p => !p.costo || p.costo === 0).length;
  const valorTotal = inventario.reduce((sum, p) => sum + ((p.costo || 0) * p.stock), 0);

  document.getElementById("statTotal").textContent = inventario.length;
  document.getElementById("statBajo").textContent = bajosStock;
  document.getElementById("statSinCosto").textContent = sinCosto;
  document.getElementById("statValor").textContent = "$" + valorTotal.toFixed(0);
}

// ======================================
// 🔍 FILTROS
// ======================================

function filtrarInventario() {
  let productos = inventario;

  if (filtroActual === "bajo") {
    productos = productos.filter(p => p.stock <= 5);
  } else if (filtroActual === "sincosto") {
    productos = productos.filter(p => !p.costo || p.costo === 0);
  }

  if (searchInventario?.value) {
    const query = searchInventario.value.toLowerCase();
    productos = productos.filter(p => p.nombre.toLowerCase().includes(query));
  }

  return productos;
}

function renderConFiltros() {
  renderTabla(filtrarInventario());
}

searchInventario?.addEventListener("input", renderConFiltros);

// ======================================
// 🔘 BOTONES FILTRO (SAFE)
// ======================================

document.getElementById("filterTodos")?.addEventListener("click", () => {
  filtroActual = "todos";
  renderConFiltros();
});

document.getElementById("filterBajoStock")?.addEventListener("click", () => {
  filtroActual = "bajo";
  renderConFiltros();
});

document.getElementById("filterSinCosto")?.addEventListener("click", () => {
  filtroActual = "sincosto";
  renderConFiltros();
});

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
  const costo = Number(document.getElementById("editCosto")?.value) || 0;
  const precio = Number(document.getElementById("editPrecio")?.value) || 0;

  const ganancia = precio - costo;
  const margen = precio > 0 ? Math.round((ganancia / precio) * 100) : 0;

  document.getElementById("editGanancia").textContent = `$${ganancia}`;
  document.getElementById("editMargen").textContent = `${margen}%`;
}

// ======================================
// 🔥 FIX CLAVE (EVITA CRASH)
// ======================================

const editCosto = document.getElementById("editCosto");
const editPrecio = document.getElementById("editPrecio");

if (editCosto) {
  editCosto.addEventListener("input", actualizarCalculosEdicion);
}

if (editPrecio) {
  editPrecio.addEventListener("input", actualizarCalculosEdicion);
}

// ======================================
// 🚀 INICIALIZAR
// ======================================

renderTabla();
actualizarStats();

console.log("✅ Inventario cargado correctamente (SAFE MODE)");
