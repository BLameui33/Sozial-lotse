// elterngeld-rechner.js (vereinfachtes Modell, mit sanfter Validierung)

function n(el) {
  if (!el) return 0;
  const raw = (el.value || "").toString().replace(",", ".");
  const v = Number(raw);
  return Number.isFinite(v) ? v : 0;
}
function euro(v) {
  const x = Number.isFinite(v) ? v : 0;
  return x.toFixed(2).replace(".", ",") + " €";
}
function clamp(v, min, max) { return Math.min(Math.max(v, min), max); }

function errorBox(msgs){
  const items = msgs.map(m=>`<li>${m}</li>`).join("");
  return `
    <div class="pflegegrad-result-card">
      <h2>Bitte Eingaben prüfen</h2>
      <ul>${items}</ul>
    </div>
  `;
}

/**
 * Vereinfacht:
 * - Basis: min 300, max 1800 €/Monat
 * - Plus : min 150, max 900 €/Monat
 * - Ersatzrate auf Einkommensdifferenz: rate% * (vorher - während)
 * - ElterngeldPlus: zusätzlicher Deckel auf (gekappter Basisbetrag / 2)
 */
function rechneMonatsbetrag(variant, nettoVorher, nettoWaeh, ersatzratePct) {
  const before = Math.max(0, nettoVorher || 0);
  const during = Math.max(0, nettoWaeh || 0);
  const diff = Math.max(0, before - during);
  const rate = clamp(ersatzratePct || 65, 0, 100) / 100;

  const basisMin = 300, basisMax = 1800;
  const plusMin = 150, plusMax = 900;

  if (variant === "basis") {
    const roher = diff * rate;
    return clamp(roher, basisMin, basisMax);
  } else {
    // ElterngeldPlus
    const roher = diff * rate;
    const basisGekappt = clamp(roher, basisMin, basisMax);
    const deckel = basisGekappt / 2; // Max: halber (gekappter) Basisbetrag
    return clamp(Math.min(roher, deckel), plusMin, plusMax);
  }
}

function rechneElterngeldElternteil({ variant, nettoVorher, nettoWaeh, monate, ersatzrate }) {
  const m = rechneMonatsbetrag(variant, nettoVorher, nettoWaeh, ersatzrate);
  const months = Math.max(0, Math.floor(monate || 0));
  const summe = m * months;
  return { monatsbetrag: m, summe, months };
}

function varLabel(v){ return v === "plus" ? "ElterngeldPlus" : "Basiselterngeld"; }

function buildResultTable(a, b, ersatzrate, nettoHeute) {
  const totalMonat = a.monatsbetrag + b.monatsbetrag;
  const totalSumme = a.summe + b.summe;
  const diffZuHeute = nettoHeute > 0 ? (totalMonat - nettoHeute) : null;

  const monthsHint = `
    <p class="hinweis">
      Monate: Basiselterngeld bis zu 14 Monate je Elternteil (vereinfacht), ElterngeldPlus bis zu 24 Monate.
      Kombinations- und Partnermonate werden hier nicht regelkonform geprüft – nur grob gekappt.
    </p>
  `;

  return `
    <h2>Ergebnis: Elterngeld (vereinfacht)</h2>

    <div class="pflegegrad-result-card">
      <p><strong>Ersatzrate:</strong> ${ersatzrate.toFixed(1).replace(".", ",")} %</p>

      <h3>Monatsbeträge</h3>
      <table class="pflegegrad-tabelle">
        <thead>
          <tr>
            <th>Elternteil</th>
            <th>Variante</th>
            <th>Monate</th>
            <th>Netto vor</th>
            <th>Netto während</th>
            <th>Elterngeld/Monat</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>A</td>
            <td>${varLabel(a.variant)}</td>
            <td>${a.months}</td>
            <td>${a.nettoVorher > 0 ? euro(a.nettoVorher) : "—"}</td>
            <td>${a.nettoWaeh > 0 ? euro(a.nettoWaeh) : "—"}</td>
            <td><strong>${euro(a.monatsbetrag)}</strong></td>
          </tr>
          <tr>
            <td>B</td>
            <td>${varLabel(b.variant)}</td>
            <td>${b.months}</td>
            <td>${b.nettoVorher > 0 ? euro(b.nettoVorher) : "—"}</td>
            <td>${b.nettoWaeh > 0 ? euro(b.nettoWaeh) : "—"}</td>
            <td><strong>${euro(b.monatsbetrag)}</strong></td>
          </tr>
        </tbody>
      </table>

      <h3>Gesamtsummen</h3>
      <table class="pflegegrad-tabelle">
        <thead><tr><th>Größe</th><th>Betrag</th></tr></thead>
        <tbody>
          <tr><td>Gesamt Elterngeld/Monat (A + B)</td><td><strong>${euro(totalMonat)}</strong></td></tr>
          <tr><td>Gesamt Elterngeld (über alle Monate)</td><td><strong>${euro(totalSumme)}</strong></td></tr>
          <tr><td>Heutiges Netto (gemeinsam, optional)</td><td>${nettoHeute > 0 ? euro(nettoHeute) : "—"}</td></tr>
          <tr><td><strong>Diff. zu heutigem Netto (monatlich)</strong></td><td><strong>${diffZuHeute !== null ? euro(diffZuHeute) : "—"}</strong></td></tr>
        </tbody>
      </table>

      <p class="hinweis">
        „Arbeiten vs. Elterngeld“: Trage im Feld „Netto während“ ein Teilzeit-Netto ein, um die Anrechnung (vereinfacht) zu simulieren.
        Leer/0 simuliert „nicht arbeiten“ in den Bezugsmonaten.
      </p>
      ${monthsHint}
    </div>
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  // Inputs
  const ersatzrateInput = document.getElementById("eg_ersatzrate");

  const aVar = document.getElementById("a_variante");
  const aVor = document.getElementById("a_netto_vorher");
  const aWae = document.getElementById("a_netto_waehrend");
  const aMon = document.getElementById("a_monate");

  const bVar = document.getElementById("b_variante");
  const bVor = document.getElementById("b_netto_vorher");
  const bWae = document.getElementById("b_netto_waehrend");
  const bMon = document.getElementById("b_monate");

  const nettoHeuteInput = document.getElementById("eg_netto_heute");

  const btn = document.getElementById("eg_berechnen");
  const reset = document.getElementById("eg_reset");
  const out = document.getElementById("eg_ergebnis");

  if (!btn || !out) return;

  btn.addEventListener("click", () => {
    // Sanfte Validierung / Normalisierung
    const errors = [];
    let ersatzrate = n(ersatzrateInput);
    if (!Number.isFinite(ersatzrate) || ersatzrate <= 0) ersatzrate = 65;
    ersatzrate = clamp(ersatzrate, 50, 80);

    const parentA = {
      variant: (aVar && aVar.value) || "basis",
      nettoVorher: n(aVor),
      nettoWaeh: n(aWae),
      monate: n(aMon)
    };
    const parentB = {
      variant: (bVar && bVar.value) || "plus",
      nettoVorher: n(bVor),
      nettoWaeh: n(bWae),
      monate: n(bMon)
    };

    // Kappung je Variante (rein UI-seitig, nicht rechtsverbindlich)
    const capMonths = (variant, m) => {
      const mm = Math.max(0, Math.floor(m || 0));
      return variant === "basis" ? Math.min(mm, 14) : Math.min(mm, 24);
    };
    const aMonths = capMonths(parentA.variant, parentA.monate);
    const bMonths = capMonths(parentB.variant, parentB.monate);

    if (aMonths !== Math.floor(parentA.monate)) {
      errors.push("Elternteil A: Monate wurden auf den zulässigen Wert gekappt (Basis bis 14, Plus bis 24).");
    }
    if (bMonths !== Math.floor(parentB.monate)) {
      errors.push("Elternteil B: Monate wurden auf den zulässigen Wert gekappt (Basis bis 14, Plus bis 24).");
    }
    parentA.monate = aMonths;
    parentB.monate = bMonths;

    // Negative/absurde Werte abfangen
    if (parentA.nettoVorher < 0 || parentB.nettoVorher < 0) {
      errors.push("Netto vor Geburt darf nicht negativ sein.");
    }
    if (parentA.nettoWaeh < 0 || parentB.nettoWaeh < 0) {
      errors.push("Netto während des Bezugs darf nicht negativ sein.");
    }

    if (errors.length) {
      out.innerHTML = errorBox(errors);
      out.scrollIntoView({ behavior: "smooth" });
      return;
    }

    const aRes = rechneElterngeldElternteil({
      variant: parentA.variant,
      nettoVorher: parentA.nettoVorher,
      nettoWaeh: parentA.nettoWaeh,
      monate: parentA.monate,
      ersatzrate: ersatzrate
    });
    const bRes = rechneElterngeldElternteil({
      variant: parentB.variant,
      nettoVorher: parentB.nettoVorher,
      nettoWaeh: parentB.nettoWaeh,
      monate: parentB.monate,
      ersatzrate: ersatzrate
    });

    const nettoHeute = n(nettoHeuteInput);

    const viewA = { ...parentA, ...aRes };
    const viewB = { ...parentB, ...bRes };

    out.innerHTML = buildResultTable(viewA, viewB, ersatzrate, nettoHeute);
    out.scrollIntoView({ behavior: "smooth" });
  });

  if (reset) {
    reset.addEventListener("click", () => {
      setTimeout(() => { out.innerHTML = ""; }, 0);
    });
  }
});
