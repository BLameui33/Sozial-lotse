// schufa-loeschen.js – Lösch-Logik, DSGVO-Check & PDF-Generator

// Hilfsfunktionen
function errorBox(msgs, isWarning = false) {
  if (!msgs.length) return "";
  const color = isWarning ? "#ed6c02" : "#d32f2f";
  const bg = isWarning ? "#fff3e0" : "#fff3f3";
  const border = isWarning ? "#ff9800" : "#e53935";
  const titel = isWarning ? "Hinweis zur Rechtslage:" : "Bitte prüfen Sie Ihre Eingaben:";
  
  return `
    <div class="pflegegrad-result-card" style="border-left: 4px solid ${border}; padding: 15px; background: ${bg}; margin-top: 20px;">
      <h3 style="margin-top: 0; color: ${color};">${titel}</h3>
      <ul style="margin-bottom: 0; font-size: 0.95rem; line-height: 1.5;">${msgs.map(m=>`<li>${m}</li>`).join("")}</ul>
    </div>
  `;
}

// Lade jsPDF Bibliothek dynamisch nach
function loadJsPDF(callback) {
  if (window.jspdf) {
    callback();
    return;
  }
  const script = document.createElement("script");
  script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
  script.onload = () => callback();
  document.head.appendChild(script);
}

// -------------------------------------------------------------------
// PDF-GENERIERUNG (DIN 5008 Standard, DSGVO Art. 17)
// -------------------------------------------------------------------
function generierePDF(daten) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const marginX = 25;
  let cursorY = 50;

  // Absender klein über dem Empfänger (Sichtfenster-Zeile)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  const absenderKlein = `${daten.name} - ${daten.adresse}`;
  doc.text(absenderKlein, marginX, cursorY);
  
  cursorY += 5; // Abstand zum Empfänger

  // Empfänger (Schufa Holding AG)
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text("SCHUFA Holding AG", marginX, cursorY);
  doc.text("Postfach 10 34 41", marginX, cursorY + 5);
  doc.text("50474 Köln", marginX, cursorY + 10);

  cursorY += 35; // Abstand zum Datum

  // Datum (rechtsbündig)
  const heute = new Date().toLocaleDateString("de-DE");
  doc.text(`Datum: ${heute}`, 185, cursorY, { align: "right" });

  cursorY += 15; // Abstand zum Betreff

  // Betreff (Fett)
  doc.setFont("helvetica", "bold");
  doc.text("Antrag auf Datenlöschung nach Artikel 17 DSGVO", marginX, cursorY);
  doc.setFont("helvetica", "normal");
  doc.text(`Zur eindeutigen Identifikation: Geburtsdatum ${daten.geburtsdatum}`, marginX, cursorY + 6);
  cursorY += 15; 

  // Brieftext
  doc.text("Sehr geehrte Damen und Herren,", marginX, cursorY);
  cursorY += 10;

  let briefText = "";

  // Textbausteine je nach Grund (Ich-Form, keine Schrägstriche)
  if (daten.art === "insolvenz") {
    briefText = `hiermit fordere ich Sie auf, den Eintrag über meine Restschuldbefreiung in meinem Datenbestand unverzüglich zu löschen.\n\n` +
                `Gemäß dem Urteil des Europäischen Gerichtshofs vom 7. Dezember 2023 (Rechtssache C-26/22) ist eine Speicherung der Restschuldbefreiung für mehr als sechs Monate unzulässig. Da meine Restschuldbefreiung vor mehr als sechs Monaten erteilt wurde, besteht keine Rechtsgrundlage mehr für die weitere Verarbeitung dieser Daten.\n\n` +
                `Ich berufe mich auf mein Recht auf Löschung (Recht auf Vergessenwerden) aus Artikel 17 der Datenschutzgrundverordnung.`;
  } else if (daten.art === "falsch") {
    briefText = `hiermit fordere ich Sie auf, den negativen Eintrag in meinem Datenbestand unverzüglich zu löschen und meinen Basis-Score entsprechend zu korrigieren.\n\n` +
                `Der eingetragene Sachverhalt ist sachlich falsch und die Forderung unberechtigt. Die Speicherung dieser unzutreffenden Daten verletzt meine Rechte massiv. Eine weitere Verarbeitung ist rechtlich nicht zulässig.\n\n` +
                `Ich mache hiermit mein Recht auf Löschung nach Artikel 17 der Datenschutzgrundverordnung geltend.`;
  } else if (daten.art === "bezahlt_klein") {
    briefText = `hiermit bitte ich um die sofortige Löschung des Eintrags über eine beglichene Forderung in meinem Datenbestand.\n\n` +
                `Es handelt sich um eine Summe von unter 1.000 Euro, die ich zügig und vollständig beglichen habe. Nach den Verhaltensregeln der Auskunfteien sind die Voraussetzungen für eine vorzeitige Löschung dieses Eintrags damit erfüllt.\n\n` +
                `Ich bitte Sie, meinen Basis-Score nach der Löschung umgehend neu zu berechnen.`;
  } else if (daten.art === "bezahlt_normal") {
    briefText = `hiermit fordere ich Sie auf, den Eintrag über meine beglichene Forderung (Erledigungsvermerk) unverzüglich zu löschen.\n\n` +
                `Die zugrundeliegende Schuld wurde vor mehr als drei Jahren vollständig bezahlt. Die reguläre, taggenaue Speicherfrist von drei Jahren nach Erledigung ist somit abgelaufen. Eine weitere Speicherung ist rechtlich nicht mehr zulässig.\n\n` +
                `Ich mache von meinem Recht auf Löschung nach Artikel 17 der Datenschutzgrundverordnung Gebrauch.`;
  }

  // Textumbruch
  const textLines = doc.splitTextToSize(briefText, 160);
  doc.text(textLines, marginX, cursorY);

  cursorY += (textLines.length * 6) + 10;

  // Schlusssatz
  const schlussText = `Ich erwarte Ihre schriftliche Bestätigung über die erfolgreiche Löschung innerhalb der gesetzlichen Frist von vier Wochen.`;
  const schlussLines = doc.splitTextToSize(schlussText, 160);
  doc.text(schlussLines, marginX, cursorY);
  
  cursorY += (schlussLines.length * 6) + 10;
  
  doc.text("Mit freundlichen Grüßen", marginX, cursorY);
  cursorY += 15;
  
  // Platz für Unterschrift
  doc.text("__________________________________", marginX, cursorY);
  doc.setFontSize(9);
  doc.text(`(Unterschrift ${daten.name})`, marginX, cursorY + 5);

  // Download triggern
  doc.save("Schufa_Loeschantrag_DSGVO.pdf");

  // WEITERLEITUNG ZUR DANKE-SEITE
  // POPUP ÖFFNEN
  setTimeout(() => {
    const popup = document.getElementById("spendenPopup");
    if (popup) {
      popup.style.display = "flex";
    }
  }, 1500);
}

// -------------------------------------------------------------------
// INITIALISIERUNG & EVENT LISTENER
// -------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  const artInp = document.getElementById("schufa_art");
  const zeitContainer = document.getElementById("zeit_container");
  const zeitInp = document.getElementById("schufa_zeit");
  
  const nameInp = document.getElementById("schufa_name");
  const geburtsdatumInp = document.getElementById("schufa_geburtsdatum");
  const adresseInp = document.getElementById("schufa_adresse");

  const btn = document.getElementById("schufa_berechnen");
  const reset = document.getElementById("schufa_reset");
  const out = document.getElementById("schufa_ergebnis");

  if (!btn || !out) return;

  // Zeit-Abfrage nur einblenden, wenn Fristen relevant sind
  artInp.addEventListener("change", () => {
    const art = artInp.value;
    if (art === "insolvenz" || art === "bezahlt_normal") {
      zeitContainer.style.display = "block";
    } else {
      zeitContainer.style.display = "none";
      zeitInp.value = ""; // Reset
    }
  });

  btn.addEventListener("click", () => {
    out.innerHTML = ""; 
    const errors = [];
    const warnings = [];

    const art = artInp.value;
    const zeit = zeitInp.value;

    // 1. Validierung: Grund & harte Rechts-Logik
    if (!art) {
      errors.push("Bitte wählen Sie aus, um was für einen Eintrag es sich handelt.");
    } else {
      
      // Logik-Check: Gibt es überhaupt ein Recht auf Löschung?
      if (art === "unbezahlt") {
        warnings.push("Sie haben leider noch keinen Anspruch auf Löschung. Solange eine berechtigte Forderung offen ist, darf die Schufa diese speichern. Zahlen Sie die Schuld zuerst, erst dann beginnt die Löschfrist.");
      }
      
      if (art === "insolvenz") {
        if (!zeit) {
          errors.push("Bitte geben Sie an, wie lange die Restschuldbefreiung her ist.");
        } else if (zeit === "unter_6") {
          warnings.push("Die Restschuldbefreiung darf nach aktuellem EuGH-Urteil für 6 Monate in der Schufa stehen. Da diese Frist bei Ihnen noch nicht abgelaufen ist, würde ein Löschantrag aktuell abgelehnt werden. Bitte warten Sie den Ablauf der 6 Monate ab.");
        }
      }

      if (art === "bezahlt_normal") {
        if (!zeit) {
          errors.push("Bitte geben Sie an, wann Sie die Schuld komplett abbezahlt haben.");
        } else if (zeit === "unter_6" || zeit === "ueber_6") {
          warnings.push("Ein normaler 'Erledigungsvermerk' bleibt in der Regel taggenau 3 Jahre lang nach der Bezahlung stehen. Da diese 3 Jahre bei Ihnen noch nicht abgelaufen sind, haben Sie leider keinen gesetzlichen Anspruch auf eine vorzeitige Löschung.");
        }
      }
    }

    // Wenn Warnungen da sind (Recht auf Löschung existiert nicht), abbrechen und aufklären!
    if (warnings.length > 0) {
      out.innerHTML = errorBox(warnings, true); // true = Oranges Info-Design
      out.scrollIntoView({ behavior: "smooth" });
      return;
    }

    // 2. Validierung: Persönliche Daten für das PDF
    const name = (nameInp.value || "").trim();
    const geburtsdatum = (geburtsdatumInp.value || "").trim();
    const adresse = (adresseInp.value || "").trim();
    
    if (!name || !geburtsdatum || !adresse) {
      errors.push("Wir benötigen Ihren Namen, das Geburtsdatum und die Adresse, damit die Schufa den Eintrag Ihnen eindeutig zuordnen kann.");
    }

    if (errors.length > 0){
      out.innerHTML = errorBox(errors, false); // false = Rotes Fehler-Design
      out.scrollIntoView({ behavior: "smooth" });
      return;
    }

    // Erfolgsfall: PDF generieren
    const originalText = btn.innerText;
    btn.innerText = "DSGVO-Antrag wird erstellt...";
    btn.disabled = true;

    const daten = {
      art: art,
      name: name,
      geburtsdatum: geburtsdatum,
      adresse: adresse
    };

    loadJsPDF(() => {
      generierePDF(daten);
      
      out.innerHTML = `
        <div style="background: #e8f5e9; border: 1px solid #c8e6c9; padding: 20px; border-radius: 6px; margin-top: 30px; text-align: center;">
          <h3 style="margin-top: 0; color: #2e7d32;">✅ Ihr Löschantrag wurde erfolgreich generiert!</h3>
          <p>Das PDF wird nun heruntergeladen. Drucken Sie es aus, unterschreiben Sie es und senden Sie es am besten per Einwurf-Einschreiben an die Schufa.</p>
          
        </div>
      `;
      out.scrollIntoView({ behavior: "smooth" });
      
      setTimeout(() => {
        btn.innerText = originalText;
        btn.disabled = false;
      }, 3000);
    });
  });

  if (reset) {
    reset.addEventListener("click", () => {
      zeitContainer.style.display = "none";
      setTimeout(() => { out.innerHTML = ""; }, 0);
    });
  }
});