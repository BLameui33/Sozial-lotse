// kita-betreuungskosten-check.js – verbessert mit Validierung & Jahresdurchschnitt

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

// --- UI: Kinderliste dynamisch rendern ---
function renderKinderListe(container, anzahl) {
  const k = Math.max(0, Math.floor(anzahl || 0));
  if (k === 0) {
    container.innerHTML = `<p class="hinweis">Keine Kinder eingetragen.</p>`;
    return;
  }
  let html = `
    <table class="pflegegrad-tabelle">
      <thead>
        <tr>
          <th>#</th>
          <th>Altersgruppe</th>
          <th>Stunden/Woche</th>
          <th>Monate/Jahr (beitragspflichtig)</th>
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
function monatlicheGebuehrKind(kind, rates, incomeMult, capPerKind, free) {
  const stdMonat = Math.max(0, kind.stdWoche) * 4.33;

  // Satz je Stunde
  let satz = 0;
  if (kind.alter === "u3") satz = rates.u3;
  else if (kind.alter === "ue3") satz = rates.ue3;
  else satz = rates.hort;

  // Beitragsfreiheit
  if ((kind.alter === "u3" && free.u3) || (kind.alter === "ue3" && free.ue3)) {
    satz = 0;
  }

  let betrag = satz * stdMonat * incomeMult;

  // Deckel pro Kind
  if (capPerKind > 0) betrag = Math.min(betrag, capPerKind);

  return betrag; // pro Monat im beitragspflichtigen Zeitraum (ohne Essen)
}

function anwendeGeschwisterrabatt(monatsBetraege, rabatt2, rabatt3plus) {
  if (monatsBetraege.length === 0) return { netto: [], rabattSum: 0 };

  // Teuerstes Kind ohne Rabatt; nächstes mit Rabatt2; weitere mit Rabatt3+
  const sorted = monatsBetraege.map((v, i) => ({ i, v })).sort((a, b) => b.v - a.v);

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
        <td>${euro(result.jahresDurchschnittProKind[idx])}</td>
      </tr>
    `;
  }).join("");

  const anteil = einkommen > 0 ? (result.summeGesamt / einkommen) * 100 : null;
  const anteilAvg = einkommen > 0 ? (result.jahresDurchschnittGesamt / einkommen) * 100 : null;

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
            <th><strong>Summe/Monat (wenn Beitrag fällig)</strong></th>
            <th>Jahresdurchschnitt / Monat (auf 12 Mon.)</th>
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
          <tr><td>Essenspauschalen gesamt (monatlich, wenn aktiv)</td><td>${euro(result.essenSum)}</td></tr>
          <tr><td><strong>Monatliche Gesamtkosten (wenn Beitrag fällig)</strong></td><td><strong>${euro(result.summeGesamt)}</strong></td></tr>
          <tr><td>Anteil am Haushaltsnetto</td><td>${anteil !== null ? anteil.toFixed(1).replace(".", ",") + " %" : "—"}</td></tr>
          <tr><td><strong>Jahresdurchschnitt / Monat (auf 12 Mon.)</strong></td><td><strong>${euro(result.jahresDurchschnittGesamt)}</strong></td></tr>
          <tr><td>Anteil am Haushaltsnetto (Durchschnitt)</td><td>${anteilAvg !== null ? anteilAvg.toFixed(1).replace(".", ",") + " %" : "—"}</td></tr>
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
    if (out) out.innerHTML = "";
  });

  if (btn && out) {
    btn.addEventListener("click", () => {
      const errors = [];
      const region = (regionInput && regionInput.value) || "";
      const einkommen = n(nettoInput);
      if (einkommen < 0) errors.push("Haushaltsnettoeinkommen darf nicht negativ sein.");

      const kinder = leseKinder(kinderWrap);
      if ((n(anzInput) || 0) !== kinder.length) {
        errors.push("Bitte Anzahl und Liste der Kinder synchronisieren.");
      }

      const params = {
        rates: {
          u3: Math.max(0, n(rateU3)),
          ue3: Math.max(0, n(rateUE3)),
          hort: Math.max(0, n(rateHort))
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

      // Plausis
      if (params.rates.u3 === 0 && !params.free.u3) errors.push("U3-Satz ist 0 und keine Beitragsfreiheit gesetzt – ist das beabsichtigt?");
      if (params.rates.ue3 === 0 && !params.free.ue3) errors.push("Ü3-Satz ist 0 und keine Beitragsfreiheit gesetzt – ist das beabsichtigt?");
      if (params.incomeMult <= 0) errors.push("Einkommensmultiplikator muss > 0 sein.");
      kinder.forEach((k, i) => {
        if (k.stdWoche < 0) errors.push(`Kind ${i+1}: Stunden/Woche darf nicht negativ sein.`);
        if (k.monate < 1 || k.monate > 12) errors.push(`Kind ${i+1}: Monate/Jahr bitte zwischen 1 und 12.`);
      });

      if (errors.length) {
        out.innerHTML = errorBox(errors);
        out.scrollIntoView({ behavior: "smooth" });
        return;
      }

      // 1) Brutto-Gebühren pro Kind (Monatsbasis – wenn Beitrag fällig)
      const bruttoProKind = kinder.map(k =>
        monatlicheGebuehrKind(
          k,
          params.rates,
          params.incomeMult,
          params.capPerKind,
          params.free
        )
      );

      // 2) Geschwisterrabatt
      const { netto: nettoProKind, rabattSum } = anwendeGeschwisterrabatt(
        bruttoProKind,
        params.rabatt2,
        params.rabatt3
      );

      // 3) Essenspauschale addieren (optional pro Kind)
      const essenProKind = kinder.map(k => (k.essen ? params.essen : 0));

      // 4) Monatskosten je Kind (wenn Beitrag fällig)
      const gesamtProKind = kinder.map((_, i) => nettoProKind[i] + essenProKind[i]);

      // 5) Jahresdurchschnitt bilden (auf 12 Monate): (Monatskosten * beitrags-Monate)/12
      const jahresDurchschnittProKind = kinder.map((k, i) => (gesamtProKind[i] * k.monate) / 12);

      // Summen
      const essenSum = essenProKind.reduce((a, b) => a + b, 0);
      const summeGesamt = gesamtProKind.reduce((a, b) => a + b, 0);
      const jahresDurchschnittGesamt = jahresDurchschnittProKind.reduce((a, b) => a + b, 0);

      const result = {
        bruttoProKind,
        nettoProKind,
        gesamtProKind,
        rabattSum,
        essenSum,
        summeGesamt,
        jahresDurchschnittProKind,
        jahresDurchschnittGesamt
      };

      out.innerHTML = baueErgebnis(region, einkommen, kinder, {
        rates: params.rates,
        incomeMult: params.incomeMult,
        rabatt2: params.rabatt2,
        rabatt3: params.rabatt3,
        free: params.free,
        capPerKind: params.capPerKind,
        essen: params.essen
      }, result);
      out.scrollIntoView({ behavior: "smooth" });
    });
  }

  if (reset && out) {
    reset.addEventListener("click", () => {
      setTimeout(() => { out.innerHTML = ""; }, 0);
    });
  }
});
