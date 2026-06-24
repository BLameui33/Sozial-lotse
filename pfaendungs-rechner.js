// pfaendungs-rechner.js – Logik nach § 850c ZPO (Pfändungstabelle)

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

// -------------------------------------------------------------------
// DATENGRUNDLAGE: Pfändungsfreigrenzen (§ 850c ZPO)
// Hinweis: Diese Werte basieren auf der Bekanntmachung vom April 2026
// und gelten vom 01. Juli 2026 bis zum 30. Juni 2027.
// -------------------------------------------------------------------
const ZPO_WERTE = {
  grundfreibetrag: 1590.00,        // Bisher: 1402.28
  zuschlagErstePerson: 597.42,     // Bisher: 527.76
  zuschlagWeiterePersonen: 332.83, // je Person (Max. bis zur 5. Person) - Bisher: 294.12
  maximalEinkommen: 4866.30        // Darüber hinaus wird alles zu 100% gepfändet - Bisher: 4275.59
};

// Anteil des "Mehrverdienstes" (über dem Freibetrag), der dem Schuldner bleibt.
// Index = Anzahl der unterhaltspflichtigen Personen (0 bis 5)
// 0 Pers: 3/10 bleiben, 1 Pers: 5/10 bleiben, 2 Pers: 6/10 bleiben, usw.
// Diese Quoten (§ 850c Abs. 3 ZPO) bleiben unverändert.
const BEHALTENS_QUOTE = [0.3, 0.5, 0.6, 0.7, 0.8, 0.9];

// -------------------------------------------------------------------
// KERN-LOGIK: Berechnung der Pfändung
// -------------------------------------------------------------------
function berechnePfaendung(nettoOriginal, personen) {
  // 1. Nach § 850c ZPO wird das Nettoeinkommen für die Berechnung auf volle 10 Euro abgerundet
  let netto = Math.floor(nettoOriginal / 10) * 10;
  
  // Wenn das Einkommen nach Rundung unter dem Grundfreibetrag liegt -> Keine Pfändung
  if (netto <= ZPO_WERTE.grundfreibetrag) {
    return { nettoOriginal, netto, personen, pfaendbar: 0, freibetrag: nettoOriginal };
  }

  // 2. Individuellen Grundfreibetrag anhand der Personen ermitteln (Maximal 5 Personen werden berücksichtigt)
  const p = Math.min(personen, 5);
  let individuellerFreibetrag = ZPO_WERTE.grundfreibetrag;
  if (p > 0) {
    individuellerFreibetrag += ZPO_WERTE.zuschlagErstePerson;
  }
  if (p > 1) {
    individuellerFreibetrag += (p - 1) * ZPO_WERTE.zuschlagWeiterePersonen;
  }

  // Liegt das Einkommen unter dem individuellen Freibetrag?
  if (netto <= individuellerFreibetrag) {
    return { nettoOriginal, netto, personen, pfaendbar: 0, freibetrag: nettoOriginal };
  }

  // 3. Anteilige Pfändung des Mehrbetrags berechnen (bis zum Maximal-Einkommen)
  let pfaendbar = 0;
  
  // Das zu berücksichtigende Netto wird bei der Maximalgrenze gedeckelt
  const nettoGedeckelt = Math.min(netto, ZPO_WERTE.maximalEinkommen);
  
  const mehrBetrag = nettoGedeckelt - individuellerFreibetrag;
  
  if (mehrBetrag > 0) {
    const behaltensAnteil = mehrBetrag * BEHALTENS_QUOTE[p];
    const pfaendbarerAnteil = mehrBetrag - behaltensAnteil;
    pfaendbar += pfaendbarerAnteil;
  }

  // 4. Alles, was über dem Maximal-Einkommen liegt, ist voll (zu 100%) pfändbar
  if (netto > ZPO_WERTE.maximalEinkommen) {
    pfaendbar += (netto - ZPO_WERTE.maximalEinkommen);
  }

  // Endgültiger Freibetrag ist das tatsächliche Netto minus das Pfändbare
  const freibetrag = nettoOriginal - pfaendbar;

  return { nettoOriginal, netto, personen, pfaendbar, freibetrag };
}

// -------------------------------------------------------------------
// HTML-GENERIERUNG FÜR DAS ERGEBNIS
// -------------------------------------------------------------------
function buildResult(res) {
  let statusBox = "";

  if (res.pfaendbar <= 0) {
    statusBox = `
      <div style="background: #e8f5e9; border: 1px solid #c8e6c9; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
        <h3 style="margin-top: 0; color: #2e7d32;">✅ Nichts pfändbar (Vollständiger Schutz)</h3>
        <p style="margin-bottom: 0; font-size: 0.95rem;">Ihr Einkommen liegt unterhalb der gesetzlichen Pfändungsfreigrenze. Ein Gläubiger bzw. Ihr Arbeitgeber darf von diesem Nettoeinkommen <strong>keinen einzigen Cent</strong> abführen.</p>
      </div>
    `;
  } else {
    statusBox = `
      <div style="background: #fff3e0; border: 1px solid #ffe0b2; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
        <h3 style="margin-top: 0; color: #e65100;">⚠️ Teilpfändung greift</h3>
        <p style="margin-bottom: 0; font-size: 0.95rem;">Ihr Einkommen liegt über der Freigrenze. Ein Teil Ihres Gehalts darf gepfändet werden, jedoch bleibt Ihr Existenzminimum streng geschützt.</p>
      </div>
    `;
  }

  return `
    <div style="border: 2px solid #2196f3; border-radius: 8px; padding: 20px; margin-top: 30px; background: #fafafa;">
      <h2 style="margin-top: 0; color: #0d47a1;">Ihr Ergebnis</h2>
      
      ${statusBox}

      <div style="display: grid; gap: 15px; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); margin-bottom: 20px;">
        <!-- Box: Was Ihnen bleibt -->
        <div style="background: white; padding: 20px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); text-align: center; border-bottom: 4px solid #2e7d32;">
          <p style="margin: 0; font-size: 0.95rem; color: #666;">Ihnen bleiben zwingend (Freibetrag):</p>
          <p style="font-size: 2.2rem; color: #2e7d32; font-weight: bold; margin: 10px 0;">
            ${euro(res.freibetrag)}
          </p>
          <p style="margin: 0; font-size: 0.8rem; color: #888;">(Das Existenzminimum für ${res.personen} Unterhaltspflichtige)</p>
        </div>

        <!-- Box: Was gepfändet wird -->
        <div style="background: white; padding: 20px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); text-align: center; border-bottom: 4px solid #d32f2f;">
          <p style="margin: 0; font-size: 0.95rem; color: #666;">Darf gepfändet werden:</p>
          <p style="font-size: 2.2rem; color: #d32f2f; font-weight: bold; margin: 10px 0;">
            ${euro(res.pfaendbar)}
          </p>
          <p style="margin: 0; font-size: 0.8rem; color: #888;">(Geht direkt an den Gläubiger)</p>
        </div>
      </div>

      <div style="font-size: 0.9rem; color: #555; background: #e3f2fd; padding: 15px; border-radius: 6px;">
        <strong>Details zur Berechnung:</strong><br>
        Ihr eingegebenes Nettoeinkommen (${euro(res.nettoOriginal)}) wurde nach gesetzlicher Vorgabe für die Berechnung auf volle 10 Euro abgerundet (${euro(res.netto)}). Die Berechnung basiert auf der Pfändungstabelle (§ 850c ZPO).
      </div>
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
    if (!nettoInp.value || n(nettoInp) < 0) errors.push("Bitte geben Sie ein gültiges Nettoeinkommen ein.");

    if (errors.length){
      out.innerHTML = errorBox(errors);
      out.scrollIntoView({ behavior: "smooth" });
      return;
    }

    const netto = n(nettoInp);
    const personen = parseInt(personenInp.value, 10) || 0;

    const res = berechnePfaendung(netto, personen);

    out.innerHTML = buildResult(res);
    out.scrollIntoView({ behavior: "smooth" });
  });

  if (reset) {
    reset.addEventListener("click", () => {
      setTimeout(() => { out.innerHTML = ""; }, 0);
    });
  }
});