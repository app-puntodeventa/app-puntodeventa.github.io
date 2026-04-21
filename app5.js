"use strict";

/* ==============================
🔐 ESTADO GLOBAL
============================== */

let usuarioActual = null;
let ventaActual = [];
let totalVenta = 0;

let data = JSON.parse(localStorage.getItem("dataPOS")) || {};

let inventario = (JSON.parse(localStorage.getItem("inventarioPOS")) || [])
  .map(normalizarProducto);

/* ==============================
🧠 UTILIDADES
============================== */

function normalizarProducto(p) {
  return {
    id: p.id || Date.now(),
    nombre: (p.nombre || "").toLowerCase().trim(),
    stock: Number(p.stock ?? p.cantidad ?? 0),
    costo: Number(p.costo ?? 0),
    precioVenta: Number(p.precioVenta ?? p.precio ?? 0),
    unidad: p.unidad || "pieza",
    alias: p.alias || []
  };
}

function normalizar(texto) {
  return (texto || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s]/g, "");
}

function escaparHTML(texto) {
  return (texto || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function extraerNombre(texto) {
  return (texto || "")
    .toLowerCase()
    .replace(/\d+/g, "")
    .replace(/\b(kilos?|kg|pieza?s?|pzas?|de|a|x|cada|uno|por|pesos?)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/* ==============================
📦 INVENTARIO
============================== */

function buscarProducto(nombre) {
  const n = normalizar(nombre);

  return inventario.find(p => {
    const base = normalizar(p.nombre);

    const matchNombre =
      n.includes(base) || base.includes(n);

    const matchAlias =
      (p.alias || []).some(a => {
        const al = normalizar(a);
        return n.includes(al) || al.includes(n);
      });

    return matchNombre || matchAlias;
  });
}

function registrarVentaEnInventario(item) {
  const nombre = extraerNombre(item.texto);
  let producto = buscarProducto(nombre);

  if (!producto) {
    producto = normalizarProducto({
      nombre,
      stock: 0,
      costo: item.costoUnitario || 0,
      precioVenta: item.precio,
      unidad: item.unidad,
      alias: [nombre]
    });

    inventario.push(producto);
  }

  producto.stock = Math.max(0, (producto.stock || 0) - item.cantidad);

  localStorage.setItem("inventarioPOS", JSON.stringify(inventario));
}

/* ==============================
🔐 LOGIN
============================== */

const VALID_PINS = {
  "4829": "ADMIN",
  "7391": "TURNO 1",
  "6158": "TURNO 2"
};

document.getElementById("btnLogin").onclick = () => {
  const pin = document.getElementById("pinInput").value;

  if (!VALID_PINS[pin]) return alert("PIN incorrecto");

  usuarioActual = VALID_PINS[pin];

  if (!data[usuarioActual]) {
    data[usuarioActual] = { ventas: [] };
  }

  localStorage.setItem("usuarioActivo", usuarioActual);

  document.getElementById("loginScreen").style.display = "none";

  init();
};

/* ==============================
🚀 INIT
============================== */

function init() {
  const user = localStorage.getItem("usuarioActivo");

  if (!user) {
    document.getElementById("loginScreen").style.display = "flex";
    return;
  }

  usuarioActual = user;

  document.getElementById("loginScreen").style.display = "none";
  document.getElementById("userLabel").textContent = usuarioActual;

  renderHistorial();
  actualizarTotalDia();
  actualizarSugerencias();
  renderProductosRapidos();
  actualizarGanancias();
}

/* ==============================
🔎 PARSER
============================== */

function parsear(texto) {
  const t = texto.toLowerCase();
  const nums = t.match(/\d+(\.\d+)?/g)?.map(Number) || [];

  let cantidad = 1;
  let precioUnitario = nums[0] || 0;
  let unidad = "pieza";
  let modoLote = true;

  if (t.includes("kg") || t.includes("kilo")) unidad = "kg";

  if (nums.length >= 2) {
    cantidad = nums[0];
    precioUnitario = nums[1];
  }

  const subtotal = cantidad * precioUnitario;

  return {
    texto,
    cantidad,
    precioUnitario,
    unidad,
    subtotal,
    modoLote
  };
}

/* ==============================
👀 PREVIEW
============================== */

const input = document.getElementById("inputProducto");
const preview = document.getElementById("preview");

input.addEventListener("input", () => {
  const v = input.value.trim();

  if (!v) {
    preview.textContent = "";
    return;
  }

  const d = parsear(v);
  const nombreDetectado = extraerNombre(v);

  const producto = buscarProducto(nombreDetectado);

  if (producto) {
    preview.textContent = `📦 ${producto.nombre} | $${producto.precioVenta}`;
  } else {
    preview.textContent = `${d.cantidad} x ${d.precioUnitario} = $${d.subtotal}`;
  }
});

/* ==============================
➕ AGREGAR
============================== */

function agregar() {
  const v = input.value.trim();
  if (!v) return;

  const d = parsear(v);

  const item = {
    texto: d.texto,
    cantidad: d.cantidad,
    unidad: d.unidad,
    precio: d.precioUnitario,
    costoUnitario: 0,
    subtotal: d.subtotal
  };

  registrarVentaEnInventario(item);

  ventaActual.push(item);
  totalVenta += item.subtotal;

  actualizarTotalVenta();
  renderPreVenta();

  input.value = "";
  preview.textContent = "";
}

input.addEventListener("keydown", e => {
  if (e.key === "Enter") agregar();
});

document.getElementById("btnAdd").onclick = agregar;

/* ==============================
🧾 PREVENTA
============================== */

function renderPreVenta() {
  const preVenta = document.getElementById("preVenta");
  preVenta.innerHTML = "";

  ventaActual.forEach((item, i) => {
    const div = document.createElement("div");

    div.className = "flex justify-between bg-gray-100 p-2 rounded";

    div.innerHTML = `
      <span>${escaparHTML(item.texto)}</span>
      <span>$${item.subtotal}</span>
    `;

    preVenta.appendChild(div);
  });
}

/* ==============================
💰 FINALIZAR VENTA
============================== */

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
};

/* ==============================
🔄 RESET
============================== */

function reset() {
  ventaActual = [];
  totalVenta = 0;
  renderPreVenta();
  actualizarTotalVenta();
}

/* ==============================
💰 TOTALES
============================== */

function actualizarTotalVenta() {
  document.getElementById("totalVenta").textContent = "$" + totalVenta;
}

function actualizarTotalDia() {
  const ventas = data[usuarioActual]?.ventas || [];
  const total = ventas.reduce((a, v) => a + v.total, 0);

  document.getElementById("totalDia").textContent = "$" + total;
}

/* ==============================
🧾 HISTORIAL
============================== */

function renderHistorial() {
  const lista = document.getElementById("listaVentas");
  lista.innerHTML = "";

  const ventas = data[usuarioActual]?.ventas || [];
  ventas.forEach(renderVenta);
}

/* ==============================
🧾 VENTA CARD
============================== */

function renderVenta(v) {
  const lista = document.getElementById("listaVentas");

  const div = document.createElement("div");
  div.className = "p-3 bg-yellow-100 rounded";

  div.innerHTML = `
    <div class="font-bold">${v.usuario}</div>
    <div class="text-xs">${v.fecha}</div>
    <div class="font-bold">Total: $${v.total}</div>
  `;

  lista.prepend(div);
}

/* ==============================
📦 SUGERENCIAS
============================== */

function actualizarSugerencias() {
  const datalist = document.getElementById("sugerencias");
  datalist.innerHTML = "";

  inventario.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.nombre;
    datalist.appendChild(opt);
  });
}

/* ==============================
💸 GANANCIAS
============================== */

function actualizarGanancias() {
  if (usuarioActual !== "ADMIN") return;

  const ventas = data[usuarioActual]?.ventas || [];

  let ingresos = 0;

  ventas.forEach(v => ingresos += v.total);

  document.getElementById("gananciaIngresos").textContent = "$" + ingresos;
  document.getElementById("gananciaVentas").textContent = ventas.length;
}

/* ==============================
📦 PRODUCTOS RAPIDOS
============================== */

function renderProductosRapidos() {
  const panel = document.getElementById("panelProductos");
  if (!panel) return;

  panel.innerHTML = "";

  inventario.slice(0, 20).forEach(p => {
    const btn = document.createElement("button");

    btn.className = "p-2 border rounded";
    btn.textContent = `${p.nombre} $${p.precioVenta}`;

    panel.appendChild(btn);
  });
}

/* ==============================
🚀 AUTO LOGIN
============================== */

init();
