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



document.getElementById("btnLogin").onclick = () =>
  AUTH4.login(document.getElementById("pinInput").value);

document.getElementById("btnAdd").onclick = () =>
  SALES4.add(document.getElementById("saleInput").value);

document.getElementById("btnFinish").onclick = () =>
  SALES4.finish();

document.getElementById("fileExcel").onchange = e =>
  importExcel(e.target.files[0]);

document.getElementById("exportExcel").onclick = exportExcel;
