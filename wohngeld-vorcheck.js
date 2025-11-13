// wohngeld-vorcheck.js – klarer, mit Mini-Validierung & Ergebnis-Ampel

function n(el){ if(!el) return 0; const raw=(el.value||"").toString().replace(",","."); const v=Number(raw); return Number.isFinite(v)?v:0; }
function euro(v){ const x=Number.isFinite(v)?v:0; return x.toFixed(2).replace(".",",")+" €"; }
function clamp(v,min,max){ return Math.min(Math.max(v,min),max); }

function errorBox(msgs){
  if (!msgs.length) return "";
  return `
    <div class="pflegegrad-result-card">
      <h2>Bitte Eingaben prüfen</h2>
      <ul>${msgs.map(m=>`<li>${m}</li>`).join("")}</ul>
    </div>
  `;
}
function badge(kind){
  const map = {
    pos: {label:"wahrscheinlich", cls:"badge-success"},
    warn:{label:"grenzwertig", cls:"badge-warning"},
    neg: {label:"eher nicht", cls:"badge-danger"}
  };
  const b = map[kind] || map.warn;
  return `<span class="${b.cls}" style="padding:.2rem .5rem;border-radius:.5rem;">${b.label}</span>`;
}

// Kernformel (vereinfacht)
function schaetzeWohngeld({ kaltmiete, cap, netto, zumutbarPct, tolMinus, tolPlus }) {
  const gedeckelt = Math.min(Math.max(0, kaltmiete), Math.max(0, cap));
  const zumutbar = Math.max(0, netto) * (clamp(zumutbarPct, 0, 100) / 100);
  const punkt = Math.max(0, gedeckelt - zumutbar);

  const spanMin = Math.max(0, punkt * (1 - clamp(tolMinus, 0, 100) / 100));
  const spanMax = Math.max(0, punkt * (1 + clamp(tolPlus, 0, 100) / 100));

  return { gedeckelt, zumutbar, punkt, spanMin, spanMax };
}

// Ampel-Logik
function einordnung(punkt, spanMin, spanMax) {
  if (punkt <= 0) return {label:"Eher nicht", kind:"neg"};
  if (spanMax < 50) return {label:"Grenzwertig", kind:"warn"};
  return {label:"Wahrscheinlich", kind:"pos"};
}

function buildResult(e, res){
  const ord = einordnung(res.punkt, res.spanMin, res.spanMax);

  return `
    <h2>Ergebnis: Wohngeld-Vorcheck</h2>

    <div class="pflegegrad-result-card">
      <p style="font-size:1.05rem;">
        <strong>Einordnung:</strong> ${badge(ord.kind)} (${ord.label})
      </p>

      <h3>Deine Eingaben</h3>
      <table class="pflegegrad-tabelle">
        <thead><tr><th>Angabe</th><th>Wert</th></tr></thead>
        <tbody>
          <tr><td>Personen im Haushalt</td><td>${e.personen}</td></tr>
          <tr><td>Haushalts-Netto pro Monat</td><td>${euro(e.netto)}</td></tr>
          <tr><td>Bruttokaltmiete</td><td>${euro(e.kaltmiete)}</td></tr>
          <tr><td>Cap (angemessene Kaltmiete)</td><td>${euro(e.cap)}</td></tr>
          <tr><td>Zumutbare Eigenbelastung</td><td>${e.zumutbarPct.toFixed(1).replace(".",",")} % vom Netto</td></tr>
          ${e.mietstufe ? `<tr><td>Mietstufe/Ort</td><td>${e.mietstufe}</td></tr>` : ""}
        </tbody>
      </table>

      <h3>Berechnung (vereinfacht)</h3>
      <table class="pflegegrad-tabelle">
        <thead><tr><th>Größe</th><th>Betrag</th></tr></thead>
        <tbody>
          <tr><td>Gedeckelte Kaltmiete</td><td>${euro(res.gedeckelt)}</td></tr>
          <tr><td>Zumutbare Eigenbelastung</td><td>${euro(res.zumutbar)}</td></tr>
          <tr><td><strong>Punkt-Schätzung Zuschuss</strong></td><td><strong>${euro(res.punkt)}</strong></td></tr>
          <tr><td>Spanne (mit Toleranz)</td><td>${euro(res.spanMin)} – ${euro(res.spanMax)}</td></tr>
        </tbody>
      </table>

      <h3>Nächste Schritte</h3>
      <ul>
        <li>Prüfe die <strong>lokale Cap</strong> für deine Personenanzahl und Mietstufe.</li>
        <li>Nutze den <strong>amtlichen Wohngeldrechner</strong> für eine genaue Berechnung.</li>
        <li>Bei knapper Spanne (<em>grenzwertig</em>): Unterlagen sammeln und beraten lassen.</li>
      </ul>
    </div>

    <p class="hinweis">
      Dieser Vorcheck ersetzt keine Rechtsberatung. Maßgeblich sind der amtliche Wohngeldrechner und der spätere Bescheid.
    </p>
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  const pers = document.getElementById("wg_personen");
  const netto = document.getElementById("wg_netto");
  const kalt = document.getElementById("wg_kaltmiete");
  const cap = document.getElementById("wg_cap");
  const zPct = document.getElementById("wg_zumutbar_pct");
  const tolM = document.getElementById("wg_tol_minus");
  const tolP = document.getElementById("wg_tol_plus");
  const mietstufe = document.getElementById("wg_mietstufe");

  const btn = document.getElementById("wg_berechnen");
  const reset = document.getElementById("wg_reset");
  const out = document.getElementById("wg_ergebnis");

  if (!btn || !out) return;

  btn.addEventListener("click", () => {
    const errors = [];
    if (!pers.value) errors.push("Bitte die Personenanzahl angeben.");
    if (!kalt.value) errors.push("Bitte die Bruttokaltmiete angeben.");
    if (!netto.value) errors.push("Bitte das Haushalts-Nettoeinkommen angeben.");
    if (!cap.value) errors.push("Bitte die Cap-Obergrenze angeben.");

    if (errors.length){
      out.innerHTML = errorBox(errors);
      out.scrollIntoView({ behavior: "smooth" });
      return;
    }

    const eingabe = {
      personen: Math.max(1, Math.floor(n(pers))),
      netto: n(netto),
      kaltmiete: n(kalt),
      cap: n(cap),
      zumutbarPct: n(zPct),
      tolMinus: n(tolM),
      tolPlus: n(tolP),
      mietstufe: (mietstufe && mietstufe.value || "").trim()
    };

    const res = schaetzeWohngeld({
      kaltmiete: eingabe.kaltmiete,
      cap: eingabe.cap,
      netto: eingabe.netto,
      zumutbarPct: eingabe.zumutbarPct,
      tolMinus: eingabe.tolMinus,
      tolPlus: eingabe.tolPlus
    });

    out.innerHTML = buildResult(eingabe, res);
    out.scrollIntoView({ behavior: "smooth" });
  });

  if (reset) {
    reset.addEventListener("click", () => {
      setTimeout(() => { out.innerHTML = ""; }, 0);
    });
  }
});
