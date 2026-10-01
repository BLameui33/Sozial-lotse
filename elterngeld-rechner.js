// elterngeld-rechner.js (Professionelles Modell mit Alleinerziehenden-Support)

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

function clamp(v, min, max) { 
  return Math.min(Math.max(v, min), max); 
}

function errorBox(msgs) {
  const items = msgs.map(m => `<li>${m}</li>`).join("");
  return `
    <div class="pflegegrad-result-card">
      <h2>Bitte Eingaben prüfen</h2>
      <ul style="color: #b91c1c; padding-left: 20px; margin-bottom: 0;">${items}</ul>
    </div>
  `;
}

/**
 * Vereinfachte, aber logisch korrekte Elterngeld-Berechnung:
 * - Basis: Mindestens 300 €, maximal 1.800 € pro Monat.
 * - Plus: Mindestens 150 €, maximal 900 € pro Monat.
 * - ElterngeldPlus entspricht grundsätzlich der Hälfte des Basisanspruchs.
 */
function rechneMonatsbetrag(variant, nettoVorher, nettoWaeh, ersatzratePct) {
  const before = Math.max(0, nettoVorher || 0);
  const during = Math.max(0, nettoWaeh || 0);
  const diff = Math.max(0, before - during);
  const rate = clamp(ersatzratePct || 65, 0, 100) / 100;

  const basisMin = 300, basisMax = 1800;
  const plusMin = 150, plusMax = 900;

  // 1. Schritt: Was wäre der Basisanspruch?
  const roherAnspruch = diff * rate;
  const basisBetrag = clamp(roherAnspruch, basisMin, basisMax);

  if (variant === "basis") {
    return basisBetrag;
  } else {
    // 2. Schritt: ElterngeldPlus ist die Hälfte des Basisanspruchs
    const plusBetrag = basisBetrag / 2;
    return clamp(plusBetrag, plusMin, plusMax);
  }
}

function rechneElterngeldElternteil({ variant, nettoVorher, nettoWaeh, monate, ersatzrate }) {
  const m = rechneMonatsbetrag(variant, nettoVorher, nettoWaeh, ersatzrate);
  const months = Math.max(0, Math.floor(monate || 0));
  const summe = m * months;
  return { monatsbetrag: m, summe, months };
}

function varLabel(v) { 
  return v === "plus" ? "ElterngeldPlus" : "Basiselterngeld"; 
}

function buildResultTable(a, b, ersatzrate, nettoHeute, isSingleParent) {
  // Logik-Korrektur: Effektive Beträge für die Gesamtübersicht
  // Wenn 0 Monate angegeben sind, ist die effektive Auszahlung 0 €
  const effMonatA = a.months === 0 ? 0 : a.monatsbetrag;
  const effMonatB = b.months === 0 ? 0 : b.monatsbetrag;

  const anzeigeMonatsbetragA = effMonatA > 0 ? euro(effMonatA) : "0,00 €";
  const anzeigeMonatsbetragB = effMonatB > 0 ? euro(effMonatB) : "0,00 €";

  // Gesamtsummen basieren nun auf den effektiven Beträgen
  const totalMonat = effMonatA + effMonatB;
  const totalSumme = a.summe + b.summe; // Summe ist korrekt, da x * 0 Monate = 0 €
  const diffZuHeute = nettoHeute > 0 ? (totalMonat - nettoHeute) : null;

  const singleParentText = isSingleParent 
    ? "<strong>Hinweis für Alleinerziehende:</strong> Ihnen stehen allein bis zu 14 Monate Basiselterngeld zu. Partnermonate entfallen." 
    : "<strong>Hinweis zur Berechnung:</strong> Die Monate wurden automatisch auf die gesetzlichen Maximalwerte gekappt (Basis: 14 Monate gesamt, Plus: 24 Monate). Geschwisterboni werden in dieser vereinfachten Ansicht nicht gesondert ausgewiesen.";

  return `
    <div class="pflegegrad-result-card">
      <h2>Ihr Elterngeld-Ergebnis (vereinfachte Schätzung)</h2>
      <p style="margin-bottom: 24px; color: #475569;">
        Basierend auf einer Ersatzrate von <strong>${ersatzrate.toFixed(1).replace(".", ",")} %</strong>. 
        Bitte beachten Sie: Dies ist eine vereinfachte Modellrechnung und ersetzt keine offizielle Beratung.
      </p>

      <h3>Monatliche Elterngeld-Ansprüche</h3>
      <table class="pflegegrad-tabelle">
        <thead>
          <tr>
            <th>Elternteil</th>
            <th>Variante</th>
            <th>Bezugsdauer</th>
            <th>Netto vor Geburt</th>
            <th>Netto während Bezug</th>
            <th>Elterngeld pro Monat</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Antragstellender Elternteil</td>
            <td>${varLabel(a.variant)}</td>
            <td>${a.months} Monate</td>
            <td>${a.nettoVorher > 0 ? euro(a.nettoVorher) : "—"}</td>
            <td>${a.nettoWaeh > 0 ? euro(a.nettoWaeh) : "0,00 €"}</td>
            <td><strong>${anzeigeMonatsbetragA}</strong></td>
          </tr>
          ${!isSingleParent ? `
          <tr>
            <td>Zweiter Elternteil</td>
            <td>${varLabel(b.variant)}</td>
            <td>${b.months} Monate</td>
            <td>${b.nettoVorher > 0 ? euro(b.nettoVorher) : "—"}</td>
            <td>${b.nettoWaeh > 0 ? euro(b.nettoWaeh) : "0,00 €"}</td>
            <td><strong>${anzeigeMonatsbetragB}</strong></td>
          </tr>
          ` : ''}
        </tbody>
      </table>

      <h3>Gesamtübersicht</h3>
      <table class="pflegegrad-tabelle">
        <tbody>
          <tr>
            <td>Gesamt Elterngeld pro Monat (tatsächliche Auszahlung)</td>
            <td style="text-align: right;"><strong>${euro(totalMonat)}</strong></td>
          </tr>
          <tr>
            <td>Gesamt Elterngeldsumme (über alle Bezugsmonate)</td>
            <td style="text-align: right;"><strong>${euro(totalSumme)}</strong></td>
          </tr>
          ${nettoHeute > 0 ? `
          <tr>
            <td>Aktuelles Netto (zum Vergleich)</td>
            <td style="text-align: right;">${euro(nettoHeute)}</td>
          </tr>
          <tr>
            <td><strong>Monatliche Differenz zum aktuellen Netto</strong></td>
            <td style="text-align: right; color: ${diffZuHeute < 0 ? '#b91c1c' : '#15803d'};">
              <strong>${diffZuHeute !== null ? euro(diffZuHeute) : "—"}</strong>
            </td>
          </tr>
          ` : ''}
        </tbody>
      </table>

      <p class="hinweis" style="margin-top: 24px;">
        ${singleParentText}
      </p>
    </div>
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  const alleinerziehendCheckbox = document.getElementById("eg_alleinerziehend");
  const feldB = document.getElementById("eg-feld-b");
  const hinweisAMonate = document.getElementById("hinweis-a-monate");
  
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

  // Funktion zum Umschalten der UI bei Alleinerziehend
  function toggleSingleParentUI() {
    const isSingle = alleinerziehendCheckbox.checked;
    if (isSingle) {
      feldB.classList.add("visually-hidden");
      hinweisAMonate.textContent = "Als Alleinerziehende(r) können Sie bis zu 14 Monate Basiselterngeld allein beziehen. ElterngeldPlus: bis zu 28 Monate.";
      // Standardwert für Alleinerziehende oft 14 Monate Basis
      if (aVar.value === "basis" && aMon.value === "12") {
        aMon.value = "14";
      }
    } else {
      feldB.classList.remove("visually-hidden");
      hinweisAMonate.textContent = "Basiselterngeld: max. 12 Monate (plus 2 Partnermonate). ElterngeldPlus: max. 24 Monate.";
    }
  }

  // Event Listener für die Checkbox
  if (alleinerziehendCheckbox) {
    alleinerziehendCheckbox.addEventListener("change", toggleSingleParentUI);
    // Initial aufrufen, falls Browser die Checkbox beim Neuladen merkt
    toggleSingleParentUI();
  }

  btn.addEventListener("click", () => {
    const errors = [];
    const isSingleParent = alleinerziehendCheckbox.checked;
    
    // 1. Ersatzrate validieren
    let ersatzrate = n(ersatzrateInput);
    if (!Number.isFinite(ersatzrate) || ersatzrate <= 0) ersatzrate = 65;
    ersatzrate = clamp(ersatzrate, 50, 80);

    // 2. Daten Elternteil A
    const parentA = {
      variant: (aVar && aVar.value) || "basis",
      nettoVorher: n(aVor),
      nettoWaeh: n(aWae),
      monate: n(aMon)
    };

    // 3. Daten Elternteil B (nur wenn nicht alleinerziehend)
    let parentB = { variant: "basis", nettoVorher: 0, nettoWaeh: 0, monate: 0 };
    if (!isSingleParent) {
      parentB = {
        variant: (bVar && bVar.value) || "basis",
        nettoVorher: n(bVor),
        nettoWaeh: n(bWae),
        monate: n(bMon)
      };
    }

    // 4. Monate logisch kappen
    const capMonths = (variant, m, isSingle) => {
      const mm = Math.max(0, Math.floor(m || 0));
      if (variant === "basis") {
        return isSingle ? Math.min(mm, 14) : Math.min(mm, 14); // 14 Monate gesamt, als Single alle allein
      }
      return isSingle ? Math.min(mm, 28) : Math.min(mm, 24); // Plus verdoppelt sich
    };
    
    const aMonths = capMonths(parentA.variant, parentA.monate, isSingleParent);
    const bMonths = isSingleParent ? 0 : capMonths(parentB.variant, parentB.monate, false);

    if (aMonths !== Math.floor(parentA.monate)) {
      errors.push(`Antragstellender Elternteil: Die Bezugsdauer wurde auf den zulässigen Höchstwert von ${aMonths} Monaten gekappt.`);
    }
    if (!isSingleParent && bMonths !== Math.floor(parentB.monate)) {
      errors.push(`Zweiter Elternteil: Die Bezugsdauer wurde auf den zulässigen Höchstwert von ${bMonths} Monaten gekappt.`);
    }
    
    parentA.monate = aMonths;
    parentB.monate = bMonths;

    // 5. Plausibilitätsprüfungen
    if (parentA.nettoVorher < 0) {
      errors.push("Das Nettoeinkommen vor der Geburt darf nicht negativ sein.");
    }
    if (parentA.nettoWaeh < 0) {
      errors.push("Das geplante Nettoeinkommen während des Bezugs darf nicht negativ sein.");
    }
    if (!isSingleParent) {
      if (parentB.nettoVorher < 0) errors.push("Das Nettoeinkommen des zweiten Elternteils vor der Geburt darf nicht negativ sein.");
      if (parentB.nettoWaeh < 0) errors.push("Das geplante Nettoeinkommen des zweiten Elternteils während des Bezugs darf nicht negativ sein.");
    }

    if (errors.length) {
      out.innerHTML = errorBox(errors);
      out.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    // 6. Berechnung durchführen
    const aRes = rechneElterngeldElternteil({
      variant: parentA.variant,
      nettoVorher: parentA.nettoVorher,
      nettoWaeh: parentA.nettoWaeh,
      monate: parentA.monate,
      ersatzrate: ersatzrate
    });
    
    const bRes = isSingleParent 
      ? { monatsbetrag: 0, summe: 0, months: 0 } 
      : rechneElterngeldElternteil({
          variant: parentB.variant,
          nettoVorher: parentB.nettoVorher,
          nettoWaeh: parentB.nettoWaeh,
          monate: parentB.monate,
          ersatzrate: ersatzrate
        });

    const nettoHeute = n(nettoHeuteInput);
    const viewA = { ...parentA, ...aRes };
    const viewB = { ...parentB, ...bRes };

    // 7. Ergebnis rendern
    out.innerHTML = buildResultTable(viewA, viewB, ersatzrate, nettoHeute, isSingleParent);
    out.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  if (reset) {
    reset.addEventListener("click", () => {
      setTimeout(() => { 
        out.innerHTML = ""; 
        // Checkbox-Zustand nach Reset prüfen, um UI korrekt zu halten
        if (alleinerziehendCheckbox) toggleSingleParentUI();
      }, 50);
    });
  }
});