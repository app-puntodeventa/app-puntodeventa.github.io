// ======================================
// 📊 MÓDULO EXCEL (IMPORT / EXPORT)
// ======================================

// IMPORTAR EXCEL
function importarExcel(file, callback) {

  const reader = new FileReader();

  reader.onload = (e) => {

    const data = new Uint8Array(e.target.result);

    const workbook = XLSX.read(data, { type: "array" });

    const sheetName = workbook.SheetNames[0];

    const sheet = workbook.Sheets[sheetName];

    const json = XLSX.utils.sheet_to_json(sheet);

    const inventarioImportado = json.map(p => ({
      nombre: (p.nombre || "").toLowerCase(),
      precio: Number(p.precio || 0),
      stock: Number(p.stock || 0)
    }));

    callback(inventarioImportado);
  };

  reader.readAsArrayBuffer(file);
}


// EXPORTAR EXCEL
function exportarExcel(inventario) {

  const ws = XLSX.utils.json_to_sheet(inventario);

  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, ws, "Inventario");

  XLSX.writeFile(wb, "inventario.xlsx");
}
