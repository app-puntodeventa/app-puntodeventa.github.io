// ======================================
// 🧠 PARSER INTELIGENTE MEJORADO
// ======================================

const PRODUCTOS_CONOCIDOS = {
  "coca": ["coka", "cocas"],
  "pepsi": ["pepsi"],
  "cerveza": ["cerveza", "cervezas"],
  "jugo": ["jugo", "jugos"],
  "leche": ["leche"],
  "agua": ["agua"],
  "jamón": ["jamon"],
  "queso": ["queso"],
  "huevo": ["huevo", "huevos"],
  "pan": ["pan", "panes"],
  "tortilla": ["tortilla"],
  "elote": ["elote", "elotes"],
  "frijol": ["frijol"],
  "pluma": ["pluma"],
  "cuaderno": ["cuaderno"],
  "salchicha": ["salchicha"],
};

const UNIDADES_CONOCIDAS = {
  "kilo": ["kg", "kilogramo"],
  "gramo": ["g", "gr"],
  "litro": ["l", "lt"],
  "pieza": ["pz"],
};

function normalizarTexto(txt) {
  return txt.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
}

function normalizarProducto(nombre) {
  const n = normalizarTexto(nombre);
  for (const [prod, sinonimos] of Object.entries(PRODUCTOS_CONOCIDOS)) {
    if (sinonimos.some(s => n.includes(s))) return prod;
  }
  return n;
}

function parseOrder(texto) {
  if (!texto.trim()) return { success: false, error: "Vacío", data: [] };
  
  const t = normalizarTexto(texto);

  // REGLA 1: "90 de salchicha" (1 número)
  let m = /^(\d+(?:\.\d+)?)\s+de\s+(.+)$/.exec(t);
  if (m) {
    return {
      success: true,
      error: null,
      data: [{
        tipo: "monto",
        descripcion: `$${m[1]} de ${normalizarProducto(m[2])}`,
        producto: normalizarProducto(m[2]),
        cantidad: 1,
        precioPorUnidad: parseFloat(m[1]),
        precioTotal: parseFloat(m[1]),
        unidad: "pieza"
      }]
    };
  }

  // REGLA 2: "3 de 9" (2 n��meros, sin producto)
  m = /^(\d+)\s+de\s+(\d+(?:\.\d+)?)$/.exec(t);
  if (m) {
    const cant = parseInt(m[1]);
    const precio = parseFloat(m[2]);
    return {
      success: true,
      error: null,
      data: [{
        tipo: "simples",
        descripcion: `${cant} × $${precio}`,
        producto: "",
        cantidad: cant,
        precioPorUnidad: precio,
        precioTotal: cant * precio,
        unidad: "pieza"
      }]
    };
  }

  // REGLA 3: "5 elotes de a 5"
  m = /^(\d+)\s+(.+?)\s+de\s+a\s+(\d+(?:\.\d+)?)$/.exec(t);
  if (m) {
    const cant = parseInt(m[1]);
    const prod = normalizarProducto(m[2]);
    const precio = parseFloat(m[3]);
    return {
      success: true,
      error: null,
      data: [{
        tipo: "producto_dea",
        descripcion: `${cant} ${prod} a $${precio}`,
        producto: prod,
        cantidad: cant,
        precioPorUnidad: precio,
        precioTotal: cant * precio,
        unidad: "pieza"
      }]
    };
  }

  // REGLA 4: "2 litros de leche a 50"
  m = /^(\d+(?:\.\d+)?)\s+(kilo|kg|kilogramo|gramo|g|litro|l|lt|pieza|pz|docena|dz|lata|latas)\s+de\s+(.+?)\s+a\s+(\d+(?:\.\d+)?)$/.exec(t);
  if (m) {
    const cant = parseFloat(m[1]);
    const unidad = m[2];
    const prod = normalizarProducto(m[3]);
    const precio = parseFloat(m[4]);
    return {
      success: true,
      error: null,
      data: [{
        tipo: "cantidad_precio",
        descripcion: `${cant} ${unidad} de ${prod} a $${precio}`,
        producto: prod,
        cantidad: cant,
        precioPorUnidad: precio,
        precioTotal: cant * precio,
        unidad
      }]
    };
  }

  // REGLA 5: "2 litros de leche"
  m = /^(\d+(?:\.\d+)?)\s+(kilo|kg|kilogramo|gramo|g|litro|l|lt|pieza|pz|docena|dz|lata|latas)\s+de\s+(.+)$/.exec(t);
  if (m) {
    const cant = parseFloat(m[1]);
    const unidad = m[2];
    const prod = normalizarProducto(m[3]);
    return {
      success: true,
      error: null,
      data: [{
        tipo: "cantidad",
        descripcion: `${cant} ${unidad} de ${prod}`,
        producto: prod,
        cantidad: cant,
        precioPorUnidad: null,
        precioTotal: null,
        unidad
      }]
    };
  }

  return { success: false, error: "Formato no reconocido", data: [] };
}

function formatearParaVenta(datos) {
  return datos;
}
