// elterngeld-rechner.js (vereinfachtes Modell)

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

/**
 * Vereinfacht:
 * - Basis: min 300, max 1800 €/Monat
 * - Plus : min 150, max 900 €/Monat
 * - Ersatzrate auf Einkommensdifferenz: rate% * (vorher - während)
 * - ElterngeldPlus: zusätzlich Deckel auf (Basisbetrag / 2)
 */
function rechneMonatsbetrag(variant, nettoVorher, nettoWaeh, ersatzratePct) {
  const diff = Math.max(0, (nettoVorher || 0) - Math.max(0, nettoWaeh || 0));
  const rate = Math.max(0, ersatzratePct || 65) / 100;

  const basisMin = 300, basisMax = 1800;
  const plusMin = 150, plusMax = 900;

  if (variant === "basis") {
    const roher = diff * rate;
    return clamp(roher, basisMin, basisMax);
  } else {
    // ElterngeldPlus
    const roher = diff * rate;
    // theoretischer Basisbetrag (ohne min/max-Kappung?) – wir nehmen die regulär gekappte Basis als Deckelgrundlage
    const basisTheo = clamp(diff * rate, basisMin, basisMax);
    const deckel = basisTheo / 2; // Max: halber Basisbetrag
    return clamp(Math.min(roher, deckel), plusMin, plusMax);
  }
}

function rechneElterngeldElternteil({ variant, nettoVorher, nettoWaeh, monate, ersatzrate }) {
  const monatsbetrag = rechneMonatsbetrag(variant, nettoVorher, nettoWaeh, ersatzrate);
  const summe = monatsbetrag * Math.max(0, Math.floor(monate || 0));
  return { monatsbetrag, summe };
}

function buildResultTable(pA, pB, ersatzrate, nettoHeute) {
  const varText = (v) => v === "plus" ? "ElterngeldPlus" : "Basiselterngeld";

  const totalMonat = pA.monatsbetrag + pB.monatsbetrag;
  const totalSumme = pA.summe + pB.summe;

  const diffZuHeute = nettoHeute > 0 ? (totalMonat - nettoHeute) : null;

  return `
    <h2>Ergebnis: Elterngeld (vereinfacht)</h2>

    <div class="pflegegrad-result-card">
      <p>
        <strong>Ersatzrate:</strong> ${ersatzrate.toFixed(1).replace(".", ",")} % (vereinfacht)
      </p>

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
            <td>${varText(pA.variant)}</td>
            <td>${pA.monate}</td>
            <td>${pA.nettoVorher > 0 ? euro(pA.nettoVorher) : "—"}</td>
            <td>${pA.nettoWaeh > 0 ? euro(pA.nettoWaeh) : "—"}</td>
            <td><strong>${euro(pA.monatsbetrag)}</strong></td>
          </tr>
          <tr>
            <td>B</td>
            <td>${varText(pB.variant)}</td>
            <td>${pB.monate}</td>
            <td>${pB.nettoVorher > 0 ? euro(pB.nettoVorher) : "—"}</td>
            <td>${pB.nettoWaeh > 0 ? euro(pB.nettoWaeh) : "—"}</td>
            <td><strong>${euro(pB.monatsbetrag)}</strong></td>
          </tr>
        </tbody>
      </table>

      <h3>Gesamtsummen</h3>
      <table class="pflegegrad-tabelle">
        <thead>
          <tr>
            <th>Größe</th>
            <th>Betrag</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Gesamt Elterngeld/Monat (A + B)</td>
            <td><strong>${euro(totalMonat)}</strong></td>
          </tr>
          <tr>
            <td>Gesamt Elterngeld (über alle Monate)</td>
            <td><strong>${euro(totalSumme)}</strong></td>
          </tr>
          <tr>
            <td>Heutiges Netto (gemeinsam, optional)</td>
            <td>${nettoHeute > 0 ? euro(nettoHeute) : "—"}</td>
          </tr>
          <tr>
            <td><strong>Diff. zu heutigem Netto (monatlich)</strong></td>
            <td><strong>${diffZuHeute !== null ? euro(diffZuHeute) : "—"}</strong></td>
          </tr>
        </tbody>
      </table>

      <p class="hinweis">
        „Arbeiten vs. Elterngeld“: Wenn du im Feld „Netto während“ ein Teilzeit-Netto einträgst, wird das Elterngeld
        (vereinfacht) auf die Differenz zum früheren Netto angewandt. Lässt du das Feld leer (oder 0), simuliert das
        „nicht arbeiten“ während des Bezugs.
      </p>
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
    const ersatzrate = clamp(n(ersatzrateInput), 50, 80);

    const parentA = {
      variant: (aVar && aVar.value) || "basis",
      nettoVorher: n(aVor),
      nettoWaeh: n(aWae),
      monate: clamp(n(aMon), 0, 24)
    };
    const parentB = {
      variant: (bVar && bVar.value) || "plus",
      nettoVorher: n(bVor),
      nettoWaeh: n(bWae),
      monate: clamp(n(bMon), 0, 24)
    };

    const aRes = rechneElterngeldElternteil({
      variant: parentA.variant,
      nettoVorher: parentA.nettoVorher,
      nettoWaeh: parentA.nettoWaeh,
      monate: parentA.monate,
      ersatzrate
    });
    const bRes = rechneElterngeldElternteil({
      variant: parentB.variant,
      nettoVorher: parentB.nettoVorher,
      nettoWaeh: parentB.nettoWaeh,
      monate: parentB.monate,
      ersatzrate
    });

    const nettoHeute = n(nettoHeuteInput);

    // Ausgabeobjekte zusammenführen (für Tabelle)
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
