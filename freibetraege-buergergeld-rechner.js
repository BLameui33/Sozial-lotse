// freibetraege-buergergeld-rechner.js – klarer Output, Mini-Validierung, gleiche Logik

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

// Freibeträge (vereinfachte Netto-Logik) in Zonen
function freibetraegeErwerb(netto, params){
  const E = Math.max(0, netto);

  const fix   = Math.min(E, Math.max(0, params.fix)); // 100 €
  const z1_lo = Math.max(0, params.z1_lo), z1_hi = Math.max(z1_lo, params.z1_hi); // 100–520
  const z2_lo = Math.max(0, params.z2_lo), z2_hi = Math.max(z2_lo, params.z2_hi); // 520–1000
  const z3_lo = Math.max(0, params.z3_lo), z3_hi = Math.max(z3_lo, params.z3_hi); // 1000–1200/1500

  const anteil = (lo, hi) => Math.max(0, Math.min(E, hi) - lo);

  const z1_basis = anteil(z1_lo, z1_hi);
  const z2_basis = anteil(z2_lo, z2_hi);
  const z3_basis = anteil(z3_lo, z3_hi);

  const z1 = 0.20 * z1_basis;
  const z2 = 0.30 * z2_basis;
  const z3 = 0.10 * z3_basis;

  const totalFreibetrag = Math.min(E, fix + z1 + z2 + z3);
  const anrechenbar = Math.max(0, E - totalFreibetrag);

  return { fix, z1_basis, z2_basis, z3_basis, z1, z2, z3, totalFreibetrag, anrechenbar };
}

function resultHTML(input, fb, aufstockung){
  // Fürs Display: anrechenbares Einkommen inkl. weiterer Abzüge (nicht negativ)
  const anrNachAbzug = Math.max(0, fb.anrechenbar - input.sonstig);

  return `
    <h2>Ergebnis: Freibeträge &amp; Aufstockung</h2>

    <div class="pflegegrad-result-card">
      <h3>Deine Angaben</h3>
      <table class="pflegegrad-tabelle">
        <thead><tr><th>Angabe</th><th>Wert</th></tr></thead>
        <tbody>
          <tr><td>Erwerbs-Nettoeinkommen/Monat</td><td>${euro(input.netto)}</td></tr>
          <tr><td>Gesamtbedarf/Monat</td><td>${euro(input.bedarf)}</td></tr>
          <tr><td>Haushalt mit minderjährigem Kind</td><td>${input.mitKind ? "Ja (10 % bis 1.500 €)" : "Nein (10 % bis 1.200 €)"}</td></tr>
          ${input.sonstig > 0 ? `<tr><td>Weitere Abzüge</td><td>− ${euro(input.sonstig)}</td></tr>` : ""}
        </tbody>
      </table>

      <h3>Freibeträge (vereinfachte Zonen)</h3>
      <table class="pflegegrad-tabelle">
        <thead><tr><th>Komponente</th><th>Bemessung</th><th>Freibetrag</th></tr></thead>
        <tbody>
          <tr><td>Fix (Grundfreibetrag)</td><td>bis ${euro(input.fix)}</td><td>${euro(fb.fix)}</td></tr>
          <tr><td>20 % (${euro(input.z1_lo)} – ${euro(input.z1_hi)})</td><td>${euro(fb.z1_basis)}</td><td>${euro(fb.z1)}</td></tr>
          <tr><td>30 % (${euro(input.z2_lo)} – ${euro(input.z2_hi)})</td><td>${euro(fb.z2_basis)}</td><td>${euro(fb.z2)}</td></tr>
          <tr><td>10 % (${euro(input.z3_lo)} – ${euro(input.z3_hi)})</td><td>${euro(fb.z3_basis)}</td><td>${euro(fb.z3)}</td></tr>
          ${input.sonstig > 0 ? `<tr><td>Weitere Abzüge</td><td>—</td><td>${euro(input.sonstig)}</td></tr>` : ""}
          <tr><td><strong>Freibeträge gesamt</strong></td><td>—</td><td><strong>${euro(fb.totalFreibetrag + input.sonstig)}</strong></td></tr>
        </tbody>
      </table>

      <h3>Anrechnung &amp; Aufstockung</h3>
      <table class="pflegegrad-tabelle">
        <thead><tr><th>Größe</th><th>Betrag</th></tr></thead>
        <tbody>
          <tr><td>Anrechenbares Erwerbseinkommen</td><td><strong>${euro(anrNachAbzug)}</strong></td></tr>
          <tr><td>Voraussichtliche Aufstockung (Bedarf − anrechenbar)</td><td><strong>${euro(aufstockung)}</strong></td></tr>
        </tbody>
      </table>

      <p class="hinweis">
        Orientierung: Das Jobcenter berücksichtigt u. a. andere Einkünfte, exakte Absetzungen, Brutto/Netto-Regeln,
        Vermögen und den Bedarf der Bedarfsgemeinschaft. Maßgeblich ist dein <strong>Bescheid</strong>.
      </p>
    </div>
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  const netto = document.getElementById("fb_netto");
  const bedarf = document.getElementById("fb_bedarf");
  const kindToggle = document.getElementById("fb_kind_toggle");

  const fix = document.getElementById("fb_fix");
  const z1_lo = document.getElementById("fb_z1_lo");
  const z1_hi = document.getElementById("fb_z1_hi");
  const z2_lo = document.getElementById("fb_z2_lo");
  const z2_hi = document.getElementById("fb_z2_hi");
  const z3_lo = document.getElementById("fb_z3_lo");
  const z3_hi = document.getElementById("fb_z3_hi");

  const sonstig = document.getElementById("fb_sonstig");

  const btn = document.getElementById("fb_berechnen");
  const reset = document.getElementById("fb_reset");
  const out = document.getElementById("fb_ergebnis");

  // Obergrenze 10%-Zone automatisch setzen (Kind ja/nein)
  function applyZ3CapFromToggle(){
    if (!z3_hi) return;
    z3_hi.value = (kindToggle && kindToggle.value === "ja") ? 1500 : 1200;
  }
  if (kindToggle){
    kindToggle.addEventListener("change", () => {
      applyZ3CapFromToggle();
      out.innerHTML = "";
    });
    applyZ3CapFromToggle();
  }

  if (!btn || !out) return;

  btn.addEventListener("click", () => {
    const errors = [];
    if (!netto.value)  errors.push("Bitte das monatliche Erwerbs-Nettoeinkommen angeben.");
    if (!bedarf.value) errors.push("Bitte den monatlichen Gesamtbedarf angeben.");
    if (errors.length){
      out.innerHTML = errorBox(errors);
      out.scrollIntoView({ behavior: "smooth" });
      return;
    }

    const input = {
      netto: n(netto),
      bedarf: n(bedarf),
      mitKind: (kindToggle && kindToggle.value) === "ja",

      fix: n(fix),
      z1_lo: n(z1_lo), z1_hi: n(z1_hi),
      z2_lo: n(z2_lo), z2_hi: n(z2_hi),
      z3_lo: n(z3_lo), z3_hi: n(z3_hi),

      sonstig: n(sonstig)
    };

    const fb = freibetraegeErwerb(input.netto, {
      fix: input.fix,
      z1_lo: input.z1_lo, z1_hi: input.z1_hi,
      z2_lo: input.z2_lo, z2_hi: input.z2_hi,
      z3_lo: input.z3_lo, z3_hi: input.z3_hi
    });

    // Anrechenbares Erwerbseinkommen nach optionalen Abzügen (nicht < 0)
    const anrechenbar = Math.max(0, fb.anrechenbar - input.sonstig);

    // Aufstockung (nicht < 0)
    const aufstockung = Math.max(0, input.bedarf - anrechenbar);

    out.innerHTML = resultHTML(input, fb, aufstockung);
    out.scrollIntoView({ behavior: "smooth" });
  });

  if (reset){
    reset.addEventListener("click", () => {
      setTimeout(() => { out.innerHTML = ""; applyZ3CapFromToggle(); }, 0);
    });
  }
});
