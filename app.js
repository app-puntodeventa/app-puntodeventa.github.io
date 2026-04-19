
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


// LOGIN
document.getElementById("btnLogin").onclick = () => {

  const pin = document.getElementById("pinInput").value;

  if (!VALID_PINS[pin]) return alert("PIN incorrecto");

  usuarioActual = pin;

  if (!data[pin]) data[pin] = { ventas: [] };

  localStorage.setItem("usuarioActivo", pin);

  document.getElementById("loginScreen").style.display = "none";

  init();
};


// INIT
function init() {

  const pin = localStorage.getItem("usuarioActivo");

  if (!VALID_PINS[pin]) {
    document.getElementById("loginScreen").style.display = "flex";
    return;
  }

  usuarioActual = pin;

  renderHistorial();
  actualizarTotalDia();
}

init();


// PARSER
function parsear(texto) {

  const nums = texto.match(/\d+(\.\d+)?/g)?.map(Number) || [];

  let cantidad = 1;
  let precio = 0;

  const t = texto.toLowerCase();
  const multi = nums.length >= 2;

  return {
    texto,
    cantidad: nums[0] || 1,
    precio: nums[1] || nums[0] || 0,
    multi
  };
}


// PREVIEW
input.addEventListener("input", () => {

  const v = input.value.trim();
  if (!v) return preview.textContent = "";

  const d = parsear(v);

  if (!d.multi) return preview.textContent = "";

  preview.textContent = `${d.cantidad} x ${d.precio} = $${d.cantidad * d.precio}`;
});


// AGREGAR
function agregar() {

  const v = input.value.trim();
  if (!v) return;

  const d = parsear(v);

  const subtotal = d.multi ? d.cantidad * d.precio : d.precio;

  ventaActual.push({
    id: Date.now(),
    usuario: usuarioActual,   // 🔥 IMPORTANTE
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


// PREVENTA
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


// FINALIZAR
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


// TOTAL
function actualizarTotalVenta() {
  totalVentaSpan.textContent = "$" + totalVenta;
}


// TOTAL DIA
function actualizarTotalDia() {

  const ventas = data[usuarioActual]?.ventas || [];

  const total = ventas.reduce((a, v) => a + v.total, 0);

  totalDiaSpan.textContent = "$" + total;
}


// RESET
function reset() {
  ventaActual = [];
  totalVenta = 0;
  actualizarTotalVenta();
  renderPreVenta();
}


// VENTA CARD
function renderVenta(v) {

  const div = document.createElement("div");

  div.className = "bg-yellow-100 p-4 rounded";

  div.innerHTML = `
    <div class="font-bold">Venta - ${v.usuario}</div>
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

  // 📲 WHATSAPP → IMAGEN REAL
  div.querySelector(".bg-green-500").onclick = () => {

    html2canvas(div).then(canvas => {

      const img = canvas.toDataURL("image/png");

      const link = document.createElement("a");
      link.href = img;
      link.download = "ticket.png";
      link.click();

      window.open(
        `https://wa.me/?text=${encodeURIComponent("Venta total: $" + v.total)}`,
        "_blank"
      );
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


// HISTORIAL
function renderHistorial() {

  listaVentas.innerHTML = "";

  const ventas = data[usuarioActual]?.ventas || [];

  ventas.forEach(renderVenta);
}


// OPEN
document.getElementById("btnNuevaVenta").onclick = () => {
  reset();
  modal.showModal();
};


// CLOSE
document.getElementById("btnCerrar").onclick = () => {
  modal.close();
};


// PDF (ESTABLE + BONITO + USUARIO)
document.getElementById("btnPDF").onclick = () => {

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const ventas = data[usuarioActual]?.ventas || [];

  let y = 10;
  let total = 0;

  doc.setFontSize(16);
  doc.text("REPORTE DE VENTAS", 10, y);
  y += 10;

  ventas.forEach((v, i) => {

    doc.setFontSize(12);
    doc.text(`Venta ${i + 1} - ${v.usuario}`, 10, y);
    y += 6;

    v.items.forEach(it => {
      doc.setFontSize(10);
      doc.text(`${it.texto} = $${it.subtotal}`, 10, y);
      y += 5;
    });

    doc.text(`Total: $${v.total}`, 10, y);
    y += 10;

    total += v.total;
  });

  doc.setFontSize(14);
  doc.text(`TOTAL DEL DÍA: $${total}`, 10, y + 10);

  doc.save("reporte.pdf");
};
