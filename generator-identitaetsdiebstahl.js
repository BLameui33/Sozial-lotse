// generator-identitaetsdiebstahl.js
// Erstellt ein PDF für den Widerspruch bei Identitätsdiebstahl

// Hilfsfunktion: Umschalten der Anzeige-Details
window.toggleAnzeigeInput = function(show) {
    const el = document.getElementById("anzeigeDetails");
    if (el) {
        el.style.display = show ? "block" : "none";
    }
};

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("idTheftForm");
    
    // Default Datum setzen (heute)
    document.getElementById("datumBrief").valueAsDate = new Date();

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        // Button Feedback
        const btn = form.querySelector(".button-primary");
        const originalText = btn.innerText;
        btn.innerText = "Erstelle PDF...";
        btn.disabled = true;

        try {
            await generatePDF();
        } catch (err) {
            console.error(err);
            alert("Fehler bei der PDF-Erstellung. Bitte nutzen Sie einen aktuellen Browser.");
        } finally {
            btn.innerText = originalText;
            btn.disabled = false;
        }
    });
});

async function generatePDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
    });

    // --- DATEN AUSLESEN ---
    const absName = document.getElementById("absenderName").value;
    const absAdresse = document.getElementById("absenderAdresse").value;
    const absPlzOrt = document.getElementById("absenderPlzOrt").value;
    
    const empfName = document.getElementById("empfaengerName").value;
    const empfAdresse = document.getElementById("empfaengerAdresse").value;
    
    const aktenzeichen = document.getElementById("aktenzeichen").value;
    const datumBrief = document.getElementById("datumBrief").value;
    
    // Datum formatieren
    const today = new Date().toLocaleDateString("de-DE", {
        year: "numeric", month: "2-digit", day: "2-digit"
    });
    
    // Anzeige Status
    const hatAnzeige = document.querySelector('input[name="anzeigeStatus"]:checked').value === "ja";
    const polizeiAz = document.getElementById("polizeiAktenzeichen").value;

    // Optionen
    const schufa = document.getElementById("schufaCheck").checked;
    const nachweis = document.getElementById("nachweisCheck").checked;

    // --- LAYOUT ---
    const leftMargin = 25;
    let yPos = 20;
    const lineHeight = 6;

    // 1. Absender (Klein oben) - optional auch groß rechtsbündig
    doc.setFontSize(10);
    doc.text(`${absName}, ${absAdresse}, ${absPlzOrt}`, leftMargin, yPos);
    yPos += 20;

    // 2. Empfängerfeld
    doc.setFontSize(11);
    doc.text(empfName, leftMargin, yPos); yPos += 5;
    
    // Adresse mehrzeilig splitten
    const splitAdresse = doc.splitTextToSize(empfAdresse, 80);
    doc.text(splitAdresse, leftMargin, yPos);
    
    // Datum rechts
    yPos += 30;
    doc.text(`${absPlzOrt.split(' ')[1] || "Ort"}, den ${today}`, 140, yPos);

    // 3. Betreff
    yPos += 15;
    doc.setFont("helvetica", "bold");
    doc.text(`Widerspruch gegen Forderung / Identitätsdiebstahl`, leftMargin, yPos);
    yPos += 6;
    doc.setFont("helvetica", "normal");
    doc.text(`Ihr Zeichen / Rechnungsnr.: ${aktenzeichen}`, leftMargin, yPos);
    doc.text(`Ihr Schreiben vom: ${new Date(datumBrief).toLocaleDateString("de-DE")}`, leftMargin, yPos + 6);
    
    // 4. Haupttext
    yPos += 20;
    doc.setFontSize(11);
    
    let text = `Sehr geehrte Damen und Herren,

hiermit widerspreche ich der oben genannten Forderung vollumfänglich.

Ich habe zu keinem Zeitpunkt eine Bestellung bei Ihnen getätigt oder einen entsprechenden Vertrag abgeschlossen. Offensichtlich haben Dritte meine persönlichen Daten missbräuchlich verwendet (Identitätsdiebstahl), um Waren oder Dienstleistungen auf meinen Namen zu bestellen.

Die geltend gemachte Forderung entbehrt daher jeder vertraglichen Grundlage.`;

    // Anzeige-Absatz
    if (hatAnzeige) {
        text += `\n\nIch habe den Vorfall bereits bei der Polizei zur Anzeige gebracht.`;
        if (polizeiAz) {
            text += ` Das Aktenzeichen lautet: ${polizeiAz}. Eine Kopie der Bestätigung liegt diesem Schreiben bei (falls vorhanden).`;
        } else {
            text += ` Das Aktenzeichen reiche ich nach, sobald es mir vorliegt.`;
        }
    } else {
        text += `\n\nIch werde diesen Vorfall umgehend bei der Polizei zur Anzeige bringen und Ihnen das Aktenzeichen unaufgefordert nachreichen.`;
    }
    
    // Forderungen (Schufa & Nachweise)
    if (nachweis) {
        text += `\n\nZudem fordere ich Sie auf, mir umgehend Nachweise über den angeblichen Vertragsschluss zukommen zu lassen (z.B. Bestellbestätigung, IP-Adresse, Liefernachweis mit Unterschrift).`;
    }

    if (schufa) {
        text += `\n\nDa die Forderung hiermit ausdrücklich bestritten ist, weise ich vorsorglich darauf hin, dass eine Übermittlung meiner Daten an Auskunfteien (wie SCHUFA) unzulässig ist (§ 31 BDSG). Ich fordere Sie auf, eventuell bereits erfolgte Einträge sofort zu löschen.`;
    }

    // Abschluss
    text += `\n\nIch erwarte Ihre schriftliche Bestätigung, dass die Forderung gegen mich storniert wurde, bis zum ${getFristDatum()}. Sollten Sie die Forderung aufrechterhalten, werde ich juristische Schritte einleiten.

Mit freundlichen Grüßen

(Unterschrift)

${absName}`;

    // Text umbrechen
    const splitText = doc.splitTextToSize(text, 160); // 160mm Breite
    doc.text(splitText, leftMargin, yPos);

    // PDF speichern
    doc.save(`Widerspruch_Identitaetsdiebstahl_${aktenzeichen.replace(/[^a-z0-9]/gi, '_')}.pdf`);
}

// Datum in 14 Tagen berechnen
function getFristDatum() {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toLocaleDateString("de-DE");
}