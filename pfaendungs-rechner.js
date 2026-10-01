// pfaendungs-rechner.js – Logik nach § 850c ZPO (Pfändungstabelle)

// Hilfsfunktionen
function n(el) { 
  if (!el) return 0; 
  const raw = (el.value || "").toString().replace(",", "."); 
  const v = Number(raw); 
  return Number.isFinite(v) ? v : 0; 
}

function euro(v) { 
  const x = Number.isFinite(v) ? v : 0; 
  return x.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €"; 
}

function errorBox(msgs) {
  if (!msgs.length) return "";
  return `
    <div class="pr-card pr-status-alert">
      <h3 class="pr-card-title pr-text-danger">Eingabe prüfen</h3>
      <ul class="pr-list">
        ${msgs.map(m => `<li>${m}</li>`).join("")}
      </ul>
    </div>
  `;
}

// -------------------------------------------------------------------
// DATENGRUNDLAGE: Pfändungsfreigrenzen (§ 850c ZPO)
// Gültig vom 01. Juli 2026 bis 30. Juni 2027
// -------------------------------------------------------------------
const ZPO_WERTE = {
  grundfreibetrag: 1590.00,        
  zuschlagErstePerson: 597.42,     
  zuschlagWeiterePersonen: 332.83, // je Person (Max. bis zur 5. Person)
  maximalEinkommen: 4866.30        // Ab hier 100% pfändbar
};

// Behaltensquote des Mehrbetrags (§ 850c Abs. 3 ZPO)
const BEHALTENS_QUOTE = [0.3, 0.5, 0.6, 0.7, 0.8, 0.9];

// -------------------------------------------------------------------
// KERN-LOGIK: Berechnung der Pfändung
// -------------------------------------------------------------------
function berechnePfaendung(nettoOriginal, personen) {
  // 1. Nach § 850c ZPO Abrundung auf volle 10 Euro
  let netto = Math.floor(nettoOriginal / 10) * 10;
  
  if (netto <= ZPO_WERTE.grundfreibetrag) {
    return { nettoOriginal, netto, personen, pfaendbar: 0, freibetrag: nettoOriginal };
  }

  // 2. Individuellen Grundfreibetrag ermitteln (max. 5 Personen)
  const p = Math.min(personen, 5);
  let individuellerFreibetrag = ZPO_WERTE.grundfreibetrag;
  if (p > 0) {
    individuellerFreibetrag += ZPO_WERTE.zuschlagErstePerson;
  }
  if (p > 1) {
    individuellerFreibetrag += (p - 1) * ZPO_WERTE.zuschlagWeiterePersonen;
  }

  if (netto <= individuellerFreibetrag) {
    return { nettoOriginal, netto, personen, pfaendbar: 0, freibetrag: nettoOriginal };
  }

  // 3. Mehrbetrag berechnen
  let pfaendbar = 0;
  const nettoGedeckelt = Math.min(netto, ZPO_WERTE.maximalEinkommen);
  const mehrBetrag = nettoGedeckelt - individuellerFreibetrag;
  
  if (mehrBetrag > 0) {
    const behaltensAnteil = mehrBetrag * BEHALTENS_QUOTE[p];
    const pfaendbarerAnteil = mehrBetrag - behaltensAnteil;
    pfaendbar += pfaendbarerAnteil;
  }

  // 4. Beträge über dem Höchsteinkommen sind zu 100% pfändbar
  if (netto > ZPO_WERTE.maximalEinkommen) {
    pfaendbar += (netto - ZPO_WERTE.maximalEinkommen);
  }

  const freibetrag = nettoOriginal - pfaendbar;

  return { nettoOriginal, netto, personen, pfaendbar, freibetrag };
}

// -------------------------------------------------------------------
// HTML-GENERIERUNG FÜR DAS ERGEBNIS
// -------------------------------------------------------------------
function buildResult(res) {
  let statusBanner = "";

  if (res.pfaendbar <= 0) {
    statusBanner = `
      <div class="pr-status-banner pr-status-notice">
        <h3 class="pr-status-title">Vollständiger Pfändungsschutz</h3>
        <p class="pr-status-text">
          Das Nettoeinkommen liegt unterhalb der gesetzlichen Pfändungsfreigrenze. Von diesem Einkommen darf kein Betrag an Gläubiger abgeführt werden.
        </p>
      </div>
    `;
  } else {
    statusBanner = `
      <div class="pr-status-banner pr-status-warn">
        <h3 class="pr-status-title">Teilweise Pfändung</h3>
        <p class="pr-status-text">
          Das Nettoeinkommen übersteigt die gesetzliche Freigrenze. Ein berechneter Teilbetrag ist pfändbar; das gesetzliche Existenzminimum bleibt geschützt.
        </p>
      </div>
    `;
  }

  return `
    <div class="pr-card">
      <h2 class="pr-card-title">Ergebnis der Berechnung</h2>
      
      ${statusBanner}

      <div class="pr-grid">
        <div class="pr-result-box pr-box-unpfaendbar">
          <span class="pr-box-label">Unpfändbarer Freibetrag</span>
          <strong class="pr-box-amount">${euro(res.freibetrag)}</strong>
          <span class="pr-box-sub">Geschütztes Existenzminimum für ${res.personen} Berechtigte</span>
        </div>

        <div class="pr-result-box pr-box-pfaendbar">
          <span class="pr-box-label">Pfändbarer Betrag</span>
          <strong class="pr-box-amount">${euro(res.pfaendbar)}</strong>
          <span class="pr-box-sub">Monatlich an Gläubiger abzuführen</span>
        </div>
      </div>

      <div class="pr-details-box">
        <h4 class="pr-details-title">Berechnungsgrundlage</h4>
        <p class="pr-details-text">
          Das eingegebene Nettoeinkommen von <strong>${euro(res.nettoOriginal)}</strong> wird gemäß § 850c ZPO auf volle 10 Euro abgerundet (<strong>${euro(res.netto)}</strong>). Die Auswertung erfolgt auf Basis der aktuellen Pfändungstabelle für <strong>${res.personen} unterhaltsberechtigte Person(en)</strong>.
        </p>
      </div>

      <div class="pr-legal-notes">
        <h4 class="pr-details-title">Wichtige rechtliche Hinweise</h4>
        <ul class="pr-list">
          <li><strong>Tatsächliche Unterhaltszahlung:</strong> Personen werden bei der Berechnung nur berücksichtigt, wenn die Unterhaltspflicht tatsächlich erfüllt wird. Bei nur teilweiser Unterhaltszahlung kann das Vollstreckungsgericht auf Antrag des Gläubigers die Berücksichtigung nach § 850c Abs. 6 ZPO anpassen.</li>
          <li><strong>Unterhaltspfändung (§ 850d ZPO):</strong> Erfogt die Pfändung wegen eigener Unterhaltsrückstände, gelten Sonderregelungen mit deutlich geringeren Freibeträgen.</li>
        </ul>
      </div>

      <p class="pr-disclaimer">
        Diese Berechnung dient der Orientierung und ersetzt keine rechtliche Beratung. Bei Pfändungsfragen oder P-Konto-Bescheinigungen wenden Sie sich an eine anerkannte <a href="https://www.verbraucherzentrale.de" target="_blank" rel="noopener noreferrer">Verbraucherzentrale</a> oder Schuldnerberatungsstelle.
      </p>
    </div>
  `;
}

// -------------------------------------------------------------------
// INITIALISIERUNG & EVENT LISTENER
// -------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  const nettoInp = document.getElementById("pfaend_netto");
  const personenInp = document.getElementById("pfaend_personen");

  const btn = document.getElementById("pfaendung_berechnen");
  const reset = document.getElementById("pfaendung_reset");
  const out = document.getElementById("pfaendung_ergebnis");

  if (!btn || !out) return;

  btn.addEventListener("click", () => {
    const errors = [];
    if (!nettoInp.value || n(nettoInp) <= 0) {
      errors.push("Bitte geben Sie ein gültiges monatliches Nettoeinkommen an.");
    }

    if (errors.length) {
      out.innerHTML = errorBox(errors);
      out.scrollIntoView({ behavior: "smooth", block: "nearest" });
      return;
    }

    const netto = n(nettoInp);
    const personen = parseInt(personenInp.value, 10) || 0;

    const res = berechnePfaendung(netto, personen);

    out.innerHTML = buildResult(res);
    out.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });

  if (reset) {
    reset.addEventListener("click", () => {
      setTimeout(() => { out.innerHTML = ""; }, 50);
    });
  }
});