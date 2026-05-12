// gez-befreiung.js – Härtefall-Logik, PDF-Generator & Weiterleitung

// Hilfsfunktionen
function n(el){ if(!el) return 0; const raw=(el.value||"").toString().replace(",","."); const v=Number(raw); return Number.isFinite(v)?v:0; }

function errorBox(msgs){
  if (!msgs.length) return "";
  return `
    <div class="pflegegrad-result-card" style="border-left: 4px solid #e53935; padding: 15px; background: #fff3f3; margin-top: 20px;">
      <h3 style="margin-top: 0; color: #d32f2f;">Bitte prüfen Sie Ihre Eingaben:</h3>
      <ul style="margin-bottom: 0;">${msgs.map(m=>`<li>${m}</li>`).join("")}</ul>
    </div>
  `;
}

// Lade jsPDF Bibliothek dynamisch nach, falls noch nicht vorhanden
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

// Grund-Texte für den Brief (Ich-Form, keine Schrägstriche)
const gruendeText = {
  "buergergeld": "Bürgergeld nach dem Zweiten Buch Sozialgesetzbuch",
  "grundsicherung": "Grundsicherung nach dem Zwölften Buch Sozialgesetzbuch",
  "bafoeg": "BAföG oder Berufsausbildungsbeihilfe",
  "asyl": "Leistungen nach dem Asylbewerberleistungsgesetz",
  "pflege": "Pflegegeld nach landesgesetzlichen Vorschriften",
  "taubblind": "Blindenhilfe (beziehungsweise ich bin taubblind)"
};

// -------------------------------------------------------------------
// PDF-GENERIERUNG (DIN 5008 Standard)
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

  // Empfänger
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text("ARD ZDF Deutschlandradio", marginX, cursorY);
  doc.text("Beitragsservice", marginX, cursorY + 5);
  doc.text("50656 Köln", marginX, cursorY + 10);

  cursorY += 35; // Abstand zum Datum

  // Datum (rechtsbündig)
  const heute = new Date().toLocaleDateString("de-DE");
  doc.text(`Datum: ${heute}`, 185, cursorY, { align: "right" });

  cursorY += 15; // Abstand zum Betreff

  // Betreff (Fett)
  doc.setFont("helvetica", "bold");
  doc.text("Antrag auf Befreiung von der Rundfunkbeitragspflicht", marginX, cursorY);
  if (daten.nummer) {
    doc.text(`Beitragsnummer: ${daten.nummer}`, marginX, cursorY + 6);
    cursorY += 6;
  }

  cursorY += 15; // Abstand zur Anrede

  // Brieftext
  doc.setFont("helvetica", "normal");
  doc.text("Sehr geehrte Damen und Herren,", marginX, cursorY);
  cursorY += 10;

  let briefText = "";

  // Logik für den Textkörper
  if (daten.grund === "haertefall") {
    briefText = `hiermit beantrage ich die Befreiung von der Rundfunkbeitragspflicht als besonderer Härtefall gemäß Paragraph 4 Absatz 6 des Rundfunkbeitragsstaatsvertrages.\n\n` +
                `Mein Antrag auf Sozialleistungen wurde abgelehnt, da mein anrechenbares Einkommen die gesetzliche Bedarfsgrenze um lediglich ${daten.ueberschreitung.replace(".", ",")} Euro überschreitet. ` +
                `Da diese Überschreitung geringer ist als der monatliche Rundfunkbeitrag von 18,36 Euro, würde mich die Zahlung des Beitrags unter das gesetzliche Existenzminimum bringen.\n\n` +
                `Den entsprechenden Ablehnungsbescheid füge ich diesem Schreiben als Nachweis in Kopie bei.`;
  } else {
    briefText = `hiermit beantrage ich die Befreiung von der Rundfunkbeitragspflicht. \n\n` +
                `Ich beziehe derzeit ${gruendeText[daten.grund]}. Die gesetzlichen Voraussetzungen für eine Befreiung sind somit erfüllt.\n\n` +
                `Den entsprechenden aktuellen Bewilligungsbescheid füge ich diesem Schreiben als Nachweis in Kopie bei.`;
  }

  // Textumbruch (damit er nicht über den rechten Rand läuft)
  const textLines = doc.splitTextToSize(briefText, 160);
  doc.text(textLines, marginX, cursorY);

  cursorY += (textLines.length * 6) + 10;

  // Schlusssatz
  doc.text("Bitte bestätigen Sie mir die Befreiung schriftlich.", marginX, cursorY);
  cursorY += 10;
  
  doc.text("Mit freundlichen Grüßen", marginX, cursorY);
  cursorY += 15;
  
  // Platz für Unterschrift
  doc.text("__________________________________", marginX, cursorY);
  doc.setFontSize(9);
  doc.text(`(Unterschrift ${daten.name})`, marginX, cursorY + 5);

  // Download triggern
  doc.save("Antrag_GEZ_Befreiung.pdf");

  // WEITERLEITUNG ZUR DANKE-SEITE (Spenden)
  // Kurzer Timeout, damit der Download sicher startet
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
  const grundInp = document.getElementById("gez_grund");
  const haertefallContainer = document.getElementById("haertefall_container");
  const ueberschreitungInp = document.getElementById("gez_ueberschreitung");
  
  const nameInp = document.getElementById("gez_name");
  const adresseInp = document.getElementById("gez_adresse");
  const nummerInp = document.getElementById("gez_nummer");

  const btn = document.getElementById("gez_berechnen");
  const reset = document.getElementById("gez_reset");
  const out = document.getElementById("gez_ergebnis");

  if (!btn || !out) return;

  // Härtefall-Container einblenden, wenn ausgewählt
  grundInp.addEventListener("change", () => {
    if (grundInp.value === "haertefall") {
      haertefallContainer.style.display = "block";
    } else {
      haertefallContainer.style.display = "none";
      ueberschreitungInp.value = "";
    }
  });

  btn.addEventListener("click", () => {
    out.innerHTML = ""; // Fehler zurücksetzen
    const errors = [];

    // 1. Validierung: Grund
    const grund = grundInp.value;
    if (!grund) {
      errors.push("Bitte wählen Sie aus, warum Sie befreit werden möchten.");
    } else if (grund === "keines") {
      errors.push("Leider erfüllen Sie weder die Standard-Bedingungen noch liegt ein Härtefall vor. Eine Befreiung ist in Ihrem Fall rechtlich nicht vorgesehen.");
    }

    // 2. Validierung: Härtefall-Logik (Kern des Tools)
    let ueberschreitung = 0;
    if (grund === "haertefall") {
      ueberschreitung = n(ueberschreitungInp);
      if (ueberschreitung <= 0) {
        errors.push("Bitte geben Sie an, um welchen Betrag Ihr Bedarf überschritten wurde (siehe Ablehnungsbescheid).");
      } else if (ueberschreitung >= 18.36) {
        errors.push(`Ihr Einkommen übersteigt den Bedarf um ${ueberschreitung.toFixed(2).replace(".", ",")} €. Da dieser Betrag höher ist als der Rundfunkbeitrag (18,36 €), greift die Härtefall-Regelung nach § 4 Abs. 6 RBStV leider nicht.`);
      }
    }

    // 3. Validierung: Persönliche Daten für das PDF
    const name = (nameInp.value || "").trim();
    const adresse = (adresseInp.value || "").trim();
    if (!name || !adresse) {
      errors.push("Um das Anschreiben generieren zu können, benötigen wir Ihren Namen und Ihre Adresse.");
    }

    // Wenn Fehler da sind, ausgeben und abbrechen
    if (errors.length > 0){
      out.innerHTML = errorBox(errors);
      out.scrollIntoView({ behavior: "smooth" });
      return;
    }

    // Keine Fehler? Dann Buttontext ändern als visuelles Feedback und PDF laden
    const originalText = btn.innerText;
    btn.innerText = "Dokument wird erstellt...";
    btn.disabled = true;

    const daten = {
      grund: grund,
      ueberschreitung: ueberschreitung.toFixed(2),
      name: name,
      adresse: adresse,
      nummer: (nummerInp.value || "").trim()
    };

    // PDF Skript laden, generieren und dann weiterleiten
    loadJsPDF(() => {
      generierePDF(daten);
      
      // Fallback, falls die Weiterleitung aus irgendeinem Grund blockiert wird
      out.innerHTML = `
        <div style="background: #e8f5e9; border: 1px solid #c8e6c9; padding: 20px; border-radius: 6px; margin-top: 30px; text-align: center;">
          <h3 style="margin-top: 0; color: #2e7d32;">✅ Ihr Anschreiben wurde erfolgreich generiert!</h3>
          <p>Der Download sollte automatisch gestartet sein. Sie werden nun weitergeleitet...</p>
         
          
        </div>
      `;
      out.scrollIntoView({ behavior: "smooth" });
      
      // Button nach 3 Sekunden zurücksetzen (falls User per Zurück-Button auf die Seite kommt)
      setTimeout(() => {
        btn.innerText = originalText;
        btn.disabled = false;
      }, 3000);
    });
  });

  if (reset) {
    reset.addEventListener("click", () => {
      haertefallContainer.style.display = "none";
      setTimeout(() => { out.innerHTML = ""; }, 0);
    });
  }
});