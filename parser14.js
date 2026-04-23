// ======================================
// 🧠 PARSER INTELIGENTE v14 - MEJORADO
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
  "panes": ["panes"],
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

// ======================================
// 🆕 EXTRAE NOMBRE DE PRODUCTO DEL TEXTO
// ======================================
function extraerNombreProducto(texto) {
  const t = normalizarTexto(texto);
  
  // Primero intentar con diccionario conocido
  for (const [prod] of Object.entries(PRODUCTOS_CONOCIDOS)) {
    if (t.includes(prod)) {
      return prod;
    }
  }
  
  // Si no está en diccionario, extraer palabras que NO sean:
  // números, preposiciones, unidades
  const palabrasIgnoradas = ["de", "kg", "kilos", "gramos", "pesos", "pz", "a", "x", "por", "cada", "unidad", "l", "lt", "g", "gr"];
  const palabras = t.split(/\s+/);
  
  for (const palabra of palabras) {
    if (!palabrasIgnoradas.includes(palabra) && 
        isNaN(palabra) && 
        palabra.length > 2) {
      return palabra;
    }
  }
  
  return "";
}

function parseOrder(texto) {
  if (!texto || !texto.trim()) return { success: false, error: "Vacío", data: [] };
  
  const t = normalizarTexto(texto);
  const numeros = extraerNumeros(t);

  // ========================================
  // REGLA 1: SOLO 1 NÚMERO
  // Ejemplo: "5" = $5
  // Ejemplo: "90 de salchicha" = $90
  // ========================================
  if (numeros.length === 1) {
    const precio = parseFloat(numeros[0]);
    
    if (precio <= 0) {
      return { success: false, error: "Precio inválido", data: [] };
    }
    
    // Buscar nombre de producto (diccionario primero, luego extracción)
    let nombreProducto = extraerNombreProducto(t);
    
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
      // Sin nombre de producto, solo precio (venta rápida)
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
  // Ejemplo: "4 5" = 4×$5 = $20
  // Ejemplo: "3 de 9" = 3×$9 = $27
  // Ejemplo: "4 panes 5" = 4 panes × $5
  // ========================================
  if (numeros.length === 2) {
    const cantidad = parseInt(numeros[0]);
    const precio = parseFloat(numeros[1]);
    
    if (cantidad <= 0 || precio <= 0) {
      return { success: false, error: "Valores inválidos", data: [] };
    }
    
    const subtotal = cantidad * precio;
    
    // Buscar nombre de producto
    let nombreProducto = extraerNombreProducto(t);
    
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
      // Sin nombre (venta rápida)
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
  // REGLA 3: CON UNIDAD + PRODUCTO + PRECIO (3+ números)
  // Ejemplo: "2 litros de leche a 50" = 2×$50 = $100
  // ========================================
  if (numeros.length >= 3) {
    const cantidad = parseFloat(numeros[0]);
    const precio = parseFloat(numeros[numeros.length - 1]); // Último número es el precio
    
    if (cantidad <= 0 || precio <= 0) {
      return { success: false, error: "Valores inválidos", data: [] };
    }
    
    const subtotal = cantidad * precio;
    
    // Buscar unidad
    let unidad = "pieza";
    for (const [unit, variantes] of Object.entries(UNIDADES_CONOCIDAS)) {
      for (const v of variantes) {
        if (t.includes(v)) {
          unidad = unit;
          break;
        }
      }
    }
    
    // Buscar producto
    let nombreProducto = extraerNombreProducto(t);
    
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
