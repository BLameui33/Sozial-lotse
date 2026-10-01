// kindesunterhalt-rechner.js – Inkl. Düsseldorfer Tabelle & Mangelfall-Logik

// Hilfsfunktionen
function n(el) {
  if (!el) return 0;
  const raw = (el.value || "").toString().replace(",", ".");
  const v = Number(raw);
  return Number.isFinite(v) ? v : 0;
}

function euro(v) {
  const x = Number.isFinite(v) ? v : 0;
  return x.toLocaleString("de-DE", { style: "currency", currency: "EUR" });
}

function errorBox(msgs) {
  if (!msgs.length) return "";
  return `
    <div class="ku-card ku-error-card">
      <h3 class="ku-card-title ku-text-danger">Bitte Angaben prüfen</h3>
      <ul class="ku-list">
        ${msgs.map(m => `<li>${m}</li>`).join("")}
      </ul>
    </div>
  `;
}

const KINDERGELD = 259; // Aktuelles Kindergeld (wird bei Minderjährigen hälftig abgezogen)

// Einkommensstufen (Netto bis ...)
const einkommensGrenzen = [
  2100, 2500, 2900, 3300, 3700, 4100, 4500, 4900, 5300, 5700, 6400, 7200, 8200, 9700, 11200
];

// Bedarfsätze pro Stufe. Spalten: [0-5 Jahre, 6-11 Jahre, 12-17 Jahre, ab 18 Jahre]
const duesseldorferTabelle = [
  [486, 558, 653, 698],  // Stufe 1
  [511, 586, 686, 733],  // Stufe 2
  [535, 614, 719, 768],  // Stufe 3
  [559, 642, 751, 803],  // Stufe 4
  [584, 670, 784, 838],  // Stufe 5
  [623, 715, 836, 894],  // Stufe 6
  [661, 759, 889, 950],  // Stufe 7
  [700, 804, 941, 1006], // Stufe 8
  [739, 849, 993, 1061], // Stufe 9
  [778, 893, 1045, 1117] // Stufe 10
];

// Funktion zur Ermittlung des Regelbedarfs
function getTabellenBedarf(netto, altersGruppe) {
  let stufe = 0;
  for (let i = 0; i < einkommensGrenzen.length; i++) {
    if (netto <= einkommensGrenzen[i]) {
      stufe = i;
      break;
    }
    if (i === einkommensGrenzen.length - 1) {
      stufe = Math.min(i, duesseldorferTabelle.length - 1);
    }
  }

  stufe = Math.min(stufe, duesseldorferTabelle.length - 1);
  const alterIndex = altersGruppe - 1;

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
    const kgAbzug = (kind.alter === 4) ? KINDERGELD : (KINDERGELD / 2);
    const regelZahlbetrag = Math.max(0, tabellenBedarf - kgAbzug);

    gesamtBedarf += regelZahlbetrag;

    return {
      name: kind.name,
      alterGrp: kind.alter,
      tabellenBedarf: tabellenBedarf,
      kgAbzug: kgAbzug,
      regelZahlbetrag: regelZahlbetrag,
      tatsaechlicherZahlbetrag: regelZahlbetrag
    };
  });

  // 2. Mangelfall-Prüfung
  const verteilungsMasse = Math.max(0, netto - selbstbehalt);
  let istMangelfall = false;

  if (gesamtBedarf > verteilungsMasse) {
    istMangelfall = true;

    if (verteilungsMasse === 0) {
      kinderBerechnet.forEach(k => k.tatsaechlicherZahlbetrag = 0);
    } else {
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
    <div class="ku-child-card">
      <h4 class="ku-child-title">Kind ${index + 1}</h4>
      <table class="ku-table">
        <tbody>
          <tr>
            <td>Bedarf nach Tabelle</td>
            <td>${euro(k.tabellenBedarf)}</td>
          </tr>
          <tr>
            <td>Abzug Kindergeld</td>
            <td>- ${euro(k.kgAbzug)}</td>
          </tr>
          <tr class="ku-table-highlight">
            <td>Regulärer Zahlbetrag</td>
            <td>${euro(k.regelZahlbetrag)}</td>
          </tr>
        </tbody>
      </table>

      ${res.istMangelfall ? `
        <div class="ku-badge-box ku-badge-warn">
          <span class="ku-badge-label">Reduziert wegen Mangelfall</span>
          <span class="ku-badge-amount">${euro(k.tatsaechlicherZahlbetrag)}</span>
        </div>
      ` : `
        <div class="ku-badge-box ku-badge-pos">
          <span class="ku-badge-label">Voraussichtlicher Zahlbetrag</span>
          <span class="ku-badge-amount">${euro(k.tatsaechlicherZahlbetrag)}</span>
        </div>
      `}
    </div>
  `).join("");

  let mangelfallHinweis = "";
  if (res.istMangelfall) {
    mangelfallHinweis = `
      <div class="ku-status-banner ku-status-warn">
        <h3 class="ku-status-title">Hinweis: Mangelfall liegt vor</h3>
        <p class="ku-status-text">
          Das Nettoeinkommen reicht nicht aus, um den vollen Unterhalt zu decken und gleichzeitig den gesetzlichen Selbstbehalt von <strong>${euro(res.selbstbehalt)}</strong> zu sichern.
        </p>
        <ul class="ku-list ku-status-list">
          <li>Gesamter Anspruch aller Kinder: ${euro(res.gesamtBedarf)}</li>
          <li>Verfügbare Verteilungsmasse: ${euro(res.verteilungsMasse)}</li>
          <li>Folge: Die verbleibenden ${euro(res.verteilungsMasse)} werden prozentual auf die Kinder aufgeteilt.</li>
        </ul>
      </div>
    `;
  } else {
    mangelfallHinweis = `
      <div class="ku-status-banner ku-status-pos">
        <h3 class="ku-status-title">Reguläre Berechnung</h3>
        <p class="ku-status-text">
          Das Einkommen reicht aus, um den vollen Unterhaltsbedarf aller Kinder zu decken. Der Selbstbehalt von ${euro(res.selbstbehalt)} bleibt gewahrt.
        </p>
      </div>
    `;
  }

  return `
    <div class="ku-card">
      <h2 class="ku-card-title">Ergebnis der Berechnung</h2>

      ${mangelfallHinweis}

      <h3 class="ku-section-subtitle">Berechnung pro Kind</h3>
      ${kinderHTML}

      <div class="ku-summary-box">
        <div class="ku-summary-header">
          <span>Zu überweisende Gesamtsumme</span>
          <strong class="ku-summary-total">${euro(res.gesamtZahlbetragTatsaechlich)}</strong>
        </div>
        <p class="ku-disclaimer">
          Diese Auswertung dient als Orientierung. Abweichungen durch individuelle Bereinigungen des Nettoeinkommens sind in der Praxis üblich.
        </p>
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

    if (errors.length) {
      out.innerHTML = errorBox(errors);
      out.scrollIntoView({ behavior: "smooth", block: "nearest" });
      return;
    }

    const kinder = [];
    const k1Val = parseInt(k1Inp.value);
    const k2Val = parseInt(k2Inp.value);
    const k3Val = parseInt(k3Inp.value);

    if (k1Val > 0) kinder.push({ name: "Kind 1", alter: k1Val });
    if (k2Val > 0) kinder.push({ name: "Kind 2", alter: k2Val });
    if (k3Val > 0) kinder.push({ name: "Kind 3", alter: k3Val });

    const netto = n(nettoInp);
    const status = statusInp ? statusInp.value : "nein";

    const res = berechneUnterhalt(netto, status, kinder);

    out.innerHTML = buildResult(res);
    out.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });

  if (reset) {
    reset.addEventListener("click", () => {
      setTimeout(() => { out.innerHTML = ""; }, 0);
    });
  }
});