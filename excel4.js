function importExcel(file) {

  const reader = new FileReader();

  reader.onload = (e) => {

    const wb = XLSX.read(new Uint8Array(e.target.result), { type: "array" });

    const sheet = wb.Sheets[wb.SheetNames[0]];

    const json = XLSX.utils.sheet_to_json(sheet);

    Inventory4.data = json.map(p => ({
      nombre: p.nombre.toLowerCase(),
      precio: Number(p.precio),
      stock: Number(p.stock)
    }));

    Inventory4.save();

    alert("Inventario cargado");
  };

  reader.readAsArrayBuffer(file);
}

function exportExcel() {
  XLSX.writeFile(
    XLSX.utils.book_new(),
    "inventario.xlsx"
  );
}
