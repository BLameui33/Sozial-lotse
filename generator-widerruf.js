// generator-widerruf.js
// Erstellt ein PDF für Widerruf & Anfechtung

// Hilfsfunktion: Umschalten des Textfeldes für Täuschung
window.toggleTaeuschung = function() {
    const box = document.getElementById("boxTaeuschung");
    const check = document.getElementById("checkAnfechtung");
    box.style.display = check.checked ? "block" : "none";
};

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("widerrufForm");
    
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const btn = form.querySelector(".button-primary");
        const originalText = btn.innerText;
        btn.innerText = "Erstelle PDF...";
        btn.disabled = true;

        try {
            await generateRevocationPDF();
        } catch (err) {
            console.error(err);
            alert("Fehler: Bitte nutzen Sie einen modernen Browser (Chrome/Firefox/Safari).");
        } finally {
            btn.innerText = originalText;
            btn.disabled = false;
        }
    });
});

async function generateRevocationPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
    });

    // --- DATEN ---
    const absName = document.getElementById("absenderName").value;
    const absAdresse = document.getElementById("absenderAdresse").value;
    const absPlzOrt = document.getElementById("absenderPlzOrt").value;
    
    const empfName = document.getElementById("empfaengerName").value;
    const empfAdresse = document.getElementById("empfaengerAdresse").value;
    
    const vertragsArt = document.getElementById("vertragsArt").value;
    const datumVertrag = document.getElementById("datumVertrag").value;
    const kundenNr = document.getElementById("kundennummer").value;
    
    const withAnfechtung = document.getElementById("checkAnfechtung").checked;
    const grundTaeuschung = document.getElementById("grundTaeuschung").value;
    const jokerBelehrung = document.getElementById("checkBelehrung").checked;
    
    const withSEPA = document.getElementById("checkSEPA").checked;
    const withDaten = document.getElementById("checkDaten").checked;
    const withWerbung = document.getElementById("checkWerbung").checked;

    // Datum heute
    const today = new Date().toLocaleDateString("de-DE", {
        year: "numeric", month: "2-digit", day: "2-digit"
    });
    const vertragDatumFmt = new Date(datumVertrag).toLocaleDateString("de-DE");

    // --- LAYOUT ---
    const leftMargin = 25;
    let yPos = 25;

    // Absender
    doc.setFontSize(10);
    doc.text(`${absName}, ${absAdresse}, ${absPlzOrt}`, leftMargin, yPos);
    yPos += 25;

    // Empfänger
    doc.setFontSize(11);
    doc.text(empfName, leftMargin, yPos); yPos += 5;
    const splitEmpf = doc.splitTextToSize(empfAdresse, 80);
    doc.text(splitEmpf, leftMargin, yPos);
    
    // Datum rechts
    yPos += 30;
    doc.text(`${absPlzOrt.split(' ')[1] || "Ort"}, den ${today}`, 140, yPos);

    // Betreff
    yPos += 15;
    doc.setFont("helvetica", "bold");
    let betreff = `Widerruf meines Vertrags`;
    if (withAnfechtung) betreff += ` und vorsorgliche Anfechtung`;
    if (kundenNr) betreff += ` (Nr.: ${kundenNr})`;
    
    doc.text(betreff, leftMargin, yPos);
    yPos += 10;
    doc.setFont("helvetica", "normal");

    // Textkörper bauen
    let text = `Sehr geehrte Damen und Herren,

hiermit widerrufe ich den von mir abgeschlossenen Vertrag (${vertragsArt}) vom ${vertragDatumFmt} sowie alle damit zusammenhängenden Vereinbarungen fristgerecht nach § 355 BGB.`;

    // Zusatz Anfechtung (Die "Waffe")
    if (withAnfechtung) {
        text += `\n\nHilfsweise erkläre ich die Anfechtung des Vertrags wegen arglistiger Täuschung (§ 123 BGB) sowie wegen Irrtums (§ 119 BGB).`;
        if (grundTaeuschung) {
            text += `\nBegründung: ${grundTaeuschung}`;
        } else {
            text += `\nBegründung: Ich wurde über wesentliche Eigenschaften des Vertrags getäuscht bzw. über den eigentlichen Vertragscharakter im Unklaren gelassen.`;
        }
    }

    // Zusatz Joker (Belehrung)
    if (jokerBelehrung) {
        text += `\n\nDa mir bei Vertragsschluss keine ordnungsgemäße Widerrufsbelehrung in Textform ausgehändigt wurde, hat die Widerrufsfrist noch nicht zu laufen begonnen.`;
    }

    // Zusatz SEPA
    if (withSEPA) {
        text += `\n\nEine eventuell erteilte Einzugsermächtigung (SEPA-Lastschriftmandat) widerrufe ich hiermit mit sofortiger Wirkung. Ich untersage Ihnen ausdrücklich weitere Abbuchungen von meinem Konto.`;
    }

    // Zusatz Daten & Werbung
    let privacyText = "";
    if (withWerbung) privacyText += "Ferner widerspreche ich der Nutzung meiner Daten zu Werbezwecken. ";
    if (withDaten) privacyText += "Ich fordere Sie auf, meine personenbezogenen Daten unverzüglich zu löschen und mir dies zu bestätigen.";
    
    if (privacyText) text += `\n\n${privacyText}`;

    // Abschluss
    text += `\n\nBitte senden Sie mir eine schriftliche Bestätigung des Widerrufs sowie des Vertragsendes in den nächsten Tagen zu.

Mit freundlichen Grüßen

(Unterschrift)

${absName}`;

    // PDF schreiben
    doc.setFontSize(11);
    const splitText = doc.splitTextToSize(text, 160);
    doc.text(splitText, leftMargin, yPos);

    // Datei speichern
    doc.save(`Widerruf_${empfName.replace(/[^a-z0-9]/gi, '_').substring(0,10)}.pdf`);
}