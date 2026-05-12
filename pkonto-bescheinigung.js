// pkonto-bescheinigung.js – Freibetrag berechnen & § 903 ZPO PDF generieren

// Hilfsfunktionen
function n(el){ if(!el) return 0; const raw=(el.value||"").toString().replace(",","."); const v=Number(raw); return Number.isFinite(v)?v:0; }
function euro(v){ const x=Number.isFinite(v)?v:0; return x.toFixed(2).replace(".",",")+" €"; }

function errorBox(msgs){
  if (!msgs.length) return "";
  return `
    <div class="pflegegrad-result-card" style="border-left: 4px solid #e53935; padding: 15px; background: #fff3f3; margin-top: 20px;">
      <h3 style="margin-top: 0; color: #d32f2f;">Bitte Angaben ergänzen:</h3>
      <ul style="margin-bottom: 0; font-size: 0.95rem;">${msgs.map(m=>`<li>${m}</li>`).join("")}</ul>
    </div>
  `;
}

// Lade jsPDF Bibliothek dynamisch nach
function loadJsPDF(callback) {
  if (window.jspdf) {
    callback();
    return;
  }
  const script = document.createElement("script");
  script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
  script.onload = () => callback();
  document.head.appendChild(script);
}

// -------------------------------------------------------------------
// DATENGRUNDLAGE (Werte nach § 850c ZPO)
// Hinweis: Basis Juli 2026. Gültig bis zum 30. Juni 2027.
// -------------------------------------------------------------------
const ZPO_WERTE = {
  grundfreibetrag: 1587.40,         // Ab 01.07.2026 (Bisher: 1402.28 in 2024 bzw. 1555.00 in 2025)
  zuschlagErstePerson: 597.42,      // Ab 01.07.2026 (Bisher: 527.76)
  zuschlagWeiterePersonen: 332.83,  // Ab 01.07.2026 (Bisher: 294.12)
  maximalEinkommen: 4866.30,        // Ab 01.07.2026: Betrag, über dem voll gepfändet wird
  kindergeldProKind: 259.00         // Aktueller Kindergeldsatz für das Jahr 2026
};

// -------------------------------------------------------------------
// KERN-LOGIK: Berechnung des erhöhten Freibetrags
// -------------------------------------------------------------------
function berechnePkonto(unterhalt, kindergeld) {
  let freibetrag = ZPO_WERTE.grundfreibetrag;
  let zuschlagUnterhalt = 0;
  let zuschlagKindergeld = 0;

  // Unterhalt berechnen (Max. 5 Personen berücksichtigt das Gesetz standardmäßig)
  const p = Math.min(unterhalt, 5);
  if (p > 0) {
    zuschlagUnterhalt += ZPO_WERTE.zuschlagErstePerson;
  }
  if (p > 1) {
    zuschlagUnterhalt += (p - 1) * ZPO_WERTE.zuschlagWeiterePersonen;
  }

  // Kindergeld berechnen
  if (kindergeld > 0) {
    zuschlagKindergeld = kindergeld * ZPO_WERTE.kindergeldProKind;
  }

  freibetrag += zuschlagUnterhalt + zuschlagKindergeld;

  return {
    grundfreibetrag: ZPO_WERTE.grundfreibetrag,
    unterhaltPersonen: p,
    zuschlagUnterhalt: zuschlagUnterhalt,
    kindergeldAnzahl: kindergeld,
    zuschlagKindergeld: zuschlagKindergeld,
    gesamt: freibetrag
  };
}

// -------------------------------------------------------------------
// PDF-GENERIERUNG (§ 903 ZPO Bescheinigung)
// -------------------------------------------------------------------
function generierePDF(daten, berechnung) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const marginX = 20;
  let cursorY = 25;

  // Amtlicher Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Bescheinigung nach § 903 Abs. 1 ZPO", marginX, cursorY);
  
  cursorY += 8;
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("zur Vorlage beim Kreditinstitut (Pfändungsschutzkonto)", marginX, cursorY);

  cursorY += 15;

  // Block 1: Kontoinhaber & Bank
  doc.setFont("helvetica", "bold");
  doc.text("1. Angaben zum Kontoinhaber und Konto", marginX, cursorY);
  cursorY += 8;
  doc.setFont("helvetica", "normal");
  
  // Rahmen für Kontoinhaber
  doc.rect(marginX, cursorY, 170, 35);
  doc.text(`Name, Vorname: ${daten.name}`, marginX + 5, cursorY + 7);
  doc.text(`Geburtsdatum: ${daten.geburtsdatum}`, marginX + 5, cursorY + 14);
  doc.text(`Anschrift: ${daten.adresse}`, marginX + 5, cursorY + 21);
  doc.text(`Kreditinstitut: ${daten.bank}`, marginX + 5, cursorY + 28);
  doc.text(`IBAN: ${daten.iban}`, marginX + 85, cursorY + 28);

  cursorY += 45;

  // Block 2: Bescheinigte Beträge
  doc.setFont("helvetica", "bold");
  doc.text("2. Bescheinigte pfändungsfreie Beträge", marginX, cursorY);
  cursorY += 8;
  doc.setFont("helvetica", "normal");

  // Erklärungstext
  const erklaerung = "Es wird bescheinigt, dass der Kontoinhaber/die Kontoinhaberin Leistungen entgegennimmt oder Unterhaltspflichten zu erfüllen hat, die den gesetzlichen Grundfreibetrag erhöhen:";
  const textLines = doc.splitTextToSize(erklaerung, 170);
  doc.text(textLines, marginX, cursorY);
  cursorY += (textLines.length * 6) + 5;

  // Tabelle der Beträge
  doc.rect(marginX, cursorY, 170, 50); // Äußerer Rahmen
  doc.line(marginX, cursorY + 10, marginX + 170, cursorY + 10); // Header Linie
  
  doc.setFont("helvetica", "bold");
  doc.text("Grund", marginX + 5, cursorY + 7);
  doc.text("Monatlicher Betrag", marginX + 120, cursorY + 7);
  
  doc.setFont("helvetica", "normal");
  let tableY = cursorY + 17;

  // Grundfreibetrag
  doc.text("Gesetzlicher Grundfreibetrag", marginX + 5, tableY);
  doc.text(euro(berechnung.grundfreibetrag), marginX + 155, tableY, { align: "right" });
  tableY += 8;

  // Unterhalt
  if (berechnung.zuschlagUnterhalt > 0) {
    doc.text(`Unterhaltspflicht für ${berechnung.unterhaltPersonen} Person(en)`, marginX + 5, tableY);
    doc.text(euro(berechnung.zuschlagUnterhalt), marginX + 155, tableY, { align: "right" });
    tableY += 8;
  }

  // Kindergeld
  if (berechnung.zuschlagKindergeld > 0) {
    doc.text(`Kindergeldbezug für ${berechnung.kindergeldAnzahl} Kind(er)`, marginX + 5, tableY);
    doc.text(euro(berechnung.zuschlagKindergeld), marginX + 155, tableY, { align: "right" });
    tableY += 8;
  }

  // Summen-Linie
  doc.line(marginX, cursorY + 40, marginX + 170, cursorY + 40);
  doc.setFont("helvetica", "bold");
  doc.text("Neuer pfändungsfreier Gesamtbetrag:", marginX + 5, cursorY + 47);
  doc.text(euro(berechnung.gesamt), marginX + 155, cursorY + 47, { align: "right" });

  cursorY += 60;

  // Nachzahlungen Sondervermerk
  if (daten.nachzahlung === "ja") {
    doc.setFont("helvetica", "bold");
    doc.text("Sondervermerk zu Nachzahlungen:", marginX, cursorY);
    doc.setFont("helvetica", "normal");
    cursorY += 6;
    const nzText = "Es wird zusätzlich bescheinigt, dass auf dem o.g. Konto eine einmalige Nachzahlung von Sozialleistungen zu erwarten ist, die nach § 902 ZPO pfändungsfrei zu stellen ist.";
    const nzLines = doc.splitTextToSize(nzText, 170);
    doc.text(nzLines, marginX, cursorY);
    cursorY += (nzLines.length * 6) + 5;
  }

  // Block 3: Ausstellende Stelle (Stempel)
  doc.setFont("helvetica", "bold");
  doc.text("3. Ausstellende Stelle / Bestätigung", marginX, cursorY);
  cursorY += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  
  const warnText = "ACHTUNG BANKEN: Diese Bescheinigung ist nach § 903 Abs. 1 Satz 2 ZPO verbindlich. Der Kontoinhaber darf das Formular nicht selbst unterzeichnen. Die Bescheinigung ist nur gültig mit Stempel und Unterschrift einer anerkannten Stelle (z.B. Arbeitgeber, Jobcenter, Familienkasse, Schuldnerberatung, Rechtsanwalt).";
  const warnLines = doc.splitTextToSize(warnText, 170);
  doc.text(warnLines, marginX, cursorY);
  
  cursorY += (warnLines.length * 5) + 5;

  // Stempel-Box
  doc.rect(marginX, cursorY, 170, 45);
  doc.setTextColor(150, 150, 150);
  doc.text("Platz für Firmen-/Behördenstempel", marginX + 55, cursorY + 22);
  
  doc.setTextColor(0, 0, 0);
  doc.text("Ort, Datum", marginX + 5, cursorY + 40);
  doc.text("_____________________________________", marginX + 90, cursorY + 36);
  doc.text("Unterschrift der anerkannten Stelle", marginX + 95, cursorY + 40);

  // Download triggern
  doc.save("P-Konto_Bescheinigung.pdf");

  // WEITERLEITUNG
 // POPUP ÖFFNEN
  setTimeout(() => {
    const popup = document.getElementById("spendenPopup");
    if (popup) {
      popup.style.display = "flex";
    }
  }, 1500);
}

// -------------------------------------------------------------------
// INITIALISIERUNG & EVENT LISTENER
// -------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  const unterhaltInp = document.getElementById("pkonto_unterhalt");
  const kindergeldInp = document.getElementById("pkonto_kindergeld");
  const nachzahlungInp = document.getElementById("pkonto_nachzahlung");
  
  const nameInp = document.getElementById("pkonto_name");
  const geburtsdatumInp = document.getElementById("pkonto_geburtsdatum");
  const adresseInp = document.getElementById("pkonto_adresse");
  const bankInp = document.getElementById("pkonto_bank");
  const ibanInp = document.getElementById("pkonto_iban");

  const btn = document.getElementById("pkonto_berechnen");
  const reset = document.getElementById("pkonto_reset");
  const out = document.getElementById("pkonto_ergebnis");

  if (!btn || !out) return;

  btn.addEventListener("click", () => {
    out.innerHTML = ""; 
    const errors = [];

    const unterhalt = parseInt(unterhaltInp.value, 10);
    const kindergeld = parseInt(kindergeldInp.value, 10);
    const nachzahlung = nachzahlungInp.value;

    if (unterhalt === 0 && kindergeld === 0 && nachzahlung === "nein") {
      errors.push("Sie haben keine Erhöhungsgründe angegeben (0 Unterhalt, 0 Kindergeld, keine Nachzahlung). In diesem Fall gilt automatisch der gesetzliche Grundfreibetrag. Sie benötigen für Ihre Bank keine zusätzliche Bescheinigung!");
    }

    const name = (nameInp.value || "").trim();
    const geburtsdatum = (geburtsdatumInp.value || "").trim();
    const adresse = (adresseInp.value || "").trim();
    const bank = (bankInp.value || "").trim();
    const iban = (ibanInp.value || "").trim();
    
    if (!name || !geburtsdatum || !adresse || !bank || !iban) {
      errors.push("Bitte füllen Sie alle Datenfelder (Name, Adresse, Bank, IBAN) aus. Diese müssen zwingend auf das amtliche Formular gedruckt werden, damit die Bank den Schutz aktiviert.");
    }

    if (errors.length > 0){
      out.innerHTML = errorBox(errors);
      out.scrollIntoView({ behavior: "smooth" });
      return;
    }

    // Erfolgsfall
    const originalText = btn.innerText;
    btn.innerText = "Bescheinigung wird erstellt...";
    btn.disabled = true;

    const daten = { name, geburtsdatum, adresse, bank, iban, nachzahlung };
    const berechnung = berechnePkonto(unterhalt, kindergeld);

    loadJsPDF(() => {
      generierePDF(daten, berechnung);
      
      out.innerHTML = `
        <div style="background: #e8f5e9; border: 1px solid #c8e6c9; padding: 20px; border-radius: 6px; margin-top: 30px; text-align: center;">
          <h3 style="margin-top: 0; color: #2e7d32;">✅ Bescheinigung generiert! Ihr neuer Freibetrag: ${euro(berechnung.gesamt)}</h3>
          <p>Das amtliche PDF wird heruntergeladen. <strong>Achtung: Unterschreiben Sie es nicht selbst!</strong> Legen Sie es Ihrem Arbeitgeber oder einer Behörde zum Abstempeln vor.</p>
          
        </div>
      `;
      out.scrollIntoView({ behavior: "smooth" });
      
      setTimeout(() => {
        btn.innerText = originalText;
        btn.disabled = false;
      }, 3000);
    });
  });

  if (reset) {
    reset.addEventListener("click", () => {
      setTimeout(() => { out.innerHTML = ""; }, 0);
    });
  }
});