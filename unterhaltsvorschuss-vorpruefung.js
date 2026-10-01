// Unterhaltsvorschuss-Vorprüfung (Geprüfte & optimierte Logik)

function parseNumber(el) {
  if (!el) return 0;
  const raw = (el.value || "").toString().replace(",", ".");
  const v = Number(raw);
  return Number.isFinite(v) ? v : 0;
}

function formatEuro(v) {
  const x = Number.isFinite(v) ? v : 0;
  return x.toLocaleString("de-DE", { style: "currency", currency: "EUR" });
}

// Prüfungslogik für den Anspruch
// Aktuelle ungefähre UVG-Höchstsätze (Mindestunterhalt minus Kindergeld)
function getUvgMaxBetrag(alter) {
  if (alter < 6) return 227;  // Altersstufe 1 (0–5 Jahre)
  if (alter < 12) return 299; // Altersstufe 2 (6–11 Jahre)
  if (alter < 18) return 394; // Altersstufe 3 (12–17 Jahre)
  return 0;
}

function beurteileUVG({ alter, alleinerziehend, zahlverhalten, betrag, netto, buergergeld }) {
  // 1. Grundvoraussetzungen
  if (alter >= 18) {
    return {
      urteil: "Kein Anspruch",
      begruendung: "Unterhaltsvorschuss gibt es nur für Kinder unter 18 Jahren.",
      badge: "neg"
    };
  }

  if (alleinerziehend !== "ja") {
    return {
      urteil: "Kein Anspruch",
      begruendung: "Unterhaltsvorschuss ist eine Leistung für Alleinerziehende. Wohnen beide Eltern zusammen, besteht kein Anspruch.",
      badge: "neg"
    };
  }

  const maxUvg = getUvgMaxBetrag(alter);

  // 2. Anrechnung von Zahlungen (Betrag >= UVG-Höchstsatz)
  if (betrag >= maxUvg) {
    return {
      urteil: "Voraussichtlich kein Zahlungsanspruch",
      begruendung: `Du gibst an, dass im Schnitt ${betrag} € gezahlt werden. Der maximale Unterhaltsvorschuss für ein Kind in diesem Alter beträgt ca. ${maxUvg} €. Da die eingehenden Zahlungen diesen Betrag decken bzw. übersteigen, zahlt das Jugendamt keinen Vorschuss aus. (Sollten die Zahlungen künftig komplett ausfallen, kann ein neuer Antrag gestellt werden).`,
      badge: "neg"
    };
  }

  // Restanspruch berechnen (Betrag < maxUvg)
  const restAnspruch = maxUvg - betrag;

  // 3. Sonderregeln für Jugendliche (12–17 Jahre) bei Grundsicherungsgeld
  if (alter >= 12 && alter <= 17) {
    const hatGenugEinkommen = netto >= 600;
    const beziehtBuergergeld = buergergeld === "ja";

    if (beziehtBuergergeld && !hatGenugEinkommen) {
      return {
        urteil: "Prüfung im Einzelfall nötig",
        begruendung: `Für Jugendliche ab 12 Jahren im Grundsicherungsgeld-Bezug gilt eine Sonderhürde: Das Jugendamt prüft, ob durch den verbleibenden Vorschuss (ca. ${restAnspruch} €) die Hilfebedürftigkeit des Haushalts aufgehoben werden kann.`,
        badge: "warn"
      };
    }
  }

  // 4. Anspruch liegt vor (Teil- oder Vollanspruch)
  if (betrag > 0) {
    return {
      urteil: "Teilanspruch wahrscheinlich",
      begruendung: `Die eingehende Zahlung (${betrag} €) wird angerechnet. Es verbleibt voraussichtlich ein Differenz-Betrag von ca. ${restAnspruch} € pro Monat als Unterhaltsvorschuss.`,
      badge: "pos"
    };
  }

  return {
    urteil: "Gute Chancen (Vollanspruch)",
    begruendung: `Da kein Unterhalt gezahlt wird, besteht voraussichtlich Anspruch auf den vollen Unterhaltsvorschuss von ca. ${maxUvg} € pro Monat.`,
    badge: "pos"
  };
}

function getBadgeHtml(kind) {
  const map = {
    pos: { label: "Wahrscheinlich", cls: "badge-pos" },
    neg: { label: "Unwahrscheinlich", cls: "badge-neg" },
    warn: { label: "Einzelfallprüfung", cls: "badge-warn" }
  };
  const b = map[kind] || map.warn;
  return `<span class="uvg-badge ${b.cls}">${b.label}</span>`;
}

function buildOutput(result, eingaben, errors) {
  if (errors.length) {
    return `
      <div class="uvg-card">
        <h3 class="uvg-card-title">Bitte Eingaben korrigieren</h3>
        <ul class="uvg-steps-list">
          ${errors.map(m => `<li>${m}</li>`).join("")}
        </ul>
      </div>
    `;
  }

  const { urteil, begruendung, badge } = result;

  return `
    <div class="uvg-card">
      <div class="uvg-status-header">
        ${getBadgeHtml(badge)}
        <span style="font-weight: 600; font-size: 1.05rem;">${urteil}</span>
      </div>

      <div class="uvg-explanation">
        ${begruendung}
      </div>

      <h4 class="uvg-steps-title">Zusammenfassung deiner Angaben</h4>
      <table class="uvg-summary-table">
        <tbody>
          <tr>
            <td>Alter des Kindes</td>
            <td>${eingaben.alter} Jahre</td>
          </tr>
          <tr>
            <td>Alleinerziehend</td>
            <td>${eingaben.alleinerziehend === "ja" ? "Ja" : "Nein"}</td>
          </tr>
          <tr>
            <td>Zahlungseingang Unterhalt</td>
            <td>${
              eingaben.zahlverhalten === "nein" ? "Kein Unterhalt" :
              eingaben.zahlverhalten === "unreg" ? "Unregelmäßig / gering" :
              "Regelmäßig"
            } (${formatEuro(eingaben.betrag)})</td>
          </tr>
          <tr>
            <td>Eigenes Nettoeinkommen</td>
            <td>${formatEuro(eingaben.netto)}</td>
          </tr>
          <tr>
            <td>Grundsicherungsgeld-Bezug (SGB II)</td>
            <td>${eingaben.buergergeld === "ja" ? "Ja" : "Nein"}</td>
          </tr>
        </tbody>
      </table>

      <h4 class="uvg-steps-title">Empfohlene nächste Schritte</h4>
      <ul class="uvg-steps-list">
        <li><strong>Unterlagen vorbereiten:</strong> Gehaltsnachweise, Geburtsurkunde und Nachweise über fehlende oder geringe Unterhaltszahlungen sammeln.</li>
        <li><strong>Jugendamt kontaktieren:</strong> Vereinbare einen Termin bei der Unterhaltsvorschussstelle deines zuständigen Jugendamtes.</li>
        <li><strong>Antrag stellen:</strong> Den Antrag kannst du direkt vor Ort oder in vielen Regionen bereits online einreichen.</li>
      </ul>

      <p class="uvg-disclaimer">
        Hinweis: Dies ist eine unverbindliche Orientierungshilfe. Die rechtsverbindliche Prüfung obliegt ausschließlich der Unterhaltsvorschussstelle.
      </p>
    </div>
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

    if (alterInput.value.trim() === "") {
      errors.push("Bitte gib das Alter des Kindes an.");
    }

    const alter = Math.floor(parseNumber(alterInput));
    if (alter < 0 || alter > 25) {
      errors.push("Das Alter muss zwischen 0 und 25 Jahren liegen.");
    }

    const eingaben = {
      alter,
      alleinerziehend: (alleinerziehendSel && alleinerziehendSel.value) || "ja",
      zahlverhalten: (zahlSel && zahlSel.value) || "nein",
      betrag: Math.max(0, parseNumber(betragInput)),
      netto: Math.max(0, parseNumber(nettoInput)),
      buergergeld: (bgSel && bgSel.value) || "nein"
    };

    const result = beurteileUVG(eingaben);
    out.innerHTML = buildOutput(result, eingaben, errors);
    out.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });

  if (reset) {
    reset.addEventListener("click", () => {
      setTimeout(() => { 
        out.innerHTML = ""; 
      }, 0);
    });
  }
});