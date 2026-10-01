// inkasso-sofortcheck.js
// Tool zur strukturierten Ersteinschätzung von Inkassoforderungen.
// Hinweis: Keine Rechtsberatung. Ergebnisse basieren ausschließlich auf Nutzereingaben.

/* --- Hilfsfunktionen --- */
function n(el) { 
  if (!el) return 0; 
  const v = Number((el.value || "").toString().replace(",", ".")); 
  return Number.isFinite(v) ? v : 0; 
}

function euro(v) { 
  const x = Number.isFinite(v) ? v : 0; 
  return x.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €"; 
}

document.addEventListener("DOMContentLoaded", () => {
  const inputs = {
    register: document.getElementById("ik_register"),
    vollmacht: document.getElementById("ik_vollmacht"),
    betrag: document.getElementById("ik_betrag"),
    schuld: document.getElementById("ik_schuld"),
    bestritten: document.getElementById("ik_bestritten")
  };

  const btn = document.getElementById("ik_berechnen");
  const reset = document.getElementById("ik_reset");
  const out = document.getElementById("ik_ergebnis");

  if (!btn || !out) return;

  btn.addEventListener("click", () => {
    out.innerHTML = ""; 

    const isRegistered = inputs.register ? inputs.register.value : ""; 
    const hasVollmacht = inputs.vollmacht ? inputs.vollmacht.value : ""; 
    const amount = n(inputs.betrag);
    const debtStatus = inputs.schuld ? inputs.schuld.value : ""; 
    const isDisputed = inputs.bestritten ? inputs.bestritten.value === "ja" : false;

    if (amount <= 0) {
      out.innerHTML = `
        <div class="ik-card ik-status-alert">
          <h3 class="ik-card-title ik-text-danger">Eingabe erforderlich</h3>
          <p class="ik-status-text">Bitte geben Sie die geforderte Gesamtsumme an, um eine fundierte Ersteinschätzung zu generieren.</p>
        </div>
      `;
      out.scrollIntoView({ behavior: "smooth", block: "nearest" });
      return;
    }

    let headline = "Ersteinschätzung der Forderung";
    let statusClass = "ik-status-notice"; // ik-status-notice, ik-status-warn, ik-status-alert
    let assessment = [];
    let todos = [];
    let strategyNote = "";

    // --- A. Registrierung ---
    if (isRegistered === "nein") {
      statusClass = "ik-status-alert";
      assessment.push("<strong>Fehlende Eintragung:</strong> Das angegebene Unternehmen ist laut Ihren Angaben nicht im Rechtsdienstleistungsregister eingetragen. Gemäß § 10 RDG ist eine behördliche Registrierung zwingende Voraussetzung für die Erbringung von Inkassodienstleistungen.");
      todos.push("Überprüfen Sie den Absender genau (Impressum, Unternehmensdaten). Veranlassen Sie vorerst keine Zahlungen.");
    } else if (isRegistered === "unsicher") {
      assessment.push("<strong>Status der Registrierung offen:</strong> Registrierte Inkassodienstleister lassen sich kostenfrei im offiziellen Rechtsdienstleistungsregister (rechtsdienstleistungsregister.de) einsehen.");
      todos.push("Prüfen Sie den Eintrag im Rechtsdienstleistungsregister.");
    } else {
      assessment.push("<strong>Registrierung vorhanden:</strong> Die formale Berechtigung zur Erbringung von Inkassodienstleistungen liegt vor.");
    }

    // --- B. Vollmacht ---
    if (hasVollmacht === "nein" || hasVollmacht === "kopie") {
      if (statusClass !== "ik-status-alert") statusClass = "ik-status-warn";
      assessment.push("<strong>Fehlender Vollmachtsnachweis:</strong> Es liegt keine Originalvollmacht des Gläubigers vor. Gemäß § 174 BGB kann Rechtsgeschäften ohne entsprechenden Nachweis schriftlich widersprochen werden.");
      todos.push("Fordern Sie das Inkassounternehmen schriftlich zur Vorlage einer Originalvollmacht auf.");
    }

    // --- C. Forderungsstatus ---
    if (debtStatus === "verjaehrt") {
      statusClass = "ik-status-alert";
      headline = "Mögliche Verjährung des Anspruchs";
      assessment.push("<strong>Einrede der Verjährung:</strong> Regelmäßige zivilrechtliche Ansprüche verjähren nach drei Jahren zum Jahresende. Verjährte Forderungen bleiben zwar bestehen, sind gerichtlich jedoch nicht mehr durchsetzbar, wenn die Einrede erhoben wird.");
      strategyNote = "Erhebung der Einrede der Verjährung gegenüber dem Unternehmenseinfluss.";
      todos.push("Erklären Sie gegenüber dem Inkassounternehmen schriftlich die Einrede der Verjährung.");
      todos.push("Leisten Sie keine Teilzahlungen, da dies den Neubeginn der Verjährung bewirken kann.");

    } else if (debtStatus === "nein") {
      statusClass = "ik-status-alert";
      headline = "Forderung dem Grunde nach bestritten";
      assessment.push("<strong>Fehlende Rechtsgrundlage:</strong> Nach Ihren Angaben besteht kein wirksamer Vertrag bzw. kein offener Zahlungsanspruch.");

      if (isDisputed) {
        assessment.push("<strong>Bestreiten erfolgt:</strong> Der Anspruch wurde bereits bestritten. Bestrittene Forderungen dürfen gemäß § 31 BDSG nicht an Wirtschaftsauskunfteien (z. B. SCHUFA) übermittelt werden.");
      } else {
        assessment.push("<strong>Widerspruch ausstehend:</strong> Um Nachteile zu vermeiden, sollte dem geltend gemachten Anspruch unverzüglich schriftlich widersprochen werden.");
      }

      strategyNote = "Substanziierter schriftlicher Widerspruch gegen die Forderung.";
      todos.push("Widersprechen Sie der Forderung schriftlich und sachlich unter Angabe der Gründe.");

    } else {
      if (statusClass !== "ik-status-alert") statusClass = "ik-status-warn";
      headline = "Berechtigung der Hauptforderung wahrscheinlich";
      assessment.push("<strong>Grundforderung besteht:</strong> Bei berechtigten Hauptforderungen ist die Vermeidung weiterer Verzugskosten maßgeblich.");

      if (isDisputed) {
        assessment.push("<strong>Nachweis gefordert:</strong> Das Inkassounternehmen ist zur detaillierten Aufschlüsselung und Belegführung verpflichtet.");
      } else {
        assessment.push("<strong>Prüfung der Nebenforderungen:</strong> Inkassogebühren müssen den gesetzlichen Obergrenzen entsprechen und verhältnismäßig sein.");
      }

      strategyNote = "Prüfung einer direkten Zahlung der Hauptforderung an den ursprünglichen Gläubiger.";
      todos.push("Prüfen Sie, ob die Hauptforderung direkt an den Gläubiger überwiesen werden kann.");
      todos.push("Überprüfen Sie die geltend gemachten Inkassokosten auf Angemessenheit.");
    }

    // Allgemeine Verfahrenshinweise
    todos.push("Führen Sie den Schriftverkehr nachweisbar (z. B. per Einschreiben oder E-Mail mit Lesebestätigung).");
    todos.push("Sollte ein gerichtlicher Mahnbescheid zugestellt werden, ist die Einhaltung der zweiwöchigen Widerspruchsfrist entscheidend.");

    const resultHtml = `
      <div class="ik-card">
        <h2 class="ku-card-title">Ergebnis der Ersteinschätzung</h2>

        <div class="ik-status-banner ${statusClass}">
          <h3 class="ik-status-title">${headline}</h3>
          <p class="ik-status-text">
            Geltend gemachte Gesamtsumme: <strong>${euro(amount)}</strong>
          </p>
        </div>

        <h3 class="ik-section-subtitle">Rechtliche Einordnung</h3>
        <ul class="ik-list">
          ${assessment.map(a => `<li>${a}</li>`).join('')}
        </ul>

        <h3 class="ik-section-subtitle">Empfohlene Maßnahmen</h3>
        <ul class="ik-list">
          ${todos.map(t => `<li>${t}</li>`).join('')}
        </ul>

        ${strategyNote ? `
          <div class="ik-strategy-box">
            <span class="ik-strategy-label">Empfohlene Handlungskonzeption</span>
            <p class="ik-strategy-text">${strategyNote}</p>
          </div>
        ` : ''}

        <p class="ik-disclaimer">
  Diese automatische Analyse stellt keine Rechtsberatung dar und ersetzt keine individuelle juristische Prüfung. 
  Bei komplexen Sachverhalten empfiehlt sich die Konsultation einer anerkannten <a href="https://www.verbraucherzentrale.de" target="_blank" rel="noopener noreferrer">Verbraucherzentrale</a> oder einer Rechtsanwaltskanzlei.
</p>
      </div>
    `;

    out.innerHTML = resultHtml;
    out.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });

  if (reset) {
    reset.addEventListener("click", () => {
      setTimeout(() => { out.innerHTML = ""; }, 50);
    });
  }
});