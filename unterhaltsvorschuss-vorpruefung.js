// unterhaltsvorschuss-vorpruefung.js (vereinfachter Vorcheck)

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

function beurteileUVG({ alter, alleinerziehend, zahlverhalten, betrag, netto, buergergeld }) {
  // Grundchecks
  if (alter >= 18) {
    return {
      urteil: "Eher nicht",
      begruendung: "Kind ist 18 Jahre oder älter. UVG richtet sich an Kinder unter 18 (vereinfacht dargestellt)."
    };
  }
  if (alleinerziehend !== "ja") {
    return {
      urteil: "Eher nicht",
      begruendung: "Kein alleinerziehender Haushalt. UVG richtet sich in der Regel an Alleinerziehende."
    };
  }

  // Plausibilitätsgrenzen für Zahlverhalten
  const zahltNichts = zahlverhalten === "nein" || (betrag <= 0);
  const zahltWenig = zahlverhalten !== "regel" && betrag > 0 && betrag < 150; // grob: deutlich zu wenig
  const zahltRegelmaessigAusreichend = zahlverhalten === "regel" && betrag >= 300; // grobe Annahme: ausreichend

  // Sonderhürde 12–17 Jahre (vereinfacht)
  const ist1217 = alter >= 12 && alter <= 17;
  const nettoMindestens600 = netto >= 600;
  const beziehtSGBII = buergergeld === "ja";

  // Ersteinschätzung je nach Zahlungen
  if (zahltRegelmaessigAusreichend) {
    return {
      urteil: "Eher nicht",
      begruendung: "Der andere Elternteil zahlt regelmäßig und in ausreichender Höhe (vereinfachte Annahme)."
    };
  }

  // Kein/zu niedriger Unterhalt: eher ja, aber Alters-/SGB-II-Hürde beachten
  if (zahltNichts || zahltWenig) {
    if (ist1217) {
      if (beziehtSGBII && !nettoMindestens600) {
        return {
          urteil: "Unklar – Beratung empfohlen",
          begruendung:
            "Für Kinder von 12–17 Jahren gelten zusätzliche Voraussetzungen. Bei SGB-II-Bezug und Einkommen unter ca. 600 € kann UVG schwierig sein. Lass dich beim Jugendamt beraten."
        };
      }
      // 12–17, kein SGB II oder ausreichend Einkommen: tendenziell ja
      return {
        urteil: "Wahrscheinlich Anspruch",
        begruendung:
          "Andere/r Elternteil zahlt nicht/zu wenig und die zusätzlichen Voraussetzungen (12–17 Jahre) scheinen erfüllt zu sein (vereinfacht)."
      };
    }

    // Unter 12: Einkommen des betreuenden Elternteils i. d. R. keine Hürde
    return {
      urteil: "Wahrscheinlich Anspruch",
      begruendung:
        "Der andere Elternteil zahlt nicht bzw. deutlich zu wenig. Bei Kindern unter 12 Jahren ist UVG grundsätzlich oft möglich (vereinfacht)."
    };
  }

  // Restfälle (z. B. regelmäßige, aber niedrige Zahlungen um 150–299 €)
  return {
    urteil: "Unklar – Beratung empfohlen",
    begruendung:
      "Zahlungen sind vorhanden, aber die Höhe/Regelmäßigkeit ist unklar. Bitte mit Nachweisen beim Jugendamt prüfen lassen."
  };
}

function buildOutput(result, eingaben) {
  const { urteil, begruendung } = result;

  return `
    <h2>Vorprüfung: Unterhaltsvorschuss</h2>

    <div class="pflegegrad-result-card">
      <p>
        <strong>Ergebnis:</strong> ${urteil}
      </p>

      <h3>Deine Angaben (Kurzüberblick)</h3>
      <table class="pflegegrad-tabelle">
        <thead><tr><th>Angabe</th><th>Wert</th></tr></thead>
        <tbody>
          <tr><td>Alter des Kindes</td><td>${eingaben.alter} Jahre</td></tr>
          <tr><td>Alleinerziehender Haushalt</td><td>${eingaben.alleinerziehend === "ja" ? "Ja" : "Nein"}</td></tr>
          <tr><td>Zahlverhalten anderer Elternteil</td><td>${
            eingaben.zahlverhalten === "nein" ? "Zahlt nicht" :
            eingaben.zahlverhalten === "unreg" ? "Unregelmäßig" : "Regelmäßig"
          }</td></tr>
          <tr><td>Monatliche Zahlung (falls vorhanden)</td><td>${euro(eingaben.betrag)}</td></tr>
          <tr><td>Netto des betreuenden Elternteils</td><td>${euro(eingaben.netto)}</td></tr>
          <tr><td>Bürgergeld (SGB II)</td><td>${eingaben.buergergeld === "ja" ? "Ja" : "Nein"}</td></tr>
        </tbody>
      </table>

      <h3>Einschätzung</h3>
      <p>${begruendung}</p>
    </div>

    <p class="hinweis">
      Diese Einschätzung ist <strong>unverbindlich</strong>. Für eine verbindliche Prüfung melde dich bitte beim
      <strong>zuständigen Jugendamt</strong>. Dort wird u. a. die Höhe des Mindestunterhalts, Mitwirkungspflichten
      (z. B. Angaben zum anderen Elternteil), mögliche Anrechnung anderer Leistungen und Besonderheiten deines Falls geprüft.
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
    const eingaben = {
      alter: Math.max(0, Math.floor(n(alterInput))),
      alleinerziehend: (alleinerziehendSel && alleinerziehendSel.value) || "ja",
      zahlverhalten: (zahlSel && zahlSel.value) || "nein",
      betrag: Math.max(0, n(betragInput)),
      netto: Math.max(0, n(nettoInput)),
      buergergeld: (bgSel && bgSel.value) || "nein"
    };

    const result = beurteileUVG(eingaben);
    out.innerHTML = buildOutput(result, eingaben);
    out.scrollIntoView({ behavior: "smooth" });
  });

  if (reset) {
    reset.addEventListener("click", () => {
      setTimeout(() => { out.innerHTML = ""; }, 0);
    });
  }
});
