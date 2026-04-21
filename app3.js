// ======================================
// 🧠 UTILIDAD
// ======================================
function $(id) {
  return document.getElementById(id);
}

// ======================================
// 📦 INVENTARIO (SEGURO)
// ======================================
let inventario = [];

try {
  inventario = JSON.parse(localStorage.getItem("inventario")) || [];
} catch (e) {
  inventario = [];
}

if (!Array.isArray(inventario)) inventario = [];

if (inventario.length === 0) {
  inventario = [
    { nombre: "cuaderno", precio: 25, stock: 20 },
    { nombre: "lapiz", precio: 5, stock: 100 },
    { nombre: "pluma", precio: 10, stock: 50 },
    { nombre: "borrador", precio: 8, stock: 30 }
  ];
}

function guardarInventario() {
  localStorage.setItem("inventario", JSON.stringify(inventario));
}

// ======================================
// 🔐 ESTADO GLOBAL
// ======================================
let usuarioActual = null;
let ventaActual = [];
let totalVenta = 0;

let data = JSON.parse(localStorage.getItem("dataPOS")) || {};

// PINs (solo demo local)
const VALID_PINS = {
  "4829": "ADMIN",
  "7391": "TURNO 1",
  "6158": "TURNO 2"
};

// ======================================
// 🎯 DOM
// ======================================
const modal = $("modal");
const input = $("inputProducto");
const preview = $("preview");
const totalVentaSpan = $("totalVenta");
const totalDiaSpan = $("totalDia");
const listaVentas = $("listaVentas");
const preVenta = $("preVenta");

// ======================================
// 🔐 LOGIN SEGURO
// ======================================
$("btnLogin").onclick = () => {
  const pin = $("pinInput").value.trim();

  if (!VALID_PINS[pin]) {
    alert("PIN incorrecto");
    return;
  }

  usuarioActual = VALID_PINS[pin];

  if (!data[usuarioActual]) {
    data[usuarioActual] = { ventas: [] };
  }

  localStorage.setItem("usuarioActivo", usuarioActual);

  $("loginScreen").style.display = "none";

  init();
};

// ======================================
// 🚀 INIT (ORDEN CORRECTO)
// ======================================
function init() {
  const user = localStorage.getItem("usuarioActivo");

  if (!user || !VALID_PINS_REV()[user]) {
    $("loginScreen").style.display = "flex";
    return;
  }

  usuarioActual = user;

  $("userLabel").textContent = usuarioActual;

  renderHistorial();
  actualizarTotalDia();
}

// reverse lookup seguro
function VALID_PINS_REV() {
  const rev = {};
  Object.entries(VALID_PINS).forEach(([k, v]) => rev[v] = k);
  return rev;
}

// ======================================
// 🧠 PARSER
// ======================================
function parsear(texto) {
  const t = texto.toLowerCase();
  const nums = t.match(/\d+(\.\d+)?/g)?.map(Number) || [];

  let cantidad = 1;
  let precio = 0;
  let multi = false;

  if (nums.length >= 2) {
    cantidad = nums[0];
    precio = nums[1];
    multi = true;
  } else if (nums.length === 1) {
    precio = nums[0];
  }

  return { texto, cantidad, precio, multi };
}

// ======================================
// ➕ AGREGAR PRODUCTO
// ======================================
function agregar() {
  const v = input.value.trim();
  if (!v) return;

  const d = parsear(v);

  const nombre = d.texto.toLowerCase();
  const producto = inventario.find(p => nombre.includes(p.nombre));

  let subtotal = 0;

  if (producto) {
    subtotal = d.cantidad * producto.precio;
    producto.stock -= d.cantidad;
    if (producto.stock < 0) producto.stock = 0;
    guardarInventario();
  } else {
    subtotal = d.multi ? d.cantidad * d.precio : d.precio;
  }

  ventaActual.push({
    id: Date.now(),
    texto: d.texto,
    subtotal
  });

  totalVenta += subtotal;

  actualizarTotalVenta();
  renderPreVenta();

  input.value = "";
  preview.textContent = "";
}

// ======================================
// 🧾 PREVENTA
// ======================================
function renderPreVenta() {
  preVenta.innerHTML = "";

  ventaActual.forEach((item, i) => {
    const div = document.createElement("div");
    div.className = "flex justify-between bg-gray-100 p-2 rounded";

    div.innerHTML = `
      <span>${item.texto}</span>
      <span>$${item.subtotal}</span>
      <button>❌</button>
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
// 💰 FINALIZAR
// ======================================
$("btnFinalizar").onclick = () => {
  if (!ventaActual.length) return;

  const venta = {
    items: ventaActual,
    total: totalVenta,
    fecha: new Date().toLocaleString()
  };

  data[usuarioActual].ventas.push(venta);

  localStorage.setItem("dataPOS", JSON.stringify(data));

  renderVenta(venta);

  reset();
  modal.close();
  actualizarTotalDia();
};

// ======================================
// 🔄 RESET
// ======================================
function reset() {
  ventaActual = [];
  totalVenta = 0;
  actualizarTotalVenta();
  renderPreVenta();
}

// ======================================
// 💰 TOTALES
// ======================================
function actualizarTotalVenta() {
  totalVentaSpan.textContent = "$" + totalVenta;
}

function actualizarTotalDia() {
  const ventas = data[usuarioActual]?.ventas || [];
  const total = ventas.reduce((a, v) => a + v.total, 0);
  totalDiaSpan.textContent = "$" + total;
}

// ======================================
// 🧾 HISTORIAL
// ======================================
function renderHistorial() {
  listaVentas.innerHTML = "";

  const ventas = data[usuarioActual]?.ventas || [];

  ventas.forEach(v => {
    const div = document.createElement("div");
    div.className = "bg-yellow-100 p-3 rounded mb-2";

    div.innerHTML = `
      <div>${v.fecha}</div>
      <div>Total: $${v.total}</div>
    `;

    listaVentas.prepend(div);
  });
}

// ======================================
// 🆕 NUEVA VENTA
// ======================================
$("btnNuevaVenta").onclick = () => {
  reset();
  modal.showModal();
};

// ======================================
// ❌ LOGOUT
// ======================================
$("btnLogout").onclick = () => {
  localStorage.removeItem("usuarioActivo");
  location.reload();
};

// ======================================
// 🔐 ENTER KEY
// ======================================
input.addEventListener("keydown", e => {
  if (e.key === "Enter") agregar();
});

$("btnAdd").onclick = agregar;




document.getElementById("fileExcel").addEventListener("change", (e) => {

  const file = e.target.files[0];
  if (!file) return;

  importarExcel(file, (inventarioNuevo) => {

    inventario = inventarioNuevo;

    guardarInventario();
    renderInventario();

    alert("Inventario importado correctamente");
  });
});



document.getElementById("btnExportExcel").onclick = () => {
  exportarExcel(inventario);
};








