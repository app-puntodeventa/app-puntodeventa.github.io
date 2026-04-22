// ======================================
// 🧠 PARSER IA MEJORADO - REGLAS CLARAS
// ======================================

/**
 * REGLAS:
 * 1. UN NÚMERO: "90 de salchicha" → $90 de salchicha
 * 2. DOS NÚMEROS: "3 de 9" o "5 elotes de a 5" → cantidad × precio
 * 3. CON UNIDAD: "2 litros de leche" → cantidad + unidad, sin guardar "de"
 */

const DICCIONARIO_PRODUCTOS = {
  "coca": ["coka", "cocas", "coca cola"],
  "pepsi": ["pepsi", "pepsí"],
  "sprite": ["sprite"],
  "cerveza": ["cerveza", "cervezas"],
  "jugo": ["jugo", "jugos", "zumo"],
  "leche": ["leche"],
  "agua": ["agua", "aguas"],
  "jamón": ["jamon", "jamones"],
  "queso": ["queso", "quesos"],
  "huevo": ["huevo", "huevos"],
  "pan": ["pan", "panes"],
  "tortilla": ["tortilla", "tortillas"],
  "elote": ["elote", "elotes"],
  "frijol": ["frijol", "frijoles"],
  "pluma": ["pluma", "plumas"],
  "cuaderno": ["cuaderno", "cuadernos"],
  "salchicha": ["salchicha", "salchichas"],
};

const DICCIONARIO_UNIDADES = {
  "kilo": ["kg", "kilogramo", "kilos"],
  "gramo": ["g", "gr", "gramo", "gramos"],
  "litro": ["l", "lt", "lts", "litro", "litros"],
  "mililitro": ["ml", "mililitro", "mililitros"],
  "pieza": ["pz", "pieza", "piezas"],
  "docena": ["docena", "docenas", "dz"],
  "lata": ["lata", "latas"],
};

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
    if (sinonimos.some(s => nombreNorm.includes(s) || s.includes(nombreNorm))) {
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
// 🔍 PARSER PRINCIPAL (REGLAS CLARAS)
// ======================================

function parseOrder(texto) {
  if (!texto || typeof texto !== "string" || texto.trim().length === 0) {
    return {
      success: false,
      error: "Texto vacío",
      data: []
    };
  }

  try {
    const textoNorm = normalizarTexto(texto);
    let resultado = [];

    // REGLA 1: "90 de salchicha" (UN número + "de" + producto)
    const reglaUnNumero = /^(\d+(?:\.\d+)?)\s+de\s+([a-záéíóúñ\s]+)$/i;
    let match = reglaUnNumero.exec(textoNorm);
    if (match) {
      const monto = parseFloat(match[1]);
      const producto = normalizarProducto(match[2]);
      return {
        success: true,
        error: null,
        data: [{
          tipo: "monto",
          producto,
          cantidad: 1,
          precioPorUnidad: monto,
          precioTotal: monto
        }],
        preview: `$${monto} de ${producto}`
      };
    }

    // REGLA 2: "3 de 9" (DOS números - cantidad × precio, sin producto)
    const reglaDosnumerosSimple = /^(\d+)\s+de\s+(\d+(?:\.\d+)?)$/;
    match = reglaDosnumerosSimple.exec(textoNorm);
    if (match) {
      const cantidad = parseInt(match[1]);
      const precio = parseFloat(match[2]);
      return {
        success: true,
        error: null,
        data: [{
          tipo: "numeros_simples",
          producto: "",
          cantidad,
          precioPorUnidad: precio,
          precioTotal: cantidad * precio
        }],
        preview: `${cantidad} × $${precio} = $${(cantidad * precio).toFixed(2)}`
      };
    }

    // REGLA 3: "5 elotes de a 5" (cantidad + producto + "de a" + precio)
    const reglaProductoDea = /^(\d+)\s+([a-záéíóúñ\s]+?)\s+de\s+a\s+(\d+(?:\.\d+)?)$/i;
    match = reglaProductoDea.exec(textoNorm);
    if (match) {
      const cantidad = parseInt(match[1]);
      const productoRaw = match[2].trim();
      const precio = parseFloat(match[3]);
      const producto = normalizarProducto(productoRaw);
      
      return {
        success: true,
        error: null,
        data: [{
          tipo: "producto_dea",
          producto,
          cantidad,
          precioPorUnidad: precio,
          precioTotal: cantidad * precio
        }],
        preview: `${cantidad} ${producto} × $${precio} = $${(cantidad * precio).toFixed(2)}`
      };
    }

    // REGLA 4: "2 litros de leche" (cantidad + unidad + "de" + producto)
    const reglaConUnidad = /^(\d+(?:\.\d+)?)\s+(kilo|kg|kilogramo|gramo|g|litro|l|lt|mililitro|ml|pieza|pz|docena|dz|lata|latas)\s+de\s+([a-záéíóúñ\s]+)$/i;
    match = reglaConUnidad.exec(textoNorm);
    if (match) {
      const cantidad = parseFloat(match[1]);
      const unidadRaw = match[2];
      const productoRaw = match[3].trim();
      
      const unidad = normalizarUnidad(unidadRaw);
      const producto = normalizarProducto(productoRaw);
      
      return {
        success: true,
        error: null,
        data: [{
          tipo: "cantidad_unidad",
          producto,
          cantidad,
          unidad,
          precioPorUnidad: null,
          precioTotal: null
        }],
        preview: `${cantidad} ${unidad} de ${producto}`
      };
    }

    // REGLA 5: "2 litros de leche a 50" (cantidad + unidad + "de" + producto + "a" + precio)
    const reglaConPrecio = /^(\d+(?:\.\d+)?)\s+(kilo|kg|kilogramo|gramo|g|litro|l|lt|mililitro|ml|pieza|pz|docena|dz|lata|latas)\s+de\s+([a-záéíóúñ\s]+?)\s+a\s+(\d+(?:\.\d+)?)$/i;
    match = reglaConPrecio.exec(textoNorm);
    if (match) {
      const cantidad = parseFloat(match[1]);
      const unidadRaw = match[2];
      const productoRaw = match[3].trim();
      const precio = parseFloat(match[4]);
      
      const unidad = normalizarUnidad(unidadRaw);
      const producto = normalizarProducto(productoRaw);
      
      return {
        success: true,
        error: null,
        data: [{
          tipo: "cantidad_precio",
          producto,
          cantidad,
          unidad,
          precioPorUnidad: precio,
          precioTotal: cantidad * precio
        }],
        preview: `${cantidad} ${unidad} de ${producto} a $${precio} = $${(cantidad * precio).toFixed(2)}`
      };
    }

    return {
      success: false,
      error: "Formato no reconocido",
      data: []
    };

  } catch (error) {
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
}

// ======================================
// 📝 FORMATEAR PARA VENTA
// ======================================

function formatearParaVenta(resultados) {
  return resultados.map(item => {
    switch (item.tipo) {
      case "monto":
        return {
          descripcion: `$${item.precioTotal} de ${item.producto}`,
          producto: item.producto,
          cantidad: 1,
          precioTotal: item.precioTotal,
          precioPorUnidad: item.precioTotal
        };

      case "numeros_simples":
        return {
          descripcion: `${item.cantidad} × $${item.precioPorUnidad}`,
          producto: "",
          cantidad: item.cantidad,
          precioTotal: item.precioTotal,
          precioPorUnidad: item.precioPorUnidad
        };

      case "producto_dea":
        return {
          descripcion: `${item.cantidad} ${item.producto} a $${item.precioPorUnidad}`,
          producto: item.producto,
          cantidad: item.cantidad,
          precioTotal: item.precioTotal,
          precioPorUnidad: item.precioPorUnidad
        };

      case "cantidad_unidad":
        return {
          descripcion: `${item.cantidad} ${item.unidad} de ${item.producto}`,
          producto: item.producto,
          cantidad: item.cantidad,
          unidad: item.unidad,
          precioPorUnidad: null,
          precioTotal: null
        };

      case "cantidad_precio":
        return {
          descripcion: `${item.cantidad} ${item.unidad} de ${item.producto} a $${item.precioPorUnidad}`,
          producto: item.producto,
          cantidad: item.cantidad,
          unidad: item.unidad,
          precioTotal: item.precioTotal,
          precioPorUnidad: item.precioPorUnidad
        };
    }
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { parseOrder, formatearParaVenta };
}
