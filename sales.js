
// ======================================
// 🧾 SALES SYSTEM (POS CORE)
// ======================================

const SALES = {

  ventaActual: [],
  totalVenta: 0,

  // ======================================
  // 🧠 PARSER (INTELIGENTE PERO SIMPLE)
  // ======================================
  parsear(texto) {

    const t = texto.toLowerCase();

    const nums = t.match(/\d+(\.\d+)?/g)?.map(Number) || [];

    let cantidad = 1;
    let precio = 0;
    let multi = false;

    const esMultiplicacion =
      t.includes("cada") ||
      t.includes("c/u") ||
      t.includes("x");

    const esTotalDirecto =
      t.includes("total") ||
      t.includes("por");

    if (nums.length === 1) {
      precio = nums[0];
    }

    if (nums.length >= 2) {
      cantidad = nums[0];
      precio = nums[1];

      multi = esMultiplicacion ? true : !esTotalDirecto;
    }

    return { texto, cantidad, precio, multi };
  },

  // ======================================
  // ➕ AGREGAR PRODUCTO A VENTA
  // ======================================
  agregar(inputValue) {

    if (!inputValue) return;

    const d = this.parsear(inputValue);

    const nombre = d.texto.toLowerCase();

    const inventario = Storage.get("inventario", []);

    const producto = inventario.find(p =>
      nombre.includes(p.nombre)
    );

    let subtotal = 0;

    if (producto) {

      subtotal = d.cantidad * producto.precio;

      producto.stock -= d.cantidad;
      if (producto.stock < 0) producto.stock = 0;

      Storage.set("inventario", inventario);

    } else {
      subtotal = d.multi
        ? d.cantidad * d.precio
        : d.precio;
    }

    this.ventaActual.push({
      id: Date.now(),
      usuario: AUTH.usuarioActual,
      ...d,
      subtotal
    });

    this.totalVenta += subtotal;

    this.renderPreVenta();
    this.actualizarTotal();
  },

  // ======================================
  // 🧾 PREVIEW DE VENTA
  // ======================================
  renderPreVenta() {

    const cont = document.getElementById("preVenta");
    if (!cont) return;

    cont.innerHTML = "";

    this.ventaActual.forEach((item, i) => {

      const div = document.createElement("div");

      div.className =
        "flex justify-between bg-gray-100 p-2 rounded items-center";

      div.innerHTML = `
        <span>${item.texto}</span>
        <div class="flex gap-2 items-center">
          <span>$${item.subtotal}</span>
          <button class="text-red-500">🗑</button>
        </div>
      `;

      div.querySelector("button").onclick = () => {
        this.eliminar(i);
      };

      cont.appendChild(div);
    });
  },

  // ======================================
  // ❌ ELIMINAR ITEM
  // ======================================
  eliminar(index) {

    const item = this.ventaActual[index];

    if (item) {
      this.totalVenta -= item.subtotal;
    }

    this.ventaActual.splice(index, 1);

    this.renderPreVenta();
    this.actualizarTotal();
  },

  // ======================================
  // 💰 TOTAL
  // ======================================
  actualizarTotal() {

    const el = document.getElementById("totalVenta");
    if (el) el.textContent = "$" + this.totalVenta;
  },

  // ======================================
  // 💾 FINALIZAR VENTA
  // ======================================
  finalizar() {

    if (!this.ventaActual.length) return;

    const usuario = AUTH.usuarioActual;

    const data = Storage.get("dataPOS", {});

    if (!data[usuario]) {
      data[usuario] = { ventas: [] };
    }

    const venta = {
      items: this.ventaActual,
      total: this.totalVenta,
      usuario,
      fecha: new Date().toLocaleString()
    };

    data[usuario].ventas.push(venta);

    Storage.set("dataPOS", data);

    this.reset();

    this.renderVenta(venta);
  },

  // ======================================
  // 🔄 RESET
  // ======================================
  reset() {
    this.ventaActual = [];
    this.totalVenta = 0;
    this.renderPreVenta();
    this.actualizarTotal();
  },

  // ======================================
  // 🧾 RENDER VENTA FINAL
  // ======================================
  renderVenta(v) {

    const cont = document.getElementById("listaVentas");
    if (!cont) return;

    const div = document.createElement("div");

    div.className = "bg-yellow-100 p-4 rounded";

    div.innerHTML = `
      <div class="font-bold">${v.usuario}</div>
      <div class="text-xs">${v.fecha}</div>

      <div class="mt-2">
        ${v.items.map(i =>
          `<div>${i.texto} - $${i.subtotal}</div>`
        ).join("")}
      </div>

      <div class="font-bold mt-2">
        Total: $${v.total}
      </div>
    `;

    cont.prepend(div);
  }
};


// ======================================
// 🎯 EVENTOS UI
// ======================================

document.addEventListener("DOMContentLoaded", () => {

  const input = document.getElementById("inputProducto");
  const btnAdd = document.getElementById("btnAdd");
  const btnFinalizar = document.getElementById("btnFinalizar");

  if (btnAdd) {
    btnAdd.onclick = () => {
      SALES.agregar(input.value);
      input.value = "";
    };
  }

  if (input) {
    input.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        SALES.agregar(input.value);
        input.value = "";
      }
    });
  }

  if (btnFinalizar) {
    btnFinalizar.onclick = () => {
      SALES.finalizar();
    };
  }
});
