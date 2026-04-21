"use strict";

/* =====================================================
🔐 ESTADO GLOBAL
===================================================== */

const STORAGE_DATA = "dataPOS";
const STORAGE_INV = "inventarioPOS";
const STORAGE_USER = "usuarioActivo";

let usuarioActual = localStorage.getItem(STORAGE_USER);
let ventaActual = [];
let totalVenta = 0;

let data = JSON.parse(localStorage.getItem(STORAGE_DATA)) || {};
let inventario = (JSON.parse(localStorage.getItem(STORAGE_INV)) || [])
  .map(normalizarProducto);

/* =====================================================
🧠 UTILIDADES
===================================================== */

function saveAll() {
  localStorage.setItem(STORAGE_DATA, JSON.stringify(data));
  localStorage.setItem(STORAGE_INV, JSON.stringify(inventario));
}

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

function norm(t) {
  return (t || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s]/g, "");
}

function escapeHTML(t) {
  return (t || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function extraerNombre(t) {
  return (t || "")
    .toLowerCase()
    .replace(/\d+/g, "")
    .replace(/\b(kilos?|kg|pieza?s?|pzas?|de|x|cada|uno|por)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/* =====================================================
📦 INVENTARIO
===================================================== */

function buscarProducto(nombre) {
  const n = norm(nombre);

  return inventario.find(p => {
    const base = norm(p.nombre);

    const matchNombre = n.includes(base) || base.includes(n);

    const matchAlias = (p.alias || []).some(a => {
      const al = norm(a);
      return n.includes(al) || al.includes(n);
    });

    return matchNombre || matchAlias;
  });
}

function registrarInventario(item) {
  const nombre = extraerNombre(item.texto);
  let p = buscarProducto(nombre);

  if (!p) {
    p = normalizarProducto({
      nombre,
      stock: 0,
      costo: item.costoUnitario || 0,
      precioVenta: item.precio,
      unidad: item.unidad,
      alias: [nombre]
    });
    inventario.push(p);
  }

  p.stock = Math.max(0, (p.stock || 0) - item.cantidad);

  saveAll();
}

/* =====================================================
🔐 LOGIN
===================================================== */

const VALID_PINS = {
  "4829": "ADMIN",
  "7391": "TURNO 1",
  "6158": "TURNO 2"
};

document.getElementById("btnLogin").onclick = () => {
  const pin = document.getElementById("pinInput").value;

  if (!VALID_PINS[pin]) return alert("PIN incorrecto");

  usuarioActual = VALID_PINS[pin];

  if (!data[usuarioActual]) data[usuarioActual] = { ventas: [] };

  localStorage.setItem(STORAGE_USER, usuarioActual);

  document.getElementById("loginScreen").style.display = "none";

  init();
};

/* =====================================================
🚀 INIT
===================================================== */

function init() {
  if (!usuarioActual) {
    document.getElementById("loginScreen").style.display = "flex";
    return;
  }

  document.getElementById("loginScreen").style.display = "none";
  document.getElementById("userLabel").textContent = usuarioActual;

  renderHistorial();
  actualizarUI();
}

/* =====================================================
🧠 PARSER
===================================================== */

function parsear(texto) {
  const nums = texto.match(/\d+(\.\d+)?/g)?.map(Number) || [];

  let cantidad = nums[0] || 1;
  let precio = nums[1] || nums[0] || 0;

  return {
    texto,
    cantidad,
    precio,
    subtotal: cantidad * precio
  };
}

/* =====================================================
➕ VENTAS
===================================================== */

const input = document.getElementById("inputProducto");
const preview = document.getElementById("preview");

function agregar() {
  const v = input.value.trim();
  if (!v) return;

  const d = parsear(v);

  const item = {
    texto: v,
    cantidad: d.cantidad,
    precio: d.precio,
    subtotal: d.subtotal,
    costoUnitario: 0
  };

  registrarInventario(item);

  ventaActual.push(item);
  totalVenta += item.subtotal;

  actualizarUI();

  input.value = "";
  preview.textContent = "";
}

input.addEventListener("keydown", e => {
  if (e.key === "Enter") agregar();
});

document.getElementById("btnAdd").onclick = agregar;

/* =====================================================
🧾 PREVENTA
===================================================== */

function renderPreVenta() {
  const el = document.getElementById("preVenta");
  el.innerHTML = "";

  ventaActual.forEach((i, idx) => {
    const div = document.createElement("div");

    div.className = "flex justify-between p-2 bg-gray-100 rounded";
    div.innerHTML = `
      <span>${escapeHTML(i.texto)}</span>
      <span>$${i.subtotal}</span>
    `;

    el.appendChild(div);
  });
}

/* =====================================================
💰 FINALIZAR VENTA
===================================================== */

document.getElementById("btnFinalizar").onclick = () => {
  if (!ventaActual.length) return;

  const venta = {
    items: ventaActual,
    total: totalVenta,
    usuario: usuarioActual,
    fecha: new Date().toLocaleString()
  };

  data[usuarioActual].ventas.push(venta);

  saveAll();

  renderVenta(venta);

  reset();
};

/* =====================================================
🔄 RESET
===================================================== */

function reset() {
  ventaActual = [];
  totalVenta = 0;
  actualizarUI();
}

/* =====================================================
📊 UI CENTRAL
===================================================== */

function actualizarUI() {
  document.getElementById("totalVenta").textContent = "$" + totalVenta;
  renderPreVenta();
}

/* =====================================================
🧾 HISTORIAL
===================================================== */

function renderHistorial() {
  const el = document.getElementById("listaVentas");
  el.innerHTML = "";

  const ventas = data[usuarioActual]?.ventas || [];
  ventas.forEach(renderVenta);
}

function renderVenta(v) {
  const el = document.getElementById("listaVentas");

  const div = document.createElement("div");
  div.className = "p-3 bg-yellow-100 rounded";

  div.innerHTML = `
    <div><b>${v.usuario}</b></div>
    <div>${v.fecha}</div>
    <div><b>Total: $${v.total}</b></div>
  `;

  el.prepend(div);
}

/* =====================================================
📦 SUGERENCIAS
===================================================== */

function actualizarSugerencias() {
  const d = document.getElementById("sugerencias");
  d.innerHTML = "";

  inventario.forEach(p => {
    const o = document.createElement("option");
    o.value = p.nombre;
    d.appendChild(o);
  });
}

/* =====================================================
💸 GANANCIAS (ADMIN)
===================================================== */

function actualizarGanancias() {
  if (usuarioActual !== "ADMIN") return;

  const ventas = data[usuarioActual]?.ventas || [];

  let total = 0;
  ventas.forEach(v => total += v.total);

  document.getElementById("gananciaIngresos").textContent = "$" + total;
  document.getElementById("gananciaVentas").textContent = ventas.length;
}

/* =====================================================
🚀 AUTO START
===================================================== */

init();
