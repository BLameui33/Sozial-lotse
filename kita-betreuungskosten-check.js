// kita-betreuungskosten-check.js

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

// --- UI: Kinderliste dynamisch rendern ---
function renderKinderListe(container, anzahl) {
  const k = Math.max(0, Math.floor(anzahl || 0));
  let html = `
    <table class="pflegegrad-tabelle">
      <thead>
        <tr>
          <th>#</th>
          <th>Altersgruppe</th>
          <th>Stunden/Woche</th>
          <th>Monate/Jahr (Beitrag)</th>
          <th>Essenspauschale aktiv?</th>
        </tr>
      </thead>
      <tbody>
  `;
  for (let i = 0; i < k; i++) {
    html += `
      <tr>
        <td>Kind ${i + 1}</td>
        <td>
          <select class="kt_kind_alter" data-index="${i}">
            <option value="u3">U3</option>
            <option value="ue3" selected>Ü3</option>
            <option value="hort">Hort</option>
          </select>
        </td>
        <td>
          <input type="number" class="kt_kind_std" data-index="${i}" min="0" max="60" step="1" value="35" />
        </td>
        <td>
          <input type="number" class="kt_kind_monate" data-index="${i}" min="1" max="12" step="1" value="12" />
        </td>
        <td style="text-align:center;">
          <input type="checkbox" class="kt_kind_essen" data-index="${i}" checked />
        </td>
      </tr>
    `;
  }
  html += `</tbody></table>`;
  container.innerHTML = html;
}

function leseKinder(container) {
  const rows = Array.from(container.querySelectorAll("tbody tr"));
  return rows.map((_, idx) => {
    const alter = container.querySelector(`.kt_kind_alter[data-index="${idx}"]`).value;
    const stdWoche = n(container.querySelector(`.kt_kind_std[data-index="${idx}"]`));
    const monate = clamp(n(container.querySelector(`.kt_kind_monate[data-index="${idx}"]`)), 1, 12);
    const essen = !!container.querySelector(`.kt_kind_essen[data-index="${idx}"]`).checked;
    return { alter, stdWoche, monate, essen };
  });
}

// --- Kernlogik ---
function monatlicheGebuehrKind(kind, rates, incomeMult, caps, befreit) {
  const stdMonat = Math.max(0, kind.stdWoche) * 4.33;

  // Grundsatz: Satz je Stunde * Monatsstunden * Einkommensmultiplikator
  let satz = 0;
  if (kind.alter === "u3") satz = rates.u3;
  else if (kind.alter === "ue3") satz = rates.ue3;
  else satz = rates.hort;

  // Beitragsfreiheit toggles
  if ((kind.alter === "u3" && befreit.u3) || (kind.alter === "ue3" && befreit.ue3)) {
    satz = 0;
  }

  let betrag = satz * stdMonat * incomeMult;

  // Deckel pro Kind
  if (caps.capPerKind > 0) {
    betrag = Math.min(betrag, caps.capPerKind);
  }

  // Pro "Monat" wird später evtl. mit Anzahl beitragspflichtiger Monate multipliziert.
  return betrag;
}

function anwendeGeschwisterrabatt(monatsBetraege, rabatt2, rabatt3plus) {
  if (monatsBetraege.length === 0) return { netto: [], rabattSum: 0 };

  // Teuerstes Kind ohne Rabatt; nächstes mit Rabatt2; Rest mit Rabatt3+
  const sorted = monatsBetraege
    .map((v, i) => ({ i, v }))
    .sort((a, b) => b.v - a.v);

  let rabattSum = 0;
  const netto = Array(monatsBetraege.length).fill(0);

  sorted.forEach((entry, rank) => {
    let r = 0;
    if (rank === 0) r = 0;
    else if (rank === 1) r = clamp(rabatt2, 0, 100) / 100;
    else r = clamp(rabatt3plus, 0, 100) / 100;

    const disc = entry.v * r;
    rabattSum += disc;
    netto[entry.i] = entry.v - disc;
  });

  return { netto, rabattSum };
}

function baueErgebnis(region, einkommen, kinder, params, result) {
  const rows = kinder.map((k, idx) => {
    const labelAlter = k.alter === "u3" ? "U3" : (k.alter === "ue3" ? "Ü3" : "Hort");
    return `
      <tr>
        <td>Kind ${idx + 1}</td>
        <td>${labelAlter}</td>
        <td>${k.stdWoche} Std/Woche</td>
        <td>${k.monate} Mon.</td>
        <td>${euro(result.bruttoProKind[idx])}</td>
        <td>${euro(result.nettoProKind[idx])}</td>
        <td>${k.essen ? euro(params.essen) : "—"}</td>
        <td><strong>${euro(result.gesamtProKind[idx])}</strong></td>
      </tr>
    `;
  }).join("");

  const diffPct = einkommen > 0 ? (result.summeGesamt / einkommen) * 100 : null;

  return `
    <h2>Ergebnis: geschätzte Betreuungskosten</h2>

    <div class="pflegegrad-result-card">
      <p>
        <strong>Region:</strong> ${region ? region : "—"}<br>
        <strong>Haushaltsnetto:</strong> ${euro(einkommen)}<br>
        <strong>Einkommensmultiplikator:</strong> ${params.incomeMult.toFixed(2)}
      </p>

      <h3>Details pro Kind</h3>
      <table class="pflegegrad-tabelle">
        <thead>
          <tr>
            <th>Kind</th>
            <th>Altersgruppe</th>
            <th>Umfang</th>
            <th>Monate/Jahr</th>
            <th>Gebühr/Monat (brutto)</th>
            <th>nach Geschwisterrabatt</th>
            <th>Essenspauschale</th>
            <th><strong>Summe/Monat</strong></th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <h3>Summen</h3>
      <table class="pflegegrad-tabelle">
        <thead>
          <tr><th>Größe</th><th>Betrag</th></tr>
        </thead>
        <tbody>
          <tr><td>Geschwisterrabatt gesamt</td><td>− ${euro(result.rabattSum)}</td></tr>
          <tr><td>Essenspauschalen gesamt</td><td>${euro(result.essenSum)}</td></tr>
          <tr><td><strong>Monatliche Gesamtkosten</strong></td><td><strong>${euro(result.summeGesamt)}</strong></td></tr>
          <tr><td>Anteil am Haushaltsnetto</td><td>${diffPct !== null ? diffPct.toFixed(1).replace(".", ",") + " %" : "—"}</td></tr>
        </tbody>
      </table>

      <p class="hinweis">
        Parameter (anpassbar): U3 ${euro(params.rates.u3)}/Std, Ü3 ${euro(params.rates.ue3)}/Std,
        Hort ${euro(params.rates.hort)}/Std, Einkommensmultiplikator ${params.incomeMult.toFixed(2)},
        Rabatte (2. Kind ${params.rabatt2}% / ab 3. Kind ${params.rabatt3}%),
        Beitragsfreiheit: ${params.free.u3 ? "U3 " : ""}${params.free.ue3 ? "Ü3 " : ""}${(!params.free.u3 && !params.free.ue3) ? "keine" : ""}.
        Deckel pro Kind: ${params.capPerKind > 0 ? euro(params.capPerKind) : "—"}.
      </p>
      <p class="hinweis">
        <strong>Hinweis:</strong> Viele Kommunen haben zusätzliche Regeln (z. B. feste Zeitkorridore 25/35/45 Std.,
        Staffelgrenzen, Befreiung ab bestimmtem Alter oder Beitragsfreiheit nur für Betreuung – nicht für Essen).
        Bitte prüfe die lokale Satzung und Bescheide.
      </p>
    </div>
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  // Elemente
  const regionInput = document.getElementById("kt_region");
  const nettoInput = document.getElementById("kt_netto");

  const anzInput = document.getElementById("kt_kinder_anz");
  const kinderWrap = document.getElementById("kt_kinder_liste");

  const rateU3 = document.getElementById("kt_rate_u3");
  const rateUE3 = document.getElementById("kt_rate_ue3");
  const rateHort = document.getElementById("kt_rate_hort");

  const incomeMultInput = document.getElementById("kt_income_mult");
  const rabatt2Input = document.getElementById("kt_rabatt2");
  const rabatt3Input = document.getElementById("kt_rabatt3");

  const freeUE3 = document.getElementById("kt_befrei_ue3");
  const freeU3 = document.getElementById("kt_befrei_u3");

  const capKindInput = document.getElementById("kt_cap_kind");
  const essenInput = document.getElementById("kt_essen");

  const btn = document.getElementById("kt_berechnen");
  const reset = document.getElementById("kt_reset");
  const out = document.getElementById("kt_ergebnis");

  // Initial: Liste rendern
  renderKinderListe(kinderWrap, n(anzInput));

  anzInput.addEventListener("input", () => {
    renderKinderListe(kinderWrap, n(anzInput));
    out.innerHTML = "";
  });

  if (btn && out) {
    btn.addEventListener("click", () => {
      const region = (regionInput && regionInput.value) || "";
      const einkommen = n(nettoInput);

      const kinder = leseKinder(kinderWrap);

      const params = {
        rates: {
          u3: n(rateU3),
          ue3: n(rateUE3),
          hort: n(rateHort)
        },
        incomeMult: clamp(n(incomeMultInput), 0.3, 2),
        rabatt2: clamp(n(rabatt2Input), 0, 100),
        rabatt3: clamp(n(rabatt3Input), 0, 100),
        free: {
          u3: !!freeU3.checked,
          ue3: !!freeUE3.checked
        },
        capPerKind: Math.max(0, n(capKindInput)),
        essen: Math.max(0, n(essenInput))
      };

      // 1) Brutto-Gebühren pro Kind (Monatsbasis)
      const bruttoProKind = kinder.map(k =>
        monatlicheGebuehrKind(
          k,
          params.rates,
          params.incomeMult,
          { capPerKind: params.capPerKind },
          params.free
        )
      );

      // 2) Geschwisterrabatt auf Gebühren anwenden (Sortierung nach Höhe enthalten)
      const { netto: nettoProKind, rabattSum } = anwendeGeschwisterrabatt(
        bruttoProKind,
        params.rabatt2,
        params.rabatt3
      );

      // 3) Essenspauschale addieren (optional pro Kind)
      const essenProKind = kinder.map(k => (k.essen ? params.essen : 0));

      // 4) Monatskosten je Kind
      const gesamtProKind = kinder.map((_, i) => nettoProKind[i] + essenProKind[i]);

      // 5) Jahresmonate berücksichtigen -> wir geben weiter "pro Monat im Beitragszeitraum" aus,
      //    die Eingabe "Monate/Jahr" dient eher der Info; optional könnte man daraus einen Jahresdurchschnitt bilden.
      //    Für Anwender*innen ist meist "pro Monat, wenn Beitrag fällig" interessanter.
      const essenSum = essenProKind.reduce((a, b) => a + b, 0);
      const summeGesamt = gesamtProKind.reduce((a, b) => a + b, 0);

      const result = {
        bruttoProKind,
        nettoProKind,
        gesamtProKind,
        rabattSum,
        essenSum,
        summeGesamt
      };

      out.innerHTML = baueErgebnis(region, einkommen, kinder, params, result);
      out.scrollIntoView({ behavior: "smooth" });
    });
  }

  if (reset && out) {
    reset.addEventListener("click", () => {
      setTimeout(() => { out.innerHTML = ""; }, 0);
    });
  }
});
