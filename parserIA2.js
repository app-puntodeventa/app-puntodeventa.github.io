// ======================================
// 🧠 PARSER IA - LENGUAJE NATURAL TIENDAS MX (MEJORADO)
// ======================================

const DICCIONARIO_PRODUCTOS = {
  "coca": ["coka", "cocas", "coca cola", "cokas"],
  "pepsi": ["pepsí", "pepsis"],
  "sprite": ["sprites"],
  "refresco": ["refrescos"],
  "cerveza": ["cervezas"],
  "pulque": ["pulques"],
  "jugo": ["jugos", "zumo", "zumos"],
  "leche": ["leches"],
  "agua": ["aguas"],
  "jamón": ["jamon", "jamones"],
  "tocino": ["tocinos"],
  "carne": ["carnes"],
  "pollo": ["pollos"],
  "pescado": ["pescados"],
  "huevo": ["huevos"],
  "queso": ["quesos"],
  "yogurt": ["yogur", "yogurts", "yogures"],
  "pan": ["panes"],
  "bolillo": ["bolillos"],
  "telera": ["teleras"],
  "tortilla": ["tortillas"],
  "concha": ["conchas"],
  "dona": ["donas", "dónut", "donuts"],
  "pastel": ["pasteles"],
  "elote": ["elotes"],
  "manzana": ["manzanas"],
  "platano": ["plátano", "platanos", "plátanos", "bananas"],
  "naranja": ["naranjas"],
  "limon": ["limón", "limones"],
  "tomate": ["tomates"],
  "cebolla": ["cebollas"],
  "ajo": ["ajos"],
  "chile": ["chiles"],
  "papa": ["papas", "patata", "patatas"],
  "zanahoria": ["zanahorias"],
  "frijol": ["frijoles", "lata de frijol", "latas de frijol"],
  "pluma": ["plumas", "bolígrafo", "bolígrafos"],
  "lapiz": ["lápiz", "lapices", "lápices"],
  "cuaderno": ["cuadernos"],
  "libreta": ["libretas"],
  "papel": ["papeles"],
  "hoja": ["hojas"],
};

const DICCIONARIO_UNIDADES = {
  "kilo": ["kg", "kilogramo", "kilos", "kilogramos"],
  "gramo": ["g", "gr", "grs", "gramos"],
  "medio kilo": ["1/2 kg", "medio", "½ kg"],
  "litro": ["l", "lt", "lts", "litros"],
  "mililitro": ["ml", "mls", "mililitros"],
  "pieza": ["pz", "piezas", "unidad", "unidades"],
  "docena": ["docenas", "dz"],
  "lata": ["latas"],
};

// ======================================
// 🧹 FUNCIONES DE NORMALIZACIÓN
// ======================================

function normalizarTexto(texto) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizarProducto(nombre) {
  const nombreNorm = normalizarTexto(nombre);
  
  if (DICCIONARIO_PRODUCTOS[nombreNorm]) {
    return nombreNorm;
  }
  
  for (const [producto, sinonimos] of Object.entries(DICCIONARIO_PRODUCTOS)) {
    if (sinonimos.includes(nombreNorm)) {
      return producto;
    }
  }
  
  return nombreNorm;
}

function normalizarUnidad(unidad) {
  if (!unidad) return null;
  
  const unidadNorm = normalizarTexto(unidad);
  
  for (const [unitoPrincipal, variantes] of Object.entries(DICCIONARIO_UNIDADES)) {
    if (variantes.includes(unidadNorm)) {
      return unitoPrincipal;
    }
  }
  
  return unidadNorm;
}

// ======================================
// 🔍 DETECTORES DE PATRONES (MEJORADO)
// ======================================

/**
 * Detecta: "3 kg de huevo a 30" → 3 kg a $30/kg = $90
 */
function detectarCantidadConPrecioUnitario(texto) {
  const regex = /(\d+(?:\.\d+)?)\s+(kilo|kg|kilogramo|gramo|g|litro|l|lt|mililitro|ml|pieza|pz|docena|dz|lata|latas)\s+de\s+([a-záéíóúñ\s]+?)\s+a\s+(\d+(?:\.\d+)?)/gi;
  const resultados = [];
  let match;

  while ((match = regex.exec(texto)) !== null) {
    const cantidad = parseFloat(match[1]);
    const unidadRaw = match[2];
    const productoRaw = match[3].trim();
    const precioUnitario = parseFloat(match[4]);
    
    const unidad = normalizarUnidad(unidadRaw);
    const producto = normalizarProducto(productoRaw);
    const precioTotal = cantidad * precioUnitario;

    resultados.push({
      tipo: "cantidad_con_precio",
      producto,
      cantidad,
      unidad,
      precioPorUnidad: precioUnitario,
      precioTotal,
      original: match[0]
    });
  }

  return resultados;
}

/**
 * Detecta: "5 elotes de a 5" → 5 × $5
 * Detecta: "2 latas de frijol de 4" → 2 × $4
 */
function detectarPiezasConPrecio(texto) {
  const regex = /(\d+)\s+([a-záéíóúñ\s]+?)\s+de\s+a\s+(\d+(?:\.\d+)?)/gi;
  const resultados = [];
  let match;

  while ((match = regex.exec(texto)) !== null) {
    const cantidad = parseInt(match[1]);
    const productoRaw = match[2].trim();
    const precioUnitario = parseFloat(match[3]);
    
    const producto = normalizarProducto(productoRaw);
    const precioTotal = cantidad * precioUnitario;

    resultados.push({
      tipo: "pieza_con_precio",
      producto,
      cantidad,
      precioPorUnidad: precioUnitario,
      precioTotal,
      original: match[0]
    });
  }

  return resultados;
}

/**
 * Detecta: "3 de 9" → 3 × $9 (sin nombre de producto)
 */
function detectarSoloNumeros(texto) {
  const regex = /^(\d+)\s+de\s+(\d+(?:\.\d+)?)$/;
  const match = regex.exec(normalizarTexto(texto));
  
  if (match) {
    const cantidad = parseInt(match[1]);
    const precioUnitario = parseFloat(match[2]);
    
    return [{
      tipo: "numeros_solo",
      producto: "",
      cantidad,
      precioPorUnidad: precioUnitario,
      precioTotal: cantidad * precioUnitario,
      original: match[0]
    }];
  }
  
  return [];
}

/**
 * Detecta: "20 de jamón" → $20 de jamón
 */
function detectarMonto(texto) {
  const regex = /(\d+(?:\.\d+)?)\s+de\s+([a-záéíóúñ\s]+?)(?:,|y|$)/gi;
  const resultados = [];
  let match;

  while ((match = regex.exec(texto)) !== null) {
    const valor = parseFloat(match[1]);
    const productoRaw = match[2].trim();
    const producto = normalizarProducto(productoRaw);

    // Evitar conflicto con otros patrones
    if (productoRaw.match(/a\s+\d+|de\s+a/)) {
      continue;
    }

    resultados.push({
      tipo: "monto",
      producto,
      valor,
      moneda: "MXN",
      original: match[0]
    });
  }

  return resultados;
}

/**
 * Detecta: "1 litro de leche" 
 */
function detectarCantidad(texto) {
  const regex = /(\d+(?:\.\d+)?)\s+(kilo|kg|kilogramo|gramo|g|litro|l|lt|mililitro|ml|pieza|pz|docena|dz|lata|latas)\s+de\s+([a-záéíóúñ\s]+?)(?:,|y|$)/gi;
  const resultados = [];
  let match;

  while ((match = regex.exec(texto)) !== null) {
    const valor = parseFloat(match[1]);
    const unidadRaw = match[2];
    const productoRaw = match[3].trim();
    
    const unidad = normalizarUnidad(unidadRaw);
    const producto = normalizarProducto(productoRaw);

    resultados.push({
      tipo: "cantidad",
      producto,
      valor,
      unidad,
      original: match[0]
    });
  }

  return resultados;
}

/**
 * Detecta: "3 plumas" (PIEZAS sin "de")
 */
function detectarPiezas(texto) {
  const regex = /(\d+)\s+([a-záéíóúñ\s]+?)(?:,|y|$)/gi;
  const resultados = [];
  let match;

  while ((match = regex.exec(texto)) !== null) {
    const cantidad = parseInt(match[1]);
    const productoRaw = match[2].trim();

    if (productoRaw.includes("de") || productoRaw.match(/kilo|kg|litro|ml|gramo|pieza|pz|docena|lata/i)) {
      continue;
    }

    const producto = normalizarProducto(productoRaw);

    if (DICCIONARIO_PRODUCTOS[producto] || Object.values(DICCIONARIO_PRODUCTOS).flat().includes(producto)) {
      resultados.push({
        tipo: "pieza",
        producto,
        cantidad,
        original: match[0]
      });
    }
  }

  return resultados;
}

// ======================================
// 🎯 FUNCIÓN PRINCIPAL
// ======================================

function parseOrder(texto) {
  if (!texto || typeof texto !== "string" || texto.trim().length === 0) {
    return {
      success: false,
      error: "Texto vacío o inválido",
      data: []
    };
  }

  try {
    const textoNorm = normalizarTexto(texto);
    let resultados = [];

    // Intentar primero patrones específicos
    let soloNumeros = detectarSoloNumeros(texto);
    if (soloNumeros.length > 0) {
      resultados = soloNumeros;
    } else {
      const cantidadConPrecio = detectarCantidadConPrecioUnitario(textoNorm);
      const piezasConPrecio = detectarPiezasConPrecio(textoNorm);
      const montos = detectarMonto(textoNorm);
      const cantidades = detectarCantidad(textoNorm);
      const piezas = detectarPiezas(textoNorm);

      resultados = [
        ...cantidadConPrecio,
        ...piezasConPrecio,
        ...montos,
        ...cantidades,
        ...piezas
      ];
    }

    resultados = eliminarDuplicados(resultados);
    resultados = resultados.map(({ original, ...rest }) => rest);

    return {
      success: true,
      error: null,
      data: resultados,
      cantidad: resultados.length,
      preview: generarPreview(resultados)
    };

  } catch (error) {
    return {
      success: false,
      error: `Error al parsear: ${error.message}`,
      data: []
    };
  }
}

// ======================================
// 🧹 FUNCIONES AUXILIARES
// ======================================

function eliminarDuplicados(resultados) {
  const mapa = new Map();

  resultados.forEach(item => {
    const clave = `${item.tipo}_${item.producto}_${item.cantidad}`;
    if (!mapa.has(clave)) {
      mapa.set(clave, item);
    }
  });

  return Array.from(mapa.values());
}

function generarPreview(resultados) {
  return resultados.map(item => {
    switch (item.tipo) {
      case "cantidad_con_precio":
        return `${item.cantidad} ${item.unidad} de ${item.producto} a $${item.precioPorUnidad} = $${item.precioTotal.toFixed(2)}`;
      case "pieza_con_precio":
        return `${item.cantidad} ${item.producto} a $${item.precioPorUnidad} = $${item.precioTotal.toFixed(2)}`;
      case "numeros_solo":
        return `${item.cantidad} × $${item.precioPorUnidad} = $${item.precioTotal.toFixed(2)}`;
      case "monto":
        return `$${item.valor} de ${item.producto}`;
      case "cantidad":
        return `${item.valor} ${item.unidad} de ${item.producto}`;
      case "pieza":
        return `${item.cantidad} ${item.producto}`;
      default:
        return JSON.stringify(item);
    }
  }).join(" | ");
}

function formatearParaVenta(resultados) {
  return resultados.map(item => {
    switch (item.tipo) {
      case "cantidad_con_precio":
        return {
          descripcion: `${item.cantidad} ${item.unidad} de ${item.producto} a $${item.precioPorUnidad}`,
          producto: item.producto,
          cantidad: item.cantidad,
          unidad: item.unidad,
          precioTotal: item.precioTotal,
          precioPorUnidad: item.precioPorUnidad
        };

      case "pieza_con_precio":
        return {
          descripcion: `${item.cantidad} ${item.producto} a $${item.precioPorUnidad}`,
          producto: item.producto,
          cantidad: item.cantidad,
          precioTotal: item.precioTotal,
          precioPorUnidad: item.precioPorUnidad
        };

      case "numeros_solo":
        return {
          descripcion: `${item.cantidad} × $${item.precioPorUnidad}`,
          producto: "",
          cantidad: item.cantidad,
          precioTotal: item.precioTotal,
          precioPorUnidad: item.precioPorUnidad
        };

      case "monto":
        return {
          descripcion: `$${item.valor} de ${item.producto}`,
          producto: item.producto,
          precioTotal: item.valor,
          cantidad: 1,
          precioPorUnidad: item.valor
        };

      case "cantidad":
        return {
          descripcion: `${item.valor} ${item.unidad} de ${item.producto}`,
          producto: item.producto,
          cantidad: item.valor,
          unidad: item.unidad
        };

      case "pieza":
        return {
          descripcion: `${item.cantidad} ${item.producto}`,
          producto: item.producto,
          cantidad: item.cantidad
        };
    }
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { parseOrder, formatearParaVenta, normalizarProducto, normalizarUnidad };
}
