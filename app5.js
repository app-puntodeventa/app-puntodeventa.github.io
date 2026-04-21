// ======================================
// 🧠 PARSER INTELIGENTE MEJORADO
// ======================================

/**
 * Parsea entrada de texto libre: "huevo 10" → {nombre: "huevo", precio: 10}
 */
function parsearLibre(texto) {
  const t = texto.trim().toLowerCase();
  
  // Extraer números del final
  const match = t.match(/^(.+?)\s+(\d+(?:\.\d+)?)$/);
  
  if (match) {
    const nombre = match[1].trim();
    const precio = parseFloat(match[2]);
    return { nombre, precio, valido: true };
  }
  
  // Si no tiene número, devolver solo nombre
  return { nombre: t, precio: 0, valido: false };
}

// En la función agregar del modo libre, ANTES de donde dice:
// const nombre = inputNombreLibre.value.trim();

// Reemplaza eso con:
