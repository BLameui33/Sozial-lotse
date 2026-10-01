// mindestlohn-rechner.js – Echten Stundenlohn & Mehrarbeit berechnen
// Design: Edel, viel Weißraum, blaue Akzente, keine Emojis, professionelle Formulierungen
// Datenstand: Mindestlohn 2026: 13,90 €, 2027: 14,60 € [[1]]

// -------------------------------------------------------------------
// HILFSFUNKTIONEN
// -------------------------------------------------------------------
function n(el) { 
  if (!el) return 0; 
  // .trim() entfernt versehentliche Leerzeichen am Anfang/Ende
  const raw = (el.value || "").toString().replace(",", ".").trim(); 
  const v = Number(raw); 
  return Number.isFinite(v) ? v : 0; 
}

function euro(v) { 
  const x = Number.isFinite(v) ? v : 0; 
  // Professionelle deutsche Währungsformatierung mit Tausender-Trennzeichen
  return x.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €"; 
}

function errorBox(msgs) {
  if (!msgs.length) return "";
  return `
    <div style="background: #fef2f2;  padding: 24px; border-radius: 8px; margin-top: 24px;">
      <h3 style="margin-top: 0; margin-bottom: 12px; color: #991b1b; font-size: 1.1rem; font-weight: 600;">Bitte Angaben prüfen:</h3>
      <ul style="margin: 0; padding-left: 20px; color: #7f1d1d; line-height: 1.6;">
        ${msgs.map(m => `<li style="margin-bottom: 6px;">${m}</li>`).join("")}
      </ul>
    </div>
  `;
}

// -------------------------------------------------------------------
// DATENGRUNDLAGE
// -------------------------------------------------------------------
const MINDESTLOHN_AKTUELL = 13.90; // Gültig ab 01.01.2026
const MINDESTLOHN_2027 = 14.60;    // Geplant ab 01.01.2027

// Arbeitsrechtliche Konstante: Ein Monat hat durchschnittlich 4,333 Wochen (13 Wochen / 3 Monate)
const WOCHEN_PRO_MONAT = 13 / 3; 

// -------------------------------------------------------------------
// KERN-LOGIK: Berechnung des Stundenlohns
// -------------------------------------------------------------------
function berechneStundenlohn(brutto, stundenVertrag, stundenReal) {
  // Arbeitsrechtliche Formel: (Monatsbrutto * 3) / 13 / Wochenstunden
  const lohnVertrag = (brutto * 3) / 13 / stundenVertrag;
  const lohnReal = (brutto * 3) / 13 / stundenReal;

  // Nur positive Mehrarbeit betrachten (Schutz vor negativen Werten bei Fehleingaben)
  const differenzStunden = Math.max(0, stundenReal - stundenVertrag);
  let wertUnbezahltMonat = 0;

  if (differenzStunden > 0) {
    // Wert der unbezahlten Arbeit im Monat (auf Basis des vertraglichen Stundenlohns)
    wertUnbezahltMonat = (differenzStunden * WOCHEN_PRO_MONAT) * lohnVertrag;
  }

  const unterMindestlohn = lohnReal < MINDESTLOHN_AKTUELL;

  return {
    lohnVertrag,
    lohnReal,
    differenzStunden,
    wertUnbezahltMonat,
    unterMindestlohn
  };
}

// -------------------------------------------------------------------
// HTML-GENERIERUNG FÜR DAS ERGEBNIS
// -------------------------------------------------------------------
function buildResult(res) {
  let alarmBox = "";

  if (res.unterMindestlohn) {
    alarmBox = `
      <div style="background: #fef2f2; border: 1px solid #fecaca;  padding: 24px; border-radius: 8px; margin-bottom: 32px;">
        <h3 style="margin-top: 0; margin-bottom: 12px; color: #991b1b; font-size: 1.1rem; font-weight: 600;">
          Achtung: Effektiver Stundenlohn unterschreitet den Mindestlohn
        </h3>
        <p style="margin: 0 0 12px 0; font-size: 0.95rem; line-height: 1.6; color: #334155;">
          Durch die unbezahlte Mehrarbeit (z. B. Rüstzeiten, nicht erfasste Überstunden) sinkt Ihr effektiver Stundenlohn auf <strong>${euro(res.lohnReal)}</strong>. Dies stellt einen Verstoß gegen das Mindestlohngesetz (MiLoG) dar, da der gesetzliche Mindestlohn zwingend <strong>${euro(MINDESTLOHN_AKTUELL)}</strong> pro Stunde beträgt.
        </p>
        <p style="margin: 0; font-size: 0.95rem; font-weight: 500; color: #991b1b; background: #fee2e2; padding: 12px; border-radius: 6px; display: inline-block;">
          Empfehlung: Dokumentieren Sie Ihre Arbeitszeiten lückenlos. Sie haben das Recht, den fehlenden Lohn rückwirkend einzufordern.
        </p>
      </div>
    `;
  } else if (res.differenzStunden > 0) {
    alarmBox = `
      <div style="background: #fffbeb; border: 1px solid #fde68a; padding: 24px; border-radius: 8px; margin-bottom: 32px;">
        <h3 style="margin-top: 0; margin-bottom: 12px; color: #92400e; font-size: 1.1rem; font-weight: 600;">
          Hinweis: Unbezahlte Mehrarbeit mindert Ihren Stundenlohn
        </h3>
        <p style="margin: 0; font-size: 0.95rem; line-height: 1.6; color: #334155;">
          Ihr effektiver Stundenlohn liegt mit <strong>${euro(res.lohnReal)}</strong> zwar noch über dem gesetzlichen Mindestlohn (${euro(MINDESTLOHN_AKTUELL)}). Durch die nicht vergüteten Mehrstunden verschenken Sie jedoch monatlich einen erheblichen Geldbetrag. Langfristig kann dies auch Ihren Anspruch auf bezahlte Überstunden oder Ausgleichszeiten schwächen.
        </p>
      </div>
    `;
  } else {
    alarmBox = `
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 24px; border-radius: 8px; margin-bottom: 32px;">
        <h3 style="margin-top: 0; margin-bottom: 12px; color: #166534; font-size: 1.1rem; font-weight: 600;">
          Keine Abweichungen festgestellt
        </h3>
        <p style="margin: 0; font-size: 0.95rem; line-height: 1.6; color: #334155;">
          Ihre erfasste Arbeitszeit entspricht Ihrer vertraglich vereinbarten Zeit. Ihr Stundenlohn von <strong>${euro(res.lohnVertrag)}</strong> erfüllt die aktuellen gesetzlichen Vorgaben.
        </p>
      </div>
    `;
  }

  let verlustBox = "";
  if (res.differenzStunden > 0) {
    verlustBox = `
      <div style="background: #ffffff; border: 1px solid #e2e8f0; padding: 24px; border-radius: 8px; margin-top: 24px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <p style="margin: 0 0 8px 0; font-size: 0.85rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 500;">
          Finanzielle Auswirkung (geschätzter Verlust pro Monat)
        </p>
        <p style="font-size: 2rem; color: #b91c1c; font-weight: 700; margin: 0 0 8px 0; letter-spacing: -0.02em;">
          - ${euro(res.wertUnbezahltMonat)}
        </p>
        <p style="font-size: 0.85rem; color: #64748b; margin: 0;">
          Basierend auf ${res.differenzStunden.toLocaleString('de-DE', { maximumFractionDigits: 1 })} unbezahlten Stunden pro Woche.
        </p>
      </div>
    `;
  }

  return `
    <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 40px; margin-top: 32px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.03), 0 4px 6px -2px rgba(0, 0, 0, 0.01);">
      <h2 style="margin-top: 0; margin-bottom: 32px; color: #0f172a; font-size: 1.5rem; font-weight: 600; text-align: center; letter-spacing: -0.02em;">
        Ihre persönliche Lohnanalyse
      </h2>
      
      ${alarmBox}

      <div style="display: grid; gap: 20px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); margin-bottom: 16px;">
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 24px; border-radius: 8px; text-align: center;">
          <p style="margin: 0 0 8px 0; font-size: 0.85rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 500;">
            Vertraglicher Stundenlohn
          </p>
          <p style="font-size: 2rem; color: #1e3a8a; font-weight: 700; margin: 0 0 8px 0; letter-spacing: -0.02em;">
            ${euro(res.lohnVertrag)}
          </p>
          <p style="margin: 0; font-size: 0.85rem; color: #64748b;">(Laut Arbeitsvertrag)</p>
        </div>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 24px; border-radius: 8px; text-align: center;">
          <p style="margin: 0 0 8px 0; font-size: 0.85rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 500;">
            Effektiver Stundenlohn
          </p>
          <p style="font-size: 2rem; color: ${res.unterMindestlohn ? '#b91c1c' : '#15803d'}; font-weight: 700; margin: 0 0 8px 0; letter-spacing: -0.02em;">
            ${euro(res.lohnReal)}
          </p>
          <p style="margin: 0; font-size: 0.85rem; color: #64748b;">(Tatsächlich erwirtschaftet)</p>
        </div>
      </div>

      ${verlustBox}

      <div style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 20px; border-radius: 8px; margin-top: 32px;">
        <p style="margin: 0; font-size: 0.9rem; line-height: 1.6; color: #1e3a8a;">
          <strong>Ausblick:</strong> Im Januar 2027 wird der gesetzliche Mindestlohn auf <strong>${euro(MINDESTLOHN_2027)}</strong> angehoben [[1]]. Ihr Arbeitgeber ist dann verpflichtet, Ihr Gehalt entsprechend anzupassen, falls Ihr aktueller Stundenlohn dann darunter liegen sollte.
        </p>
      </div>
    </div>
  `;
}

// -------------------------------------------------------------------
// INITIALISIERUNG & EVENT LISTENER
// -------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  const bruttoInp = document.getElementById("ml_brutto");
  const vertragInp = document.getElementById("ml_stunden_vertrag");
  const realInp = document.getElementById("ml_stunden_real");

  const btn = document.getElementById("ml_berechnen");
  const reset = document.getElementById("ml_reset");
  const out = document.getElementById("ml_ergebnis");

  if (!btn || !out) return;

  btn.addEventListener("click", () => {
    out.innerHTML = "";
    const errors = [];

    const brutto = n(bruttoInp);
    const vertrag = n(vertragInp);
    const real = n(realInp);

    if (brutto <= 0) errors.push("Bitte geben Sie Ihr monatliches Bruttogehalt ein.");
    if (vertrag <= 0) errors.push("Bitte geben Sie Ihre vertraglichen Wochenstunden ein.");
    if (real <= 0) errors.push("Bitte geben Sie Ihre tatsächlichen Wochenstunden ein.");
    
    // Logik-Check: Der Rechner ist auf das Aufdecken von *Mehrarbeit* ausgelegt.
    if (real < vertrag) {
      errors.push("Die tatsächliche Arbeitszeit ist geringer als die vertragliche. Dieser Rechner prüft auf unbezahlte Mehrarbeit. Bitte prüfen Sie Ihre Eingaben.");
    }

    if (errors.length > 0) {
      out.innerHTML = errorBox(errors);
      out.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    const res = berechneStundenlohn(brutto, vertrag, real);
    out.innerHTML = buildResult(res);
    out.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  if (reset) {
    reset.addEventListener("click", () => {
      out.innerHTML = "";
      if (bruttoInp) bruttoInp.value = "";
      if (vertragInp) vertragInp.value = "";
      if (realInp) realInp.value = "";
    });
  }
});