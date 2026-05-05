const DOCUMENTS = {
  garmin: {
    fileName: "istruzioni-garmin-prg.pdf",
    title: "Istruzioni Garmin - installazione PRG",
    lines: [
      "1. Crea la watch face e premi Genera PRG.",
      "2. Scarica il file .prg sul computer.",
      "3. Collega il Garmin al computer con il cavo USB.",
      "4. Apri il disco Garmin da Esplora file o Finder.",
      "5. Entra nella cartella GARMIN/APPS.",
      "6. Copia il file .prg scaricato dentro GARMIN/APPS.",
      "7. Scollega il Garmin in modo sicuro.",
      "8. Dal Garmin seleziona la nuova watch face.",
      "",
      "Nota: da iPhone non si possono copiare file .prg direttamente sul Garmin.",
      "Su Android puo funzionare solo se il telefono supporta USB-C/OTG e il Garmin viene visto come memoria.",
    ],
  },
  "apple-watch": {
    fileName: "istruzioni-apple-watch-foto.pdf",
    title: "Istruzioni Apple Watch - quadrante Foto",
    lines: [
      "Apple Watch non installa watch face custom come Garmin.",
      "La procedura corretta e usare l'immagine PNG come quadrante Foto.",
      "",
      "1. Scegli il formato Apple Watch corretto.",
      "2. Premi Scarica PNG watch.",
      "3. Salva l'immagine su iPhone in Foto.",
      "4. Apri l'app Watch su iPhone.",
      "5. Vai in Galleria quadranti e scegli Foto.",
      "6. Seleziona l'immagine scaricata.",
      "7. Imposta stile e posizione dell'orario se disponibili.",
      "8. Premi Aggiungi per inviarlo ad Apple Watch.",
    ],
  },
  "wear-os": {
    fileName: "istruzioni-wear-os.png-e-watchface.pdf",
    title: "Istruzioni Wear OS / Samsung / Pixel Watch",
    lines: [
      "Per Wear OS esistono vere watch face installabili, ma richiedono un pacchetto Android/WFF.",
      "In questa fase l'app esporta il PNG nel formato corretto per preparare il quadrante.",
      "",
      "1. Scegli un formato Wear OS rotondo.",
      "2. Premi Scarica PNG watch.",
      "3. Usa il PNG come base grafica per Watch Face Format, Watch Face Studio o Play Store.",
      "4. Per installazione diretta futura servira un pacchetto APK/WFF firmato.",
      "",
      "Compatibile come direzione tecnica con Samsung Galaxy Watch Wear OS, Pixel Watch,",
      "OnePlus Watch Wear OS, TicWatch e altri dispositivi Wear OS.",
    ],
  },
  amazfit: {
    fileName: "istruzioni-amazfit-zepp.pdf",
    title: "Istruzioni Amazfit / Zepp OS",
    lines: [
      "Per Amazfit e Zepp OS si possono creare watch face dedicate, ma servono pacchetti specifici Zepp.",
      "In questa fase l'app esporta il PNG nel formato corretto per preparare la grafica.",
      "",
      "1. Scegli un formato Amazfit/Zepp rotondo o rettangolare.",
      "2. Premi Scarica PNG watch.",
      "3. Usa il PNG come base nel tool Watchface Maker di Zepp/Amazfit.",
      "4. Per installazione su orologio servira generare il pacchetto watch face del modello corretto.",
      "",
      "La compatibilita dipende dal modello Amazfit e dalla versione Zepp OS.",
    ],
  },
};

export function getInstructionPdf(type) {
  return DOCUMENTS[type] || null;
}

export function renderInstructionPdf(doc) {
  const objects = [];
  const pageText = buildTextStream(doc.title, doc.lines);
  addObject(objects, "<< /Type /Catalog /Pages 2 0 R >>");
  addObject(objects, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  addObject(objects, "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>");
  addObject(objects, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  addObject(objects, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  addObject(objects, `<< /Length ${Buffer.byteLength(pageText, "utf8")} >>\nstream\n${pageText}\nendstream`);

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${object.id} 0 obj\n${object.body}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(pdf, "utf8");
}

function addObject(objects, body) {
  objects.push({ id: objects.length + 1, body });
}

function buildTextStream(title, lines) {
  const chunks = [
    "BT",
    "/F2 11 Tf",
    "50 802 Td",
    "0 0 0 rg",
    "/F1 20 Tf",
    `(${escapePdfText(title)}) Tj`,
    "0 -34 Td",
    "/F2 12 Tf",
  ];
  for (const line of lines) {
    chunks.push(`(${escapePdfText(line)}) Tj`);
    chunks.push("0 -18 Td");
  }
  chunks.push("ET");
  return chunks.join("\n");
}

function escapePdfText(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}
