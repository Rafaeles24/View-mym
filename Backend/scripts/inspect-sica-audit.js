const ExcelJS = require('exceljs');

async function inspectAudit(path) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path);

  const sheet = workbook.getWorksheet('DATA') ?? workbook.worksheets[0];
  const headers = new Map();

  sheet.getRow(1).eachCell((cell, column) => {
    headers.set(String(cell.value).trim(), column);
  });

  const values = {
    campaigns: new Set(),
    sedes: new Set(),
    fechasTramitacion: [],
    fechasEdicionLima: [],
  };

  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
    const row = sheet.getRow(rowNumber);
    const read = (header) => String(row.getCell(headers.get(header)).value ?? '').trim();

    values.campaigns.add(read('CAMPAIGN'));
    values.sedes.add(read('SEDE'));
    values.fechasTramitacion.push(read('FECHA TRAMITACION'));
    values.fechasEdicionLima.push(read('FECHA EDICION LIMA'));
  }

  const nonEmptySorted = (items) => items.filter(Boolean).sort();

  console.log(
    JSON.stringify(
      {
        rows: Math.max(0, sheet.rowCount - 1),
        campaigns: nonEmptySorted([...values.campaigns]),
        sedes: nonEmptySorted([...values.sedes]),
        fecha_tramitacion_max: nonEmptySorted(values.fechasTramitacion).at(-1) ?? null,
        fecha_edicion_lima_max: nonEmptySorted(values.fechasEdicionLima).at(-1) ?? null,
      },
      null,
      2,
    ),
  );
}

const path = process.argv[2];

if (!path) {
  throw new Error('Debes indicar la ruta del archivo de auditoría.');
}

inspectAudit(path).catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
