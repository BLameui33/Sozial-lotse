// mehrbedarfe-orientierung.js

function n(el){ if(!el) return 0; const raw=(el.value||"").toString().replace(",","."); const v=Number(raw); return Number.isFinite(v)?v:0; }
function euro(v){ const x=Number.isFinite(v)?v:0; return x.toFixed(2).replace(".",",")+" €"; }
function clamp(v,min,max){ return Math.min(Math.max(v,min),max); }

// Basisbedarf (Regelsätze, ohne Angemessenheitsprüfung KdU)
function basisRegelsatzSumme(inp){
  const rsErw = (inp.haushalt === "paar" ? n(inp.rsPartner) * 2 : n(inp.rsSingle))
              + n(inp.rsErwWeitere) * Math.max(0, Math.floor(inp.erwWeitere));
  const rsKids = n(inp.rs05) * Math.max(0, Math.floor(inp.k05))
               + n(inp.rs613) * Math.max(0, Math.floor(inp.k613))
               + n(inp.rs1417) * Math.max(0, Math.floor(inp.k1417));
  return { rsErw, rsKids, rsSum: rsErw + rsKids };
}

// sehr vereinfachte AE-Schätzung anhand Kinderzahl/Alter:
function autoAePct(k05, k613, k1417){
  const kTot = (k05|0) + (k613|0) + (k1417|0);
  if (kTot <= 0) return 0;
  if (kTot === 1){
    // 1 Kind: unter 7 Jahre tendenziell höher
    return k05 > 0 ? 36 : 12; // grobe Orientierung
  }
  if (kTot === 2) return 36;
  if (kTot === 3) return 36;
  if (kTot === 4) return 48;
  return 60; // 5+
}

function berechneMehrbedarfe(inp){
  // 1) Basis-Regelsätze (ohne Miete)
  const base = basisRegelsatzSumme(inp);

  // 2) AE-Mehrbedarf
  let aePct = 0;
  if (inp.aeFlag === "ja"){
    if (inp.aeMode === "auto"){
      aePct = autoAePct(inp.k05, inp.k613, inp.k1417);
    } else {
      aePct = Number(inp.aeMode) || 0;
    }
  }
  const aeBasis = n(inp.aeBasis) || n(inp.rsSingle);
  const aeBetrag = Math.round((aeBasis * (aePct/100)) * 100) / 100;

  // 3) Schwangerschafts-Mehrbedarf
  const schwPct = (inp.schwFlag === "ja") ? clamp(n(inp.schwPct), 0, 50) : 0;
  const schwBasis = n(inp.schwBasis) || n(inp.rsSingle);
  const schwBetrag = Math.round((schwBasis * (schwPct/100)) * 100) / 100;

  // 4) Optionale Pauschalen
  const ern = Math.max(0, n(inp.ern));
  const wwt = Math.max(0, n(inp.ww));
  const sonst = Math.max(0, n(inp.sonst));

  const mbSum = aeBetrag + schwBetrag + ern + wwt + sonst;

  // 5) Gesamtbedarf (optional mit Miete)
  const miete = Math.max(0, n(inp.warmmiete));
  const gesamt = base.rsSum + mbSum + miete;

  return {
    base,
    aePct, aeBasis, aeBetrag,
    schwPct, schwBasis, schwBetrag,
    ern, wwt, sonst,
    mbSum, miete, gesamt
  };
}

function renderErgebnis(inp, out){
  const kinderGes = (inp.k05|0) + (inp.k613|0) + (inp.k1417|0);

  const rowsPauschalen = [];
  if (out.ern > 0) rowsPauschalen.push(`<tr><td>Ernährung (kostenaufwändig)</td><td>${euro(out.ern)}</td></tr>`);
  if (out.wwt > 0) rowsPauschalen.push(`<tr><td>Dezentrale Warmwasserbereitung</td><td>${euro(out.wwt)}</td></tr>`);
  if (out.sonst > 0) rowsPauschalen.push(`<tr><td>Sonstige Mehrbedarfe</td><td>${euro(out.sonst)}</td></tr>`);

  const pauschalenHTML = rowsPauschalen.length
    ? rowsPauschalen.join("")
    : `<tr><td colspan="2">– keine –</td></tr>`;

  return `
    <h2>Ergebnis: Mehrbedarfe (Orientierung)</h2>

    <div class="pflegegrad-result-card">
      <h3>Haushaltsbasis (Regelsätze)</h3>
      <table class="pflegegrad-tabelle">
        <thead><tr><th>Komponente</th><th>Betrag</th></tr></thead>
        <tbody>
          <tr><td>Erwachsene (Summe)</td><td>${euro(out.base.rsErw)}</td></tr>
          <tr><td>Kinder (Summe)</td><td>${euro(out.base.rsKids)}</td></tr>
          <tr><td><strong>Regelsätze gesamt</strong></td><td><strong>${euro(out.base.rsSum)}</strong></td></tr>
        </tbody>
      </table>

      <h3>Mehrbedarfe</h3>
      <table class="pflegegrad-tabelle">
        <thead><tr><th>Art</th><th>Betrag</th></tr></thead>
        <tbody>
          <tr>
            <td>Alleinerziehend ${
              inp.aeFlag === "ja"
                ? `( ${kinderGes} Kind(er), ${
                    inp.aeMode === "auto" ? "automatisch" : (out.aePct.toFixed(0) + " %")
                  }, Basis ${euro(out.aeBasis)} )`
                : "(nicht gesetzt)"
            }</td>
            <td>${euro(out.aeBetrag)}</td>
          </tr>
          <tr>
            <td>Schwangerschaft ${
              inp.schwFlag === "ja"
                ? `( ${out.schwPct.toFixed(0)} % von ${euro(out.schwBasis)} )`
                : "(nicht gesetzt)"
            }</td>
            <td>${euro(out.schwBetrag)}</td>
          </tr>
          ${pauschalenHTML}
          <tr><td><strong>Mehrbedarfe gesamt</strong></td><td><strong>${euro(out.mbSum)}</strong></td></tr>
        </tbody>
      </table>

      <h3>Option: Gesamtbedarf (grobe Summe)</h3>
      <table class="pflegegrad-tabelle">
        <thead><tr><th>Komponente</th><th>Betrag</th></tr></thead>
        <tbody>
          <tr><td>Regelsätze gesamt</td><td>${euro(out.base.rsSum)}</td></tr>
          <tr><td>Mehrbedarfe gesamt</td><td>${euro(out.mbSum)}</td></tr>
          <tr><td>Warmmiete (Eingabe)</td><td>${euro(out.miete)}</td></tr>
          <tr><td><strong>Gesamtbedarf (grobe Orientierung)</strong></td><td><strong>${euro(out.gesamt)}</strong></td></tr>
        </tbody>
      </table>

      <p class="hinweis">
        <strong>Hinweis:</strong> Die automatische AE-Schätzung ist nur eine Orientierung.
        Für eine verbindliche Bewertung nutze bitte Beratung/Jobcenter und die gesetzlichen Grundlagen.
      </p>
    </div>
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  // Haushalt / Regelsätze
  const haushalt = document.getElementById("mb_haushalt");
  const erwWeit = document.getElementById("mb_erw_weitere");
  const k05 = document.getElementById("mb_k_0_5");
  const k613 = document.getElementById("mb_k_6_13");
  const k1417 = document.getElementById("mb_k_14_17");

  const rsSingle = document.getElementById("mb_rs_single");
  const rsPartner = document.getElementById("mb_rs_partner");
  const rsErwW = document.getElementById("mb_rs_erw_weitere");
  const rs05 = document.getElementById("mb_rs_0_5");
  const rs613 = document.getElementById("mb_rs_6_13");
  const rs1417 = document.getElementById("mb_rs_14_17");

  const warmmiete = document.getElementById("mb_warmmiete");

  // Mehrbedarfe
  const aeFlag = document.getElementById("mb_ae_flag");
  const aeMode = document.getElementById("mb_ae_mode");
  const aeBasis = document.getElementById("mb_ae_basis");

  const schwFlag = document.getElementById("mb_schw_flag");
  const schwPct = document.getElementById("mb_schw_pct");
  const schwBasis = document.getElementById("mb_schw_basis");

  const ern = document.getElementById("mb_ernaehrung");
  const wwt = document.getElementById("mb_warmwasser");
  const sonst = document.getElementById("mb_sonstig");

  // Actions
  const btn = document.getElementById("mb_berechnen");
  const reset = document.getElementById("mb_reset");
  const out = document.getElementById("mb_ergebnis");

  if (!btn || !out) return;

  btn.addEventListener("click", () => {
    const inp = {
      // Haushalt & Regelsätze
      haushalt: (haushalt && haushalt.value) || "single",
      erwWeitere: Math.max(0, Math.floor(n(erwWeit))),
      k05: Math.max(0, Math.floor(n(k05))),
      k613: Math.max(0, Math.floor(n(k613))),
      k1417: Math.max(0, Math.floor(n(k1417))),

      rsSingle: n(rsSingle),
      rsPartner: n(rsPartner),
      rsErwWeitere: n(rsErwW),
      rs05: n(rs05),
      rs613: n(rs613),
      rs1417: n(rs1417),

      warmmiete: n(warmmiete),

      // Mehrbedarfe
      aeFlag: (aeFlag && aeFlag.value) || "nein",
      aeMode: (aeMode && aeMode.value) || "auto",
      aeBasis: n(aeBasis),

      schwFlag: (schwFlag && schwFlag.value) || "nein",
      schwPct: n(schwPct),
      schwBasis: n(schwBasis),

      ern: n(ern),
      ww: n(wwt),
      sonst: n(sonst)
    };

    const outVals = berechneMehrbedarfe(inp);
    out.innerHTML = renderErgebnis(inp, outVals);
    out.scrollIntoView({ behavior: "smooth" });
  });

  if (reset) {
    reset.addEventListener("click", () => {
      setTimeout(() => { out.innerHTML = ""; }, 0);
    });
  }
});
