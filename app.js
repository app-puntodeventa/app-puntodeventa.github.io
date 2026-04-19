
// ==============================
// 🔥 ESTADO GLOBAL
// ==============================

let usuarioActual = null;
let ventaActual = [];
let totalVenta = 0;

let data = JSON.parse(localStorage.getItem("dataPOS")) || {};


// ==============================
// 🔐 PINES FIJOS (SEGURIDAD BÁSICA)
// ==============================

const VALID_PINS = {
  "4829": "ADMIN",
  "7391": "TURNO 1",
  "6158": "TURNO 2"
};


// ==============================
// 🎯 DOM
// ==============================

const modal = document.getElementById("modal");
const input = document.getElementById("inputProducto");
const preview = document.getElementById("preview");

const totalVentaSpan = document.getElementById("totalVenta");
const totalDiaSpan = document.getElementById("totalDia");

const listaVentas = document.getElementById("listaVentas");


// ==============================
// 🔐 LOGIN REAL
// ==============================

document.getElementById("btnLogin").onclick = () => {

  const pin = document.getElementById("pinInput").value;

  if (!VALID_PINS[pin]) {
    alert("PIN incorrecto");
    return;
  }

  usuarioActual = pin;

  if (!data[pin]) {
    data[pin] = {
      nombre: VALID_PINS[pin],
      ventas: []
    };
  }

  localStorage.setItem("usuarioActivo", pin);

  document.getElementById("loginScreen").style.display = "none";

  init();
};


// ==============================
// 🚀 INIT (BLOQUEA SIN LOGIN)
// ==============================

function init() {

  const pin = localStorage.getItem("usuarioActivo");

  if (!pin || !VALID_PINS[pin]) {
    document.getElementById("loginScreen").style.display = "flex";
    return;
  }

  usuarioActual = pin;

  renderHistorial();
  actualizarTotalDia();
}

init();


// ==============================
// 🧠 PARSER
// ==============================

function parsear(texto) {

  const nums = texto.match(/\d+(\.\d+)?/g)?.map(Number) || [];

  let cantidad = 1;
  let precio = 0;
  let multi = false;

  if (nums.length === 1) precio = nums[0];

  if (nums.length >= 2) {
    cantidad = nums[0];
    precio = nums[1];
    multi = true;
  }

  return { texto, cantidad, precio, multi };
}


// ==============================
// 👀 PREVIEW
// ==============================

input.addEventListener("input", () => {

  const v = input.value.trim();
  if (!v) return preview.textContent = "";

  const d = parsear(v);

  if (!d.multi) return preview.textContent = "";

  preview.textContent = `${d.cantidad} x ${d.precio} = $${d.cantidad * d.precio}`;
});


// ==============================
// ➕ AGREGAR
// ==============================

input.addEventListener("keydown", (e) => {

  if (e.key !== "Enter") return;

  const v = input.value.trim();
  if (!v) return;

  const d = parsear(v);

  const subtotal = d.multi ? d.cantidad * d.precio : d.precio;

  ventaActual.push({
    id: Date.now(),
    ...d,
    subtotal
  });

  totalVenta += subtotal;

  actualizarTotalVenta();

  input.value = "";
  preview.textContent = "";

  renderPreVenta();
});


// ==============================
// 🧾 PREVENTA
// ==============================

function renderPreVenta() {

  const cont = document.getElementById("preVenta");

  cont.innerHTML = "";

  ventaActual.forEach((item, index) => {

    const div = document.createElement("div");

    div.className = "flex justify-between bg-gray-100 p-2 rounded";

    div.innerHTML = `
      <span>${item.texto}</span>
      <span>$${item.subtotal}</span>
    `;

    div.onclick = () => editarItem(index);

    cont.appendChild(div);
  });
}


// ==============================
// ✏️ EDITAR
// ==============================

function editarItem(index) {

  input.value = ventaActual[index].texto;

  totalVenta -= ventaActual[index].subtotal;

  ventaActual.splice(index, 1);

  actualizarTotalVenta();
  renderPreVenta();
}


// ==============================
// 🗑 FINALIZAR VENTA
// ==============================

document.getElementById("btnFinalizar").onclick = () => {

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
};


// ==============================
// 📊 TOTAL
// ==============================

function actualizarTotalVenta() {
  totalVentaSpan.textContent = "$" + totalVenta;
}


// ==============================
// 📊 TOTAL DEL DÍA
// ==============================

function actualizarTotalDia() {

  const ventas = data[usuarioActual]?.ventas || [];

  const total = ventas.reduce((a, v) => a + v.total, 0);

  totalDiaSpan.textContent = "$" + total;
}


// ==============================
// 🔄 RESET
// ==============================

function reset() {

  ventaActual = [];
  totalVenta = 0;

  actualizarTotalVenta();
  renderPreVenta();
}


// ==============================
// 🧾 RENDER VENTA
// ==============================

function renderVenta(v) {

  const div = document.createElement("div");

  div.className = "bg-yellow-100 p-4 rounded relative";

  div.innerHTML = `
    <div class="font-bold mb-1">Venta</div>
    <div class="text-sm mb-2">Total: $${v.total}</div>

    <button class="bg-green-500 text-white px-3 py-1 rounded flex items-center gap-2">
      <i class="bi bi-whatsapp"></i> WhatsApp
    </button>

    <!-- 🗑 BOTÓN ELIMINAR -->
    <button class="absolute top-2 right-2 text-red-600 text-lg">
      ✕
    </button>
  `;

  // WhatsApp
  div.querySelector("button").onclick = () => {
    const msg = `Venta total: $${v.total}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  // ELIMINAR
  div.querySelector(".text-red-600").onclick = () => {

    const ventas = data[usuarioActual].ventas;

    const index = ventas.findIndex(x => x.fecha === v.fecha && x.total === v.total);

    if (index !== -1) {
      ventas.splice(index, 1);
      localStorage.setItem("dataPOS", JSON.stringify(data));
      renderHistorial();
      actualizarTotalDia();
    }
  };

  listaVentas.prepend(div);
}

// ==============================
// 📄 PDF
// ==============================

document.getElementById("btnPDF").onclick = () => {

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const ventas = data[usuarioActual]?.ventas || [];

  let y = 10;
  let totalDia = 0;

  doc.setFontSize(16);
  doc.text("REPORTE DE VENTAS DEL DÍA", 10, y);
  y += 10;

  ventas.forEach((v, i) => {

    doc.setFontSize(12);
    doc.text(`VENTA ${i + 1} - ${v.fecha}`, 10, y);
    y += 6;

    v.items.forEach(it => {
      doc.setFontSize(10);
      doc.text(`• ${it.texto} = $${it.subtotal}`, 12, y);
      y += 5;
    });

    doc.setFontSize(11);
    doc.text(`SUBTOTAL: $${v.total}`, 10, y);
    y += 10;

    totalDia += v.total;
  });

  y += 5;

  doc.setFontSize(14);
  doc.text(`TOTAL DEL DÍA: $${totalDia}`, 10, y);

  doc.save("reporte_ventas.pdf");
};

// ==============================
// 🆕 NUEVA VENTA
// ==============================

document.getElementById("btnNuevaVenta").onclick = () => {
  reset();
  modal.showModal();
};


// ==============================
// ❌ CERRAR
// ==============================

document.getElementById("btnCerrar").onclick = () => {
  modal.close();
};


// ==============================
// 📦 HISTORIAL
// ==============================

function renderHistorial() {

  listaVentas.innerHTML = "";

  const ventas = data[usuarioActual]?.ventas || [];

  ventas.forEach(renderVenta);
}
