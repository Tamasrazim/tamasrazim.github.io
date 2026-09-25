// BNC AgroCare invoice row rule.
// BNCFINAL.xlsx is the canonical sheet. This helper mirrors its row logic.
// It inserts before ST, extends formulas, copies row formatting, and rebalances SL values.

async function addProductRow(file) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const ws = workbook.getWorksheet("01");

  let stRow = null;
  ws.eachRow((row, rowNumber) => {
    if (stRow === null && row.getCell("B").value === "ST") stRow = rowNumber;
  });
  if (!stRow) throw new Error('Could not find the "ST" row');

  const bump = (formula) =>
    formula.replace(/([A-Z]+)(\d+)/g, (whole, col, row) => {
      const r = parseInt(row, 10);
      return r >= stRow ? col + (r + 1) : whole;
    });

  for (let r = stRow; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    for (let c = 1; c <= 15; c++) {
      const cell = row.getCell(c);
      if (cell.formula) cell.value = { formula: bump(cell.formula) };
    }
  }

  ws.spliceRows(stRow, 0, []);

  const aboveRow = ws.getRow(stRow - 1);
  const newRow = ws.getRow(stRow);
  for (let c = 1; c <= 12; c++) {
    newRow.getCell(c).style = { ...aboveRow.getCell(c).style };
  }
  newRow.height = aboveRow.height;

  const newStRow = stRow + 1;
  ["D", "F", "L"].forEach((col) => {
    ws.getCell(col + newStRow).value = {
      formula: "SUM(" + col + "11:" + col + stRow + ")",
    };
  });

  const totalRows = stRow - 11 + 1;
  for (let i = 0; i < totalRows; i++) {
    ws.getCell("A" + (11 + i)).value = i + 1;
    ws.getCell("G" + (11 + i)).value = totalRows + i + 1;
  }

  const out = await workbook.xlsx.writeBuffer();
  return new Blob([out], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}