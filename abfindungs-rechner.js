// abfindungs-rechner.js – Berechnung (0,5-Formel) & Sperrzeit-Warnung
// Design: Edel, viel Weißraum, blaue Akzente, keine Emojis, runde Formulierungen

// -------------------------------------------------------------------
// HILFSFUNKTIONEN
// -------------------------------------------------------------------
function n(el) { 
  if (!el) return 0; 
  const raw = (el.value || "").toString().replace(",", ".").trim(); 
  const v = Number(raw); 
  return Number.isFinite(v) ? v : 0; 
}

function euro(v) { 
  const x = Number.isFinite(v) ? v : 0; 
  return x.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €"; 
}

function errorBox(msgs) {
  if (!msgs.length) return "";
  return `
    <div style="background: #fef2f2; border-left: 4px solid #b91c1c; padding: 24px; border-radius: 8px; margin-top: 24px;">
      <h3 style="margin-top: 0; margin-bottom: 12px; color: #991b1b; font-size: 1.1rem; font-weight: 600;">Bitte Angaben prüfen:</h3>
      <ul style="margin: 0; padding-left: 20px; color: #7f1d1d; line-height: 1.6;">
        ${msgs.map(m => `<li style="margin-bottom: 6px;">${m}</li>`).join("")}
      </ul>
    </div>
  `;
}

// -------------------------------------------------------------------
// LOGIK: Sperrzeit-Risiko bewerten (Texte fachlich geglättet und präzisiert)
// -------------------------------------------------------------------
function ermittleRisiko(art) {
  switch(art) {
    case "aufhebungsvertrag":
      return {
        titel: "Hinweis zur Sperrzeit: Erhöhtes Risiko",
        color: "#991b1c", // Edles Dunkelrot
        bg: "#fef2f2",    // Sehr helles Rot
        text: "Bei einem Aufhebungsvertrag lösen Sie das Arbeitsverhältnis im gegenseitigen Einvernehmen auf. Die Agentur für Arbeit verhängt in diesen Fällen jedoch häufig eine <strong>12-wöchige Sperrzeit</strong> beim Arbeitslosengeld. Prüfen Sie sorgfältig, ob die angebotene Abfindung den finanziellen Verlust durch die Sperrzeit und mögliche Beiträge zur Krankenversicherung vollständig ausgleicht."
      };
    case "eigenkuendigung":
      return {
        titel: "Hinweis zur Sperrzeit: Sehr hohes Risiko",
        color: "#991b1c", 
        bg: "#fef2f2",
        text: "Wenn Sie das Arbeitsverhältnis selbst kündigen (ohne einen von der Agentur anerkannten wichtigen Grund), tritt in der Regel eine <strong>12-wöchige Sperrzeit</strong> ein. Bitte beachten Sie: Bei einer Eigenkündigung besteht kein gesetzlicher Anspruch auf eine Abfindung. Eine berechnete Summe dient hier lediglich einer theoretischen Orientierung."
      };
    case "betriebsbedingt":
      return {
        titel: "Hinweis zur Sperrzeit: Geringes Risiko",
        color: "#1e40af", // Edles Dunkelblau
        bg: "#eff6ff",    // Sehr helles Blau
        text: "Erfolgt die Kündigung aus betriebsbedingten Gründen unter Einhaltung der ordentlichen Frist, droht in der Regel <strong>keine Sperrzeit</strong>. Weist der Arbeitgeber im Kündigungsschreiben auf § 1a KSchG hin, haben Sie nach Ablauf der 3-wöchigen Klagefrist oft einen direkten gesetzlichen Anspruch auf die Regelabfindung."
      };
    case "personenbedingt":
      return {
        titel: "Hinweis zur Sperrzeit: Abhängig von den Umständen",
        color: "#92400e", // Edles Amber/Ocker
        bg: "#fffbeb",    // Sehr helles Amber
        text: "Bei personenbedingten Kündigungen (z. B. langandauernde Krankheit) verhängt die Agentur für Arbeit meist keine Sperrzeit, sofern Sie zumutbare Maßnahmen zur Erhaltung des Arbeitsplatzes mitgetragen haben. Eine Abfindung ist hier oft das Ergebnis eines gerichtlichen Vergleichs, um langwierige Verfahren zu vermeiden, und erfordert gutes Verhandlungsgeschick."
      };
    default:
      return null;
  }
}

// -------------------------------------------------------------------
// LOGIK: Berechnung der Abfindung
// -------------------------------------------------------------------
function berechneAbfindung(brutto, jahre, art) {
  // Faustformel: 0,5 Bruttomonatsgehälter pro Beschäftigungsjahr (§ 1a KSchG Orientierung)
  const faktorRegel = 0.5;
  const regelAbfindung = brutto * faktorRegel * jahre;
  
  // Verhandlungsspanne: In der Praxis liegt der Faktor oft zwischen 0,25 (schwach) und 1,0 (stark)
  const spanMin = Math.max(0, brutto * 0.25 * jahre);
  const spanMax = Math.max(0, brutto * 1.0 * jahre);

  const risiko = ermittleRisiko(art);

  return { brutto, jahre, regelAbfindung, spanMin, spanMax, risiko };
}

// -------------------------------------------------------------------
// HTML-GENERIERUNG FÜR DAS ERGEBNIS (Elegantes Design, viel Weißraum)
// -------------------------------------------------------------------
function buildResult(res) {
  const risikoBox = res.risiko ? `
    <div style="background: ${res.risiko.bg}; border: 1px solid ${res.risiko.color}20; border-left: 4px solid ${res.risiko.color}; padding: 24px; border-radius: 8px; margin-bottom: 32px;">
      <h3 style="margin-top: 0; margin-bottom: 12px; color: ${res.risiko.color}; font-size: 1.05rem; font-weight: 600; letter-spacing: 0.01em;">
        ${res.risiko.titel}
      </h3>
      <p style="margin: 0; font-size: 0.95rem; line-height: 1.7; color: #334155;">
        ${res.risiko.text}
      </p>
    </div>
  ` : '';

  return `
    <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 40px; margin-top: 32px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.03), 0 4px 6px -2px rgba(0, 0, 0, 0.01);">
      <h2 style="margin-top: 0; margin-bottom: 32px; color: #0f172a; font-size: 1.5rem; font-weight: 600; text-align: center; letter-spacing: -0.02em;">
        Ihre persönliche Berechnung
      </h2>
      
      ${risikoBox}

      <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 32px; border-radius: 10px; text-align: center; margin-bottom: 32px;">
        <p style="margin: 0 0 8px 0; font-size: 0.9rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 500;">
          Übliche Regelabfindung (Faktor 0,5)
        </p>
        <p style="font-size: 2.5rem; color: #1e3a8a; font-weight: 700; margin: 0 0 16px 0; letter-spacing: -0.02em;">
          ${euro(res.regelAbfindung)}
        </p>
        <div style="display: inline-block; font-size: 0.9rem; color: #475569; background: #ffffff; padding: 12px 20px; border-radius: 6px; border: 1px solid #cbd5e1; line-height: 1.5;">
          Mögliche Verhandlungsspanne (Faktor 0,25 bis 1,0):<br>
          <strong style="color: #0f172a; font-size: 1.05rem;">${euro(res.spanMin)} – ${euro(res.spanMax)}</strong>
        </div>
      </div>

      <h3 style="font-size: 1.1rem; color: #0f172a; font-weight: 600; margin-bottom: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
        Wichtige Hinweise für Ihr weiteres Vorgehen
      </h3>
      <ul style="font-size: 0.95rem; line-height: 1.7; color: #475569; margin: 0; padding-left: 20px;">
        <li style="margin-bottom: 12px;">
          <strong style="color: #1e3a8a;">Brutto ist nicht Netto:</strong> Abfindungen sind voll einkommensteuerpflichtig. Sozialversicherungsbeiträge (Kranken-, Pflege-, Rentenversicherung) fallen auf die Abfindungssumme in der Regel jedoch nicht an.
        </li>
        <li style="margin-bottom: 12px;">
          <strong style="color: #1e3a8a;">Fünftelregelung nutzen:</strong> Das Finanzamt berechnet die Steuerlast meist nach der günstigeren „Fünftelregelung“, um die progressive Steuerwirkung in dem Jahr des Zuflusses abzumildern.
        </li>
        <li>
          <strong style="color: #1e3a8a;">Klagefrist unbedingt beachten:</strong> Nach Erhalt einer Kündigung bleiben Ihnen exakt <strong>3 Wochen</strong> Zeit, um Kündigungsschutzklage beim Arbeitsgericht einzureichen. Wird diese Frist versäumt, wird die Kündigung wirksam und die Verhandlungsbasis für eine Abfindung entfällt meist.
        </li>
      </ul>
    </div>
  `;
}

// -------------------------------------------------------------------
// INITIALISIERUNG & EVENT LISTENER
// -------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  const bruttoInp = document.getElementById("abf_brutto");
  const jahreInp = document.getElementById("abf_jahre");
  const artInp = document.getElementById("abf_art");

  const btn = document.getElementById("abf_berechnen");
  const reset = document.getElementById("abf_reset");
  const out = document.getElementById("abf_ergebnis");

  if (!btn || !out) return;

  btn.addEventListener("click", () => {
    const errors = [];
    if (!bruttoInp.value || n(bruttoInp) <= 0) errors.push("Bitte geben Sie Ihr monatliches Bruttogehalt ein.");
    if (!jahreInp.value || n(jahreInp) < 0) errors.push("Bitte geben Sie die Jahre der Betriebszugehörigkeit an.");
    if (!artInp.value) errors.push("Bitte wählen Sie die Art der Beendigung des Arbeitsverhältnisses aus.");

    if (errors.length) {
      out.innerHTML = errorBox(errors);
      out.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    const brutto = n(bruttoInp);
    const jahre = n(jahreInp);
    const art = artInp.value;

    const res = berechneAbfindung(brutto, jahre, art);

    out.innerHTML = buildResult(res);
    out.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  if (reset) {
    reset.addEventListener("click", () => {
      // Sanftes Ausblenden oder direktes Leeren
      out.innerHTML = "";
      if(bruttoInp) bruttoInp.value = "";
      if(jahreInp) jahreInp.value = "";
      if(artInp) artInp.value = "";
    });
  }
});