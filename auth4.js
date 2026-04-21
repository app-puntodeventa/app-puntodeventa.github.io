const AUTH4 = {

  pins: {
    "4829": "ADMIN",
    "7391": "TURNO 1",
    "6158": "TURNO 2"
  },

  user: null,

  login(pin) {
    const u = this.pins[pin];
    if (!u) return alert("PIN incorrecto");

    this.user = u;
    Storage4.set("user", u);

    document.getElementById("loginScreen").style.display = "none";

    APP4.init();
  },

  load() {
    this.user = Storage4.get("user");
    return this.user;
  }
};
