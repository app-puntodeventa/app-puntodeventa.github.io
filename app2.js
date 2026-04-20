// ======================================
// ⚙️ CONFIG DEMO
// ======================================

const DEMO = true;

let usuarioActual = "DEMO";
let ventaActual = [];
let totalVenta = 0;

let data = JSON.parse(localStorage.getItem("dataPOS")) || {};

if (!data[usuarioActual]) {
  data[usuarioActual] = { ventas: [] };
}


// ======================================
// 🎯 DOM
// ======================================

const modal = document.getElementById("modal");
const input = document.getElementById("inputProducto");
const preview = document.getElementById("preview");

const totalVentaSpan = document.getElementById("totalVenta");
const totalDiaSpan = document.getElementById("totalDia");
const listaVentas = document.getElementById("listaVentas");
const preVenta = document.getElementById("preVenta");


// ======================================
// 🚀 INIT
// ======================================

function init() {

  document.getElementById("userLabel").textContent = "Modo Demo";

  document.getElementById("btnPDFGlobal").style.display = "block";

  renderHistorial();
  actualizarTotalDia();
}

init();


// ======================================
// 🧠 PARSER INTELIGENTE
// ======================================

function parsear(texto) {

  const t = texto.toLowerCase();

  const nums = t.match(/\d+(\.\d+)?/g)?.map(Number) || [];

  let cantidad = 1;
  let precio = 0;
  let multi = false;

  const esMultiplicacion =
    t.includes("cada") ||
    t.includes("cada uno") ||
    t.includes("de a") ||
    t.includes("c/u") ||
    t.includes(" x ");

  const esTotalDirecto =
    t.includes(" por ") ||
    t.includes(" son ") ||
    t.includes(" total") ||
    t.includes(" pesos de");

  if (nums.length === 1) {
    precio = nums[0];
  }

  if (nums.length >= 2) {
    cantidad = nums[0];
    precio = nums[1];

    if (esMultiplicacion) multi = true;
    else if (esTotalDirecto) multi = false;
    else multi = true;
  }

  return { texto, cantidad, precio, multi };
}


// ======================================
// 👀 PREVIEW
// ======================================

input.addEventListener("input", () => {

  const v = input.value.trim();
  if (!v) return preview.textContent = "";

  const d = parsear(v);

  if (!d.multi) return preview.textContent = "";

  preview.textContent = `${d.cantidad} x ${d.precio} = $${d.cantidad * d.precio}`;
});


// ======================================
// ➕ AGREGAR PRODUCTO
// ======================================

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


// ======================================
// 🧾 PREVENTA
// ======================================

function renderPreVenta() {

  preVenta.innerHTML = "";

  ventaActual.forEach((item, i) => {

    const div = document.createElement("div");

    div.className = "flex justify-between bg-gray-100 p-2 rounded items-center";

    div.innerHTML = `
      <span>${escaparHTML(item.texto)}</span>

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

    preVenta.appendChild(div);
  });
}


// ======================================
// 💰 FINALIZAR VENTA
// ======================================

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


// ======================================
// 📊 TOTALES
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
// 🔄 RESET
// ======================================

function reset() {
  ventaActual = [];
  totalVenta = 0;
  actualizarTotalVenta();
  renderPreVenta();
}


// ======================================
// 🧾 RENDER VENTA
// ======================================

function renderVenta(v) {

  const div = document.createElement("div");
  div.className = "bg-yellow-100 p-4 rounded";

  const itemsHTML = v.items.map(it => `
    <div class="flex justify-between text-sm border-b py-1">
      <span>${escaparHTML(it.texto)}</span>
      <span>$${it.subtotal}</span>
    </div>
  `).join("");

  div.innerHTML = `
    <div class="font-bold text-gray-700 mb-1">🧾 ${v.usuario}</div>
    <div class="text-xs text-gray-500 mb-2">${v.fecha}</div>

    <div class="bg-white rounded p-2 mb-2">
      ${itemsHTML}
    </div>

    <div class="font-bold text-right text-lg">
      Total: $${v.total}
    </div>

    <div class="flex gap-3 mt-2">
      <button class="bg-blue-500 text-white px-3 py-1 rounded">
        📄 Ticket
      </button>

      <button class="text-red-500 ml-auto">
        <i class="bi bi-trash"></i>
      </button>
    </div>
  `;

  // Ticket imagen
  div.querySelector(".bg-blue-500").onclick = () => {

    html2canvas(div, { scale: 2, backgroundColor: "#fff" })
      .then(canvas => {

        const link = document.createElement("a");
        link.href = canvas.toDataURL("image/png");
        link.download = `ticket-${Date.now()}.png`;
        link.click();
      });
  };

  // Eliminar venta
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


// ======================================
// 📚 HISTORIAL
// ======================================

function renderHistorial() {

  listaVentas.innerHTML = "";

  const ventas = data[usuarioActual]?.ventas || [];

  ventas.forEach(renderVenta);

  actualizarTotalDia();
}


// ======================================
// 🆕 NUEVA VENTA
// ======================================

document.getElementById("btnNuevaVenta").onclick = () => {
  reset();
  modal.showModal();
};


// ======================================
// ❌ CERRAR MODAL
// ======================================

document.getElementById("btnCerrar").onclick = () => {
  modal.close();
};


// ======================================
// 📄 PDF USUARIO
// ======================================

document.getElementById("btnPDF").onclick = () => {

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const ventas = data[usuarioActual]?.ventas || [];

  let y = 10;
  let total = 0;

  doc.text("REPORTE DE VENTAS", 10, y);
  y += 10;

  ventas.forEach((v, i) => {

    doc.text(`Venta #${i + 1}`, 10, y);
    y += 6;

    v.items.forEach(it => {
      doc.text(`${it.texto} $${it.subtotal}`, 10, y);
      y += 5;
    });

    doc.text(`Total: $${v.total}`, 10, y);
    y += 8;

    total += v.total;
  });

  doc.text(`TOTAL: $${total}`, 10, y + 10);

  doc.save("reporte-demo.pdf");
};


// ======================================
// 📊 PDF GLOBAL
// ======================================

document.getElementById("btnPDFGlobal").onclick = () => {

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  let y = 10;
  let totalGlobal = 0;

  Object.keys(data).forEach(usuario => {

    const ventas = data[usuario].ventas || [];

    ventas.forEach(v => {

      doc.text(`${usuario}: $${v.total}`, 10, y);
      y += 6;

      totalGlobal += v.total;
    });
  });

  doc.text(`TOTAL GLOBAL: $${totalGlobal}`, 10, y + 10);

  doc.save("reporte-global.pdf");
};


// ======================================
// 🔄 REINICIAR DEMO
// ======================================

document.getElementById("btnLogout").onclick = () => {
  if (confirm("¿Reiniciar demo?")) {
    localStorage.removeItem("dataPOS");
    location.reload();
  }
};


// ======================================
// 🔐 SEGURIDAD
// ======================================

function escaparHTML(texto) {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
