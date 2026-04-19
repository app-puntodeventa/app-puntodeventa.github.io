let usuarioActual = null;
let ventaActual = [];
let totalVenta = 0;

let data = JSON.parse(localStorage.getItem("dataPOS")) || {};

// PIN FIJOS
const VALID_PINS = {
  "4829": "ADMIN",
  "7391": "TURNO 1",
  "6158": "TURNO 2"
};

// DOM
const modal = document.getElementById("modal");
const input = document.getElementById("inputProducto");
const preview = document.getElementById("preview");

const totalVentaSpan = document.getElementById("totalVenta");
const totalDiaSpan = document.getElementById("totalDia");
const listaVentas = document.getElementById("listaVentas");


// ==============================
// 🔐 LOGIN (FIX: ahora usa nombre, no PIN)
// ==============================
document.getElementById("btnLogin").onclick = () => {

  const pin = document.getElementById("pinInput").value;

  if (!VALID_PINS[pin]) return alert("PIN incorrecto");

  const nombreUsuario = VALID_PINS[pin];

  usuarioActual = nombreUsuario;

  if (!data[nombreUsuario]) data[nombreUsuario] = { ventas: [] };

  localStorage.setItem("usuarioActivo", nombreUsuario);

  document.getElementById("loginScreen").style.display = "none";

  init();
};


// ==============================
// 🚀 INIT (FIX)
// ==============================
function init() {

  const user = localStorage.getItem("usuarioActivo");

  if (!user) {
    document.getElementById("loginScreen").style.display = "flex";
    return;
  }

  usuarioActual = user;

  renderHistorial();
  actualizarTotalDia();
}

init();


// ==============================
// 🧠 PARSER
// ==============================
function parsear(texto) {

  const nums = texto.match(/\d+(\.\d+)?/g)?.map(Number) || [];

  return {
    texto,
    cantidad: nums[0] || 1,
    precio: nums[1] || nums[0] || 0,
    multi: nums.length >= 2
  };
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
function agregar() {

  const v = input.value.trim();
  if (!v) return;

  const d = parsear(v);

  const subtotal = d.multi ? d.cantidad * d.precio : d.precio;

  ventaActual.push({
    id: Date.now(),
    usuario: usuarioActual,
    ...d,
    subtotal
  });

  totalVenta += subtotal;

  actualizarTotalVenta();

  input.value = "";
  preview.textContent = "";

  renderPreVenta();

  navigator.vibrate?.(30);
}


// ENTER + BOTÓN
input.addEventListener("keydown", e => {
  if (e.key === "Enter") agregar();
});

document.getElementById("btnAdd").onclick = agregar;


// ==============================
// 🧾 PREVENTA
// ==============================
function renderPreVenta() {

  const cont = document.getElementById("preVenta");
  cont.innerHTML = "";

  ventaActual.forEach((item, i) => {

    const div = document.createElement("div");

    div.className = "flex justify-between bg-gray-100 p-2 rounded items-center";

    div.innerHTML = `
      <span>${item.texto}</span>

      <div class="flex gap-3 items-center">
        <span>$${item.subtotal}</span>

        <button class="text-red-500">
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

    cont.appendChild(div);
  });
}


// ==============================
// 💰 FINALIZAR
// ==============================
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
};


// ==============================
// 📊 TOTALES
// ==============================
function actualizarTotalVenta() {
  totalVentaSpan.textContent = "$" + totalVenta;
}

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
// 🧾 VENTA CARD
// ==============================
function renderVenta(v) {

  const div = document.createElement("div");

  div.className = "bg-yellow-100 p-4 rounded";

  div.innerHTML = `
    <div class="font-bold text-gray-700">🧾 ${v.usuario}</div>
    <div>Total: $${v.total}</div>

    <div class="flex gap-3 mt-2">

      <button class="bg-blue-500 text-white px-3 py-1 rounded">
        📄 Ticket
      </button>

      <button class="text-red-500">
        <i class="bi bi-trash"></i>
      </button>

    </div>
  `;

  // 📄 TICKET (MEJOR CALIDAD)
  div.querySelector(".bg-blue-500").onclick = () => {

    html2canvas(div, {
      scale: 2,
      backgroundColor: "#ffffff"
    }).then(canvas => {

      const img = canvas.toDataURL("image/png");

      const link = document.createElement("a");
      link.href = img;
      link.download = `ticket-${v.usuario}-${Date.now()}.png`;
      link.click();
    });
  };

  // 🗑 eliminar
  div.querySelector(".text-red-500").onclick = () => {

    const arr = data[usuarioActual].ventas;

    const i = arr.indexOf(v);

    if (i !== -1) {
      arr.splice(i, 1);
      localStorage.setItem("dataPOS", JSON.stringify(data));
      renderHistorial();
      actualizarTotalDia();
    }
  };

  listaVentas.prepend(div);
}


// ==============================
// 📚 HISTORIAL
// ==============================
function renderHistorial() {

  listaVentas.innerHTML = "";

  const ventas = data[usuarioActual]?.ventas || [];

  ventas.forEach(renderVenta);
}


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
// 📄 PDF BONITO FINAL
// ==============================
document.getElementById("btnPDF").onclick = () => {

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const ventas = data[usuarioActual]?.ventas || [];

  let y = 10;
  let total = 0;

  // HEADER
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
      doc.text(`• ${it.texto}   $${it.subtotal}`, 10, y);
      y += 5;
    });

    doc.setFontSize(11);
    doc.text(`Total: $${v.total}`, 10, y);
    y += 8;

    doc.line(10, y, 200, y);
    y += 6;

    total += v.total;

    if (y > 270) {
      doc.addPage();
      y = 10;
    }
  });

  doc.setFontSize(14);
  doc.text(`TOTAL DEL DÍA: $${total}`, 10, y + 10);

  doc.save(`reporte-${usuarioActual}.pdf`);
};
