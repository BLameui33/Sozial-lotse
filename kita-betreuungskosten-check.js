// kita-betreuungskosten-check.js – Texte für Laien verständlich aufbereitet

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

// Fehlermeldungen in verständlicher Sprache
function errorBox(msgs){
  const items = msgs.map(m=>`<li>${m}</li>`).join("");
  return `
    <div class="pflegegrad-result-card" style="border-left: 4px solid #e53935;">
      <h2>Bitte prüfen Sie Ihre Eingaben</h2>
      <p class="hinweis">Der Rechner kann erst starten, wenn die folgenden Punkte geklärt sind:</p>
      <ul>${items}</ul>
    </div>
  `;
}

// --- UI: Kinderliste dynamisch rendern (mit verständlichen Labels) ---
function renderKinderListe(container, anzahl) {
  const k = Math.max(0, Math.floor(anzahl || 0));
  if (k === 0) {
    container.innerHTML = `<p class="hinweis">Noch keine Kinder eingetragen. Bitte geben Sie oben die Anzahl der betreuten Kinder an.</p>`;
    return;
  }
  let html = `
    <p class="hinweis" style="margin-bottom:10px;">
      <strong>So geht's:</strong> Für jedes Kind tragen Sie ein, in welche Einrichtung es geht (Krippe, Kindergarten oder Hort), wie viele Stunden pro Woche es dort betreut wird und für wie viele Monate im Jahr Sie die Betreuung bezahlen.
    </p>
    <table class="pflegegrad-tabelle">
      <thead>
        <tr>
          <th>Kind</th>
          <th>Einrichtung / Alter</th>
          <th>Stunden pro Woche</th>
          <th>Monate im Jahr</th>
          <th>Essen dabei?</th>
        </tr>
      </thead>
      <tbody>
  `;
  for (let i = 0; i < k; i++) {
    html += `
      <tr>
        <td><strong>Kind ${i + 1}</strong></td>
        <td>
          <select class="kt_kind_alter" data-index="${i}" aria-label="Einrichtung Kind ${i+1}">
            <option value="u3">Krippe (0–3 Jahre)</option>
            <option value="ue3" selected>Kindergarten (3–6 Jahre)</option>
            <option value="hort">Hort (Schulkind)</option>
          </select>
        </td>
        <td>
          <input type="number" class="kt_kind_std" data-index="${i}" min="0" max="60" step="1" value="35" aria-label="Stunden pro Woche Kind ${i+1}" />
          <div class="hint-small">Typisch: 25 (Halbtag), 35 (3/4-Tag), 45 (Ganztag)</div>
        </td>
        <td>
          <input type="number" class="kt_kind_monate" data-index="${i}" min="1" max="12" step="1" value="12" aria-label="Betreuungsmonate Kind ${i+1}" />
          <div class="hint-small">12 = ganzjährig</div>
        </td>
        <td style="text-align:center;">
          <input type="checkbox" class="kt_kind_essen" data-index="${i}" checked aria-label="Mittagessen Kind ${i+1}" />
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

// --- Kernlogik (unverändert) ---
function monatlicheGebuehrKind(kind, rates, incomeMult, capPerKind, free) {
  const stdMonat = Math.max(0, kind.stdWoche) * 4.33;

  let satz = 0;
  if (kind.alter === "u3") satz = rates.u3;
  else if (kind.alter === "ue3") satz = rates.ue3;
  else satz = rates.hort;

  if ((kind.alter === "u3" && free.u3) || (kind.alter === "ue3" && free.ue3)) {
    satz = 0;
  }

  let betrag = satz * stdMonat * incomeMult;

  if (capPerKind > 0) betrag = Math.min(betrag, capPerKind);

  return betrag;
}

function anwendeGeschwisterrabatt(monatsBetraege, rabatt2, rabatt3plus) {
  if (monatsBetraege.length === 0) return { netto: [], rabattSum: 0 };

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

// --- Ergebnisausgabe ---
function baueErgebnis(region, einkommen, kinder, params, result) {
  function alterLabel(code) {
    if (code === "u3") return "Krippe (0–3 J.)";
    if (code === "ue3") return "Kindergarten (3–6 J.)";
    return "Hort (Schulkind)";
  }

  // Rabatt-Status pro Kind ermitteln
  const bruttoMitIndex = result.bruttoProKind.map((v, i) => ({ i, v }))
    .sort((a, b) => b.v - a.v);
  
  const rabattInfo = Array(kinder.length).fill(null);
  bruttoMitIndex.forEach((entry, rank) => {
    if (rank === 0) {
      rabattInfo[entry.i] = { prozent: 0, text: "kein Rabatt (teuerstes Kind)", color: "#555" };
    } else if (rank === 1) {
      rabattInfo[entry.i] = { prozent: params.rabatt2, text: `−${params.rabatt2} % Geschwister-Rabatt`, color: "#2e7d32" };
    } else {
      rabattInfo[entry.i] = { prozent: params.rabatt3, text: `−${params.rabatt3} % Geschwister-Rabatt`, color: "#2e7d32" };
    }
  });

  const rows = kinder.map((k, idx) => {
    const rabatt = rabattInfo[idx];
    return `
      <tr>
        <td><strong>Kind ${idx + 1}</strong></td>
        <td>${alterLabel(k.alter)}</td>
        <td>${k.stdWoche} Std/Wo</td>
        <td>${k.monate} Monate</td>
        <td>${euro(result.bruttoProKind[idx])}</td>
        <td>
          <strong>${euro(result.nettoProKind[idx])}</strong>
          <div class="hint-small" style="color:${rabatt.color}; margin-top:2px;">
            ${rabatt.text}
          </div>
        </td>
        <td>${k.essen ? euro(params.essen) : "—"}</td>
        <td><strong>${euro(result.gesamtProKind[idx])}</strong></td>
        <td>${euro(result.jahresDurchschnittProKind[idx])}</td>
      </tr>
    `;
  }).join("");

  const anteil = einkommen > 0 ? (result.summeGesamt / einkommen) * 100 : null;
  const anteilAvg = einkommen > 0 ? (result.jahresDurchschnittGesamt / einkommen) * 100 : null;

  let befreiungText = "keine Altersgruppe beitragsfrei";
  if (params.free.u3 && params.free.ue3) befreiungText = "Krippe und Kindergarten beitragsfrei";
  else if (params.free.u3) befreiungText = "Krippe beitragsfrei";
  else if (params.free.ue3) befreiungText = "Kindergarten beitragsfrei";

  // Kurzer Geschwister-Rabatt Hinweis
  let rabattInfoBox = '';
  if (kinder.length > 1) {
    rabattInfoBox = `
      <div class="info-box" style="background:#e3f2fd; border-left:4px solid #2196f3; margin-top:15px; padding:10px 12px;">
        <strong>Geschwister-Rabatt:</strong> In den meisten Kommunen zahlt das teuerste Kind voll; der Rabatt greift erst ab dem zweiten Kind. Je nach regionaler Satzung kann die Sortierung stattdessen nach Alter erfolgen.
      </div>
    `;
  }

  return `
    <h2>Ihre geschätzten Kita-Kosten</h2>

    <div class="pflegegrad-result-card">
      <p style="font-size:0.95em; line-height:1.6;">
        <strong>Wohnort:</strong> ${region ? region : "nicht angegeben"}<br>
        <strong>Haushaltsnetto pro Monat:</strong> ${euro(einkommen)}<br>
        <strong>Ihr Beitragssatz:</strong> ${params.incomeMult.toFixed(2)}-fach 
        ${params.incomeMult === 1 ? "(Durchschnitt)" : (params.incomeMult < 1 ? "(unterdurchschnittlich)" : "(überdurchschnittlich)")}
      </p>

      <h3>Kosten im Detail pro Kind</h3>
      <div style="overflow-x:auto;">
      <table class="pflegegrad-tabelle">
        <thead>
          <tr>
            <th>Kind</th>
            <th>Einrichtung</th>
            <th>Stunden</th>
            <th>Monate</th>
            <th>Beitrag vor Rabatt</th>
            <th>Nach Rabatt</th>
            <th>Essensgeld</th>
            <th><strong>Gesamt / Monat</strong></th>
            <th>Auf 12 Monate umgelegt</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      </div>

      <h3>Zusammenfassung</h3>
      <table class="pflegegrad-tabelle">
        <thead>
          <tr><th>Was?</th><th>Betrag</th></tr>
        </thead>
        <tbody>
          <tr><td>Ihr Geschwister-Rabatt (insgesamt)</td><td style="color:#2e7d32;"><strong>− ${euro(result.rabattSum)}</strong></td></tr>
          <tr><td>Essensgeld gesamt (monatlich)</td><td>${euro(result.essenSum)}</td></tr>
          <tr><td><strong>Gesamtkosten pro Monat</strong></td><td><strong style="color:#1565c0;">${euro(result.summeGesamt)}</strong></td></tr>
          <tr><td>Davon Anteil am Nettoeinkommen</td><td>${anteil !== null ? anteil.toFixed(1).replace(".", ",") + " %" : "—"}</td></tr>
          <tr style="background:#e8f5e9;"><td><strong>Ø Kosten pro Monat (aufs Jahr gerechnet)</strong></td><td><strong style="color:#2e7d32;">${euro(result.jahresDurchschnittGesamt)}</strong></td></tr>
          <tr><td>Ø Anteil am Nettoeinkommen</td><td>${anteilAvg !== null ? anteilAvg.toFixed(1).replace(".", ",") + " %" : "—"}</td></tr>
        </tbody>
      </table>

      ${rabattInfoBox}

      <p class="hinweis" style="font-size:0.85em; margin-top:10px;">
        <em>* „Auf 12 Monate umgelegt“ verteilt betreuungskoordinierte Schließ- oder Fehlzeiten gleichmäßig auf das Gesamtjahr für Ihre Budgetplanung.</em>
      </p>

      <div class="info-box" style="background:#f5f5f5; margin-top:15px; padding:10px 12px;">
        <h3 style="margin-top:0; margin-bottom:6px;">Berechnungsgrundlagen</h3>
        <p class="hinweis" style="margin:2px 0;"><strong>Stundensätze:</strong> Krippe ${euro(params.rates.u3)}, Kindergarten ${euro(params.rates.ue3)}, Hort ${euro(params.rates.hort)}</p>
        <p class="hinweis" style="margin:2px 0;"><strong>Geschwister-Rabatte:</strong> 2. Kind: −${params.rabatt2}%, ab 3. Kind: −${params.rabatt3}%${params.rabatt3 === 100 ? " (beitragsfrei)" : ""}</p>
        <p class="hinweis" style="margin:2px 0;"><strong>Beitragsfreiheit:</strong> ${befreiungText}</p>
        <p class="hinweis" style="margin:2px 0;"><strong>Höchstgrenze pro Kind:</strong> ${params.capPerKind > 0 ? euro(params.capPerKind) + " / Monat" : "keine"}</p>
      </div>

      <div class="info-box warning" style="border-left: 4px solid #ff9800; margin-top:15px; padding:10px 12px;">
        <h3 style="margin-top:0; margin-bottom:6px;">Hinweis zur Genauigkeit</h3>
        <p class="hinweis" style="margin:0;">
          Dies ist eine unverbindliche Berechnung zur Orientierung. Maßgeblich ist ausschließlich der finale Gebührenbescheid Ihrer Kommune oder Ihres Trägers.
        </p>
      </div>
    </div>
  `;
}

document.addEventListener("DOMContentLoaded", () => {
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
      if (einkommen < 0) errors.push("Ihr Haushaltsnetto kann nicht negativ sein. Bitte prüfen Sie die Eingabe.");

      const kinder = leseKinder(kinderWrap);
      if ((n(anzInput) || 0) !== kinder.length) {
        errors.push("Die Anzahl der Kinder passt nicht zur Liste. Bitte geben Sie oben die korrekte Anzahl ein.");
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

      // Verständliche Plausibilitäts-Prüfungen
      if (params.rates.u3 === 0 && !params.free.u3) {
        errors.push("Für die Krippe haben Sie 0,00 € pro Stunde eingetragen, aber es ist keine Beitragsfreiheit aktiviert. Ist das richtig? Falls ja, können Sie diese Meldung ignorieren.");
      }
      if (params.rates.ue3 === 0 && !params.free.ue3) {
        errors.push("Für den Kindergarten haben Sie 0,00 € pro Stunde eingetragen, aber es ist keine Beitragsfreiheit aktiviert. Ist das richtig?");
      }
      if (params.incomeMult <= 0) {
        errors.push("Ihr Beitragssatz muss größer als 0 sein.");
      }
      kinder.forEach((k, i) => {
        if (k.stdWoche < 0) {
          errors.push(`Bei Kind ${i+1}: Die Stunden pro Woche können nicht negativ sein.`);
        }
        if (k.monate < 1 || k.monate > 12) {
          errors.push(`Bei Kind ${i+1}: Bitte geben Sie zwischen 1 und 12 Betreuungsmonaten im Jahr an.`);
        }
      });

      if (errors.length) {
        out.innerHTML = errorBox(errors);
        out.scrollIntoView({ behavior: "smooth" });
        return;
      }

      const bruttoProKind = kinder.map(k =>
        monatlicheGebuehrKind(
          k,
          params.rates,
          params.incomeMult,
          params.capPerKind,
          params.free
        )
      );

      const { netto: nettoProKind, rabattSum } = anwendeGeschwisterrabatt(
        bruttoProKind,
        params.rabatt2,
        params.rabatt3
      );

      const essenProKind = kinder.map(k => (k.essen ? params.essen : 0));

      const gesamtProKind = kinder.map((_, i) => nettoProKind[i] + essenProKind[i]);

      const jahresDurchschnittProKind = kinder.map((k, i) => (gesamtProKind[i] * k.monate) / 12);

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