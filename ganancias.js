let data = JSON.parse(localStorage.getItem("dataPOS")) || {};
let inventario = JSON.parse(localStorage.getItem("inventarioPOS")) || [];

let usuario = localStorage.getItem("usuarioActivo");

// juntar todas las ventas
let ventas = [];

Object.values(data).forEach(u => {
  (u.ventas || []).forEach(v => ventas.push(v));
});

// totales
let totalVentas = 0;
let totalCosto = 0;

let lista = document.getElementById("listaGanancias");

ventas.forEach(v => {

  totalVentas += v.total;

  v.items.forEach(it => {

    let nombre = it.texto.toLowerCase();

    let prod = inventario.find(p =>
      nombre.includes(p.nombre)
    );

    if (prod && prod.costo) {
      totalCosto += prod.costo * (it.subtotal / v.total);
    }

  });

});

// UI
document.getElementById("totalVentas").textContent = "$" + totalVentas.toFixed(2);
document.getElementById("totalCosto").textContent = "$" + totalCosto.toFixed(2);

let ganancia = totalVentas - totalCosto;

document.getElementById("gananciaTotal").textContent = "$" + ganancia.toFixed(2);

// detalle simple
ventas.forEach(v => {

  const div = document.createElement("div");
  div.className = "border p-2 rounded";

  div.innerHTML = `
    <div class="text-sm text-gray-500">${v.fecha}</div>
    <div class="font-bold">$${v.total}</div>
  `;

  lista.appendChild(div);
});
