// kindergeld-kinderzuschlag.js (vereinfachter Vorcheck)

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

// UI: dynamische Kinderliste
function renderKinderListe(container, anzahl) {
  const k = Math.max(0, Math.floor(anzahl || 0));
  let html = `
    <table class="pflegegrad-tabelle" style="margin-top:.6rem;">
      <thead>
        <tr>
          <th>#</th>
          <th>Alter</th>
          <th>Förderfähig 18–24 (vereinfacht)</th>
        </tr>
      </thead>
      <tbody>
  `;
  for (let i = 0; i < k; i++) {
    html += `
      <tr>
        <td>Kind ${i + 1}</td>
        <td>
          <input type="number" class="kg_kind_alter" data-index="${i}" min="0" max="30" step="1" value="8" />
        </td>
        <td>
          <input type="checkbox" class="kg_kind_foerder" data-index="${i}" checked />
          <small>bei 18–24 Jahren Haken entfernen, falls <em>nicht</em> in Ausbildung/Studium</small>
        </td>
      </tr>
    `;
  }
  html += `</tbody></table>`;
  container.innerHTML = html;
}

function leseKinder(container) {
  const alters = Array.from(container.querySelectorAll(".kg_kind_alter")).map(inp => n(inp));
  const foerder = Array.from(container.querySelectorAll(".kg_kind_foerder")).map(inp => !!inp.checked);

  let anzahlAnspruch = 0;
  let hinweise = [];
  alters.forEach((age, idx) => {
    if (age >= 25) {
      hinweise.push(`Kind ${idx + 1}: ${age} Jahre – i. d. R. kein Kindergeldanspruch.`);
      return;
    }
    if (age >= 18 && age <= 24) {
      if (!foerder[idx]) {
        hinweise.push(`Kind ${idx + 1}: ${age} Jahre – als <em>nicht förderfähig</em> markiert (z. B. keine Ausbildung).`);
        return;
      } else {
        hinweise.push(`Kind ${idx + 1}: ${age} Jahre – <em>förderfähig angenommen</em> (Ausbildung/Studium; vereinfacht).`);
      }
    }
    anzahlAnspruch += 1;
  });

  return { alters, anzahlAnspruch, hinweise };
}

// KiZ-Vorcheck (stark vereinfacht!)
// Heuristik mit pauschalen Bedarfen:
// - Eltern-Basisbedarf (Paar ~1100 €, Alleinerziehend ~700 €)
// - Kinderbedarf pauschal ~420 €/Kind
// - + Warmmiete
// Vergleich Netto vs. Bedarf:
//   < Mindesteinkommen (Alleinerziehend 600 / Paar 900): "nein (unter Mindestgrenze; ggf. Bürgergeld prüfen)"
//   >= Mindest und Netto < Bedarf: "denkbar"
//   zwischen Bedarf und Bedarf*1.15: "grenzwertig"
//   > Bedarf*1.15: "eher nicht"
function kizVorcheck({ haushalt, netto, warmmiete, kinderAnz }) {
  const minIncome = haushalt === "alleinerziehend" ? 600 : 900; // sehr grob
  const baseParent = haushalt === "alleinerziehend" ? 700 : 1100; // pauschale Orientierung
  const perChild = 420; // pauschal
  const bedarf = baseParent + perChild * Math.max(0, kinderAnz) + Math.max(0, warmmiete);

  if (netto < minIncome) {
    return {
      urteil: "Eher nein",
      begruendung: `Nettoeinkommen unter der vereinfachten Mindesteinkommensgrenze (${euro(minIncome)}). Evtl. Anspruch auf Bürgergeld/Wohngeld prüfen.`,
      bedarf,
      range: [bedarf, bedarf * 1.15]
    };
  }

  if (netto < bedarf) {
    return {
      urteil: "Denkbar",
      begruendung: "Nettoeinkommen liegt unter dem pauschal ermittelten Bedarf. Kinderzuschlag/Wohngeld könnten helfen (unverbindlich).",
      bedarf,
      range: [bedarf, bedarf * 1.15]
    };
  }

  if (netto >= bedarf && netto <= bedarf * 1.15) {
    return {
      urteil: "Grenzwertig",
      begruendung: "Netto liegt knapp über dem pauschalen Bedarf. Ergebnis kann je nach Details kippen – offiziellen Rechner nutzen.",
      bedarf,
      range: [bedarf, bedarf * 1.15]
    };
  }

  return {
    urteil: "Eher nein",
    begruendung: "Nettoeinkommen liegt deutlich über dem pauschalen Bedarf (vereinfacht).",
    bedarf,
    range: [bedarf, bedarf * 1.15]
  };
}

function baueErgebnisHTML(kindergeld, foerderbareKinder, hinweise, kiz, netto, warmmiete) {
  return `
    <h2>Ergebnis</h2>

    <div class="pflegegrad-result-card">
      <h3>Kindergeld</h3>
      <table class="pflegegrad-tabelle">
        <thead><tr><th>Größe</th><th>Betrag</th></tr></thead>
        <tbody>
          <tr><td>Förderfähige Kinder (vereinfacht)</td><td>${foerderbareKinder}</td></tr>
          <tr><td><strong>Kindergeld gesamt pro Monat</strong></td><td><strong>${euro(kindergeld)}</strong></td></tr>
        </tbody>
      </table>

      <h3>Kinderzuschlag (KiZ) – Vorcheck (vereinfacht)</h3>
      <p>
        <strong>Urteil:</strong> ${kiz.urteil}<br>
        <strong>Begründung:</strong> ${kiz.begruendung}
      </p>
      <table class="pflegegrad-tabelle">
        <thead><tr><th>Größe</th><th>Wert</th></tr></thead>
        <tbody>
          <tr><td>Pauschaler Bedarf (Eltern+Kinder) + Warmmiete</td><td>${euro(kiz.bedarf)}</td></tr>
          <tr><td>Orientierungsbereich „grenzwertig“</td><td>${euro(kiz.range[0])} – ${euro(kiz.range[1])}</td></tr>
          <tr><td>Dein Netto / Warmmiete (Eingabe)</td><td>${euro(netto)} / ${euro(warmmiete)}</td></tr>
        </tbody>
      </table>

      ${hinweise.length ? `
        <h3>Hinweise zu deinen Kinderangaben</h3>
        <ul>${hinweise.map(h => `<li>${h}</li>`).join("")}</ul>
      ` : ""}
    </div>

    <p class="hinweis">
      Dieser KiZ-Vorcheck ist stark vereinfacht (Pauschalwerte, keine Abzüge/Vermögen/Angemessenheitsgrenzen).
      Für verbindliche Aussagen nutze bitte den <strong>offiziellen Kinderzuschlag-/Wohngeld-Rechner</strong> und lass dich beraten.
    </p>
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  const anzahlInput = document.getElementById("kg_kinder_anzahl");
  const kinderContainer = document.getElementById("kg_kinder_liste");
  const kgSatzInput = document.getElementById("kg_satz");

  const haushaltSel = document.getElementById("kiz_haushalt");
  const einkommenInput = document.getElementById("kiz_einkommen");
  const warmmieteInput = document.getElementById("kiz_warmmiete");

  const btn = document.getElementById("kiz_berechnen");
  const reset = document.getElementById("kiz_reset");
  const out = document.getElementById("kiz_ergebnis");

  // Initial Kinderliste
  renderKinderListe(kinderContainer, n(anzahlInput));

  anzahlInput.addEventListener("input", () => {
    renderKinderListe(kinderContainer, n(anzahlInput));
    out.innerHTML = "";
  });

  if (btn && out) {
    btn.addEventListener("click", () => {
      const { anzahlAnspruch, hinweise } = leseKinder(kinderContainer);
      const kgSatz = n(kgSatzInput);
      const kindergeld = anzahlAnspruch * kgSatz;

      const haushalt = haushaltSel.value;
      const netto = n(einkommenInput);
      const warmmiete = n(warmmieteInput);

      const kiz = kizVorcheck({
        haushalt,
        netto,
        warmmiete,
        kinderAnz: anzahlAnspruch
      });

      out.innerHTML = baueErgebnisHTML(kindergeld, anzahlAnspruch, hinweise, kiz, netto, warmmiete);
      out.scrollIntoView({ behavior: "smooth" });
    });
  }

  if (reset && out) {
    reset.addEventListener("click", () => {
      setTimeout(() => { out.innerHTML = ""; }, 0);
    });
  }
});
