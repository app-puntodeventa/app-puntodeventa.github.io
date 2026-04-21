let inventario = JSON.parse(localStorage.getItem("inventarioPOS")) || [];

const lista = document.getElementById("listaInventario");

function guardar() {

  const nombre = document.getElementById("invNombre").value.toLowerCase();
  const cantidad = Number(document.getElementById("invCantidad").value);
  const costo = Number(document.getElementById("invCosto").value);

  if (!nombre) return;

  const existente = inventario.find(p => p.nombre === nombre);

  if (existente) {
    existente.cantidad += cantidad;
    if (costo) existente.costo = costo;
  } else {
    inventario.push({
      nombre,
      cantidad,
      costo,
      alias: []
    });
  }

  localStorage.setItem("inventarioPOS", JSON.stringify(inventario));

  render();
}

document.getElementById("btnGuardar").onclick = guardar;

function render() {

  lista.innerHTML = "";

  inventario.forEach((p, i) => {

    const div = document.createElement("div");

    div.className = "bg-white p-2 rounded flex justify-between";

    div.innerHTML = `
      <span>${p.nombre} (${p.cantidad})</span>
      <span>$${p.costo}</span>
    `;

    lista.appendChild(div);
  });
}

render();
