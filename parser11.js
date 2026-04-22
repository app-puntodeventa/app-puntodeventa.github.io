// ======================================
// 🧠 PARSER INTELIGENTE SÚPER FLEXIBLE
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
  "café": ["cafe", "café"],
  "refresco": ["refresco"],
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
    if (sinonimos.some(s => n.includes(s)) || n === prod) return prod;
  }
  return n;
}

function extraerNumeros(texto) {
  return texto.match(/\d+(?:\.\d+)?/g) || [];
}

function parseOrder(texto) {
  if (!texto || !texto.trim()) return { success: false, error: "Vacío", data: [] };
  
  const t = normalizarTexto(texto);
  const numeros = extraerNumeros(t);

  // ========================================
  // REGLA 1: SOLO 1 NÚMERO
  // ========================================
  if (numeros.length === 1) {
    const precio = parseFloat(numeros[0]);
    
    let nombreProducto = "";
    for (const [prod] of Object.entries(PRODUCTOS_CONOCIDOS)) {
      if (t.includes(prod)) {
        nombreProducto = prod;
        break;
      }
    }
    
    if (nombreProducto) {
      return {
        success: true,
        error: null,
        data: [{
          tipo: "con_nombre",
          descripcion: `$${precio} de ${nombreProducto}`,
          producto: nombreProducto,
          cantidad: 1,
          precioPorUnidad: precio,
          precioTotal: precio,
          unidad: "pieza"
        }]
      };
    } else {
      return {
        success: true,
        error: null,
        data: [{
          tipo: "solo_precio",
          descripcion: `$${precio}`,
          producto: "",
          cantidad: 1,
          precioPorUnidad: precio,
          precioTotal: precio,
          unidad: "pieza"
        }]
      };
    }
  }

  // ========================================
  // REGLA 2: 2 NÚMEROS
  // ========================================
  if (numeros.length === 2) {
    const cantidad = parseInt(numeros[0]);
    const precio = parseFloat(numeros[1]);
    const subtotal = cantidad * precio;
    
    let nombreProducto = "";
    for (const [prod] of Object.entries(PRODUCTOS_CONOCIDOS)) {
      if (t.includes(prod)) {
        nombreProducto = prod;
        break;
      }
    }
    
    if (nombreProducto) {
      return {
        success: true,
        error: null,
        data: [{
          tipo: "cantidad_precio_producto",
          descripcion: `${cantidad} ${nombreProducto} a $${precio}`,
          producto: nombreProducto,
          cantidad,
          precioPorUnidad: precio,
          precioTotal: subtotal,
          unidad: "pieza"
        }]
      };
    } else {
      return {
        success: true,
        error: null,
        data: [{
          tipo: "cantidad_precio",
          descripcion: `${cantidad} × $${precio}`,
          producto: "",
          cantidad,
          precioPorUnidad: precio,
          precioTotal: subtotal,
          unidad: "pieza"
        }]
      };
    }
  }

  // ========================================
  // REGLA 3: 3+ NÚMEROS (CON UNIDAD)
  // ========================================
  if (numeros.length >= 3) {
    const cantidad = parseFloat(numeros[0]);
    const precio = parseFloat(numeros[numeros.length - 1]);
    const subtotal = cantidad * precio;
    
    let unidad = "pieza";
    for (const [unit, variantes] of Object.entries(UNIDADES_CONOCIDAS)) {
      for (const v of variantes) {
        if (t.includes(v)) {
          unidad = unit;
          break;
        }
      }
    }
    
    let nombreProducto = "";
    for (const [prod] of Object.entries(PRODUCTOS_CONOCIDOS)) {
      if (t.includes(prod)) {
        nombreProducto = prod;
        break;
      }
    }
    
    if (nombreProducto) {
      return {
        success: true,
        error: null,
        data: [{
          tipo: "completo",
          descripcion: `${cantidad} ${unidad} de ${nombreProducto} a $${precio}`,
          producto: nombreProducto,
          cantidad,
          precioPorUnidad: precio,
          precioTotal: subtotal,
          unidad
        }]
      };
    } else {
      return {
        success: true,
        error: null,
        data: [{
          tipo: "cantidad_unidad_precio",
          descripcion: `${cantidad} ${unidad} a $${precio}`,
          producto: "",
          cantidad,
          precioPorUnidad: precio,
          precioTotal: subtotal,
          unidad
        }]
      };
    }
  }

  return { success: false, error: "No se reconocen números", data: [] };
}
