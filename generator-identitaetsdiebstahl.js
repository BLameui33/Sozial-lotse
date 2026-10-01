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

    // =========================================================
    //  PROFESSIONELLES BRIEFLAYOUT (DIN 5008 orientiert)
    // =========================================================

    const pageWidth  = 210;
    const leftMargin = 25;
    const rightEdge  = pageWidth - 25;   // 185 mm
    const textWidth  = rightEdge - leftMargin; // 160 mm
    const colorDark  = [30, 30, 30];     // fast Schwarz
    const colorGrey  = [110, 110, 110];  // dezentes Grau
    const colorLine  = [180, 180, 180];  // helle Linie
    const colorAccent = [0, 51, 102];    // dunkles Blau (seriös)

    let y = 0; // laufende Y-Position

    // ---------------------------------------------------------
    //  1. BRIEFKOPF – Absenderzeile klein, elegant
    // ---------------------------------------------------------
    y = 18;

    // Absender als kleine "Dachzeile" mit Trennstrich
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...colorGrey);
    const absenderKlein = `${absName}  ·  ${absAdresse}  ·  ${absPlzOrt}`;
    doc.text(absenderKlein, leftMargin, y);

    // Feine horizontale Linie unter der Absenderzeile
    y += 3;
    doc.setDrawColor(...colorLine);
    doc.setLineWidth(0.25);
    doc.line(leftMargin, y, rightEdge, y);

    // ---------------------------------------------------------
    //  2. EMPFÄNGERBLOCK  (linkes Fenster, DIN-gerecht)
    // ---------------------------------------------------------
    y += 18;  // Abstand nach DIN: Fensterzone

    doc.setTextColor(...colorDark);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(empfName, leftMargin, y);
    y += 5.5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    const splitAdresse = doc.splitTextToSize(empfAdresse, textWidth);
    doc.text(splitAdresse, leftMargin, y);
    y += splitAdresse.length * 5 + 2;

    // ---------------------------------------------------------
    //  3. DATUM  – rechtsbündig, sauber formatiert
    // ---------------------------------------------------------
    y += 12;

    // Ort aus PLZ-String extrahieren (alles nach dem ersten Leerzeichen)
    const ortTeile = absPlzOrt.trim().split(" ");
    const ortName  = ortTeile.length > 1 ? ortTeile.slice(1).join(" ") : "Ort";

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...colorGrey);
    const datumText = `${ortName}, den ${today}`;
    const datumWidth = doc.getTextWidth(datumText);
    doc.text(datumText, rightEdge - datumWidth, y);

    // ---------------------------------------------------------
    //  4. BETREFFZEILE  – fett, mit Aktenzeichen-Block
    // ---------------------------------------------------------
    y += 14;

    // Dezente Akzentlinie links neben dem Betreff
    doc.setDrawColor(...colorAccent);
    doc.setLineWidth(0.8);
    doc.line(leftMargin, y - 4.5, leftMargin, y + 1.5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11.5);
    doc.setTextColor(...colorDark);
    doc.text("Widerspruch gegen Forderung / Identitätsdiebstahl", leftMargin + 4, y);

    y += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...colorGrey);
    doc.text(`Ihr Zeichen / Rechnungsnr.: ${aktenzeichen}`, leftMargin + 4, y);
    y += 5;
    doc.text(`Ihr Schreiben vom: ${new Date(datumBrief).toLocaleDateString("de-DE")}`, leftMargin + 4, y);

    // Dünne Trennlinie vor dem Fließtext
    y += 6;
    doc.setDrawColor(...colorLine);
    doc.setLineWidth(0.2);
    doc.line(leftMargin, y, rightEdge, y);

    // ---------------------------------------------------------
    //  5. HAUPTTEXT
    // ---------------------------------------------------------
    y += 10;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(...colorDark);
    doc.setLineHeightFactor(1.45);

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

Mit freundlichen Grüßen`;

    // Text umbrechen und ausgeben
    const splitText = doc.splitTextToSize(text, textWidth);
    doc.text(splitText, leftMargin, y);
    y += splitText.length * (10.5 * 1.45) / 72 * 25.4; // präzise Höhenberechnung
    y += 4;

    // ---------------------------------------------------------
    //  6. UNTERRSCHRIFTENBLOCK – professionell gestaltet
    // ---------------------------------------------------------

    // Platz für handschriftliche Unterschrift
    y += 16;

    // Dezente Signaturlinie
    doc.setDrawColor(...colorGrey);
    doc.setLineWidth(0.3);
    doc.line(leftMargin, y, leftMargin + 55, y);

    // Name unter der Linie
    y += 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...colorDark);
    doc.text(absName, leftMargin, y);

    // Zusatzinfo unter dem Namen (optional, klein)
    y += 4.5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...colorGrey);
    doc.text(absAdresse + ", " + absPlzOrt, leftMargin, y);

    // ---------------------------------------------------------
    //  7. ANLAGEN-HINWEIS (falls Polizei-Anzeige)
    // ---------------------------------------------------------
    if (hatAnzeige && polizeiAz) {
        y += 14;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(...colorGrey);
        doc.text("Anlage:", leftMargin, y);
        doc.setFont("helvetica", "normal");
        doc.text("  Kopie der Anzeigebestätigung", leftMargin + 18, y);
    }

    // ---------------------------------------------------------
    //  8. FOOTER – schlichte Fußzeile
    // ---------------------------------------------------------
    const footerY = 280;

    // Dünne Linie über dem Footer
    doc.setDrawColor(...colorLine);
    doc.setLineWidth(0.2);
    doc.line(leftMargin, footerY - 4, rightEdge, footerY - 4);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...colorGrey);

    const footerLeft  = absName;
    const footerMid   = absAdresse;
    const footerRight = absPlzOrt;

    doc.text(footerLeft, leftMargin, footerY);
    const midWidth = doc.getTextWidth(footerMid);
    doc.text(footerMid, (pageWidth / 2) - (midWidth / 2), footerY);
    const rightWidth = doc.getTextWidth(footerRight);
    doc.text(footerRight, rightEdge - rightWidth, footerY);

    // =========================================================
    //  PDF SPEICHERN
    // =========================================================
    doc.save(`Widerspruch_Identitaetsdiebstahl_${aktenzeichen.replace(/[^a-z0-9]/gi, '_')}.pdf`);
}

// Datum in 14 Tagen berechnen
function getFristDatum() {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toLocaleDateString("de-DE");
}