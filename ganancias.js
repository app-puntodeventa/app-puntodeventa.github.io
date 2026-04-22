// ======================================
// 📊 CARGA DE DATOS
// ======================================

let data = JSON.parse(localStorage.getItem("dataPOS")) || {};
let inventario = JSON.parse(localStorage.getItem("inventarioPOS")) || [];
let usuarioActual = localStorage.getItem("usuarioActivo") || "ADMIN";

// Juntar todas las ventas
let todasLasVentas = [];
Object.entries(data).forEach(([usuario, userData]) => {
  (userData.ventas || []).forEach(venta => {
    todasLasVentas.push({
      ...venta,
      usuario
    });
  });
});

// ======================================
// 🧠 NORMALIZAR BÚSQUEDA
// ======================================

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

// ======================================
// 📈 CALCULAR GANANCIAS POR PRODUCTO
// ======================================

let productoStats = {};

todasLasVentas.forEach(venta => {
  venta.items.forEach(item => {
    const producto = buscarProducto(item.texto);
    
    if (!producto) return;

    const nombreKey = producto.nombre.toLowerCase();

    if (!productoStats[nombreKey]) {
      productoStats[nombreKey] = {
        nombre: producto.nombre,
        cantidad: 0,
        precioVenta: producto.precioVenta || 0,
        costo: producto.costo || 0,
        ingresos: 0,
        costoTotal: 0,
        ganancia: 0,
        ventas: 0
      };
    }

    const stats = productoStats[nombreKey];
    const cant = item.cantidad || 1;
    const precio = item.precio || producto.precioVenta || 0;
    const ingreso = item.subtotal || (cant * precio);

    stats.cantidad += cant;
    stats.ingresos += ingreso;
    stats.ventas += 1;

    if (stats.costo > 0) {
      stats.costoTotal += stats.costo * cant;
    }
  });
});

// Calcular ganancias
Object.values(productoStats).forEach(stat => {
  stat.ganancia = stat.ingresos - stat.costoTotal;
});

// ======================================
// 📊 TOTALES GENERALES
// ======================================

let totalIngresos = Object.values(productoStats).reduce((sum, p) => sum + p.ingresos, 0);
let totalCosto = Object.values(productoStats).reduce((sum, p) => sum + p.costoTotal, 0);
let gananciaNeta = totalIngresos - totalCosto;
let margenPorcentaje = totalIngresos > 0 ? ((gananciaNeta / totalIngresos) * 100).toFixed(1) : 0;

// ======================================
// 🎨 ACTUALIZAR UI - RESUMEN
// ======================================

document.getElementById("totalIngresos").textContent = "$" + totalIngresos.toFixed(2);
document.getElementById("totalCostoProduccion").textContent = "$" + totalCosto.toFixed(2);
document.getElementById("gananciaNeta").textContent = "$" + gananciaNeta.toFixed(2);
document.getElementById("margenPorcentaje").textContent = margenPorcentaje + "%";

// Color dinámico para margen
const elMargen = document.getElementById("margenPorcentaje");
if (margenPorcentaje > 30) {
  elMargen.parentElement.className = "bg-gradient-to-br from-green-500 to-green-600 text-white p-4 rounded shadow-lg";
} else if (margenPorcentaje > 15) {
  elMargen.parentElement.className = "bg-gradient-to-br from-yellow-500 to-yellow-600 text-white p-4 rounded shadow-lg";
} else {
  elMargen.parentElement.className = "bg-gradient-to-br from-orange-500 to-orange-600 text-white p-4 rounded shadow-lg";
}

// ======================================
// 📋 LLENAR TABLA DE PRODUCTOS
// ======================================

const tablaProductos = document.getElementById("tablaProductos");

// Filtro
const filtroSoloConCosto = document.getElementById("filtroSoloConCosto");
const btnActualizar = document.getElementById("btnActualizar");

function renderTabla() {
  tablaProductos.innerHTML = "";

  let productos = Object.values(productoStats);

  if (filtroSoloConCosto.checked) {
    productos = productos.filter(p => p.costo > 0);
  }

  if (productos.length === 0) {
    tablaProductos.innerHTML = `
      <tr>
        <td colspan="8" class="text-center p-4 text-gray-400">
          ${filtroSoloConCosto.checked ? "No hay productos con costo registrado" : "No hay datos"}
        </td>
      </tr>
    `;
    return;
  }

  // Ordenar por ganancia descendente
  productos.sort((a, b) => b.ganancia - a.ganancia);

  productos.forEach(p => {
    const margen = p.ingresos > 0 ? ((p.ganancia / p.ingresos) * 100).toFixed(1) : 0;

    const colorGanancia = p.ganancia >= 0 ? "text-green-600" : "text-red-600";
    const colorMargen = margen > 30 ? "text-green-600" : margen > 15 ? "text-yellow-600" : "text-red-600";

    const row = document.createElement("tr");
    row.className = "hover:bg-gray-50 border-b";
    row.innerHTML = `
      <td class="border p-2"><strong>${p.nombre.toUpperCase()}</strong></td>
      <td class="border p-2 text-right">${p.cantidad}</td>
      <td class="border p-2 text-right">$${p.precioVenta.toFixed(2)}</td>
      <td class="border p-2 text-right font-bold text-blue-600">$${p.ingresos.toFixed(2)}</td>
      <td class="border p-2 text-right">${p.costo > 0 ? "$" + p.costo.toFixed(2) : "—"}</td>
      <td class="border p-2 text-right">${p.costo > 0 ? "$" + p.costoTotal.toFixed(2) : "—"}</td>
      <td class="border p-2 text-right font-bold ${colorGanancia}">$${p.ganancia.toFixed(2)}</td>
      <td class="border p-2 text-right font-bold ${colorMargen}">${margen}%</td>
    `;

    tablaProductos.appendChild(row);
  });
}

renderTabla();

// Actualizar tabla al cambiar filtro
btnActualizar.addEventListener("click", renderTabla);
filtroSoloConCosto.addEventListener("change", renderTabla);

// ======================================
// 👥 RESUMEN POR USUARIO (ADMIN)
// ======================================

if (usuarioActual === "ADMIN") {
  const resumenUsuarios = document.getElementById("resumenUsuarios");
  const tablaUsuarios = document.getElementById("tablaUsuarios");

  resumenUsuarios.classList.remove("hidden");

  let usuarioStats = {};

  todasLasVentas.forEach(venta => {
    if (!usuarioStats[venta.usuario]) {
      usuarioStats[venta.usuario] = {
        numVentas: 0,
        ingresos: 0,
        ganancia: 0
      };
    }

    usuarioStats[venta.usuario].numVentas += 1;
    usuarioStats[venta.usuario].ingresos += venta.total || 0;

    // Calcular ganancia
    venta.items.forEach(item => {
      if (item.ganancia) {
        usuarioStats[venta.usuario].ganancia += item.ganancia;
      }
    });
  });

  // Renderizar tabla de usuarios
  Object.entries(usuarioStats).forEach(([usuario, stats]) => {
    const margen = stats.ingresos > 0 ? ((stats.ganancia / stats.ingresos) * 100).toFixed(1) : 0;
    const colorGanancia = stats.ganancia >= 0 ? "text-green-600" : "text-red-600";

    const row = document.createElement("tr");
    row.innerHTML = `
      <td class="border p-2"><strong>${usuario}</strong></td>
      <td class="border p-2 text-right">${stats.numVentas}</td>
      <td class="border p-2 text-right font-bold">$${stats.ingresos.toFixed(2)}</td>
      <td class="border p-2 text-right font-bold ${colorGanancia}">$${stats.ganancia.toFixed(2)}</td>
      <td class="border p-2 text-right font-bold">${margen}%</td>
    `;

    tablaUsuarios.appendChild(row);
  });
}

// ======================================
// 🕐 HISTORIAL DE TRANSACCIONES
// ======================================

const historialTransacciones = document.getElementById("historialTransacciones");

// Ordenar ventas por fecha descendente
todasLasVentas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

// Mostrar últimas 20 transacciones
todasLasVentas.slice(0, 20).forEach(venta => {
  let gananciaVenta = 0;
  venta.items.forEach(item => {
    if (item.ganancia) gananciaVenta += item.ganancia;
  });

  const div = document.createElement("div");
  div.className = "border-l-4 border-blue-500 bg-blue-50 p-3 rounded flex justify-between items-center hover:bg-blue-100 transition";

  const colorGanancia = gananciaVenta >= 0 ? "text-green-600" : "text-red-600";

  div.innerHTML = `
    <div>
      <p class="font-bold text-sm">${venta.usuario} - ${venta.fecha}</p>
      <p class="text-xs text-gray-500">${venta.items.length} producto(s)</p>
    </div>
    <div class="text-right">
      <p class="font-bold">$${venta.total.toFixed(2)}</p>
      <p class="text-xs font-bold ${colorGanancia}">Ganancia: $${gananciaVenta.toFixed(2)}</p>
    </div>
  `;

  historialTransacciones.appendChild(div);
});

// ======================================
// 📥 EXPORTAR A CSV
// ======================================

const btnExportar = document.getElementById("btnExportar");

btnExportar.addEventListener("click", () => {
  let csv = "PRODUCTO,CANTIDAD,PRECIO_UNITARIO,INGRESOS,COSTO_UNITARIO,COSTO_TOTAL,GANANCIA,MARGEN_%\n";

  Object.values(productoStats).forEach(p => {
    const margen = p.ingresos > 0 ? ((p.ganancia / p.ingresos) * 100).toFixed(1) : 0;
    csv += `"${p.nombre}",${p.cantidad},$${p.precioVenta.toFixed(2)},$${p.ingresos.toFixed(2)},$${p.costo.toFixed(2)},$${p.costoTotal.toFixed(2)},$${p.ganancia.toFixed(2)},${margen}%\n`;
  });

  // Resumen
  csv += `\nRESUMEN,,,,\n`;
  csv += `Total Ingresos,,,,$${totalIngresos.toFixed(2)}\n`;
  csv += `Total Costo,,,,$${totalCosto.toFixed(2)}\n`;
  csv += `Ganancia Neta,,,,$${gananciaNeta.toFixed(2)}\n`;
  csv += `Margen %,,,${margenPorcentaje}%\n`;

  // Descargar
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `ganancias-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
});

console.log("✅ Ganancias cargadas correctamente");
