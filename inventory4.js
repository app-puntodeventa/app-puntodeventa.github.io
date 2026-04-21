const Inventory4 = {

  data: Storage4.get("inventory", [
    { nombre: "cuaderno", precio: 25, stock: 20 },
    { nombre: "lapiz", precio: 5, stock: 100 }
  ]),

  save() {
    Storage4.set("inventory", this.data);
  },

  findByName(text) {
    return this.data.find(p =>
      text.toLowerCase().includes(p.nombre)
    );
  }
};
