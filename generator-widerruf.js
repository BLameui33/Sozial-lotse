// generator-widerruf.js
// Erstellt ein PDF für Widerruf & Anfechtung

// Hilfsfunktion: Umschalten des Textfeldes für Täuschung
window.toggleTaeuschung = function() {
    const box = document.getElementById("boxTaeuschung");
    const check = document.getElementById("checkAnfechtung");
    if(box && check) {
        box.style.display = check.checked ? "block" : "none";
    }
};

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("widerrufForm");
    if (!form) return;
    
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
            alert("Fehler beim Erstellen des PDFs. Bitte Konsolenausgabe prüfen.");
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

    // --- HELFER FÜR SICHERES AUSLESEN (Mit Debug-Warnung) ---
    const getVal = (id) => {
        const el = document.getElementById(id);
        if (!el) { console.warn(`⚠️ [PDF-Fehler] Feld mit ID "${id}" wurde im HTML nicht gefunden!`); return ""; }
        return el.value?.trim() || "";
    };
    const getChk = (id) => {
        const el = document.getElementById(id);
        if (!el) { console.warn(`⚠️ [PDF-Fehler] Checkbox mit ID "${id}" wurde im HTML nicht gefunden!`); return false; }
        return el.checked || false;
    };

    // --- DATEN ---
    const absName = getVal("absenderName");
    const absAdresse = getVal("absenderAdresse");
    const absPlzOrt = getVal("absPlzOrt");
    
    const empfName = getVal("empfaengerName");
    const empfAdresse = getVal("empfaengerAdresse");
    
    const vertragsArt = getVal("vertragsArt");
    const datumVertrag = getVal("datumVertrag");
    const kundenNr = getVal("kundennummer");
    
    const withAnfechtung = getChk("checkAnfechtung");
    const grundTaeuschung = getVal("grundTaeuschung");
    const jokerBelehrung = getChk("checkBelehrung");
    
    const withSEPA = getChk("checkSEPA");
    const withDaten = getChk("checkDaten");
    const withWerbung = getChk("checkWerbung");

    // Datum heute
    const today = new Date().toLocaleDateString("de-DE", {
        year: "numeric", month: "2-digit", day: "2-digit"
    });
    const vertragDatumFmt = datumVertrag ? new Date(datumVertrag).toLocaleDateString("de-DE") : "unbekannt";

    // --- LAYOUT KONSTANTEN ---
    const leftMargin = 25;
    const rightMargin = 185; 
    const pageHeight = doc.internal.pageSize.getHeight(); // 297mm (A4 Höhe)
    let yPos = 20;

    // --- BRIEFKOPF ---
    
    // 1. Absenderzeile
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    const absenderZeile = `${absName} · ${absAdresse} · ${absPlzOrt}`;
    doc.text(absenderZeile, leftMargin, yPos);
    
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(leftMargin, yPos + 2, leftMargin + 85, yPos + 2);
    
    // 2. Datum (etwas kompakter)
    yPos = 32;
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    const ort = absPlzOrt.split(' ')[1] || "Ort";
    doc.text(`${ort}, den ${today}`, rightMargin, yPos, { align: "right" });

    // 3. Empfänger (Kompakter: 38mm statt 50mm)
    yPos = 38;
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(empfName, leftMargin, yPos); 
    yPos += 5;
    const splitEmpf = doc.splitTextToSize(empfAdresse, 80);
    doc.text(splitEmpf, leftMargin, yPos);
    
    yPos += (splitEmpf ? splitEmpf.length * 5 : 0) + 15;

    // --- BETREFF ---
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    let betreff = `Widerruf meines Vertrags`;
    if (withAnfechtung) betreff += ` und vorsorgliche Anfechtung`;
    if (kundenNr) betreff += ` (Nr.: ${kundenNr})`;
    
    doc.text(betreff, leftMargin, yPos);
    yPos += 10;
    doc.setFont("helvetica", "normal");

    // --- TEXTKÖRPER ---
    let text = `Sehr geehrte Damen und Herren,\n\nhiermit widerrufe ich den von mir abgeschlossenen Vertrag (${vertragsArt}) vom ${vertragDatumFmt} sowie alle damit zusammenhängenden Vereinbarungen fristgerecht nach § 355 BGB.`;

    if (withAnfechtung) {
        text += `\n\nHilfsweise erkläre ich die Anfechtung des Vertrags wegen arglistiger Täuschung (§ 123 BGB) sowie wegen Irrtums (§ 119 BGB).`;
        if (grundTaeuschung) {
            text += `\nBegründung: ${grundTaeuschung}`;
        } else {
            text += `\nBegründung: Ich wurde über wesentliche Eigenschaften des Vertrags getäuscht bzw. über den eigentlichen Vertragscharakter im Unklaren gelassen.`;
        }
    }

    if (jokerBelehrung) {
        text += `\n\nDa mir bei Vertragsschluss keine ordnungsgemäße Widerrufsbelehrung in Textform ausgehändigt wurde, hat die Widerrufsfrist noch nicht zu laufen begonnen.`;
    }

    if (withSEPA) {
        text += `\n\nEine eventuell erteilte Einzugsermächtigung (SEPA-Lastschriftmandat) widerrufe ich hiermit mit sofortiger Wirkung. Ich untersage Ihnen ausdrücklich weitere Abbuchungen von meinem Konto.`;
    }

    let privacyText = "";
    if (withWerbung) privacyText += "Ferner widerspreche ich der Nutzung meiner Daten zu Werbezwecken. ";
    if (withDaten) privacyText += "Ich fordere Sie auf, meine personenbezogenen Daten unverzüglich zu löschen und mir dies zu bestätigen.";
    
    if (privacyText) text += `\n\n${privacyText}`;

    text += `\n\nBitte senden Sie mir eine schriftliche Bestätigung des Widerrufs sowie des Vertragsendes in den nächsten Tagen zu.\n\nMit freundlichen Grüßen`;

    // --- PDF TEXT SCHREIBEN (MIT AUTOMATISCHEM SEITENUMBRUCH) ---
    doc.setFontSize(10); 
    const splitText = doc.splitTextToSize(text, 160);
    const lineHeight = 4.5;
    
    for (let i = 0; i < splitText.length; i++) {
        // Wenn wir den unteren Rand (25mm Abstand) erreichen -> Neue Seite
        if (yPos > pageHeight - 25) {
            doc.addPage();
            yPos = 20; // Text beginnt wieder oben
        }
        doc.text(splitText[i], leftMargin, yPos);
        yPos += lineHeight;
    }
    
    // yPos für Unterschriftenfeld
    yPos += 20; 

    // --- OPTIMIERTES UNTERSCHRIFTENFELD (MIT SEITENUMBRUCH-CHECK) ---
    // Falls der Text so lang war, dass die Unterschrift nicht mehr auf Seite 1 passt
    if (yPos > pageHeight - 30) {
        doc.addPage();
        yPos = 20;
    }

    doc.setLineWidth(0.3);
    doc.setDrawColor(0, 0, 0);
    doc.line(leftMargin, yPos, leftMargin + 70, yPos); 
    yPos += 5;
    doc.text(absName, leftMargin, yPos); // <--- Der Name unter der Linie

    // Datei speichern
    const safeFilename = empfName ? empfName.replace(/[^a-z0-9äöüß]/gi, '_').substring(0,15) : 'Vertrag';
    doc.save(`Widerruf_${safeFilename}.pdf`);
}