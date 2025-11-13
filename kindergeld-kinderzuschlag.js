// kindergeld-kinderzuschlag.js (vereinfachter Vorcheck) – mit sanfter Validierung & smarter Kinderliste

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

// UI: dynamische Kinderliste
function rowForKind(i, defaultAge = 8) {
  return `
    <tr>
      <td>Kind ${i + 1}</td>
      <td>
        <input type="number" class="kg_kind_alter" data-index="${i}" min="0" max="30" step="1" value="${defaultAge}" />
      </td>
      <td>
        <label style="display:flex; gap:.4rem; align-items:center;">
          <input type="checkbox" class="kg_kind_foerder" data-index="${i}" />
          <span>förderfähig (18–24 in Ausbildung/Studium); unter 18 automatisch</span>
        </label>
      </td>
    </tr>
  `;
}

function renderKinderListe(container, anzahl) {
  const k = Math.max(0, Math.floor(anzahl || 0));
  if (k === 0) {
    container.innerHTML = `<p class="hinweis">Keine Kinder eingetragen.</p>`;
    return;
  }
  let rows = "";
  for (let i = 0; i < k; i++) rows += rowForKind(i);
  container.innerHTML = `
    <table class="pflegegrad-tabelle" style="margin-top:.6rem;">
      <thead>
        <tr>
          <th>#</th>
          <th>Alter</th>
          <th>Förderfähigkeit (18–24)</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  // Defaults: <18 automatisch förderfähig (Checkbox egal); 18–24 standardmäßig angehakt; >=25 aus
  Array.from(container.querySelectorAll(".kg_kind_alter")).forEach((inp, idx) => {
    const chk = container.querySelector(`.kg_kind_foerder[data-index="${idx}"]`);
    const apply = () => {
      const age = n(inp);
      if (age < 18) { chk.checked = true; chk.disabled = true; }
      else if (age <= 24) { chk.disabled = false; chk.checked = true; }
      else { chk.disabled = true; chk.checked = false; }
    };
    apply();
    inp.addEventListener("input", apply);
  });
}

function leseKinder(container) {
  const alters = Array.from(container.querySelectorAll(".kg_kind_alter")).map(inp => n(inp));
  const foerder = Array.from(container.querySelectorAll(".kg_kind_foerder")).map(inp => !!inp.checked);

  let anzahlAnspruch = 0;
  const hinweise = [];

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
        hinweise.push(`Kind ${idx + 1}: ${age} Jahre – <em>förderfähig angenommen</em> (vereinfacht).`);
      }
    }
    // <18 ist immer förderfähig
    anzahlAnspruch += 1;
  });

  return { alters, anzahlAnspruch, hinweise };
}

// KiZ-Vorcheck (stark vereinfacht!)
function kizVorcheck({ haushalt, netto, warmmiete, kinderAnz }) {
  const minIncome = haushalt === "alleinerziehend" ? 600 : 900; // grobe Mindesteinkommen-Orientierung
  const baseParent = haushalt === "alleinerziehend" ? 700 : 1100; // pauschaler Elternbedarf
  const perChild = 420; // pauschaler Kinderbedarf
  const bedarf = baseParent + perChild * Math.max(0, kinderAnz) + Math.max(0, warmmiete);
  const spannbreiteOben = bedarf * 1.15;

  if (netto < minIncome) {
    return {
      urteil: "Eher nein",
      begruendung: `Nettoeinkommen unter der vereinfachten Mindesteinkommensgrenze (${euro(minIncome)}). Evtl. Bürgergeld/Wohngeld prüfen.`,
      bedarf, range: [bedarf, spannbreiteOben]
    };
  }
  if (netto < bedarf) {
    return {
      urteil: "Denkbar",
      begruendung: "Nettoeinkommen liegt unter dem pauschalen Bedarf. Kinderzuschlag/Wohngeld könnten helfen (unverbindlich).",
      bedarf, range: [bedarf, spannbreiteOben]
    };
  }
  if (netto <= spannbreiteOben) {
    return {
      urteil: "Grenzwertig",
      begruendung: "Netto liegt knapp über dem pauschalen Bedarf. Offizielle Rechner nutzen – Details können das Ergebnis drehen.",
      bedarf, range: [bedarf, spannbreiteOben]
    };
  }
  return {
    urteil: "Eher nein",
    begruendung: "Nettoeinkommen liegt deutlich über dem pauschalen Bedarf (vereinfacht).",
    bedarf, range: [bedarf, spannbreiteOben]
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
          <tr><td>Pauschaler Bedarf (Eltern + Kinder) + Warmmiete</td><td>${euro(kiz.bedarf)}</td></tr>
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
      Stark vereinfachte Heuristik (Pauschalwerte, keine Vermögensprüfung, keine exakten Abzüge/Angemessenheitsgrenzen).
      Für verbindliche Aussagen bitte den <strong>offiziellen KiZ-/Wohngeld-Rechner</strong> nutzen und ggf. beraten lassen.
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
  renderKinderListe(kinderContainer, n(anzahlInput) || 0);

  anzahlInput.addEventListener("input", () => {
    renderKinderListe(kinderContainer, n(anzahlInput));
    if (out) out.innerHTML = "";
  });

  if (btn && out) {
    btn.addEventListener("click", () => {
      const errors = [];
      const anzahlKinder = Math.max(0, Math.floor(n(anzahlInput)));
      if (anzahlKinder === 0) {
        errors.push("Bitte mindestens 1 Kind eintragen, sonst ist Kindergeld = 0.");
      }

      const kgSatz = n(kgSatzInput);
      if (kgSatz < 0) errors.push("Kindergeldsatz darf nicht negativ sein.");

      const netto = n(einkommenInput);
      const warmmiete = n(warmmieteInput);
      if (netto < 0) errors.push("Nettoeinkommen darf nicht negativ sein.");
      if (warmmiete < 0) errors.push("Warmmiete darf nicht negativ sein.");

      if (errors.length) {
        out.innerHTML = errorBox(errors);
        out.scrollIntoView({ behavior: "smooth" });
        return;
      }

      const { anzahlAnspruch, hinweise } = leseKinder(kinderContainer);
      const kindergeld = Math.max(0, anzahlAnspruch) * Math.max(0, kgSatz);

      const kiz = kizVorcheck({
        haushalt: haushaltSel.value,
        netto: Math.max(0, netto),
        warmmiete: Math.max(0, warmmiete),
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
