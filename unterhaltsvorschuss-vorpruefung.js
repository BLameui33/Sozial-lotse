// unterhaltsvorschuss-vorpruefung.js – vereinfachte, klarere Version

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

// Kleine Fehlerbox
function errorBox(msgs){
  if (!msgs.length) return "";
  return `
    <div class="pflegegrad-result-card">
      <h2>Bitte Eingaben prüfen</h2>
      <ul>${msgs.map(m=>`<li>${m}</li>`).join("")}</ul>
    </div>
  `;
}

// Kernlogik: grobe Einordnung
function beurteileUVG({ alter, alleinerziehend, zahlverhalten, betrag, netto, buergergeld }) {
  // 1) Alters- und Haushaltsgrundlagen
  if (alter >= 18) {
    return {
      urteil: "Eher nicht",
      begruendung: "Kind ist 18 Jahre oder älter. UVG richtet sich an Kinder unter 18 (vereinfacht).",
      badge: "neg"
    };
  }
  if (alleinerziehend !== "ja") {
    return {
      urteil: "Eher nicht",
      begruendung: "Kein alleinerziehender Haushalt. UVG richtet sich grundsätzlich an Alleinerziehende.",
      badge: "neg"
    };
  }

  // 2) Zahlverhalten grob bewerten
  const zahltNichts = zahlverhalten === "nein" || betrag <= 0;
  const zahltUnregWenig = zahlverhalten === "unreg" && betrag >= 0 && betrag < 150; // grob zu wenig
  const zahltRegelAusreichend = zahlverhalten === "regel" && betrag >= 300; // grobe Untergrenze "ausreichend"

  // 3) Sonderhürde 12–17 (vereinfacht)
  const ist1217 = alter >= 12 && alter <= 17;
  const nettoMindestens600 = netto >= 600;
  const beziehtSGBII = buergergeld === "ja";

  // 4) Entscheidungsmatrix (vereinfachte Heuristik)
  if (zahltRegelAusreichend) {
    return {
      urteil: "Eher nicht",
      begruendung: "Der andere Elternteil zahlt regelmäßig und in ausreichender Höhe (vereinfacht).",
      badge: "neg"
    };
  }

  if (zahltNichts || zahltUnregWenig) {
    if (ist1217) {
      if (beziehtSGBII && !nettoMindestens600) {
        return {
          urteil: "Unklar",
          begruendung: "Bei 12–17 Jahren wird u. a. geprüft, ob kein SGB-II-Bezug besteht oder mind. ca. 600 € eigenes Einkommen vorhanden ist. Bitte Beratung/Jugendamt kontaktieren.",
          badge: "warn"
        };
      }
      return {
        urteil: "Wahrscheinlich",
        begruendung: "Andere/r Elternteil zahlt nicht/zu wenig und die Zusatzvoraussetzungen (12–17) scheinen erfüllt (vereinfacht).",
        badge: "pos"
      };
    }

    // unter 12
    return {
      urteil: "Wahrscheinlich",
      begruendung: "Andere/r Elternteil zahlt nicht bzw. deutlich zu wenig. Bei Kindern unter 12 ist UVG oft möglich (vereinfacht).",
      badge: "pos"
    };
  }

  // Rest: z. B. unklare/knappe Fälle
  return {
    urteil: "Unklar",
    begruendung: "Zahlungen vorhanden, aber Höhe/Regelmäßigkeit unklar. Bitte mit Nachweisen beim Jugendamt klären.",
    badge: "warn"
  };
}

function badgeHtml(kind){
  const map = {
    pos: {label: "wahrscheinlich", cls: "badge-success"},
    neg: {label: "eher nicht", cls: "badge-danger"},
    warn:{label: "unklar", cls: "badge-warning"}
  };
  const b = map[kind] || map.warn;
  return `<span class="${b.cls}" style="padding:.2rem .5rem; border-radius:.5rem;">${b.label}</span>`;
}

function buildOutput(result, eingaben, errors) {
  if (errors.length) return errorBox(errors);

  const { urteil, begruendung, badge } = result;

  return `
    <h2>Vorprüfung: Unterhaltsvorschuss</h2>

    <div class="pflegegrad-result-card">
      <p style="font-size:1.05rem;">
        <strong>Ergebnis:</strong> ${badgeHtml(badge)} (${urteil})
      </p>

      <h3>Deine Angaben (Kurzüberblick)</h3>
      <table class="pflegegrad-tabelle">
        <thead><tr><th>Angabe</th><th>Wert</th></tr></thead>
        <tbody>
          <tr><td>Alter des Kindes</td><td>${eingaben.alter} Jahre</td></tr>
          <tr><td>Alleinerziehender Haushalt</td><td>${eingaben.alleinerziehend === "ja" ? "Ja" : "Nein"}</td></tr>
          <tr><td>Zahlverhalten anderer Elternteil</td><td>${
            eingaben.zahlverhalten === "nein" ? "Zahlt nicht" :
            eingaben.zahlverhalten === "unreg" ? "Unregelmäßig / zu wenig" :
            "Regelmäßig (ausreichend)"
          }</td></tr>
          <tr><td>Monatliche Zahlung (falls vorhanden)</td><td>${euro(eingaben.betrag)}</td></tr>
          <tr><td>Eigenes Netto</td><td>${euro(eingaben.netto)}</td></tr>
          <tr><td>Bürgergeld (SGB II)</td><td>${eingaben.buergergeld === "ja" ? "Ja" : "Nein"}</td></tr>
        </tbody>
      </table>

      <h3>Einordnung</h3>
      <p>${begruendung}</p>

      <h3>Was kannst du tun?</h3>
      <ul>
        <li><strong>Unterlagen sammeln:</strong> z. B. Zahlungsnachweise, Schriftverkehr, Bescheide.</li>
        <li><strong>Jugendamt kontaktieren:</strong> dort wird der Einzelfall verbindlich geprüft.</li>
        <li><strong>Bei 12–17 Jahren:</strong> Einkommensnachweis (ca. ≥ 600 €) bzw. SGB-II-Status bereithalten.</li>
      </ul>
    </div>

    <p class="hinweis">
      Diese Einschätzung ist <strong>unverbindlich</strong>. Das Jugendamt prüft u. a. Mindestunterhalt,
      Mitwirkungspflichten (Angaben zum anderen Elternteil), Vaterschaft, Aufenthalt sowie die Anrechnung anderer Leistungen.
    </p>
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  const alterInput = document.getElementById("uvg_kind_alter");
  const alleinerziehendSel = document.getElementById("uvg_alleinerziehend");
  const zahlSel = document.getElementById("uvg_zahlverhalten");
  const betragInput = document.getElementById("uvg_betrag");
  const nettoInput = document.getElementById("uvg_eltern_netto");
  const bgSel = document.getElementById("uvg_buergergeld");

  const btn = document.getElementById("uvg_check");
  const reset = document.getElementById("uvg_reset");
  const out = document.getElementById("uvg_ergebnis");

  if (!btn || !out) return;

  btn.addEventListener("click", () => {
    const errors = [];

    const alter = Math.max(0, Math.floor(n(alterInput)));
    if (!Number.isFinite(alter) || alterInput.value === "") errors.push("Bitte Alter des Kindes angeben.");
    if (alter < 0 || alter > 25) errors.push("Alter bitte zwischen 0 und 25 Jahren angeben.");

    const eingaben = {
      alter,
      alleinerziehend: (alleinerziehendSel && alleinerziehendSel.value) || "ja",
      zahlverhalten: (zahlSel && zahlSel.value) || "nein",
      betrag: Math.max(0, n(betragInput)),
      netto: Math.max(0, n(nettoInput)),
      buergergeld: (bgSel && bgSel.value) || "nein"
    };

    // Sofortige „Kein-Alleinerziehend“-Kennzeichnung
    if (eingaben.alleinerziehend !== "ja") {
      // keine weiteren Fehler nötig; Ergebnis wird „eher nicht“
    }

    const result = beurteileUVG(eingaben);
    out.innerHTML = buildOutput(result, eingaben, errors);
    out.scrollIntoView({ behavior: "smooth" });
  });

  if (reset) {
    reset.addEventListener("click", () => {
      setTimeout(() => { out.innerHTML = ""; }, 0);
    });
  }
});
