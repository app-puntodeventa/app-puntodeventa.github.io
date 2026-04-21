/************************************
 * 🧼 UTILIDADES BASE
 ************************************/
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

/************************************
 * 🔐 ESTADO GLOBAL
 ************************************/
let usuarioActual = null;
let ventaActual = [];
let totalVenta = 0;

let data = JSON.parse(localStorage.getItem("dataPOS")) || {};

let inventario = (JSON.parse(localStorage.getItem("inventarioPOS")) || [])
  .map(normalizarProducto);

/************************************
 * 📦 INVENTARIO
 ************************************/
function guardarInventario() {
  localStorage.setItem("inventarioPOS", JSON.stringify(inventario));
}

function buscarProducto(nombre) {
  const n = normalizar(nombre);

  return inventario.find(p => {
    const base = normalizar(p.nombre);

    const matchNombre =
      n.includes(base) || base.includes(n);

    const matchAlias = (p.alias || []).some(a => {
      const al = normalizar(a);
      return n.includes(al) || al.includes(n);
    });

    return matchNombre || matchAlias;
  });
}

/************************************
 * 🧠 PARSER
 ************************************/
function parsear(texto) {
  const t = texto.toLowerCase();
  const nums = t.match(/\d+(\.\d+)?/g)?.map(Number) || [];

  let cantidad = 1;
  let precioUnitario = 0;
  let unidad = "pieza";

  if (t.includes("kg") || t.includes("kilo")) unidad = "kg";

  if (nums.length === 1) precioUnitario = nums[0];

  if (nums.length >= 2) {
    cantidad = nums[0];
    precioUnitario = nums[1];
  }

  const subtotal = cantidad * precioUnitario;

  return { texto, cantidad, precioUnitario, unidad, subtotal };
}

function extraerNombre(texto) {
  return (texto || "")
    .toLowerCase()
    .replace(/\d+/g, "")
    .replace(/\b(kilos?|kg|pieza?s?|pzas?|de|a|x|cada|uno|por|pesos?)\b/g, "")
    .trim();
}

/************************************
 * 🎯 DOM
 ************************************/
const modal = document.getElementById("modal");
const input = document.getElementById("inputProducto");
const preview = document.getElementById("preview");
const preVenta = document.getElementById("preVenta");

const totalVentaSpan = document.getElementById("totalVenta");
const totalDiaSpan = document.getElementById("totalDia");
const listaVentas = document.getElementById("listaVentas");

/************************************
 * 🔐 LOGIN
 ************************************/
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

  localStorage.setItem("usuarioActivo", usuarioActual);

  document.getElementById("loginScreen").style.display = "none";

  init();
};

/************************************
 * 🚀 INIT
 ************************************/
function init() {
  const user = localStorage.getItem("usuarioActivo");

  if (!user) {
    document.getElementById("loginScreen").style.display = "flex";
    return;
  }

  usuarioActual = user;

  document.getElementById("userLabel").textContent = usuarioActual;

  renderHistorial();
  actualizarTotalDia();
  renderProductosRapidos();
  actualizarSugerencias();
}

/************************************
 * 👀 PREVIEW
 ************************************/
input.addEventListener("input", () => {
  const v = input.value.trim();
  if (!v) return preview.textContent = "";

  const d = parsear(v);
  const nombre = extraerNombre(v);
  const producto = buscarProducto(nombre);

  if (producto) {
    preview.textContent = `📦 ${producto.nombre} | $${producto.precioVenta}`;
  } else {
    preview.textContent = `${d.cantidad} x ${d.precioUnitario} = $${d.subtotal}`;
  }
});

/************************************
 * ➕ AGREGAR VENTA
 ************************************/
function agregar() {
  const v = input.value.trim();
  if (!v) return;

  const d = parsear(v);

  const item = {
    texto: d.texto,
    cantidad: d.cantidad,
    unidad: d.unidad,
    precio: d.precioUnitario,
    subtotal: d.subtotal
  };

  ventaActual.push(item);
  totalVenta += item.subtotal;

  actualizarTotalVenta();
  renderPreVenta();

  input.value = "";
  preview.textContent = "";
}

document.getElementById("btnAdd").onclick = agregar;

input.addEventListener("keydown", e => {
  if (e.key === "Enter") agregar();
});

/************************************
 * 🧾 PREVENTA
 ************************************/
function renderPreVenta() {
  preVenta.innerHTML = "";

  ventaActual.forEach((item, i) => {
    const div = document.createElement("div");

    div.className = "flex justify-between bg-gray-100 p-2 rounded";

    div.innerHTML = `
      <span>${escaparHTML(item.texto)}</span>
      <span>$${item.subtotal}</span>
      <button>🗑</button>
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

/************************************
 * 💰 FINALIZAR
 ************************************/
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
  modal.close();
  actualizarTotalDia();
};

/************************************
 * 📊 TOTALES
 ************************************/
function actualizarTotalVenta() {
  totalVentaSpan.textContent = "$" + totalVenta;
}

function actualizarTotalDia() {
  const ventas = data[usuarioActual]?.ventas || [];
  const total = ventas.reduce((a, v) => a + v.total, 0);
  totalDiaSpan.textContent = "$" + total;
}

/************************************
 * 🔄 RESET
 ************************************/
function reset() {
  ventaActual = [];
  totalVenta = 0;
  actualizarTotalVenta();
  renderPreVenta();
}

/************************************
 * 🧾 RENDER VENTA
 ************************************/
function renderVenta(v) {
  const div = document.createElement("div");
  div.className = "bg-yellow-100 p-4 rounded";

  div.innerHTML = `
    <div><b>${v.usuario}</b></div>
    <div>${v.fecha}</div>
    <div>Total: $${v.total}</div>
  `;

  listaVentas.prepend(div);
}

/************************************
 * 📚 HISTORIAL
 ************************************/
function renderHistorial() {
  listaVentas.innerHTML = "";

  const ventas = data[usuarioActual]?.ventas || [];
  ventas.forEach(renderVenta);
}

/************************************
 * 🧾 PRODUCTOS RÁPIDOS
 ************************************/
function renderProductosRapidos() {
  // opcional simple
}

/************************************
 * 📦 INVENTARIO VENTA
 ************************************/
function registrarVentaEnInventario(item) {
  let p = buscarProducto(extraerNombre(item.texto));

  if (!p) {
    p = normalizarProducto({
      nombre: item.texto,
      stock: 0
    });

    inventario.push(p);
  }

  p.stock = Math.max(0, (p.stock || 0) - item.cantidad);

  guardarInventario();
}

/************************************
 * 🔔 INIT AUTO
 ************************************/
init();
