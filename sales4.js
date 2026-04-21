const SALES4 = {

  items: [],
  total: 0,

  parse(text) {
    const nums = text.match(/\d+(\.\d+)?/g)?.map(Number) || [];

    return {
      text,
      qty: nums[0] || 1,
      price: nums[1] || 0
    };
  },

  add(text) {

    const d = this.parse(text);
    const product = Inventory4.findByName(d.text);

    let subtotal = 0;

    if (product) {
      subtotal = d.qty * product.precio;
      product.stock -= d.qty;
      Inventory4.save();
    } else {
      subtotal = d.qty * d.price;
    }

    this.items.push({
      text: d.text,
      subtotal
    });

    this.total += subtotal;

    this.render();
  },

  render() {

    const cont = document.getElementById("preSale");
    const total = document.getElementById("total");

    cont.innerHTML = "";

    this.items.forEach((i, index) => {

      const div = document.createElement("div");

      div.className = "flex justify-between bg-white p-2";

      div.innerHTML = `
        <span>${i.text}</span>
        <span>$${i.subtotal}</span>
      `;

      cont.appendChild(div);
    });

    total.textContent = "$" + this.total;
  },

  finish() {

    const user = AUTH4.user;

    const data = Storage4.get("sales", {});

    if (!data[user]) data[user] = [];

    data[user].push({
      items: this.items,
      total: this.total,
      date: new Date().toLocaleString()
    });

    Storage4.set("sales", data);

    this.items = [];
    this.total = 0;

    this.render();

    APP4.renderHistory();
  }
};
