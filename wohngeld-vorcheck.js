// wohngeld-vorcheck.js (vereinfachte Spannen-Logik)

function n(el){ if(!el) return 0; const raw=(el.value||"").toString().replace(",","."); const v=Number(raw); return Number.isFinite(v)?v:0; }
function euro(v){ const x=Number.isFinite(v)?v:0; return x.toFixed(2).replace(".",",")+" €"; }
function clamp(v,min,max){ return Math.min(Math.max(v,min),max); }

// Kernformel (vereinfacht):
// 1) gedeckelte Miete = min(Kaltmiete, Cap)
// 2) zumutbare Eigenbelastung = Netto * (zumutbar%)
// 3) Punkt-Schätzung Zuschuss = max(0, gedeckelte Miete - zumutbar)
// 4) Spanne = Punkt * (1 - tolMinus%) ... Punkt * (1 + tolPlus%)
function schätzeWohngeld({ kaltmiete, cap, netto, zumutbarPct, tolMinus, tolPlus }) {
  const gedeckelt = Math.min(Math.max(0,kaltmiete), Math.max(0,cap));
  const zumutbar = Math.max(0, netto) * (clamp(zumutbarPct, 0, 100) / 100);
  const punkt = Math.max(0, gedeckelt - zumutbar);

  const minusF = 1 - clamp(tolMinus, 0, 100) / 100;
  const plusF  = 1 + clamp(tolPlus,  0, 100) / 100;

  const spanMin = Math.max(0, punkt * minusF);
  const spanMax = Math.max(0, punkt * plusF);

  return { gedeckelt, zumutbar, punkt, spanMin, spanMax };
}

// Einordnung (grob)
function einordnung(punkt, spanMin, spanMax) {
  if (punkt <= 0) return "Eher nicht";
  // sehr kleiner Betrag -> grenzwertig
  if (spanMax < 50) return "Grenzwertig";
  return "Wahrscheinlich";
}

function baueErgebnisHTML(eingabe, out) {
  const urteil = einordnung(out.punkt, out.spanMin, out.spanMax);

  return `
    <h2>Ergebnis: Wohngeld-Vorcheck (grobe Spanne)</h2>

    <div class="pflegegrad-result-card">
      <h3>Deine Eingaben (Kurzüberblick)</h3>
      <table class="pflegegrad-tabelle">
        <thead><tr><th>Angabe</th><th>Wert</th></tr></thead>
        <tbody>
          <tr><td>Personen im Haushalt</td><td>${eingabe.personen}</td></tr>
          <tr><td>Haushalts-Netto</td><td>${euro(eingabe.netto)}</td></tr>
          <tr><td>Kaltmiete</td><td>${euro(eingabe.kaltmiete)}</td></tr>
          <tr><td>Cap (angemessene Kaltmiete)</td><td>${euro(eingabe.cap)}</td></tr>
          <tr><td>Zumutbare Eigenbelastung</td><td>${eingabe.zumutbarPct.toFixed(1).replace(".",",")} % vom Netto</td></tr>
        </tbody>
      </table>

      <h3>Berechnung (vereinfacht)</h3>
      <table class="pflegegrad-tabelle">
        <thead><tr><th>Größe</th><th>Wert</th></tr></thead>
        <tbody>
          <tr><td>Gedeckelte Kaltmiete</td><td>${euro(out.gedeckelt)}</td></tr>
          <tr><td>Zumutbare Eigenbelastung</td><td>${euro(out.zumutbar)}</td></tr>
          <tr><td><strong>Punkt-Schätzung Zuschuss</strong></td><td><strong>${euro(out.punkt)}</strong></td></tr>
          <tr><td>Spanne (mit Toleranz)</td><td>${euro(out.spanMin)} – ${euro(out.spanMax)}</td></tr>
        </tbody>
      </table>

      <h3>Einordnung</h3>
      <p><strong>${urteil}</strong> (auf Basis der vereinfachten Formel und deiner Parameter).</p>

      <p class="hinweis">
        Für eine verbindliche Einschätzung nutze bitte den <strong>offiziellen Wohngeldrechner</strong>
        deiner Landes-/Bundesseite und/oder lass dich beraten. Passe Cap und Prozentsatz an deine Kommune an
        (Personenzahl & Mietstufe).
      </p>
    </div>
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

  const btn = document.getElementById("wg_berechnen");
  const reset = document.getElementById("wg_reset");
  const out = document.getElementById("wg_ergebnis");

  if (!btn || !out) return;

  btn.addEventListener("click", () => {
    const eingabe = {
      personen: Math.max(1, Math.floor(n(pers))),
      netto: n(netto),
      kaltmiete: n(kalt),
      cap: n(cap),
      zumutbarPct: n(zPct),
      tolMinus: n(tolM),
      tolPlus: n(tolP)
    };

    const res = schätzeWohngeld({
      kaltmiete: eingabe.kaltmiete,
      cap: eingabe.cap,
      netto: eingabe.netto,
      zumutbarPct: eingabe.zumutbarPct,
      tolMinus: eingabe.tolMinus,
      tolPlus: eingabe.tolPlus
    });

    out.innerHTML = baueErgebnisHTML(eingabe, res);
    out.scrollIntoView({ behavior: "smooth" });
  });

  if (reset) {
    reset.addEventListener("click", () => {
      setTimeout(() => { out.innerHTML = ""; }, 0);
    });
  }
});
