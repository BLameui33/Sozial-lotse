// mindestlohn-rechner.js – Echten Stundenlohn & Lohnraub berechnen

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
// DATENGRUNDLAGE
// -------------------------------------------------------------------
const MINDESTLOHN_AKTUELL = 13.90;
const MINDESTLOHN_2027 = 14.60;

// Arbeitsrechtliche Konstante: Ein Monat hat durchschnittlich 4,333 Wochen (13 Wochen / 3 Monate)
const WOCHEN_PRO_MONAT = 13 / 3; 

// -------------------------------------------------------------------
// KERN-LOGIK: Berechnung des Stundenlohns
// -------------------------------------------------------------------
function berechneStundenlohn(brutto, stundenVertrag, stundenReal) {
  // Arbeitsrechtliche Formel: (Monatsbrutto * 3) / 13 / Wochenstunden
  const lohnVertrag = (brutto * 3) / 13 / stundenVertrag;
  const lohnReal = (brutto * 3) / 13 / stundenReal;

  const differenzStunden = stundenReal - stundenVertrag;
  let wertUnbezahltMonat = 0;

  if (differenzStunden > 0) {
    // Wert der unbezahlten Arbeit im Monat (auf Basis des vertraglichen Lohns)
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
    // Schlimmster Fall: Effektiver Lohn unter Mindestlohn
    alarmBox = `
      <div style="background: #ffebee; border: 1px solid #e53935; padding: 15px; border-radius: 6px; margin-bottom: 25px;">
        <h3 style="margin-top: 0; color: #c62828; font-size: 1.15rem;">🚨 Lohnraub erkannt! Mindestlohn unterschritten</h3>
        <p style="margin-bottom: 10px; font-size: 0.95rem; color: #333;">
          Achtung: Durch Ihre unbezahlte Mehrarbeit (z.B. Rüstzeiten, Überstunden) rutscht Ihr effektiver Stundenlohn auf <strong>${euro(res.lohnReal)}</strong>. Das ist illegal! Der gesetzliche Mindestlohn liegt bei zwingend <strong>${euro(MINDESTLOHN_AKTUELL)}</strong> pro Stunde.
        </p>
        <p style="margin-bottom: 0; font-size: 0.95rem; font-weight: bold; color: #c62828;">
          Tipp: Dokumentieren Sie Ihre Arbeitszeiten genau. Sie können den Lohn rückwirkend einfordern.
        </p>
      </div>
    `;
  } else if (res.differenzStunden > 0) {
    // Fall 2: Mehrarbeit, aber noch über Mindestlohn
    alarmBox = `
      <div style="background: #fff3e0; border: 1px solid #ff9800; padding: 15px; border-radius: 6px; margin-bottom: 25px;">
        <h3 style="margin-top: 0; color: #e65100; font-size: 1.15rem;">⚠️ Unbezahlte Arbeit entlarvt</h3>
        <p style="margin-bottom: 0; font-size: 0.95rem; color: #333;">
          Ihr Stundenlohn bleibt zwar mit ${euro(res.lohnReal)} knapp über dem gesetzlichen Mindestlohn (${euro(MINDESTLOHN_AKTUELL)}), aber Sie verschenken durch unbezahlte Mehrarbeit jeden Monat bares Geld an Ihren Arbeitgeber!
        </p>
      </div>
    `;
  } else {
    // Fall 3: Alles korrekt
    alarmBox = `
      <div style="background: #e8f5e9; border: 1px solid #4caf50; padding: 15px; border-radius: 6px; margin-bottom: 25px;">
        <h3 style="margin-top: 0; color: #2e7d32; font-size: 1.15rem;">✅ Alles im grünen Bereich</h3>
        <p style="margin-bottom: 0; font-size: 0.95rem; color: #333;">
          Ihre bezahlte Zeit entspricht Ihrer gearbeiteten Zeit. Ihr Stundenlohn liegt bei ${euro(res.lohnVertrag)} und erfüllt die gesetzlichen Vorgaben.
        </p>
      </div>
    `;
  }

  // Box für den entgangenen Lohn (nur wenn es eine Differenz gibt)
  let verlustBox = "";
  if (res.differenzStunden > 0) {
    verlustBox = `
      <div style="background: white; padding: 15px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-top: 15px; border-left: 4px solid #d32f2f;">
        <p style="margin: 0; font-size: 0.9rem; color: #666;">Wert Ihrer unbezahlten Arbeit (Verlust pro Monat):</p>
        <p style="font-size: 1.6rem; color: #d32f2f; font-weight: bold; margin: 5px 0 0 0;">
          - ${euro(res.wertUnbezahltMonat)}
        </p>
        <p style="font-size: 0.8rem; color: #888; margin-top: 5px;">
          (Bei ${res.differenzStunden.toString().replace(".", ",")} unbezahlten Stunden pro Woche)
        </p>
      </div>
    `;
  }

  return `
    <div style="border: 2px solid #2196f3; border-radius: 8px; padding: 20px; margin-top: 30px; background: #fafafa;">
      <h2 style="margin-top: 0; color: #0d47a1;">Ihr Ergebnis</h2>
      
      ${alarmBox}

      <div style="display: grid; gap: 15px; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">
        <div style="background: white; padding: 15px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); text-align: center;">
          <p style="margin: 0; font-size: 0.9rem; color: #666;">Stundenlohn auf dem Papier:</p>
          <p style="font-size: 1.8rem; color: #1976d2; font-weight: bold; margin: 5px 0;">
            ${euro(res.lohnVertrag)}
          </p>
          <p style="margin: 0; font-size: 0.8rem; color: #888;">(Laut Vertrag)</p>
        </div>

        <div style="background: white; padding: 15px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); text-align: center;">
          <p style="margin: 0; font-size: 0.9rem; color: #666;">Ihr <strong>echter</strong> Stundenlohn:</p>
          <p style="font-size: 1.8rem; color: ${res.unterMindestlohn ? '#d32f2f' : '#2e7d32'}; font-weight: bold; margin: 5px 0;">
            ${euro(res.lohnReal)}
          </p>
          <p style="margin: 0; font-size: 0.8rem; color: #888;">(Effektiv pro Stunde)</p>
        </div>
      </div>

      ${verlustBox}

      <div style="font-size: 0.9rem; color: #555; background: #e3f2fd; padding: 15px; border-radius: 6px; margin-top: 20px;">
        <strong>Ausblick 2027:</strong> Im Januar 2027 wird der gesetzliche Mindestlohn auf <strong>${euro(MINDESTLOHN_2027)}</strong> angehoben. Ihr Arbeitgeber ist dann verpflichtet, Ihr Gehalt entsprechend anzupassen, falls Ihr Lohn darunter fallen sollte.
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
    if (real < vertrag) errors.push("Die tatsächliche Arbeitszeit kann hier nicht kleiner als die vertragliche sein.");

    if (errors.length > 0){
      out.innerHTML = errorBox(errors);
      out.scrollIntoView({ behavior: "smooth" });
      return;
    }

    const res = berechneStundenlohn(brutto, vertrag, real);
    out.innerHTML = buildResult(res);
    out.scrollIntoView({ behavior: "smooth" });
  });

  if (reset) {
    reset.addEventListener("click", () => {
      setTimeout(() => { out.innerHTML = ""; }, 0);
    });
  }
});