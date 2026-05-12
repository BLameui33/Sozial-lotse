// kindesunterhalt-rechner.js – Inkl. Düsseldorfer Tabelle & Mangelfall-Logik

// Hilfsfunktionen
function n(el){ if(!el) return 0; const raw=(el.value||"").toString().replace(",","."); const v=Number(raw); return Number.isFinite(v)?v:0; }
function euro(v){ const x=Number.isFinite(v)?v:0; return x.toFixed(2).replace(".",",")+" €"; }

function errorBox(msgs){
  if (!msgs.length) return "";
  return `
    <div class="pflegegrad-result-card" style="border-left: 4px solid #e53935; padding: 15px; background: #fff3f3; margin-top: 20px;">
      <h3 style="margin-top: 0; color: #d32f2f;">Bitte Angaben prüfen:</h3>
      <ul style="margin-bottom: 0;">${msgs.map(m=>`<li>${m}</li>`).join("")}</ul>
    </div>
  `;
}



const KINDERGELD = 259; // Aktuelles Kindergeld (wird bei Minderjährigen hälftig abgezogen)

// Einkommensstufen (Netto bis ...)
// Aktuelle Einkommensgrenzen der Düsseldorfer Tabelle (bis 11.200 €)
const einkommensGrenzen = [
  2100,  // Stufe 1
  2500,  // Stufe 2
  2900,  // Stufe 3
  3300,  // Stufe 4
  3700,  // Stufe 5
  4100,  // Stufe 6
  4500,  // Stufe 7
  4900,  // Stufe 8
  5300,  // Stufe 9
  5700,  // Stufe 10
  6400,  // Stufe 11
  7200,  // Stufe 12 
  8200, // Stufe 13
  9700,  // Stufe 14 
  11200  // Stufe 15 (Korrekt)
];

// Bedarfsätze pro Stufe. Spalten: [0-5 Jahre, 6-11 Jahre, 12-17 Jahre, ab 18 Jahre]
const duesseldorferTabelle = [
  [486, 558, 653, 698],  // Stufe 1  (bis 2.100 €)
  [511, 586, 686, 733],  // Stufe 2  (2.101 - 2.500 €)
  [535, 614, 719, 768],  // Stufe 3  (2.501 - 2.900 €)
  [559, 642, 751, 803],  // Stufe 4  (2.901 - 3.300 €)
  [584, 670, 784, 838],  // Stufe 5  (3.301 - 3.700 €)
  [623, 715, 836, 894],  // Stufe 6  (3.701 - 4.100 €)
  [661, 759, 889, 950],  // Stufe 7  (4.101 - 4.500 €)
  [700, 804, 941, 1006], // Stufe 8  (4.501 - 4.900 €)
  [739, 849, 993, 1061], // Stufe 9  (4.901 - 5.300 €)
  [778, 893, 1045, 1117] // Stufe 10 (5.301 - 5.700 €)
];

// Funktion zur Ermittlung des Regelbedarfs
function getTabellenBedarf(netto, altersGruppe) {
  let stufe = 0;
  for (let i = 0; i < einkommensGrenzen.length; i++) {
    if (netto <= einkommensGrenzen[i]) {
      stufe = i;
      break;
    }
    // Wenn über der höchsten hier definierten Stufe:
    if (i === einkommensGrenzen.length - 1) stufe = Math.min(i, duesseldorferTabelle.length - 1);
  }
  
  // Sicherstellen, dass wir nicht über das definierte Array hinausgehen
  stufe = Math.min(stufe, duesseldorferTabelle.length - 1);
  const alterIndex = altersGruppe - 1; // 1 wird zu 0, 2 zu 1 etc.
  
  return duesseldorferTabelle[stufe][alterIndex];
}

// -------------------------------------------------------------------
// KERN-LOGIK: Berechnung & Mangelfall-Prüfung
// -------------------------------------------------------------------

function berechneUnterhalt(netto, status, kinder) {
  const selbstbehalt = (status === "ja") ? 1450 : 1200;
  let gesamtBedarf = 0;
  
  // 1. Reguläre Zahlbeträge berechnen
  const kinderBerechnet = kinder.map(kind => {
    const tabellenBedarf = getTabellenBedarf(netto, kind.alter);
    
    // Kindergeld-Abzug: Bei Volljährigen voll (Altersgruppe 4), sonst hälftig
    const kgAbzug = (kind.alter === 4) ? KINDERGELD : (KINDERGELD / 2);
    
    // Zahlbetrag darf nicht negativ werden
    const regelZahlbetrag = Math.max(0, tabellenBedarf - kgAbzug);
    
    gesamtBedarf += regelZahlbetrag;
    
    return {
      name: kind.name,
      alterGrp: kind.alter,
      tabellenBedarf: tabellenBedarf,
      kgAbzug: kgAbzug,
      regelZahlbetrag: regelZahlbetrag,
      tatsaechlicherZahlbetrag: regelZahlbetrag // Wird im Mangelfall überschrieben
    };
  });

  // 2. Mangelfall-Prüfung
  const verteilungsMasse = Math.max(0, netto - selbstbehalt);
  let istMangelfall = false;

  if (gesamtBedarf > verteilungsMasse) {
    istMangelfall = true;
    
    // Wenn gar kein Geld über dem Selbstbehalt da ist:
    if (verteilungsMasse === 0) {
      kinderBerechnet.forEach(k => k.tatsaechlicherZahlbetrag = 0);
    } else {
      // Prozentuale Verteilung der Restmasse
      kinderBerechnet.forEach(k => {
        const anteil = k.regelZahlbetrag / gesamtBedarf;
        k.tatsaechlicherZahlbetrag = verteilungsMasse * anteil;
      });
    }
  }

  const gesamtZahlbetragTatsaechlich = kinderBerechnet.reduce((sum, k) => sum + k.tatsaechlicherZahlbetrag, 0);

  return {
    selbstbehalt,
    verteilungsMasse,
    gesamtBedarf,
    gesamtZahlbetragTatsaechlich,
    istMangelfall,
    kinder: kinderBerechnet
  };
}

// -------------------------------------------------------------------
// HTML-GENERIERUNG FÜR DAS ERGEBNIS
// -------------------------------------------------------------------

function buildResult(res) {
  let kinderHTML = res.kinder.map((k, index) => `
    <div style="background: white; padding: 15px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 15px;">
      <h4 style="margin-top: 0; color: #333;">Kind ${index + 1}</h4>
      <table style="width: 100%; font-size: 0.95rem; border-collapse: collapse;">
        <tr><td style="padding: 4px 0; color: #666;">Bedarf nach Tabelle:</td><td style="text-align: right;">${euro(k.tabellenBedarf)}</td></tr>
        <tr><td style="padding: 4px 0; color: #666;">Abzug Kindergeld:</td><td style="text-align: right;">- ${euro(k.kgAbzug)}</td></tr>
        <tr style="border-top: 1px solid #eee;">
          <td style="padding: 8px 0; font-weight: bold;">Normaler Zahlbetrag:</td>
          <td style="text-align: right; font-weight: bold;">${euro(k.regelZahlbetrag)}</td>
        </tr>
      </table>
      ${res.istMangelfall ? `
        <div style="background: #fff3e0; padding: 10px; margin-top: 10px; border-radius: 4px; border-left: 3px solid #ed6c02;">
          <strong style="color: #d84315;">Reduziert wegen Mangelfall:</strong><br>
          <span style="font-size: 1.2rem; font-weight: bold; color: #d32f2f;">${euro(k.tatsaechlicherZahlbetrag)}</span>
        </div>
      ` : `
        <div style="margin-top: 10px;">
          <strong style="color: #2e7d32;">Voraussichtlicher Zahlbetrag:</strong><br>
          <span style="font-size: 1.2rem; font-weight: bold; color: #2e7d32;">${euro(k.tatsaechlicherZahlbetrag)}</span>
        </div>
      `}
    </div>
  `).join("");

  let mangelfallHinweis = "";
  if (res.istMangelfall) {
    mangelfallHinweis = `
      <div style="background: #ffebee; border: 1px solid #ffcdd2; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
        <h3 style="margin-top: 0; color: #c62828;">⚠️ Achtung: Mangelfall erkannt!</h3>
        <p style="margin-bottom: 10px; font-size: 0.95rem;">Das Nettoeinkommen reicht nicht aus, um den vollen Unterhalt zu zahlen und gleichzeitig den gesetzlichen Selbstbehalt von <strong>${euro(res.selbstbehalt)}</strong> zu sichern.</p>
        <ul style="font-size: 0.9rem; color: #444; margin-bottom: 0; padding-left: 20px;">
          <li>Gesamter Anspruch aller Kinder: ${euro(res.gesamtBedarf)}</li>
          <li>Verfügbare Verteilungsmasse: ${euro(res.verteilungsMasse)}</li>
          <li><strong>Folge:</strong> Die restlichen ${euro(res.verteilungsMasse)} werden nun prozentual (je nach Höhe des Anspruchs) auf die Kinder aufgeteilt.</li>
        </ul>
      </div>
    `;
  } else {
    mangelfallHinweis = `
      <div style="background: #e8f5e9; border: 1px solid #c8e6c9; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
        <h3 style="margin-top: 0; color: #2e7d32;">✅ Reguläre Berechnung (Kein Mangelfall)</h3>
        <p style="margin-bottom: 0; font-size: 0.95rem;">Das Einkommen ist ausreichend, um den vollen Unterhaltsbedarf aller Kinder zu decken. Der Selbstbehalt von ${euro(res.selbstbehalt)} ist nicht gefährdet.</p>
      </div>
    `;
  }

  return `
    <div style="border: 2px solid #2196f3; border-radius: 8px; padding: 20px; margin-top: 30px; background: #fafafa;">
      <h2 style="margin-top: 0; color: #0d47a1;">Ergebnis deiner Berechnung</h2>
      
      ${mangelfallHinweis}
      
      <h3 style="font-size: 1.1rem; border-bottom: 1px solid #ccc; padding-bottom: 5px;">Übersicht der Kinder</h3>
      ${kinderHTML}

      <div style="background: #e3f2fd; padding: 15px; border-radius: 6px; margin-top: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #bbdefb; padding-bottom: 10px; margin-bottom: 10px;">
          <strong style="color: #0d47a1;">Zu überweisende Gesamtsumme:</strong>
          <span style="font-size: 1.4rem; font-weight: bold; color: #0d47a1;">${euro(res.gesamtZahlbetragTatsaechlich)}</span>
        </div>
        <p style="font-size: 0.85rem; color: #555; margin: 0;">Diese Summe ist eine Orientierung. Abweichungen durch individuelle Bereinigungen des Nettoeinkommens sind in der Praxis sehr häufig.</p>
      </div>
    </div>
  `;
}

// -------------------------------------------------------------------
// INITIALISIERUNG & EVENT LISTENER
// -------------------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
  const nettoInp = document.getElementById("ku_netto");
  const statusInp = document.getElementById("ku_status");
  const k1Inp = document.getElementById("ku_kind1");
  const k2Inp = document.getElementById("ku_kind2");
  const k3Inp = document.getElementById("ku_kind3");

  const btn = document.getElementById("ku_berechnen");
  const reset = document.getElementById("ku_reset");
  const out = document.getElementById("ku_ergebnis");

  if (!btn || !out) return;

  btn.addEventListener("click", () => {
    const errors = [];
    if (!nettoInp.value) errors.push("Bitte das monatliche Nettoeinkommen eintragen.");
    if (!k1Inp.value) errors.push("Bitte das Alter für mindestens ein Kind (Kind 1) angeben.");

    if (errors.length){
      out.innerHTML = errorBox(errors);
      out.scrollIntoView({ behavior: "smooth" });
      return;
    }

    // Kinder-Array zusammenbauen
    const kinder = [];
    const k1Val = parseInt(k1Inp.value);
    const k2Val = parseInt(k2Inp.value);
    const k3Val = parseInt(k3Inp.value);

    if (k1Val > 0) kinder.push({ name: "Kind 1", alter: k1Val });
    if (k2Val > 0) kinder.push({ name: "Kind 2", alter: k2Val });
    if (k3Val > 0) kinder.push({ name: "Kind 3", alter: k3Val });

    const netto = n(nettoInp);
    const status = statusInp.value;

    const res = berechneUnterhalt(netto, status, kinder);

    out.innerHTML = buildResult(res);
    out.scrollIntoView({ behavior: "smooth" });
  });

  if (reset) {
    reset.addEventListener("click", () => {
      setTimeout(() => { out.innerHTML = ""; }, 0);
    });
  }
});