
// ======================================
// 🔐 AUTH SYSTEM (LOGIN + SESIÓN)
// ======================================

const AUTH = {

  validPins: {
    "4829": "ADMIN",
    "7391": "TURNO 1",
    "6158": "TURNO 2"
  },

  usuarioActual: null,

  // ======================================
  // 🔑 LOGIN
  // ======================================
  login(pin) {

    const user = this.validPins[pin];

    if (!user) {
      alert("PIN incorrecto");
      return false;
    }

    this.usuarioActual = user;

    Storage.set("usuarioActivo", user);

    this.hideLogin();

    if (typeof APP !== "undefined") {
      APP.init();
    }

    return true;
  },

  // ======================================
  // 🚪 LOGOUT
  // ======================================
  logout() {

    Storage.remove("usuarioActivo");
    this.usuarioActual = null;

    location.reload();
  },

  // ======================================
  // 🔄 CARGAR SESIÓN
  // ======================================
  loadSession() {

    const user = Storage.get("usuarioActivo");

    if (!user) return null;

    this.usuarioActual = user;
    return user;
  },

  // ======================================
  // 👁 UI LOGIN
  // ======================================
  showLogin() {
    const el = document.getElementById("loginScreen");
    if (el) el.style.display = "flex";
  },

  hideLogin() {
    const el = document.getElementById("loginScreen");
    if (el) el.style.display = "none";
  }
};


// ======================================
// 🎯 EVENTOS UI
// ======================================

document.addEventListener("DOMContentLoaded", () => {

  const btnLogin = document.getElementById("btnLogin");
  const pinInput = document.getElementById("pinInput");
  const btnLogout = document.getElementById("btnLogout");

  if (btnLogin) {
    btnLogin.onclick = () => {
      AUTH.login(pinInput.value);
    };
  }

  if (btnLogout) {
    btnLogout.onclick = () => {
      AUTH.logout();
    };
  }
});
