const APP4 = {

  init() {

    const user = AUTH4.load();

    if (!user) {
      document.getElementById("loginScreen").style.display = "flex";
      return;
    }

    document.getElementById("userLabel").textContent = user;

    this.renderHistory();
  },

  renderHistory() {

    const cont = document.getElementById("history");

    const data = Storage4.get("sales", {});

    const user = AUTH4.user;

    cont.innerHTML = "";

    (data[user] || []).forEach(v => {

      const div = document.createElement("div");

      div.className = "bg-yellow-100 p-2";

      div.innerHTML = `
        <div>${v.date}</div>
        <div>Total: $${v.total}</div>
      `;

      cont.appendChild(div);
    });
  }
};
