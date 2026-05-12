// abfindungs-rechner.js – Berechnung (0,5-Formel) & Sperrzeit-Warnung

// Hilfsfunktionen
function n(el){ if(!el) return 0; const raw=(el.value||"").toString().replace(",","."); const v=Number(raw); return Number.isFinite(v)?v:0; }
function euro(v){ const x=Number.isFinite(v)?v:0; return x.toFixed(2).replace(".",",")+" €"; }

function errorBox(msgs){
  if (!msgs.length) return "";
  return `
    <div class="pflegegrad-result-card" style="border-left: 4px solid #e53935; padding: 15px; background: #fff3f3; margin-top: 20px;">
      <h3 style="margin-top: 0; color: #d32f2f;">Bitte Angaben prüfen:</h3>
      <ul style="margin-bottom: 0;">${msgs.map(m=>`<li>${m}</li>`).join("")}</ul>
    </div>
  `;
}

// -------------------------------------------------------------------
// LOGIK: Sperrzeit-Risiko bewerten
// -------------------------------------------------------------------
function ermittleRisiko(art) {
  switch(art) {
    case "aufhebungsvertrag":
      return {
        titel: "Sperrzeit-Risiko: HOCH (12 Wochen)",
        color: "#c62828", // Dunkelrot
        bg: "#ffebee",
        icon: "⚠️",
        text: "Beim Aufhebungsvertrag lösen Sie Ihr Arbeitsverhältnis aktiv mit auf. Die Agentur für Arbeit verhängt hier fast immer eine <strong>12-wöchige Sperrzeit</strong> beim ALG 1. Rechnen Sie genau nach: Ihre Abfindung muss den Verlust von 3 Monatsgehältern ALG 1 plus eventuelle Beiträge zur freiwilligen Krankenversicherung zwingend ausgleichen!"
      };
    case "eigenkuendigung":
      return {
        titel: "Sperrzeit-Risiko: SEHR HOCH",
        color: "#b71c1c", 
        bg: "#ffcdd2",
        icon: "⛔",
        text: "Wenn Sie selbst kündigen (ohne wichtigen, z.B. ärztlichen Grund), bekommen Sie 12 Wochen lang kein Arbeitslosengeld. Wichtig: Bei einer Eigenkündigung haben Sie <strong>keinen gesetzlichen Anspruch</strong> auf eine Abfindung. Die berechnete Summe ist hier rein theoretisch."
      };
    case "betriebsbedingt":
      return {
        titel: "Sperrzeit-Risiko: GERING",
        color: "#2e7d32", // Grün
        bg: "#e8f5e9",
        icon: "✅",
        text: "Kündigt der Arbeitgeber aus betriebsbedingten Gründen und wird die ordentliche Kündigungsfrist eingehalten, droht Ihnen in der Regel <strong>keine Sperrzeit</strong>. Wenn der Arbeitgeber im Kündigungsschreiben auf § 1a KSchG verweist, haben Sie nach Verstreichen der 3-wöchigen Klagefrist oft einen direkten Anspruch auf die Regelabfindung."
      };
    case "personenbedingt":
      return {
        titel: "Sperrzeit-Risiko: MITTEL bis HOCH",
        color: "#ed6c02", // Orange
        bg: "#fff3e0",
        icon: "⚠️",
        text: "Hier muss unterschieden werden: Ist die Kündigung <em>verhaltensbedingt</em> (z.B. nach vorheriger Abmahnung), droht eine Sperrzeit. Ist sie <em>krankheitsbedingt</em>, meistens nicht. Eine Abfindung ist hier starkes Verhandlungsgeschick, da Arbeitgeber oft versuchen, ohne Abfindung zu kündigen."
      };
    default:
      return null;
  }
}

// -------------------------------------------------------------------
// LOGIK: Berechnung der Abfindung
// -------------------------------------------------------------------
function berechneAbfindung(brutto, jahre, art) {
  // Faustformel: 0,5 Bruttomonatsgehälter pro Beschäftigungsjahr
  const faktorRegel = 0.5;
  const regelAbfindung = brutto * faktorRegel * jahre;
  
  // Verhandlungsspanne: In der Praxis liegt der Faktor oft zwischen 0,25 (schwach) und 1,0 (stark)
  const spanMin = Math.max(0, brutto * 0.25 * jahre);
  const spanMax = Math.max(0, brutto * 1.0 * jahre);

  const risiko = ermittleRisiko(art);

  return { brutto, jahre, regelAbfindung, spanMin, spanMax, risiko };
}

// -------------------------------------------------------------------
// HTML-GENERIERUNG FÜR DAS ERGEBNIS
// -------------------------------------------------------------------
function buildResult(res) {
  const risikoBox = res.risiko ? `
    <div style="background: ${res.risiko.bg}; border: 1px solid ${res.risiko.color}; padding: 15px; border-radius: 6px; margin-bottom: 25px;">
      <h3 style="margin-top: 0; color: ${res.risiko.color}; font-size: 1.1rem;">
        ${res.risiko.icon} ${res.risiko.titel}
      </h3>
      <p style="margin-bottom: 0; font-size: 0.95rem; line-height: 1.5; color: #333;">
        ${res.risiko.text}
      </p>
    </div>
  ` : '';

  return `
    <div style="border: 2px solid #2196f3; border-radius: 8px; padding: 20px; margin-top: 30px; background: #fafafa;">
      <h2 style="margin-top: 0; color: #0d47a1;">Ihre Berechnung</h2>
      
      ${risikoBox}

      <div style="background: white; padding: 20px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 20px; text-align: center;">
        <p style="margin: 0; font-size: 1rem; color: #666;">Übliche Regelabfindung (Faktor 0,5):</p>
        <p style="font-size: 2.2rem; color: #0d47a1; font-weight: bold; margin: 10px 0;">
          ${euro(res.regelAbfindung)}
        </p>
        <div style="font-size: 0.9rem; color: #555; background: #f5f5f5; padding: 10px; border-radius: 4px; display: inline-block;">
          Mögliche Verhandlungsspanne (Faktor 0,25 bis 1,0):<br>
          <strong>${euro(res.spanMin)} – ${euro(res.spanMax)}</strong>
        </div>
      </div>

      <h3 style="font-size: 1.1rem; color: #333;">Was Sie jetzt wissen müssen:</h3>
      <ul style="font-size: 0.95rem; line-height: 1.6; color: #444; margin-bottom: 0;">
        <li><strong>Brutto ist nicht Netto:</strong> Abfindungen müssen voll versteuert werden! Sozialabgaben (Kranken-, Pflege-, Rentenversicherung) fallen auf die Abfindung hingegen in der Regel <em>nicht</em> an.</li>
        <li><strong>Fünftelregelung:</strong> Das Finanzamt berechnet die Steuerlast meist nach der günstigeren "Fünftelregelung", um die extreme Steuerprogression in diesem Jahr etwas abzufedern.</li>
        <li><strong>Klagefrist beachten:</strong> Wenn Sie eine Kündigung erhalten haben, bleiben Ihnen nur exakt <strong>3 Wochen</strong> Zeit, um Kündigungsschutzklage einzureichen. Verpassen Sie diese Frist, ist die Kündigung wirksam und die Verhandlungsbasis für eine Abfindung oft zerstört.</li>
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
    if (!bruttoInp.value || n(bruttoInp) <= 0) errors.push("Bitte geben Sie Ihr Bruttogehalt ein.");
    if (!jahreInp.value || n(jahreInp) < 0) errors.push("Bitte geben Sie die Jahre der Betriebszugehörigkeit an.");
    if (!artInp.value) errors.push("Bitte wählen Sie aus, wie das Arbeitsverhältnis enden soll.");

    if (errors.length){
      out.innerHTML = errorBox(errors);
      out.scrollIntoView({ behavior: "smooth" });
      return;
    }

    const brutto = n(bruttoInp);
    const jahre = n(jahreInp);
    const art = artInp.value;

    const res = berechneAbfindung(brutto, jahre, art);

    out.innerHTML = buildResult(res);
    out.scrollIntoView({ behavior: "smooth" });
  });

  if (reset) {
    reset.addEventListener("click", () => {
      setTimeout(() => { out.innerHTML = ""; }, 0);
    });
  }
});