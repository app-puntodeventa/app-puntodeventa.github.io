// ======================================
// 🧠 PARSER IA - LENGUAJE NATURAL TIENDAS MX
// ======================================

/**
 * Parser inteligente para órdenes de compra en español mexicano
 * Convierte texto informal en JSON estructurado
 * 
 * Ejemplo: "20 de jamón, 2 cocas y 1 kilo de tortilla"
 * Salida: [
 *   { tipo: "monto", producto: "jamón", valor: 20, moneda: "MXN" },
 *   { tipo: "pieza", producto: "coca", cantidad: 2 },
 *   { tipo: "cantidad", producto: "tortilla", valor: 1, unidad: "kilo" }
 * ]
 */

// ======================================
// 📚 DICCIONARIO DE NORMALIZACION
// ======================================

const DICCIONARIO_PRODUCTOS = {
  // Bebidas
  "coca": ["coka", "cocas", "coca cola", "cokas"],
  "pepsi": ["pepsí", "pepsis"],
  "sprite": ["sprites"],
  "refresco": ["refrescos"],
  "cerveza": ["cervezas"],
  "pulque": ["pulques"],
  "pulquería": ["pulquerías"],
  "jugo": ["jugos", "zumo", "zumos"],
  "leche": ["leches"],
  "agua": ["aguas"],
  
  // Carnes y proteínas
  "jamón": ["jamon", "jamones"],
  "tocino": ["tocinos"],
  "carne": ["carnes"],
  "pollo": ["pollos"],
  "pescado": ["pescados"],
  "huevo": ["huevos"],
  "queso": ["quesos"],
  "yogurt": ["yogur", "yogurts", "yogures"],
  
  // Productos de panadería
  "pan": ["panes"],
  "bolillo": ["bolillos"],
  "telera": ["teleras"],
  "tortilla": ["tortillas"],
  "concha": ["conchas"],
  "dona": ["donas", "dónut", "donuts"],
  "pastel": ["pasteles"],
  "pastelillo": ["pastelillos"],
  
  // Frutas y verduras
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
  
  // Artículos de papelería
  "pluma": ["plumas", "bolígrafo", "bolígrafos"],
  "lapiz": ["lápiz", "lapices", "lápices"],
  "cuaderno": ["cuadernos"],
  "libreta": ["libretas"],
  "papel": ["papeles"],
  "hoja": ["hojas"],
  "goma": ["gomas", "borrador", "borradores"],
  "regla": ["reglas"],
  "pegamento": ["pegamentos"],
  "marcador": ["marcadores"],
  "rotulador": ["rotuladores"],
  "colores": ["color", "lápices de color"],
  "crayon": ["crayones", "crayola", "crayolas"],
  
  // Artículos de oficina
  "tinta": ["tintas"],
  "tóner": ["tóners"],
  "cartuchos": ["cartucho"],
  "folder": ["folders"],
  "carpeta": ["carpetas"],
  "paquete": ["paquetes"],
  
  // Otros
  "chicle": ["chicles"],
  "chocolate": ["chocolates"],
  "caramelo": ["caramelos"],
  "galleta": ["galletas"],
  "cereal": ["cereales"],
  "arroz": ["arroces"],
  "frijol": ["frijoles"],
  "aceite": ["aceites"],
  "azucar": ["azúcar", "azucares", "azúcares"],
  "sal": ["sales"],
  "jabón": ["jabones"],
  "detergente": ["detergentes"],
  "papel higienico": ["papel higiénico", "papel higienico"],
  "servilleta": ["servilletas"],
  "bolsa": ["bolsas", "bolsita", "bolsitas"],
  "vaso": ["vasos"],
  "plato": ["platos"],
  "cuchara": ["cucharas"],
  "tenedor": ["tenedores"],
  "cuchillo": ["cuchillos"],
};

const DICCIONARIO_UNIDADES = {
  // Peso
  "kilo": ["kg", "kilogramo", "kilos", "kilogramos"],
  "gramo": ["g", "gr", "grs", "gramos"],
  "medio kilo": ["1/2 kg", "medio", "½ kg"],
  "cuarto kilo": ["1/4 kg", "¼ kg"],
  
  // Volumen
  "litro": ["l", "lt", "lts", "litros"],
  "mililitro": ["ml", "mls", "mililitros"],
  "medio litro": ["1/2 litro", "½ lt"],
  
  // Conteo
  "pieza": ["pz", "piezas", "unidad", "unidades"],
  "docena": ["docenas", "dz"],
  "par": ["pares"],
};

const DICCIONARIO_CONECTORES = ["de", "y", ",", "con", "más"];

// ======================================
// 🧹 FUNCIONES DE NORMALIZACIÓN
// ======================================

/**
 * Normaliza el texto: lowercase, sin acentos, espacios limpios
 */
function normalizarTexto(texto) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Elimina acentos
    .replace(/\s+/g, " ") // Espacios múltiples a uno
    .trim();
}

/**
 * Busca un producto en el diccionario
 * Devuelve el nombre normalizado
 */
function normalizarProducto(nombre) {
  const nombreNorm = normalizarTexto(nombre);
  
  // Búsqueda directa
  if (DICCIONARIO_PRODUCTOS[nombreNorm]) {
    return nombreNorm;
  }
  
  // Búsqueda en sinónimos
  for (const [producto, sinonimos] of Object.entries(DICCIONARIO_PRODUCTOS)) {
    if (sinonimos.includes(nombreNorm)) {
      return producto;
    }
  }
  
  // Si no encuentra, devuelve el nombre limpio
  return nombreNorm;
}

/**
 * Busca una unidad en el diccionario
 * Devuelve la unidad normalizada
 */
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
// 🔍 DETECTORES DE PATRONES
// ======================================

/**
 * Detecta patrón: "[numero] de [producto]"
 * Interpreta como MONTO en MXN
 * Ej: "20 de jamón" → { tipo: "monto", producto: "jamón", valor: 20 }
 */
function detectarMonto(texto) {
  const regex = /(\d+(?:\.\d+)?)\s+de\s+(.+?)(?:,|y|$)/gi;
  const resultados = [];
  let match;

  while ((match = regex.exec(texto)) !== null) {
    const valor = parseFloat(match[1]);
    const productoRaw = match[2].trim();
    const producto = normalizarProducto(productoRaw);

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
 * Detecta patrón: "[numero] [unidad] de [producto]"
 * Interpreta como CANTIDAD física
 * Ej: "2 kilos de huevo" → { tipo: "cantidad", producto: "huevo", valor: 2, unidad: "kilo" }
 */
function detectarCantidad(texto) {
  const regex = /(\d+(?:\.\d+)?)\s+(kilo|kg|kilogramo|gramo|g|litro|l|lt|mililitro|ml|pieza|pz|docena|dz|par|medio|¼|½|1\/2|1\/4)\s+de\s+(.+?)(?:,|y|$)/gi;
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
 * Detecta patrón: "[numero] [producto]" (SIN "de")
 * Interpreta como PIEZAS
 * Ej: "3 plumas" → { tipo: "pieza", producto: "pluma", cantidad: 3 }
 */
function detectarPiezas(texto) {
  const regex = /(\d+)\s+([a-záéíóúñ\s]+?)(?:,|y|$)/gi;
  const resultados = [];
  let match;

  while ((match = regex.exec(texto)) !== null) {
    const cantidad = parseInt(match[1]);
    const productoRaw = match[2].trim();

    // Evitar capturar si ya fue detectado en otros patrones
    if (productoRaw.includes("de") || productoRaw.match(/kilo|kg|litro|ml|gramo|pieza|pz|docena/i)) {
      continue;
    }

    const producto = normalizarProducto(productoRaw);

    // Solo agregar si es un producto conocido
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

/**
 * Detecta patrón: "[cantidad] [producto] por [precio]"
 * Interpreta como PROMOCIÓN
 * Ej: "3 cuadernos por 50" → { tipo: "promo", producto: "cuaderno", cantidad: 3, precio: 50 }
 */
function detectarPromo(texto) {
  const regex = /(\d+)\s+([a-záéíóúñ\s]+?)\s+por\s+(\d+(?:\.\d+)?)/gi;
  const resultados = [];
  let match;

  while ((match = regex.exec(texto)) !== null) {
    const cantidad = parseInt(match[1]);
    const productoRaw = match[2].trim();
    const precio = parseFloat(match[3]);

    const producto = normalizarProducto(productoRaw);

    resultados.push({
      tipo: "promo",
      producto,
      cantidad,
      precio,
      original: match[0]
    });
  }

  return resultados;
}

/**
 * Detecta patrón: "[numero] por [precio]" (SIN nombre de producto)
 * Usa el último producto mencionado
 * Ej: "cuadernos, 3 por 50" → promoción del último producto
 */
function detectarPromoSinProducto(texto, ultimoProducto) {
  const regex = /(\d+)\s+por\s+(\d+(?:\.\d+)?)/gi;
  const resultados = [];
  let match;

  while ((match = regex.exec(texto)) !== null) {
    const cantidad = parseInt(match[1]);
    const precio = parseFloat(match[2]);

    if (ultimoProducto) {
      resultados.push({
        tipo: "promo",
        producto: ultimoProducto,
        cantidad,
        precio,
        original: match[0]
      });
    }
  }

  return resultados;
}

// ======================================
// 🎯 FUNCIÓN PRINCIPAL
// ======================================

/**
 * Parser principal - convierte texto en órdenes estructuradas
 * @param {string} texto - Orden en lenguaje natural
 * @returns {array} Array de productos parseados
 */
function parseOrder(texto) {
  // Validación
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

    // Detectar todos los patrones
    const montos = detectarMonto(textoNorm);
    const cantidades = detectarCantidad(textoNorm);
    const piezas = detectarPiezas(textoNorm);
    const promos = detectarPromo(textoNorm);

    // Obtener último producto mencionado para promos
    const ultimoProducto = 
      montos[montos.length - 1]?.producto ||
      cantidades[cantidades.length - 1]?.producto ||
      piezas[piezas.length - 1]?.producto;

    const promosBonus = detectarPromoSinProducto(textoNorm, ultimoProducto);

    // Combinar todos los resultados
    resultados = [
      ...montos,
      ...cantidades,
      ...piezas,
      ...promos,
      ...promosBonus
    ];

    // Eliminar duplicados
    resultados = eliminarDuplicados(resultados);

    // Limpiar campos "original"
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

/**
 * Elimina duplicados por producto y tipo
 */
function eliminarDuplicados(resultados) {
  const mapa = new Map();

  resultados.forEach(item => {
    const clave = `${item.tipo}_${item.producto}`;
    if (!mapa.has(clave)) {
      mapa.set(clave, item);
    }
  });

  return Array.from(mapa.values());
}

/**
 * Genera una vista previa legible del parse
 */
function generarPreview(resultados) {
  return resultados.map(item => {
    switch (item.tipo) {
      case "monto":
        return `$${item.valor} de ${item.producto}`;
      case "cantidad":
        return `${item.valor} ${item.unidad} de ${item.producto}`;
      case "pieza":
        return `${item.cantidad} ${item.producto}`;
      case "promo":
        return `${item.cantidad} ${item.producto} por $${item.precio}`;
      default:
        return JSON.stringify(item);
    }
  }).join(" + ");
}

/**
 * Convierte el resultado del parser a formato más amigable
 */
function formatearParaVenta(resultados) {
  return resultados.map(item => {
    switch (item.tipo) {
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

      case "promo":
        return {
          descripcion: `${item.cantidad} ${item.producto} por $${item.precio}`,
          producto: item.producto,
          cantidad: item.cantidad,
          precioTotal: item.precio,
          precioPorUnidad: (item.precio / item.cantidad).toFixed(2)
        };
    }
  });
}

// ======================================
// 📊 EJEMPLOS DE USO
// ======================================

/**
 * EJEMPLOS:
 * 
 * parseOrder("20 de jamón, 2 cocas y 1 kilo de tortilla, 3 cuadernos por 50")
 * 
 * parseOrder("100 de queso, 2 litros de leche, 6 huevos")
 * 
 * parseOrder("3 plumas, 2 cuadernos por 100, 50 de pan")
 * 
 * parseOrder("medio kilo de arroz, 2 bolsas de pan, 1 litro de leche")
 */

// Exportar para uso global
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { parseOrder, formatearParaVenta, normalizarProducto, normalizarUnidad };
}
