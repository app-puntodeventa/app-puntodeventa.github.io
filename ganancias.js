// ======================================
// 💰 GANANCIAS - ANÁLISIS
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
// 🔍 BUSCAR PRODUCTO
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
        ingresos: 0,
        costoTotal: 0,
        ganancia: 0,
        precioVenta: producto.precioVenta || 0,
        costo: producto.costo || 0
      };
    }

    const stats = productoStats[nombreKey];
    const cant = item.cantidad || 1;
    const ingreso = item.subtotal || 0;

    stats.cantidad += cant;
    stats.ingresos += ingreso;

    if (stats.costo > 0) {
      stats.costoTotal += stats.costo * cant;
    }
  });
});

// Calcular ganancia
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
// 🎨 ACTUALIZAR MÉTRICAS
// ======================================

document.getElementById("metricIngresos").textContent = totalIngresos.toFixed(0);
document.getElementById("metricCosto").textContent = totalCosto.toFixed(0);
document.getElementById("metricGanancia").textContent = gananciaNeta.toFixed(0);
document.getElementById("metricMargen").textContent = margenPorcentaje;

// Color dinámico para margen
const margenBadge = document.querySelector("[style*='--color-to: #6b21a8']");
if (margenPorcentaje > 40) {
  margenBadge.style.setProperty('--color-from', '#22c55e');
  margenBadge.style.setProperty('--color-to', '#166534');
} else if (margenPorcentaje > 25) {
  margenBadge.style.setProperty('--color-from', '#3b82f6');
  margenBadge.style.setProperty('--color-to', '#1e40af');
} else if (margenPorcentaje > 10) {
  margenBadge.style.setProperty('--color-from', '#f59e0b');
  margenBadge.style.setProperty('--color-to', '#b45309');
} else {
  margenBadge.style.setProperty('--color-from', '#ef4444');
  margenBadge.style.setProperty('--color-to', '#991b1b');
}

// ======================================
// 📋 TABLA DE PRODUCTOS
// ======================================

const tablaProductos = document.getElementById("tablaProductos");

let productos = Object.values(productoStats).sort((a, b) => b.ganancia - a.ganancia);

tablaProductos.innerHTML = productos.map(p => {
  const margen = p.ingresos > 0 ? ((p.ganancia / p.ingresos) * 100).toFixed(0) : 0;
  
  let margenBadge = "";
  if (margen >= 40) {
    margenBadge = `<span class="badge badge-excelente">✅ ${margen}%</span>`;
  } else if (margen >= 25) {
    margenBadge = `<span class="badge badge-bueno">👍 ${margen}%</span>`;
  } else if (margen >= 10) {
    margenBadge = `<span class="badge badge-advertencia">⚠️ ${margen}%</span>`;
  } else {
    margenBadge = `<span class="badge badge-bajo">❌ ${margen}%</span>`;
  }

  const colorGanancia = p.ganancia > 0 ? "text-green-600" : "text-gray-600";

  return `
    <tr class="border-b hover:bg-gray-50 transition">
      <td class="px-4 py-3 font-bold">${p.nombre.toUpperCase()}</td>
      <td class="px-4 py-3 text-center">${p.cantidad}</td>
      <td class="px-4 py-3 text-right">$${p.ingresos.toFixed(0)}</td>
      <td class="px-4 py-3 text-right">${p.costo > 0 ? '$' + p.costoTotal.toFixed(0) : '—'}</td>
      <td class="px-4 py-3 text-right font-bold ${colorGanancia}">$${p.ganancia.toFixed(0)}</td>
      <td class="px-4 py-3 text-center">${margenBadge}</td>
    </tr>
  `;
}).join("");

// ======================================
// 👥 RESUMEN POR USUARIO
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

    venta.items.forEach(item => {
      if (item.ganancia) {
        usuarioStats[venta.usuario].ganancia += item.ganancia;
      }
    });
  });

  tablaUsuarios.innerHTML = Object.entries(usuarioStats).map(([usuario, stats]) => {
    const margen = stats.ingresos > 0 ? ((stats.ganancia / stats.ingresos) * 100).toFixed(0) : 0;
    const colorGanancia = stats.ganancia > 0 ? "text-green-600" : "text-gray-600";

    return `
      <tr class="border-b hover:bg-gray-50 transition">
        <td class="px-4 py-3 font-bold">${usuario}</td>
        <td class="px-4 py-3 text-center">${stats.numVentas}</td>
        <td class="px-4 py-3 text-right font-bold">$${stats.ingresos.toFixed(0)}</td>
        <td class="px-4 py-3 text-right font-bold ${colorGanancia}">$${stats.ganancia.toFixed(0)}</td>
        <td class="px-4 py-3 text-center font-bold">${margen}%</td>
      </tr>
    `;
  }).join("");
}

// ======================================
// 🕐 HISTORIAL
// ======================================

const historialTransacciones = document.getElementById("historialTransacciones");

todasLasVentas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

todasLasVentas.slice(0, 20).forEach(venta => {
  let gananciaVenta = 0;
  venta.items.forEach(item => {
    if (item.ganancia) gananciaVenta += item.ganancia;
  });

  const colorGanancia = gananciaVenta > 0 ? "text-green-600" : "text-gray-600";

  const div = document.createElement("div");
  div.className = "border-l-4 border-blue-500 bg-blue-50 p-3 rounded hover:bg-blue-100 transition";

  div.innerHTML = `
    <div class="flex justify-between items-start">
      <div>
        <p class="font-bold text-sm">${venta.usuario}</p>
        <p class="text-xs text-gray-600">${venta.fecha}</p>
        <p class="text-xs text-gray-600">${venta.items.length} producto(s)</p>
      </div>
      <div class="text-right">
        <p class="font-bold">$${venta.total.toFixed(0)}</p>
        <p class="text-xs font-bold ${colorGanancia}">G: $${gananciaVenta.toFixed(0)}</p>
      </div>
    </div>
  `;

  historialTransacciones.appendChild(div);
});

console.log("✅ Análisis de ganancias cargado");
