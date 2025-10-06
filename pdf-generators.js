// ====================================================================================
// START: Globale Hilfsfunktionen (für das gesamte Skript verfügbar)
// ====================================================================================
function getElementValue(id, defaultValue = "") {
    const element = document.getElementById(id);
    if (element && typeof element.value !== 'undefined' && element.value !== null) {
        return String(element.value);
    }
    return defaultValue;
}

function getElementChecked(id, defaultValue = false) {
    const element = document.getElementById(id);
    return element ? element.checked : defaultValue;
}

function getFormattedDateValue(value, defaultValue = "N/A") { 
    return value ? new Date(value).toLocaleDateString("de-DE") : defaultValue;
}

/*
====================================================================================
  ZENTRALE PDF-REZEPTSAMMLUNG (pdf-generators.js)
  ----------------------------------------------------------------------------------
  In dieser Datei werden ALLE Funktionen gesammelt, die ein PDF-Dokument erstellen.
  Jede Funktion ist ein eigenes "Rezept".
====================================================================================
*/


// ===================================================================================
// START: REZEPT FÜR WIDERSPRUCH KINDERZUSCHLAG (KIZ)
// ===================================================================================

function generateKizWiderspruchPDF(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    // Layout-Konstanten und PDF-Schreibfunktionen (wie in der letzten funktionierenden Version)
    const margin = 20;
    const defaultLineHeight = 7;
    const spaceAfterParagraph = 3; 
    const subHeadingFontSize = 11;
    const textFontSize = 10;     
    const betreffFontSize = 12;

    let y = margin;
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const usableHeight = pageHeight - margin;

    function writeLine(text, currentLineHeight = defaultLineHeight, fontStyle = "normal", fontSize = textFontSize) {
        const textToWrite = text === undefined || text === null ? "" : String(text);
        if (y + currentLineHeight > usableHeight - (margin/2)) { doc.addPage(); y = margin; }
        doc.setFontSize(fontSize);
        doc.setFont("times", fontStyle); 
        doc.text(textToWrite, margin, y);
        y += currentLineHeight;
    }

    function writeParagraph(text, paragraphLineHeight = defaultLineHeight, paragraphFontSize = textFontSize, options = {}) {
        const textToWrite = text === undefined || text === null ? "" : String(text);
        const fontStyle = options.fontStyle || "normal";
        const extraSpacing = options.extraSpacingAfter === undefined ? spaceAfterParagraph : options.extraSpacingAfter;
        doc.setFontSize(paragraphFontSize);
        doc.setFont("times", fontStyle);
        
        const lines = doc.splitTextToSize(textToWrite, pageWidth - (2 * margin));
        for (let i = 0; i < lines.length; i++) {
            if (y + paragraphLineHeight > usableHeight - (margin/2) ) { doc.addPage(); y = margin; }
            doc.text(lines[i], margin, y);
            y += paragraphLineHeight;
        }
        if (y + extraSpacing > usableHeight - (margin/2) && lines.length > 0) {
             doc.addPage(); y = margin;
        } else if (lines.length > 0) { 
            y += extraSpacing;
        }
    }
    
    // Formulardaten aus dem 'data' Objekt verwenden
    const {
        personName, kindergeldnummer, anzahlPersonenKiz,
        personAdresse, personPlz, personOrt,
        familienkasseName, familienkasseAdresse,
        bescheidDatum, bescheidAktenzeichen, bescheidInhalt,
        widerspruchsgruende,
        textAblehnung, textEinkommen, textVermoegen, textWohnkosten,
        ergaenzendeArgumenteKiz, forderungKiz,
        anlagen, anlageSonstigesKizWiderspruch
    } = data;

    const bescheidDatumFormatiert = getFormattedDateValue(bescheidDatum, "UNBEKANNT");

    doc.setFont("times", "normal");

    // Absender
    writeLine(personName);
    writeLine(personAdresse);
    writeLine(`${personPlz} ${personOrt}`);
    writeLine(`Kindergeldnummer: ${kindergeldnummer}`);
    if (y + defaultLineHeight <= usableHeight) y += defaultLineHeight; else {doc.addPage(); y = margin;}

    // Empfänger
    writeLine(familienkasseName);
    familienkasseAdresse.split("\n").forEach(line => writeLine(line.trim()));
    if (y + defaultLineHeight * 2 <= usableHeight) y += defaultLineHeight * 2; else {doc.addPage(); y = margin;}

    // Datum
    const datumHeute = new Date().toLocaleDateString("de-DE");
    doc.setFontSize(textFontSize);
    const datumsBreite = doc.getStringUnitWidth(datumHeute) * textFontSize / doc.internal.scaleFactor;
    if (y + defaultLineHeight > usableHeight) { doc.addPage(); y = margin; }
    doc.text(datumHeute, pageWidth - margin - datumsBreite, y);
    y += defaultLineHeight * 2; 

    // Betreff
    let betreffText = `Widerspruch gegen Ihren Bescheid zum Kinderzuschlag (KiZ) vom ${bescheidDatumFormatiert}`;
    if (bescheidAktenzeichen && bescheidAktenzeichen.trim() !== "") betreffText += `, Ihr Zeichen: ${bescheidAktenzeichen}`;
    betreffText += `\nAntragsteller: ${personName}, Kindergeldnummer: ${kindergeldnummer}`;
    
    writeParagraph(betreffText, defaultLineHeight, betreffFontSize, {fontStyle: "bold", extraSpacingAfter: defaultLineHeight});

    // Anrede
    writeParagraph("Sehr geehrte Damen und Herren,", defaultLineHeight, textFontSize, {extraSpacingAfter: defaultLineHeight * 0.5});

    // ======================================================
    // START: Logik für getrennte Textblöcke (Singular vs. Plural)
    // ======================================================

    if (anzahlPersonenKiz === "mehrerePersonen") {
        // --- TEXTBLOCK FÜR PLURAL ("WIR") ---
        writeParagraph(`hiermit legen wir fristgerecht und mit allem Nachdruck Widerspruch gegen Ihren oben genannten Bescheid vom ${bescheidDatumFormatiert} ein. Mit diesem Bescheid haben Sie unseren Antrag auf Kinderzuschlag (KiZ) nach § 6a Bundeskindergeldgesetz (BKGG) ganz oder teilweise abgelehnt.`);
        writeParagraph(`Ihre Entscheidung (konkret: "${bescheidInhalt || 'siehe Ihr Bescheid'}") ist nach unserer Auffassung rechtswidrig, da sie auf einer fehlerhaften Tatsachengrundlage und/oder Rechtsanwendung beruht und uns in unseren Rechten verletzt.`);
        
        writeLine(`Begründung unseres Widerspruchs:`, defaultLineHeight, "bold", subHeadingFontSize);
        y += spaceAfterParagraph / 2; 
        writeParagraph(`Die Ablehnung bzw. die fehlerhafte Berechnung unseres Anspruchs ist aus den folgenden, von uns gewählten Gründen nicht haltbar:`, defaultLineHeight, textFontSize);

        if (widerspruchsgruende.includes("ablehnung") && textAblehnung && textAblehnung.trim() !== "") {
            writeLine("Zur fehlerhaften Ablehnung unseres Antrags:", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textAblehnung);
        }
        if (widerspruchsgruende.includes("einkommen") && textEinkommen && textEinkommen.trim() !== "") {
            writeLine("Zur fehlerhaften Berechnung des zu berücksichtigenden Einkommens:", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textEinkommen);
        }
        if (widerspruchsgruende.includes("vermoegen") && textVermoegen && textVermoegen.trim() !== "") {
            writeLine("Zur fehlerhaften Anrechnung von Vermögen:", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textVermoegen);
        }
        if (widerspruchsgruende.includes("wohnkosten") && textWohnkosten && textWohnkosten.trim() !== "") {
            writeLine("Zur fehlerhaften Berücksichtigung unserer Wohnkosten:", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textWohnkosten);
        }
        if (ergaenzendeArgumenteKiz && ergaenzendeArgumenteKiz.trim() !== "") {
            writeLine("Weitere ergänzende Ausführungen:", defaultLineHeight, "bold", textFontSize);
            writeParagraph(ergaenzendeArgumenteKiz);
        }
        
        writeLine(`Unser Antrag im Widerspruchsverfahren:`, defaultLineHeight, "bold", subHeadingFontSize);
        y += spaceAfterParagraph / 2;
        writeParagraph(forderungKiz, defaultLineHeight, textFontSize, {fontStyle:"bold"});
    
    } else {
        // --- TEXTBLOCK FÜR SINGULAR ("ICH") ---
        writeParagraph(`hiermit lege ich fristgerecht und mit allem Nachdruck Widerspruch gegen Ihren oben genannten Bescheid vom ${bescheidDatumFormatiert} ein. Mit diesem Bescheid haben Sie meinen Antrag auf Kinderzuschlag (KiZ) nach § 6a Bundeskindergeldgesetz (BKGG) ganz oder teilweise abgelehnt.`);
        writeParagraph(`Ihre Entscheidung (konkret: "${bescheidInhalt || 'siehe Ihr Bescheid'}") ist nach meiner Auffassung rechtswidrig, da sie auf einer fehlerhaften Tatsachengrundlage und/oder Rechtsanwendung beruht und mich in meinen Rechten verletzt.`);

        writeLine(`Begründung meines Widerspruchs:`, defaultLineHeight, "bold", subHeadingFontSize);
        y += spaceAfterParagraph / 2;
        writeParagraph(`Die Ablehnung bzw. die fehlerhafte Berechnung meines Anspruchs ist aus den folgenden, von mir gewählten Gründen nicht haltbar:`, defaultLineHeight, textFontSize);

        if (widerspruchsgruende.includes("ablehnung") && textAblehnung && textAblehnung.trim() !== "") {
            writeLine("Zur fehlerhaften Ablehnung meines Antrags:", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textAblehnung);
        }
        if (widerspruchsgruende.includes("einkommen") && textEinkommen && textEinkommen.trim() !== "") {
            writeLine("Zur fehlerhaften Berechnung des zu berücksichtigenden Einkommens:", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textEinkommen);
        }
        if (widerspruchsgruende.includes("vermoegen") && textVermoegen && textVermoegen.trim() !== "") {
            writeLine("Zur fehlerhaften Anrechnung von Vermögen:", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textVermoegen);
        }
        if (widerspruchsgruende.includes("wohnkosten") && textWohnkosten && textWohnkosten.trim() !== "") {
            writeLine("Zur fehlerhaften Berücksichtigung meiner Wohnkosten:", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textWohnkosten);
        }
        if (ergaenzendeArgumenteKiz && ergaenzendeArgumenteKiz.trim() !== "") {
            writeLine("Weitere ergänzende Ausführungen:", defaultLineHeight, "bold", textFontSize);
            writeParagraph(ergaenzendeArgumenteKiz);
        }
        
        writeLine(`Mein Antrag im Widerspruchsverfahren:`, defaultLineHeight, "bold", subHeadingFontSize);
        y += spaceAfterParagraph / 2;
        writeParagraph(forderungKiz, defaultLineHeight, textFontSize, {fontStyle:"bold"});
    }

    // --- Gemeinsamer Schlussteil ---
    if (anlagen && anlagen.length > 0) {
        writeLine("Anlagen:", defaultLineHeight, "bold", subHeadingFontSize);
        y += spaceAfterParagraph / 2;
        anlagen.forEach(anlage => {
            writeParagraph(`- ${anlage}`);
        });
        const anlageSonstigesText = data.anlageSonstigesKizWiderspruch || "";
        if (anlageSonstigesText.trim() !== "") { 
            writeParagraph(`- Sonstige Anlagen: ${anlageSonstigesText}`);
        }
    }
    
    writeParagraph(`Es wird aufgefordert, den Bescheid aufzuheben und über den Anspruch auf Kinderzuschlag unter Berücksichtigung der dargelegten Fakten sowie der Rechtsauffassung neu zu entscheiden und die zustehenden Leistungen ab dem Antragsdatum nachzuzahlen.`, defaultLineHeight, textFontSize, {fontStyle: "italic"});
    writeParagraph(`Für den Fall, dass dem Widerspruch nicht oder nicht vollständig abgeholfen wird, bleibt die Einleitung weiterer rechtlicher Schritte ausdrücklich vorbehalten.`, defaultLineHeight, textFontSize, {fontStyle: "italic"});
    
    y += defaultLineHeight;
    
    writeParagraph("Mit freundlichen Grüßen");
    writeParagraph("\n\n_________________________"); 
    writeParagraph(personName);

    doc.save("widerspruch_kinderzuschlag.pdf");
}
// ===================================================================================
// ENDE: REZEPT FÜR WIDERSPRUCH KINDERZUSCHLAG (KIZ)
// ===================================================================================


// ===================================================================================
// START: REZEPT FÜR BUT Bildung und Teilhabe Widerspruch
// ===================================================================================
function generateButWiderspruchPDF(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    // Layout-Konstanten und PDF-Schreibfunktionen (wie in der letzten funktionierenden Version)
    const margin = 20;
    const defaultLineHeight = 7;
    const spaceAfterParagraph = 3; 
    const subHeadingFontSize = 11;
    const textFontSize = 10;     
    const smallTextFontSize = 8;
    const betreffFontSize = 12;

    let y = margin;
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const usableHeight = pageHeight - margin;

    function writeLine(text, currentLineHeight = defaultLineHeight, fontStyle = "normal", fontSize = textFontSize) {
        const textToWrite = text === undefined || text === null ? "" : String(text);
        if (y + currentLineHeight > usableHeight - (margin/2)) { doc.addPage(); y = margin; }
        doc.setFontSize(fontSize);
        doc.setFont("times", fontStyle); 
        doc.text(textToWrite, margin, y);
        y += currentLineHeight;
    }

    function writeParagraph(text, paragraphLineHeight = defaultLineHeight, paragraphFontSize = textFontSize, options = {}) {
        const textToWrite = text === undefined || text === null ? "" : String(text);
        const fontStyle = options.fontStyle || "normal";
        const extraSpacing = options.extraSpacingAfter === undefined ? spaceAfterParagraph : options.extraSpacingAfter;
        doc.setFontSize(paragraphFontSize);
        doc.setFont("times", fontStyle);
        
        const lines = doc.splitTextToSize(textToWrite, pageWidth - (2 * margin));
        for (let i = 0; i < lines.length; i++) {
            if (y + paragraphLineHeight > usableHeight - (margin/2) ) { doc.addPage(); y = margin; }
            doc.text(lines[i], margin, y);
            y += paragraphLineHeight;
        }
        if (y + extraSpacing > usableHeight - (margin/2) && lines.length > 0) {
             doc.addPage(); y = margin;
        } else if (lines.length > 0) { 
            y += extraSpacing;
        }
    }
    
    // Formulardaten aus dem 'data' Objekt verwenden
    const {
        personName, bgNummer, anzahlPersonenBut,
        personAdresse, personPlz, personOrt,
        behoerdeName, behoerdeAdresse,
        bescheidDatum, bescheidAktenzeichen, abgelehnteLeistung, betroffenesKind,
        widerspruchsgruende,
        textVoraussetzungen, textBedarfNichtGedeckt, textFormelleFehler,
        ergaenzendeArgumenteBut, forderungBut,
        anlagen, anlageSonstigesButWiderspruch
    } = data;

    const bescheidDatumFormatiert = getFormattedDateValue(bescheidDatum, "UNBEKANNT");

    doc.setFont("times", "normal");

    // Absender
    writeLine(personName);
    writeLine(personAdresse);
    writeLine(`${personPlz} ${personOrt}`);
    writeLine(`BG-Nummer / Aktenzeichen: ${bgNummer}`);
    if (y + defaultLineHeight <= usableHeight) y += defaultLineHeight; else {doc.addPage(); y = margin;}

    // Empfänger
    writeLine(behoerdeName);
    behoerdeAdresse.split("\n").forEach(line => writeLine(line.trim()));
    if (y + defaultLineHeight * 2 <= usableHeight) y += defaultLineHeight * 2; else {doc.addPage(); y = margin;}

    // Datum
    const datumHeute = new Date().toLocaleDateString("de-DE");
    doc.setFontSize(textFontSize);
    const datumsBreite = doc.getStringUnitWidth(datumHeute) * textFontSize / doc.internal.scaleFactor;
    if (y + defaultLineHeight > usableHeight) { doc.addPage(); y = margin; }
    doc.text(datumHeute, pageWidth - margin - datumsBreite, y);
    y += defaultLineHeight * 2; 

    // Betreff
    let betreffText = `Widerspruch gegen Ihren Bescheid vom ${bescheidDatumFormatiert}`;
    if (bescheidAktenzeichen && bescheidAktenzeichen.trim() !== "") betreffText += `, Ihr Zeichen: ${bescheidAktenzeichen}`;
    betreffText += `\nBetreffend: Ablehnung von Leistungen für Bildung und Teilhabe (BuT) für ${betroffenesKind || 'mein Kind / meine Kinder'}`;
    
    writeParagraph(betreffText, defaultLineHeight, betreffFontSize, {fontStyle: "bold", extraSpacingAfter: defaultLineHeight});

    // Anrede
    writeParagraph("Sehr geehrte Damen und Herren,", defaultLineHeight, textFontSize, {extraSpacingAfter: defaultLineHeight * 0.5});

    // ======================================================
    // START: Logik für getrennte Textblöcke (Singular vs. Plural)
    // ======================================================

    if (anzahlPersonenBut === "mehrerePersonen") {
        // --- TEXTBLOCK FÜR PLURAL ("WIR") ---
        writeParagraph(`hiermit legen wir fristgerecht und mit allem Nachdruck Widerspruch gegen Ihren oben genannten Bescheid vom ${bescheidDatumFormatiert} ein. Mit diesem Bescheid haben Sie unseren Antrag auf Leistungen für Bildung und Teilhabe (konkret: "${abgelehnteLeistung || 'siehe unser Antrag'}") für unsere Kinder ${betroffenesKind || ''} abgelehnt.`);
        writeParagraph(`Diese Entscheidung ist nach unserer Auffassung rechtswidrig und verwehrt unseren Kindern die gesetzlich zustehende Chance auf Bildung und soziale Teilhabe, wie sie in den §§ 28 ff. SGB II bzw. § 34 SGB XII verankert ist.`);
        
        writeLine(`Begründung unseres Widerspruchs:`, defaultLineHeight, "bold", subHeadingFontSize);
        y += spaceAfterParagraph / 2; 

        if (widerspruchsgruende.includes("voraussetzungen") && textVoraussetzungen && textVoraussetzungen.trim() !== "") {
            writeLine("Die Anspruchsvoraussetzungen sind erfüllt:", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textVoraussetzungen);
        }
        if (widerspruchsgruende.includes("bedarfNichtGedeckt") && textBedarfNichtGedeckt && textBedarfNichtGedeckt.trim() !== "") {
            writeLine("Der Bedarf ist notwendig und unabweisbar:", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textBedarfNichtGedeckt);
        }
        if (widerspruchsgruende.includes("formelleFehler") && textFormelleFehler && textFormelleFehler.trim() !== "") {
            writeLine("Der Bescheid weist formelle Fehler auf:", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textFormelleFehler);
        }
        if (ergaenzendeArgumenteBut && ergaenzendeArgumenteBut.trim() !== "") {
            writeLine("Weitere ergänzende Ausführungen:", defaultLineHeight, "bold", textFontSize);
            writeParagraph(ergaenzendeArgumenteBut);
        }
        
        writeLine(`Unser Antrag im Widerspruchsverfahren:`, defaultLineHeight, "bold", subHeadingFontSize);
        y += spaceAfterParagraph / 2;
        writeParagraph(forderungBut, defaultLineHeight, textFontSize, {fontStyle:"bold"});
    
    } else {
        // --- TEXTBLOCK FÜR SINGULAR ("ICH") ---
        writeParagraph(`hiermit lege ich fristgerecht und mit allem Nachdruck Widerspruch gegen Ihren oben genannten Bescheid vom ${bescheidDatumFormatiert} ein. Mit diesem Bescheid haben Sie meinen Antrag auf Leistungen für Bildung und Teilhabe (konkret: "${abgelehnteLeistung || 'siehe mein Antrag'}") für mein Kind ${betroffenesKind || ''} abgelehnt.`);
        writeParagraph(`Diese Entscheidung ist nach meiner Auffassung rechtswidrig und verwehrt meinem Kind die gesetzlich zustehende Chance auf Bildung und soziale Teilhabe, wie sie in den §§ 28 ff. SGB II bzw. § 34 SGB XII verankert ist.`);
        
        writeLine(`Begründung meines Widerspruchs:`, defaultLineHeight, "bold", subHeadingFontSize);
        y += spaceAfterParagraph / 2;

        if (widerspruchsgruende.includes("voraussetzungen") && textVoraussetzungen && textVoraussetzungen.trim() !== "") {
            writeLine("Die Anspruchsvoraussetzungen sind erfüllt:", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textVoraussetzungen);
        }
        if (widerspruchsgruende.includes("bedarfNichtGedeckt") && textBedarfNichtGedeckt && textBedarfNichtGedeckt.trim() !== "") {
            writeLine("Der Bedarf ist notwendig und unabweisbar:", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textBedarfNichtGedeckt);
        }
        if (widerspruchsgruende.includes("formelleFehler") && textFormelleFehler && textFormelleFehler.trim() !== "") {
            writeLine("Der Bescheid weist formelle Fehler auf:", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textFormelleFehler);
        }
        if (ergaenzendeArgumenteBut && ergaenzendeArgumenteBut.trim() !== "") {
            writeLine("Weitere ergänzende Ausführungen:", defaultLineHeight, "bold", textFontSize);
            writeParagraph(ergaenzendeArgumenteBut);
        }
        
        writeLine(`Mein Antrag im Widerspruchsverfahren:`, defaultLineHeight, "bold", subHeadingFontSize);
        y += spaceAfterParagraph / 2;
        writeParagraph(forderungBut, defaultLineHeight, textFontSize, {fontStyle:"bold"});
    }

    // --- Gemeinsamer Schlussteil ---
    if (anlagen && anlagen.length > 0) {
        writeLine("Anlagen:", defaultLineHeight, "bold", subHeadingFontSize);
        y += spaceAfterParagraph / 2;
        anlagen.forEach(anlage => {
            writeParagraph(`- ${anlage}`);
        });
        const anlageSonstigesText = data.anlageSonstigesButWiderspruch || "";
        if (anlageSonstigesText.trim() !== "") { 
            writeParagraph(`- Sonstige Anlagen: ${anlageSonstigesText}`);
        }
    }
    
    writeParagraph(`Es wird aufgefordert, den Bescheid aufzuheben und über den Antrag auf Leistungen für Bildung und Teilhabe unter Berücksichtigung der dargelegten Rechtsauffassung neu zu entscheiden und die beantragte Leistung zu bewilligen.`, defaultLineHeight, textFontSize, {fontStyle: "italic"});
    writeParagraph(`Für den Fall, dass dem Widerspruch nicht oder nicht vollständig abgeholfen wird, bleibt die Einleitung weiterer rechtlicher Schritte ausdrücklich vorbehalten.`, defaultLineHeight, textFontSize, {fontStyle: "italic"});
    
    y += defaultLineHeight;
    
    writeParagraph("Mit freundlichen Grüßen");
    writeParagraph("\n\n_________________________"); 
    writeParagraph(personName);

    doc.save("widerspruch_but.pdf");    
}
// ===================================================================================
// ENDE: REZEPT FÜR BUT Bildung und Teilhabe
// ===================================================================================

// ===================================================================================
// START: REZEPT FÜR Wohngeld 
// ===================================================================================

function generateWohngeldWiderspruchPDF(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    // Layout-Konstanten und PDF-Schreibfunktionen (wie in der letzten funktionierenden Version)
    const margin = 20;
    const defaultLineHeight = 7;
    const spaceAfterParagraph = 3; 
    const subHeadingFontSize = 11;
    const textFontSize = 10;     
    const smallTextFontSize = 8;
    const betreffFontSize = 12;

    let y = margin;
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const usableHeight = pageHeight - margin;

    function writeLine(text, currentLineHeight = defaultLineHeight, fontStyle = "normal", fontSize = textFontSize) {
        const textToWrite = text === undefined || text === null ? "" : String(text);
        if (y + currentLineHeight > usableHeight - (margin/2)) { doc.addPage(); y = margin; }
        doc.setFontSize(fontSize);
        doc.setFont("times", fontStyle); 
        doc.text(textToWrite, margin, y);
        y += currentLineHeight;
    }

    function writeParagraph(text, paragraphLineHeight = defaultLineHeight, paragraphFontSize = textFontSize, options = {}) {
        const textToWrite = text === undefined || text === null ? "" : String(text);
        const fontStyle = options.fontStyle || "normal";
        const extraSpacing = options.extraSpacingAfter === undefined ? spaceAfterParagraph : options.extraSpacingAfter;
        doc.setFontSize(paragraphFontSize);
        doc.setFont("times", fontStyle);
        
        const lines = doc.splitTextToSize(textToWrite, pageWidth - (2 * margin));
        for (let i = 0; i < lines.length; i++) {
            if (y + paragraphLineHeight > usableHeight - (margin/2) ) { doc.addPage(); y = margin; }
            doc.text(lines[i], margin, y);
            y += paragraphLineHeight;
        }
        if (y + extraSpacing > usableHeight - (margin/2) && lines.length > 0) {
             doc.addPage(); y = margin;
        } else if (lines.length > 0) { 
            y += extraSpacing;
        }
    }
    
    // Formulardaten aus dem 'data' Objekt verwenden
    const {
        personName, aktenzeichenWohngeld, anzahlPersonenWohngeld,
        personAdresse, personPlz, personOrt,
        behoerdeName, behoerdeAdresse,
        bescheidDatum, bescheidAktenzeichen, bescheidInhalt,
        widerspruchsgruende,
        textAblehnung, textHaushaltsmitglieder, textMiete, textEinkommen,
        ergaenzendeArgumenteWohngeld, forderungWohngeld,
        anlagen, anlageSonstigesWohngeldWiderspruch
    } = data;

    const bescheidDatumFormatiert = getFormattedDateValue(bescheidDatum, "UNBEKANNT");

    doc.setFont("times", "normal");

    // Absender
    writeLine(personName);
    writeLine(personAdresse);
    writeLine(`${personPlz} ${personOrt}`);
    writeLine(`Wohngeldnummer / Aktenzeichen: ${aktenzeichenWohngeld}`);
    if (y + defaultLineHeight <= usableHeight) y += defaultLineHeight; else {doc.addPage(); y = margin;}

    // Empfänger
    writeLine(behoerdeName);
    behoerdeAdresse.split("\n").forEach(line => writeLine(line.trim()));
    if (y + defaultLineHeight * 2 <= usableHeight) y += defaultLineHeight * 2; else {doc.addPage(); y = margin;}

    // Datum
    const datumHeute = new Date().toLocaleDateString("de-DE");
    doc.setFontSize(textFontSize);
    const datumsBreite = doc.getStringUnitWidth(datumHeute) * textFontSize / doc.internal.scaleFactor;
    if (y + defaultLineHeight > usableHeight) { doc.addPage(); y = margin; }
    doc.text(datumHeute, pageWidth - margin - datumsBreite, y);
    y += defaultLineHeight * 2; 

    // Betreff
    let betreffText = `Widerspruch gegen Ihren Wohngeldbescheid vom ${bescheidDatumFormatiert}`;
    if (bescheidAktenzeichen && bescheidAktenzeichen.trim() !== "") betreffText += `, Ihr Zeichen: ${bescheidAktenzeichen}`;
    betreffText += `\nAntragsteller: ${personName}`;
    
    writeParagraph(betreffText, defaultLineHeight, betreffFontSize, {fontStyle: "bold", extraSpacingAfter: defaultLineHeight});

    // Anrede
    writeParagraph("Sehr geehrte Damen und Herren,", defaultLineHeight, textFontSize, {extraSpacingAfter: defaultLineHeight * 0.5});

    // ======================================================
    // START: Logik für getrennte Textblöcke (Singular vs. Plural)
    // ======================================================

    if (anzahlPersonenWohngeld === "mehrerePersonen") {
        // --- TEXTBLOCK FÜR PLURAL ("WIR") ---
        writeParagraph(`hiermit legen wir fristgerecht und mit allem Nachdruck Widerspruch gegen Ihren oben genannten Bescheid vom ${bescheidDatumFormatiert} ein. Mit diesem Bescheid haben Sie über unseren Antrag auf Wohngeld entschieden.`);
        writeParagraph(`Ihre Entscheidung (konkret: "${bescheidInhalt || 'siehe Ihr Bescheid'}") ist nach unserer Auffassung rechtswidrig und/oder beruht auf einer fehlerhaften Berechnung und verletzt uns in unseren Rechten.`);
        
        writeLine(`Begründung unseres Widerspruchs:`, defaultLineHeight, "bold", subHeadingFontSize);
        y += spaceAfterParagraph / 2; 

        if (widerspruchsgruende.includes("ablehnung") && textAblehnung && textAblehnung.trim() !== "") {
            writeLine("Zur fehlerhaften Ablehnung unseres Antrags:", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textAblehnung);
        }
        if (widerspruchsgruende.includes("haushaltsmitglieder") && textHaushaltsmitglieder && textHaushaltsmitglieder.trim() !== "") {
            writeLine("Zur falschen Anzahl der berücksichtigten Haushaltsmitglieder (§§ 5-8 WoGG):", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textHaushaltsmitglieder);
        }
        if (widerspruchsgruende.includes("miete") && textMiete && textMiete.trim() !== "") {
            writeLine("Zur falschen Höhe der berücksichtigten Miete (§§ 9-12 WoGG):", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textMiete);
        }
        if (widerspruchsgruende.includes("einkommen") && textEinkommen && textEinkommen.trim() !== "") {
            writeLine("Zur fehlerhaften Berechnung des zu berücksichtigenden Gesamteinkommens (§§ 13-18 WoGG):", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textEinkommen);
        }
        if (ergaenzendeArgumenteWohngeld && ergaenzendeArgumenteWohngeld.trim() !== "") {
            writeLine("Weitere ergänzende Ausführungen:", defaultLineHeight, "bold", textFontSize);
            writeParagraph(ergaenzendeArgumenteWohngeld);
        }
        
        writeLine(`Unser Antrag im Widerspruchsverfahren:`, defaultLineHeight, "bold", subHeadingFontSize);
        y += spaceAfterParagraph / 2;
        writeParagraph(forderungWohngeld, defaultLineHeight, textFontSize, {fontStyle:"bold"});
    
    } else {
        // --- TEXTBLOCK FÜR SINGULAR ("ICH") ---
        writeParagraph(`hiermit lege ich fristgerecht und mit allem Nachdruck Widerspruch gegen Ihren oben genannten Bescheid vom ${bescheidDatumFormatiert} ein. Mit diesem Bescheid haben Sie über meinen Antrag auf Wohngeld entschieden.`);
        writeParagraph(`Ihre Entscheidung (konkret: "${bescheidInhalt || 'siehe Ihr Bescheid'}") ist nach meiner Auffassung rechtswidrig und/oder beruht auf einer fehlerhaften Berechnung und verletzt mich in meinen Rechten.`);

        writeLine(`Begründung meines Widerspruchs:`, defaultLineHeight, "bold", subHeadingFontSize);
        y += spaceAfterParagraph / 2;

        if (widerspruchsgruende.includes("ablehnung") && textAblehnung && textAblehnung.trim() !== "") {
            writeLine("Zur fehlerhaften Ablehnung meines Antrags:", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textAblehnung);
        }
        if (widerspruchsgruende.includes("haushaltsmitglieder") && textHaushaltsmitglieder && textHaushaltsmitglieder.trim() !== "") {
            writeLine("Zur falschen Anzahl der berücksichtigten Haushaltsmitglieder (§§ 5-8 WoGG):", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textHaushaltsmitglieder);
        }
        if (widerspruchsgruende.includes("miete") && textMiete && textMiete.trim() !== "") {
            writeLine("Zur falschen Höhe der berücksichtigten Miete (§§ 9-12 WoGG):", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textMiete);
        }
        if (widerspruchsgruende.includes("einkommen") && textEinkommen && textEinkommen.trim() !== "") {
            writeLine("Zur fehlerhaften Berechnung des zu berücksichtigenden Gesamteinkommens (§§ 13-18 WoGG):", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textEinkommen);
        }
        if (ergaenzendeArgumenteWohngeld && ergaenzendeArgumenteWohngeld.trim() !== "") {
            writeLine("Weitere ergänzende Ausführungen:", defaultLineHeight, "bold", textFontSize);
            writeParagraph(ergaenzendeArgumenteWohngeld);
        }
        
        writeLine(`Mein Antrag im Widerspruchsverfahren:`, defaultLineHeight, "bold", subHeadingFontSize);
        y += spaceAfterParagraph / 2;
        writeParagraph(forderungWohngeld, defaultLineHeight, textFontSize, {fontStyle:"bold"});
    }

    // --- Gemeinsamer Schlussteil ---
    if (anlagen && anlagen.length > 0) {
        writeLine("Anlagen:", defaultLineHeight, "bold", subHeadingFontSize);
        y += spaceAfterParagraph / 2;
        anlagen.forEach(anlage => {
            writeParagraph(`- ${anlage}`);
        });
        const anlageSonstigesText = data.anlageSonstigesWohngeldWiderspruch || "";
        if (anlageSonstigesText.trim() !== "") { 
            writeParagraph(`- Sonstige Anlagen: ${anlageSonstigesText}`);
        }
    }
    
    writeParagraph(`Es wird aufgefordert, den Bescheid aufzuheben und über den Wohngeldanspruch unter Berücksichtigung der dargelegten Fakten sowie der Rechtsauffassung neu zu entscheiden. Zudem wird um die Zusendung eines korrigierten, rechtsmittelfähigen Bescheides und um die umgehende Nachzahlung der zu Unrecht vorenthaltenen Leistungen ab dem ursprünglichen Antragsdatum gebeten.`, defaultLineHeight, textFontSize, {fontStyle: "italic"});
    writeParagraph(`Für den Fall, dass dem Widerspruch nicht oder nicht vollständig abgeholfen wird, bleibt die Einleitung weiterer rechtlicher Schritte ausdrücklich vorbehalten.`, defaultLineHeight, textFontSize, {fontStyle: "italic"});
    
    y += defaultLineHeight;
    
    writeParagraph("Mit freundlichen Grüßen");
    writeParagraph("\n\n_________________________"); 
    writeParagraph(personName);

    doc.save("widerspruch_wohngeldbescheid.pdf");
}
// ===================================================================================
// ENDE:  Wohngeld
// ===================================================================================

// ===================================================================================
// START:  Sozialhilfe
// ===================================================================================

function generateSozialhilfeWiderspruchPDF(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    // Layout-Konstanten und PDF-Schreibfunktionen (wie in der letzten funktionierenden Version)
    const margin = 20;
    const defaultLineHeight = 7;
    const spaceAfterParagraph = 3; 
    const subHeadingFontSize = 11;
    const textFontSize = 10;     
    const smallTextFontSize = 8;
    const betreffFontSize = 12;

    let y = margin;
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const usableHeight = pageHeight - margin;

    function writeLine(text, currentLineHeight = defaultLineHeight, fontStyle = "normal", fontSize = textFontSize) {
        const textToWrite = text === undefined || text === null ? "" : String(text);
        if (y + currentLineHeight > usableHeight - (margin/2)) { doc.addPage(); y = margin; }
        doc.setFontSize(fontSize);
        doc.setFont("times", fontStyle); 
        doc.text(textToWrite, margin, y);
        y += currentLineHeight;
    }

    function writeParagraph(text, paragraphLineHeight = defaultLineHeight, paragraphFontSize = textFontSize, options = {}) {
        const textToWrite = text === undefined || text === null ? "" : String(text);
        const fontStyle = options.fontStyle || "normal";
        const extraSpacing = options.extraSpacingAfter === undefined ? spaceAfterParagraph : options.extraSpacingAfter;
        doc.setFontSize(paragraphFontSize);
        doc.setFont("times", fontStyle);
        
        const lines = doc.splitTextToSize(textToWrite, pageWidth - (2 * margin));
        for (let i = 0; i < lines.length; i++) {
            if (y + paragraphLineHeight > usableHeight - (margin/2) ) { doc.addPage(); y = margin; }
            doc.text(lines[i], margin, y);
            y += paragraphLineHeight;
        }
        if (y + extraSpacing > usableHeight - (margin/2) && lines.length > 0) {
             doc.addPage(); y = margin;
        } else if (lines.length > 0) { 
            y += extraSpacing;
        }
    }
    
    // Formulardaten aus dem 'data' Objekt verwenden
    const {
        personName, aktenzeichenSozialamt, anzahlPersonenSozialhilfe,
        personAdresse, personPlz, personOrt,
        behoerdeName, behoerdeAdresse,
        bescheidDatum, bescheidAktenzeichen, bescheidInhalt,
        widerspruchsgruende,
        textAblehnung, textBerechnung, textEinkommen, textVermoegen,
        ergaenzendeArgumenteSozialhilfe, forderungSozialhilfe,
        anlagen, anlageSonstigesSozialhilfeWiderspruch
    } = data;

    const bescheidDatumFormatiert = getFormattedDateValue(bescheidDatum, "UNBEKANNT");

    doc.setFont("times", "normal");

    // Absender
    writeLine(personName);
    writeLine(personAdresse);
    writeLine(`${personPlz} ${personOrt}`);
    writeLine(`Aktenzeichen: ${aktenzeichenSozialamt}`);
    if (y + defaultLineHeight <= usableHeight) y += defaultLineHeight; else {doc.addPage(); y = margin;}

    // Empfänger
    writeLine(behoerdeName);
    behoerdeAdresse.split("\n").forEach(line => writeLine(line.trim()));
    if (y + defaultLineHeight * 2 <= usableHeight) y += defaultLineHeight * 2; else {doc.addPage(); y = margin;}

    // Datum
    const datumHeute = new Date().toLocaleDateString("de-DE");
    doc.setFontSize(textFontSize);
    const datumsBreite = doc.getStringUnitWidth(datumHeute) * textFontSize / doc.internal.scaleFactor;
    if (y + defaultLineHeight > usableHeight) { doc.addPage(); y = margin; }
    doc.text(datumHeute, pageWidth - margin - datumsBreite, y);
    y += defaultLineHeight * 2; 

    // Betreff
    let betreffText = `Widerspruch gegen Ihren Bescheid vom ${bescheidDatumFormatiert}`;
    if (bescheidAktenzeichen && bescheidAktenzeichen.trim() !== "") betreffText += `, Ihr Zeichen: ${bescheidAktenzeichen}`;
    betreffText += `\nBetreffend: Leistungen nach dem SGB XII (Sozialhilfe / Grundsicherung)`;
    betreffText += `\nAntragsteller: ${personName}, Aktenzeichen: ${aktenzeichenSozialamt}`;
    
    writeParagraph(betreffText, defaultLineHeight, betreffFontSize, {fontStyle: "bold", extraSpacingAfter: defaultLineHeight});

    // Anrede
    writeParagraph("Sehr geehrte Damen und Herren,", defaultLineHeight, textFontSize, {extraSpacingAfter: defaultLineHeight * 0.5});

    // ======================================================
    // START: Logik für getrennte Textblöcke (Singular vs. Plural)
    // ======================================================

    if (anzahlPersonenSozialhilfe === "mehrerePersonen") {
        // --- TEXTBLOCK FÜR PLURAL ("WIR") ---
        writeParagraph(`hiermit legen wir fristgerecht und mit allem Nachdruck Widerspruch gegen Ihren oben genannten Bescheid vom ${bescheidDatumFormatiert} ein. In diesem Bescheid haben Sie über unsere Leistungsansprüche nach dem Sozialgesetzbuch Zwölftes Buch (SGB XII) entschieden.`);
        writeParagraph(`Ihre Entscheidung (konkret: "${bescheidInhalt || 'siehe Ihr Bescheid'}") ist nach unserer Auffassung rechtswidrig, da sie auf einer fehlerhaften Sachverhaltsermittlung und/oder Rechtsanwendung beruht und uns in unserem grundrechtlich geschützten Anspruch auf Sicherung des Existenzminimums verletzt.`);
        
        writeLine(`Begründung unseres Widerspruchs:`, defaultLineHeight, "bold", subHeadingFontSize);
        y += spaceAfterParagraph / 2; 

        if (widerspruchsgruende.includes("ablehnung") && textAblehnung && textAblehnung.trim() !== "") {
            writeLine("Zur fehlerhaften Ablehnung unseres Leistungsanspruchs:", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textAblehnung);
        }
        if (widerspruchsgruende.includes("berechnung") && textBerechnung && textBerechnung.trim() !== "") {
            writeLine("Zur fehlerhaften Berechnung der Leistungshöhe (Bedarfe):", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textBerechnung);
        }
        if (widerspruchsgruende.includes("einkommen") && textEinkommen && textEinkommen.trim() !== "") {
            writeLine("Zur fehlerhaften Anrechnung von Einkommen:", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textEinkommen);
        }
        if (widerspruchsgruende.includes("vermoegen") && textVermoegen && textVermoegen.trim() !== "") {
            writeLine("Zur fehlerhaften Anrechnung von Vermögen:", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textVermoegen);
        }
        if (ergaenzendeArgumenteSozialhilfe && ergaenzendeArgumenteSozialhilfe.trim() !== "") {
            writeLine("Weitere ergänzende Ausführungen:", defaultLineHeight, "bold", textFontSize);
            writeParagraph(ergaenzendeArgumenteSozialhilfe);
        }
        
        writeLine(`Unser Antrag im Widerspruchsverfahren:`, defaultLineHeight, "bold", subHeadingFontSize);
        y += spaceAfterParagraph / 2;
        writeParagraph(forderungSozialhilfe, defaultLineHeight, textFontSize, {fontStyle:"bold"});
    
    } else {
        // --- TEXTBLOCK FÜR SINGULAR ("ICH") ---
        writeParagraph(`hiermit lege ich fristgerecht und mit allem Nachdruck Widerspruch gegen Ihren oben genannten Bescheid vom ${bescheidDatumFormatiert} ein. In diesem Bescheid haben Sie über meine Leistungsansprüche nach dem Sozialgesetzbuch Zwölftes Buch (SGB XII) entschieden.`);
        writeParagraph(`Ihre Entscheidung (konkret: "${bescheidInhalt || 'siehe Ihr Bescheid'}") ist nach meiner Auffassung rechtswidrig, da sie auf einer fehlerhaften Sachverhaltsermittlung und/oder Rechtsanwendung beruht und mich in meinem grundrechtlich geschützten Anspruch auf Sicherung des Existenzminimums verletzt.`);
        
        writeLine(`Begründung meines Widerspruchs:`, defaultLineHeight, "bold", subHeadingFontSize);
        y += spaceAfterParagraph / 2;

        if (widerspruchsgruende.includes("ablehnung") && textAblehnung && textAblehnung.trim() !== "") {
            writeLine("Zur fehlerhaften Ablehnung meines Leistungsanspruchs:", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textAblehnung);
        }
        if (widerspruchsgruende.includes("berechnung") && textBerechnung && textBerechnung.trim() !== "") {
            writeLine("Zur fehlerhaften Berechnung der Leistungshöhe (Bedarfe):", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textBerechnung);
        }
        if (widerspruchsgruende.includes("einkommen") && textEinkommen && textEinkommen.trim() !== "") {
            writeLine("Zur fehlerhaften Anrechnung von Einkommen:", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textEinkommen);
        }
        if (widerspruchsgruende.includes("vermoegen") && textVermoegen && textVermoegen.trim() !== "") {
            writeLine("Zur fehlerhaften Anrechnung von Vermögen:", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textVermoegen);
        }
        if (ergaenzendeArgumenteSozialhilfe && ergaenzendeArgumenteSozialhilfe.trim() !== "") {
            writeLine("Weitere ergänzende Ausführungen:", defaultLineHeight, "bold", textFontSize);
            writeParagraph(ergaenzendeArgumenteSozialhilfe);
        }

        writeLine(`Mein Antrag im Widerspruchsverfahren:`, defaultLineHeight, "bold", subHeadingFontSize);
        y += spaceAfterParagraph / 2;
        writeParagraph(forderungSozialhilfe, defaultLineHeight, textFontSize, {fontStyle:"bold"});
    }

    // --- Gemeinsamer Schlussteil ---
    if (anlagen && anlagen.length > 0) {
        writeLine("Anlagen:", defaultLineHeight, "bold", subHeadingFontSize);
        y += spaceAfterParagraph / 2;
        anlagen.forEach(anlage => {
            writeParagraph(`- ${anlage}`);
        });
        const anlageSonstigesText = data.anlageSonstigesSozialhilfeWiderspruch || "";
        if (anlageSonstigesText.trim() !== "") { 
            writeParagraph(`- Sonstige Anlagen: ${anlageSonstigesText}`);
        }
    }
    
    writeParagraph(`Es wird aufgefordert, den Bescheid aufzuheben und über den Leistungsanspruch unter Berücksichtigung der dargelegten Gründe sowie der geltenden Rechtslage neu zu entscheiden. Zudem wird um die Zusendung eines korrigierten, rechtsmittelfähigen Bescheides und um die umgehende Nachzahlung aller zu Unrecht vorenthaltenen Leistungen gebeten.`, defaultLineHeight, textFontSize);
    writeParagraph(`Für den Fall, dass dem Widerspruch nicht oder nicht vollständig abgeholfen wird, bleibt die Einleitung weiterer rechtlicher Schritte ausdrücklich vorbehalten.`, defaultLineHeight, textFontSize, {fontStyle: "italic"});
    
    y += defaultLineHeight;
    
    writeParagraph("Mit freundlichen Grüßen");
    writeParagraph("\n\n_________________________"); 
    writeParagraph(personName);

    doc.save("widerspruch_sozialhilfebescheid.pdf");
}
// ===================================================================================
// ENDE:  Sozialhilfe
// ===================================================================================

// ===================================================================================
// START:  Ablehnung ALG1
// ===================================================================================

function generateAlg1AblehnungWiderspruchPDF(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    // Layout-Konstanten und PDF-Schreibfunktionen (wie in der letzten funktionierenden Version)
    const margin = 20;
    const defaultLineHeight = 7;
    const spaceAfterParagraph = 3; 
    const subHeadingFontSize = 11;
    const textFontSize = 10;     
    const betreffFontSize = 12;
    const smallTextFontSize = 8;

    let y = margin;
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const usableHeight = pageHeight - margin;

    function writeLine(text, currentLineHeight = defaultLineHeight, fontStyle = "normal", fontSize = textFontSize) {
        const textToWrite = text === undefined || text === null ? "" : String(text);
        if (y + currentLineHeight > usableHeight - (margin/2)) { doc.addPage(); y = margin; }
        doc.setFontSize(fontSize);
        doc.setFont("times", fontStyle); 
        doc.text(textToWrite, margin, y);
        y += currentLineHeight;
    }

    function writeParagraph(text, paragraphLineHeight = defaultLineHeight, paragraphFontSize = textFontSize, options = {}) {
        const textToWrite = text === undefined || text === null ? "" : String(text);
        const fontStyle = options.fontStyle || "normal";
        const extraSpacing = options.extraSpacingAfter === undefined ? spaceAfterParagraph : options.extraSpacingAfter;
        doc.setFontSize(paragraphFontSize);
        doc.setFont("times", fontStyle);
        
        const lines = doc.splitTextToSize(textToWrite, pageWidth - (2 * margin));
        for (let i = 0; i < lines.length; i++) {
            if (y + paragraphLineHeight > usableHeight - (margin/2) ) { doc.addPage(); y = margin; }
            doc.text(lines[i], margin, y);
            y += paragraphLineHeight;
        }
        if (y + extraSpacing > usableHeight - (margin/2) && lines.length > 0) {
             doc.addPage(); y = margin;
        } else if (lines.length > 0) { 
            y += extraSpacing;
        }
    }
    
    // Formulardaten aus dem 'data' Objekt verwenden
    const {
        personName, kundenNummer, anzahlPersonenAlg1Ablehnung,
        personAdresse, personPlz, personOrt,
        agenturName, agenturAdresse,
        bescheidDatum, bescheidAktenzeichen, ablehnungsgrundVermieter,
        widerspruchsgruende,
        textAnwartschaft, textArbeitslosigkeit, textVerfuegbarkeit, textArbeitslosmeldung,
        ergaenzendeArgumenteAlg1Ablehnung, forderungAlg1Ablehnung,
        anlagen, anlageSonstigesAlg1Ablehnung
    } = data;

    const bescheidDatumFormatiert = getFormattedDateValue(bescheidDatum, "UNBEKANNT");

    doc.setFont("times", "normal");

    // Absender
    writeLine(personName);
    writeLine(personAdresse);
    writeLine(`${personPlz} ${personOrt}`);
    writeLine(`Kundennummer: ${kundenNummer}`);
    if (y + defaultLineHeight <= usableHeight) y += defaultLineHeight; else {doc.addPage(); y = margin;}

    // Empfänger
    writeLine(agenturName);
    agenturAdresse.split("\n").forEach(line => writeLine(line.trim()));
    if (y + defaultLineHeight * 2 <= usableHeight) y += defaultLineHeight * 2; else {doc.addPage(); y = margin;}

    // Datum
    const datumHeute = new Date().toLocaleDateString("de-DE");
    doc.setFontSize(textFontSize);
    const datumsBreite = doc.getStringUnitWidth(datumHeute) * textFontSize / doc.internal.scaleFactor;
    if (y + defaultLineHeight > usableHeight) { doc.addPage(); y = margin; }
    doc.text(datumHeute, pageWidth - margin - datumsBreite, y);
    y += defaultLineHeight * 2; 

    // Betreff
    let betreffText = `Widerspruch gegen Ihren Ablehnungsbescheid zum Arbeitslosengeld I vom ${bescheidDatumFormatiert}`;
    if (bescheidAktenzeichen && bescheidAktenzeichen.trim() !== "") betreffText += `, Ihr Zeichen: ${bescheidAktenzeichen}`;
    betreffText += `\nVersicherter: ${personName}, Kundennummer: ${kundenNummer}`;
    betreffText += `\n- Aufforderung zur Rücknahme der Ablehnung und Leistungsbewilligung -`;
    
    writeParagraph(betreffText, defaultLineHeight, betreffFontSize, {fontStyle: "bold", extraSpacingAfter: defaultLineHeight});

    // Anrede
    writeParagraph("Sehr geehrte Damen und Herren,", defaultLineHeight, textFontSize, {extraSpacingAfter: defaultLineHeight * 0.5});

    // ======================================================
    // START: Logik für getrennte Textblöcke (Singular vs. Plural)
    // ======================================================

    if (anzahlPersonenAlg1Ablehnung === "mehrerePersonen") {
        // --- TEXTBLOCK FÜR PLURAL ("WIR") ---
        writeParagraph(`hiermit legen wir fristgerecht und mit allem Nachdruck Widerspruch gegen Ihren oben genannten Bescheid vom ${bescheidDatumFormatiert} ein. Mit diesem Bescheid lehnen Sie unseren Antrag auf Arbeitslosengeld I ab.`);
        writeParagraph(`Diese Entscheidung ist nach unserer Auffassung rechtswidrig, da die gesetzlichen Voraussetzungen für einen Anspruch auf Arbeitslosengeld nach dem Dritten Buch Sozialgesetzbuch (SGB III) in unserem Fall vollumfänglich erfüllt sind.`);
        
        writeLine(`Begründung unseres Widerspruchs:`, defaultLineHeight, "bold", subHeadingFontSize);
        y += spaceAfterParagraph / 2; 
        writeParagraph(`Sie begründen Ihre Ablehnung mit folgendem Sachverhalt: "${ablehnungsgrundVermieter || 'siehe Ihr Bescheid'}". Diese Bewertung ist aus den nachfolgend dargelegten Gründen fehlerhaft und nicht haltbar:`, defaultLineHeight, textFontSize);

        if (widerspruchsgruende.includes("anwartschaft") && textAnwartschaft && textAnwartschaft.trim() !== "") {
            writeLine("Die Anwartschaftszeit (§ 142 SGB III) ist erfüllt:", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textAnwartschaft);
        }
        if (widerspruchsgruende.includes("arbeitslosigkeit") && textArbeitslosigkeit && textArbeitslosigkeit.trim() !== "") {
            writeLine("Die Voraussetzung der Arbeitslosigkeit (§ 138 Abs. 1 Nr. 1 SGB III) liegt vor:", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textArbeitslosigkeit);
        }
        if (widerspruchsgruende.includes("verfuegbarkeit") && textVerfuegbarkeit && textVerfuegbarkeit.trim() !== "") {
            writeLine("Wir stehen der Arbeitsvermittlung zur Verfügung (§ 138 Abs. 1 Nr. 3 SGB III):", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textVerfuegbarkeit);
        }
        if (widerspruchsgruende.includes("arbeitslosmeldung") && textArbeitslosmeldung && textArbeitslosmeldung.trim() !== "") {
            writeLine("Die persönliche Arbeitslosmeldung ist fristgerecht erfolgt (§ 141 SGB III):", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textArbeitslosmeldung);
        }
        if (ergaenzendeArgumenteAlg1Ablehnung && ergaenzendeArgumenteAlg1Ablehnung.trim() !== "") {
            writeLine("Weitere ergänzende Ausführungen:", defaultLineHeight, "bold", textFontSize);
            writeParagraph(ergaenzendeArgumenteAlg1Ablehnung);
        }
        
        writeParagraph(`Aus den genannten Gründen sind alle Voraussetzungen für unseren Anspruch auf Arbeitslosengeld I erfüllt. Die Ablehnung ist rechtswidrig und aufzuheben.`);
        
        writeLine(`Unser Antrag im Widerspruchsverfahren:`, defaultLineHeight, "bold", subHeadingFontSize);
        y += spaceAfterParagraph / 2;
        writeParagraph(forderungAlg1Ablehnung, defaultLineHeight, textFontSize, {fontStyle:"bold"});
    
    } else {
        // --- TEXTBLOCK FÜR SINGULAR ("ICH") ---
        writeParagraph(`hiermit lege ich fristgerecht und mit allem Nachdruck Widerspruch gegen Ihren oben genannten Bescheid vom ${bescheidDatumFormatiert} ein. Mit diesem Bescheid lehnen Sie meinen Antrag auf Arbeitslosengeld I ab.`);
        writeParagraph(`Diese Entscheidung ist nach meiner Auffassung rechtswidrig, da die gesetzlichen Voraussetzungen für einen Anspruch auf Arbeitslosengeld nach dem Dritten Buch Sozialgesetzbuch (SGB III) in meinem Fall vollumfänglich erfüllt sind.`);

        writeLine(`Begründung meines Widerspruchs:`, defaultLineHeight, "bold", subHeadingFontSize);
        y += spaceAfterParagraph / 2;
        writeParagraph(`Sie begründen Ihre Ablehnung mit folgendem Sachverhalt: "${ablehnungsgrundVermieter || 'siehe Ihr Bescheid'}". Diese Bewertung ist aus den nachfolgend dargelegten Gründen fehlerhaft und nicht haltbar:`, defaultLineHeight, textFontSize);

        if (widerspruchsgruende.includes("anwartschaft") && textAnwartschaft && textAnwartschaft.trim() !== "") {
            writeLine("Die Anwartschaftszeit (§ 142 SGB III) ist erfüllt:", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textAnwartschaft);
        }
        if (widerspruchsgruende.includes("arbeitslosigkeit") && textArbeitslosigkeit && textArbeitslosigkeit.trim() !== "") {
            writeLine("Die Voraussetzung der Arbeitslosigkeit (§ 138 Abs. 1 Nr. 1 SGB III) liegt vor:", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textArbeitslosigkeit);
        }
        if (widerspruchsgruende.includes("verfuegbarkeit") && textVerfuegbarkeit && textVerfuegbarkeit.trim() !== "") {
            writeLine("Ich stehe der Arbeitsvermittlung zur Verfügung (§ 138 Abs. 1 Nr. 3 SGB III):", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textVerfuegbarkeit);
        }
        if (widerspruchsgruende.includes("arbeitslosmeldung") && textArbeitslosmeldung && textArbeitslosmeldung.trim() !== "") {
            writeLine("Die persönliche Arbeitslosmeldung ist fristgerecht erfolgt (§ 141 SGB III):", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textArbeitslosmeldung);
        }
        if (ergaenzendeArgumenteAlg1Ablehnung && ergaenzendeArgumenteAlg1Ablehnung.trim() !== "") {
            writeLine("Weitere ergänzende Ausführungen:", defaultLineHeight, "bold", textFontSize);
            writeParagraph(ergaenzendeArgumenteAlg1Ablehnung);
        }

        writeParagraph(`Aus den genannten Gründen sind alle Voraussetzungen für meinen Anspruch auf Arbeitslosengeld I erfüllt. Ihre Ablehnung ist rechtswidrig und aufzuheben.`);
        
        writeLine(`Mein Antrag im Widerspruchsverfahren:`, defaultLineHeight, "bold", subHeadingFontSize);
        y += spaceAfterParagraph / 2;
        writeParagraph(forderungAlg1Ablehnung, defaultLineHeight, textFontSize, {fontStyle:"bold"});
    }

    // --- Gemeinsamer Schlussteil ---
    if (anlagen && anlagen.length > 0) {
        writeLine("Anlagen:", defaultLineHeight, "bold", subHeadingFontSize);
        y += spaceAfterParagraph / 2;
        anlagen.forEach(anlage => {
            writeParagraph(`- ${anlage}`);
        });
        const anlageSonstigesText = data.anlageSonstigesAlg1Ablehnung || "";
        if (anlageSonstigesText.trim() !== "") { 
            writeParagraph(`- Sonstige Anlagen: ${anlageSonstigesText}`);
        }
    }
    
    writeParagraph(`Es wird aufgefordert, den angefochtenen Bescheid aufzuheben, über den Antrag auf Arbeitslosengeld I unter Beachtung der dargelegten Rechtsauffassung neu zu entscheiden und die Leistungen antragsgemäß zu bewilligen.`, defaultLineHeight, textFontSize, {fontStyle:"italic"});
    writeParagraph(`Für den Fall, dass dem Widerspruch nicht oder nicht vollständig abgeholfen wird, bleibt die Einleitung weiterer rechtlicher Schritte ausdrücklich vorbehalten.`, defaultLineHeight, textFontSize, {fontStyle: "italic"});
    
    y += defaultLineHeight;
    
    writeParagraph("Mit freundlichen Grüßen");
    writeParagraph("\n\n_________________________"); 
    writeParagraph(personName);

    doc.save("widerspruch_alg1_ablehnung.pdf");
}
// ===================================================================================
// ENDE:  Ablehnung ALG1
// ===================================================================================

// ===================================================================================
// START:  Bescheid ALG1
// ===================================================================================

function generateAlg1BescheidWiderspruchPDF(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    // Layout-Konstanten und PDF-Schreibfunktionen (wie in der letzten funktionierenden Version)
    const margin = 20;
    const defaultLineHeight = 7;
    const spaceAfterParagraph = 3; 
    const subHeadingFontSize = 11;
    const textFontSize = 10;     
    const betreffFontSize = 12;

    let y = margin;
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const usableHeight = pageHeight - margin;

    function writeLine(text, currentLineHeight = defaultLineHeight, fontStyle = "normal", fontSize = textFontSize) {
        const textToWrite = text === undefined || text === null ? "" : String(text);
        if (y + currentLineHeight > usableHeight - (margin/2)) { doc.addPage(); y = margin; }
        doc.setFontSize(fontSize);
        doc.setFont("times", fontStyle); 
        doc.text(textToWrite, margin, y);
        y += currentLineHeight;
    }

    function writeParagraph(text, paragraphLineHeight = defaultLineHeight, paragraphFontSize = textFontSize, options = {}) {
        const textToWrite = text === undefined || text === null ? "" : String(text);
        const fontStyle = options.fontStyle || "normal";
        const extraSpacing = options.extraSpacingAfter === undefined ? spaceAfterParagraph : options.extraSpacingAfter;
        doc.setFontSize(paragraphFontSize);
        doc.setFont("times", fontStyle);
        
        const lines = doc.splitTextToSize(textToWrite, pageWidth - (2 * margin));
        for (let i = 0; i < lines.length; i++) {
            if (y + paragraphLineHeight > usableHeight - (margin/2) ) { doc.addPage(); y = margin; }
            doc.text(lines[i], margin, y);
            y += paragraphLineHeight;
        }
        if (y + extraSpacing > usableHeight - (margin/2) && lines.length > 0) {
             doc.addPage(); y = margin;
        } else if (lines.length > 0) { 
            y += extraSpacing;
        }
    }
    
    const {
        personName, kundenNummer, anzahlPersonenAlg1,
        personAdresse, personPlz, personOrt,
        agenturName, agenturAdresse,
        bescheidDatum, bescheidAktenzeichen,
        widerspruchsgruende,
        textHoehe, textDauer,
        ergaenzendeArgumenteAlg1, forderungAlg1,
        anlagen, anlageSonstigesAlg1
    } = data;

    const bescheidDatumFormatiert = getFormattedDateValue(bescheidDatum, "UNBEKANNT");

    doc.setFont("times", "normal");

    // Absender
    writeLine(personName);
    writeLine(personAdresse);
    writeLine(`${personPlz} ${personOrt}`);
    writeLine(`Kundennummer: ${kundenNummer}`);
    if (y + defaultLineHeight <= usableHeight) y += defaultLineHeight; else {doc.addPage(); y = margin;}

    // Empfänger
    writeLine(agenturName);
    agenturAdresse.split("\n").forEach(line => writeLine(line.trim()));
    if (y + defaultLineHeight * 2 <= usableHeight) y += defaultLineHeight * 2; else {doc.addPage(); y = margin;}

    // Datum
    const datumHeute = new Date().toLocaleDateString("de-DE");
    doc.setFontSize(textFontSize);
    const datumsBreite = doc.getStringUnitWidth(datumHeute) * textFontSize / doc.internal.scaleFactor;
    if (y + defaultLineHeight > usableHeight) { doc.addPage(); y = margin; }
    doc.text(datumHeute, pageWidth - margin - datumsBreite, y);
    y += defaultLineHeight * 2; 

    // Betreff
    let betreffText = `Widerspruch gegen Ihren Bescheid über Arbeitslosengeld I vom ${bescheidDatumFormatiert}`;
    if (bescheidAktenzeichen && bescheidAktenzeichen.trim() !== "") betreffText += `, Ihr Zeichen: ${bescheidAktenzeichen}`;
    betreffText += `\nVersicherter: ${personName}, Kundennummer: ${kundenNummer}`;
    betreffText += `\n- Aufforderung zur Neuberechnung und Korrektur des Leistungsanspruchs -`;
    
    writeParagraph(betreffText, defaultLineHeight, betreffFontSize, {fontStyle: "bold", extraSpacingAfter: defaultLineHeight});

    // Anrede
    writeParagraph("Sehr geehrte Damen und Herren,", defaultLineHeight, textFontSize, {extraSpacingAfter: defaultLineHeight * 0.5});

    // ======================================================
    // START: Logik für getrennte Textblöcke (Singular vs. Plural)
    // ======================================================

    if (anzahlPersonenAlg1 === "mehrerePersonen") {
        // --- TEXTBLOCK FÜR PLURAL ("WIR") ---
        writeParagraph(`hiermit legen wir fristgerecht und mit allem Nachdruck Widerspruch gegen Ihren oben genannten Bescheid vom ${bescheidDatumFormatiert} ein.`);
        writeParagraph(`Die in diesem Bescheid getroffene Festsetzung bezüglich der Höhe und/oder der Dauer unseres Anspruchs auf Arbeitslosengeld ist nach unserer Auffassung rechtswidrig und beruht auf einer fehlerhaften Tatsachengrundlage bzw. Rechtsanwendung.`);
        
        writeLine(`Begründung unseres Widerspruchs:`, defaultLineHeight, "bold", subHeadingFontSize);
        y += spaceAfterParagraph / 2; 

        if (widerspruchsgruende.includes("hoehe") && textHoehe && textHoehe.trim() !== "") {
            writeLine("Zur fehlerhaften Berechnung der Leistungshöhe (§ 149 f. SGB III):", defaultLineHeight, "bold", textFontSize);
            writeParagraph(`Sie haben die Höhe unseres Leistungsanspruchs fehlerhaft berechnet. Das von Ihnen zugrunde gelegte Bemessungsentgelt ist unzutreffend. Folgende Punkte wurden nicht oder nicht korrekt berücksichtigt:`);
            writeParagraph(textHoehe);
        }
        if (widerspruchsgruende.includes("dauer") && textDauer && textDauer.trim() !== "") {
            writeLine("Zur fehlerhaften Berechnung der Anspruchsdauer (§ 147 SGB III):", defaultLineHeight, "bold", textFontSize);
            writeParagraph(`Sie haben die Dauer unseres Leistungsanspruchs zu kurz bemessen. Bei der Prüfung der Anwartschaftszeit wurden relevante Versicherungszeiten zu Unrecht nicht berücksichtigt:`);
            writeParagraph(textDauer);
        }
        if (ergaenzendeArgumenteAlg1 && ergaenzendeArgumenteAlg1.trim() !== "") {
            writeLine("Weitere ergänzende Ausführungen:", defaultLineHeight, "bold", textFontSize);
            writeParagraph(ergaenzendeArgumenteAlg1);
        }
        
        writeParagraph(`Wir bitten Sie, die Berechnungsgrundlagen unter Einbeziehung der beigefügten Nachweise neu zu prüfen.`, defaultLineHeight, textFontSize, {fontStyle: "italic", extraSpacingAfter: defaultLineHeight*0.5});
        
        writeLine(`Unser Antrag im Widerspruchsverfahren:`, defaultLineHeight, "bold", subHeadingFontSize);
        y += spaceAfterParagraph / 2;
        writeParagraph(forderungAlg1, defaultLineHeight, textFontSize, {fontStyle:"bold"});
    
    } else {
        // --- TEXTBLOCK FÜR SINGULAR ("ICH") ---
        writeParagraph(`hiermit lege ich fristgerecht und mit allem Nachdruck Widerspruch gegen Ihren oben genannten Bescheid vom ${bescheidDatumFormatiert} ein.`);
        writeParagraph(`Die in diesem Bescheid getroffene Festsetzung bezüglich der Höhe und/oder der Dauer meines Anspruchs auf Arbeitslosengeld ist nach meiner Auffassung rechtswidrig und beruht auf einer fehlerhaften Tatsachengrundlage bzw. Rechtsanwendung.`);

        writeLine(`Begründung meines Widerspruchs:`, defaultLineHeight, "bold", subHeadingFontSize);
        y += spaceAfterParagraph / 2;

        if (widerspruchsgruende.includes("hoehe") && textHoehe && textHoehe.trim() !== "") {
            writeLine("Zur fehlerhaften Berechnung der Leistungshöhe (§ 149 f. SGB III):", defaultLineHeight, "bold", textFontSize);
            writeParagraph(`Sie haben die Höhe meines Leistungsanspruchs fehlerhaft berechnet. Das von Ihnen zugrunde gelegte Bemessungsentgelt ist unzutreffend. Folgende Punkte wurden nicht oder nicht korrekt berücksichtigt:`);
            writeParagraph(textHoehe);
        }
        if (widerspruchsgruende.includes("dauer") && textDauer && textDauer.trim() !== "") {
            writeLine("Zur fehlerhaften Berechnung der Anspruchsdauer (§ 147 SGB III):", defaultLineHeight, "bold", textFontSize);
            writeParagraph(`Sie haben die Dauer meines Leistungsanspruchs zu kurz bemessen. Bei der Prüfung der Anwartschaftszeit wurden relevante Versicherungszeiten zu Unrecht nicht berücksichtigt:`);
            writeParagraph(textDauer);
        }
        if (ergaenzendeArgumenteAlg1 && ergaenzendeArgumenteAlg1.trim() !== "") {
            writeLine("Weitere ergänzende Ausführungen:", defaultLineHeight, "bold", textFontSize);
            writeParagraph(ergaenzendeArgumenteAlg1);
        }
        
        writeParagraph(`Ich bitte Sie, die Berechnungsgrundlagen unter Einbeziehung der beigefügten Nachweise neu zu prüfen.`, defaultLineHeight, textFontSize, {fontStyle: "italic", extraSpacingAfter: defaultLineHeight*0.5});

        writeLine(`Mein Antrag im Widerspruchsverfahren:`, defaultLineHeight, "bold", subHeadingFontSize);
        y += spaceAfterParagraph / 2;
        writeParagraph(forderungAlg1, defaultLineHeight, textFontSize, {fontStyle:"bold"});
    }

    // --- Gemeinsamer Schlussteil ---
    if (anlagen && anlagen.length > 0) {
        writeLine("Anlagen:", defaultLineHeight, "bold", subHeadingFontSize);
        y += spaceAfterParagraph / 2;
        anlagen.forEach(anlage => {
            writeParagraph(`- ${anlage}`);
        });
        const anlageSonstigesText = data.anlageSonstigesAlg1 || "";
        if (anlageSonstigesText.trim() !== "") { 
            writeParagraph(`- Sonstige Anlagen: ${anlageSonstigesText}`);
        }
    }
    
    writeParagraph(`Es wird um eine schriftliche Bestätigung des Eingangs dieses Widerspruchs, um eine Korrektur des Bescheides sowie um die umgehende Nachzahlung der zu Unrecht vorenthaltenen Beträge gebeten.`, defaultLineHeight, textFontSize);
    writeParagraph(`Für den Fall, dass dem Widerspruch nicht oder nicht vollständig abgeholfen wird, bleibt die Einleitung weiterer rechtlicher Schritte ausdrücklich vorbehalten.`, defaultLineHeight, textFontSize, {fontStyle: "italic"});
    
    y += defaultLineHeight;
    
    writeParagraph("Mit freundlichen Grüßen");
    writeParagraph("\n\n_________________________"); 
    writeParagraph(personName);

    doc.save("widerspruch_alg1_bescheid.pdf");
}
// ===================================================================================
// ENDE:  Bescheid ALG1
// ===================================================================================

// ===================================================================================
// Start:  Sperrzeit ALG1
// ===================================================================================

function generateAlg1SperrzeitWiderspruchPDF(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    // Layout-Konstanten und PDF-Schreibfunktionen (wie in der letzten funktionierenden Version)
    const margin = 20;
    const defaultLineHeight = 7;
    const spaceAfterParagraph = 3; 
    const subHeadingFontSize = 11;
    const textFontSize = 10;     
    const betreffFontSize = 12;
    const smallTextFontSize = 8;

    let y = margin;
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const usableHeight = pageHeight - margin;

    function writeLine(text, currentLineHeight = defaultLineHeight, fontStyle = "normal", fontSize = textFontSize) {
        const textToWrite = text === undefined || text === null ? "" : String(text);
        if (y + currentLineHeight > usableHeight - (margin/2)) { doc.addPage(); y = margin; }
        doc.setFontSize(fontSize);
        doc.setFont("times", fontStyle); 
        doc.text(textToWrite, margin, y);
        y += currentLineHeight;
    }

    function writeParagraph(text, paragraphLineHeight = defaultLineHeight, paragraphFontSize = textFontSize, options = {}) {
        const textToWrite = text === undefined || text === null ? "" : String(text);
        const fontStyle = options.fontStyle || "normal";
        const extraSpacing = options.extraSpacingAfter === undefined ? spaceAfterParagraph : options.extraSpacingAfter;
        doc.setFontSize(paragraphFontSize);
        doc.setFont("times", fontStyle);
        
        const lines = doc.splitTextToSize(textToWrite, pageWidth - (2 * margin));
        for (let i = 0; i < lines.length; i++) {
            if (y + paragraphLineHeight > usableHeight - (margin/2) ) { doc.addPage(); y = margin; }
            doc.text(lines[i], margin, y);
            y += paragraphLineHeight;
        }
        if (y + extraSpacing > usableHeight - (margin/2) && lines.length > 0) {
             doc.addPage(); y = margin;
        } else if (lines.length > 0) { 
            y += extraSpacing;
        }
    }
    
    // Formulardaten aus dem 'data' Objekt verwenden
    const {
        personName, kundenNummer, anzahlPersonenSperrzeit,
        personAdresse, personPlz, personOrt,
        agenturName, agenturAdresse,
        bescheidDatum, bescheidAktenzeichen, sperrzeitGrund, sperrzeitDauer,
        widerspruchsgruende,
        textWichtigerGrund, textSachverhaltFalsch, textAnhaerungFehlte,
        ergaenzendeArgumenteSperrzeit, forderungSperrzeit,
        anlagen, anlageSonstigesSperrzeit
    } = data;

    const bescheidDatumFormatiert = getFormattedDateValue(bescheidDatum, "UNBEKANNT");

    doc.setFont("times", "normal");

    // Absender
    writeLine(personName);
    writeLine(personAdresse);
    writeLine(`${personPlz} ${personOrt}`);
    writeLine(`Kundennummer: ${kundenNummer}`);
    if (y + defaultLineHeight <= usableHeight) y += defaultLineHeight; else {doc.addPage(); y = margin;}

    // Empfänger
    writeLine(agenturName);
    agenturAdresse.split("\n").forEach(line => writeLine(line.trim()));
    if (y + defaultLineHeight * 2 <= usableHeight) y += defaultLineHeight * 2; else {doc.addPage(); y = margin;}

    // Datum
    const datumHeute = new Date().toLocaleDateString("de-DE");
    doc.setFontSize(textFontSize);
    const datumsBreite = doc.getStringUnitWidth(datumHeute) * textFontSize / doc.internal.scaleFactor;
    if (y + defaultLineHeight > usableHeight) { doc.addPage(); y = margin; }
    doc.text(datumHeute, pageWidth - margin - datumsBreite, y);
    y += defaultLineHeight * 2; 

    // Betreff
    let betreffText = `Widerspruch gegen Ihren Sperrzeitbescheid vom ${bescheidDatumFormatiert}`;
    if (bescheidAktenzeichen && bescheidAktenzeichen.trim() !== "") betreffText += `, Ihr Zeichen: ${bescheidAktenzeichen}`;
    betreffText += `\nVersicherter: ${personName}, Kundennummer: ${kundenNummer}`;
    betreffText += `\n- Aufforderung zur Rücknahme des Sperrzeit-Tatbestandes und zur unverzüglichen Leistungsbewilligung -`;
    
    writeParagraph(betreffText, defaultLineHeight, betreffFontSize, {fontStyle: "bold", extraSpacingAfter: defaultLineHeight});

    // Anrede
    writeParagraph("Sehr geehrte Damen und Herren,", defaultLineHeight, textFontSize, {extraSpacingAfter: defaultLineHeight * 0.5});

    // ======================================================
    // START: Logik für getrennte Textblöcke (Singular vs. Plural - hier meist Singular relevant)
    // ======================================================

    if (anzahlPersonenSperrzeit === "mehrerePersonen") {
        // --- TEXTBLOCK FÜR PLURAL ("WIR") ---
        // Hinweis: Dieser Fall ist bei ALG I sehr selten, aber für die Vollständigkeit hier enthalten.
        writeParagraph(`hiermit legen wir fristgerecht und mit allem Nachdruck Widerspruch gegen Ihren oben genannten Bescheid vom ${bescheidDatumFormatiert} ein. Mit diesem Bescheid stellen Sie den Eintritt einer Sperrzeit von ${sperrzeitDauer || '[Dauer]'} fest.`);
        writeParagraph(`Diese Entscheidung ist nach unserer Auffassung rechtswidrig und unbegründet. Die Voraussetzungen für den Eintritt einer Sperrzeit nach § 159 SGB III liegen nicht vor. Der Bescheid ist daher aufzuheben.`);
        
        writeLine(`Begründung unseres Widerspruchs:`, defaultLineHeight, "bold", subHeadingFontSize);
        y += spaceAfterParagraph / 2; 
        writeParagraph(`Sie begründen die Sperrzeit mit folgendem Sachverhalt: "${sperrzeitGrund || 'siehe Ihr Bescheid'}". Diese Bewertung ist aus den nachfolgend dargelegten Gründen nicht haltbar:`, defaultLineHeight, textFontSize);

        if (widerspruchsgruende.includes("wichtigerGrund") && textWichtigerGrund && textWichtigerGrund.trim() !== "") {
            writeLine("Für unser Handeln lag ein wichtiger Grund im Sinne des § 159 Abs. 1 S. 1 SGB III vor:", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textWichtigerGrund);
        }
        if (widerspruchsgruende.includes("sachverhaltFalsch") && textSachverhaltFalsch && textSachverhaltFalsch.trim() !== "") {
            writeLine("Der von Ihnen zugrunde gelegte Sachverhalt ist unzutreffend:", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textSachverhaltFalsch);
        }
        if (widerspruchsgruende.includes("anhaerungFehlte") && textAnhaerungFehlte && textAnhaerungFehlte.trim() !== "") {
            writeLine("Die nach § 24 SGB X erforderliche Anhörung vor Erlass des Bescheides fehlte oder war fehlerhaft:", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textAnhaerungFehlte);
        }
        if (ergaenzendeArgumenteSperrzeit && ergaenzendeArgumenteSperrzeit.trim() !== "") {
            writeLine("Weitere ergänzende Ausführungen:", defaultLineHeight, "bold", textFontSize);
            writeParagraph(ergaenzendeArgumenteSperrzeit);
        }
        
        writeParagraph(`Aus den genannten Gründen ist die Festsetzung einer Sperrzeit rechtswidrig.`, defaultLineHeight, textFontSize, {fontStyle: "italic", extraSpacingAfter: defaultLineHeight*0.5});
        
        writeLine(`Unser Antrag im Widerspruchsverfahren:`, defaultLineHeight, "bold", subHeadingFontSize);
        y += spaceAfterParagraph / 2;
        writeParagraph(forderungSperrzeit, defaultLineHeight, textFontSize, {fontStyle:"bold"});
    
    } else {
        // --- TEXTBLOCK FÜR SINGULAR ("ICH") ---
        writeParagraph(`hiermit lege ich fristgerecht und mit allem Nachdruck Widerspruch gegen Ihren oben genannten Bescheid vom ${bescheidDatumFormatiert} ein. Mit diesem Bescheid stellen Sie den Eintritt einer Sperrzeit von ${sperrzeitDauer || '[Dauer]'} fest.`);
        writeParagraph(`Diese Entscheidung ist nach meiner Auffassung rechtswidrig und unbegründet. Die Voraussetzungen für den Eintritt einer Sperrzeit nach § 159 SGB III liegen nicht vor. Der Bescheid ist daher aufzuheben.`);

        writeLine(`Begründung meines Widerspruchs:`, defaultLineHeight, "bold", subHeadingFontSize);
        y += spaceAfterParagraph / 2;
        writeParagraph(`Sie begründen die Sperrzeit mit folgendem Sachverhalt: "${sperrzeitGrund || 'siehe Ihr Bescheid'}". Diese Bewertung ist aus den nachfolgend dargelegten Gründen nicht haltbar:`, defaultLineHeight, textFontSize);

        if (widerspruchsgruende.includes("wichtigerGrund") && textWichtigerGrund && textWichtigerGrund.trim() !== "") {
            writeLine("Für mein Handeln lag ein wichtiger Grund im Sinne des § 159 Abs. 1 S. 1 SGB III vor:", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textWichtigerGrund);
        }
        if (widerspruchsgruende.includes("sachverhaltFalsch") && textSachverhaltFalsch && textSachverhaltFalsch.trim() !== "") {
            writeLine("Der von Ihnen zugrunde gelegte Sachverhalt ist unzutreffend:", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textSachverhaltFalsch);
        }
        if (widerspruchsgruende.includes("anhaerungFehlte") && textAnhaerungFehlte && textAnhaerungFehlte.trim() !== "") {
            writeLine("Die nach § 24 SGB X erforderliche Anhörung vor Erlass des Bescheides fehlte oder war fehlerhaft:", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textAnhaerungFehlte);
        }
        if (ergaenzendeArgumenteSperrzeit && ergaenzendeArgumenteSperrzeit.trim() !== "") {
            writeLine("Weitere ergänzende Ausführungen:", defaultLineHeight, "bold", textFontSize);
            writeParagraph(ergaenzendeArgumenteSperrzeit);
        }
        
        writeParagraph(`Aus den genannten Gründen ist die Festsetzung einer Sperrzeit rechtswidrig.`, defaultLineHeight, textFontSize, {fontStyle: "italic", extraSpacingAfter: defaultLineHeight*0.5});

        writeLine(`Mein Antrag im Widerspruchsverfahren:`, defaultLineHeight, "bold", subHeadingFontSize);
        y += spaceAfterParagraph / 2;
        writeParagraph(forderungSperrzeit, defaultLineHeight, textFontSize, {fontStyle:"bold"});
    }

    // --- Gemeinsamer Schlussteil ---
    if (anlagen && anlagen.length > 0) {
        writeLine("Anlagen:", defaultLineHeight, "bold", subHeadingFontSize);
        y += spaceAfterParagraph / 2;
        anlagen.forEach(anlage => {
            writeParagraph(`- ${anlage}`);
        });
        const anlageSonstigesText = data.anlageSonstigesSperrzeit || ""; // ID aus HTML anpassen
        if (anlageSonstigesText.trim() !== "") { 
            writeParagraph(`- Sonstige Anlagen: ${anlageSonstigesText}`);
        }
    }
    
    writeParagraph(`Es wird um eine schriftliche Bestätigung des Eingangs dieses Widerspruchs sowie um eine rechtsmittelfähige Entscheidung innerhalb der gesetzlichen Fristen gebeten.`, defaultLineHeight, textFontSize);
    writeParagraph(`Für den Fall, dass dem Widerspruch nicht oder nicht vollständig abgeholfen wird, bleibt die Einleitung weiterer rechtlicher Schritte ausdrücklich vorbehalten.`, defaultLineHeight, textFontSize, {fontStyle: "italic"});
    
    y += defaultLineHeight;
    
    writeParagraph("Mit freundlichen Grüßen");
    writeParagraph("\n\n_________________________"); 
    writeParagraph(personName);

    doc.save("widerspruch_sperrzeit_alg1.pdf");
}
// ===================================================================================
// ENDE:  Sperrzeit ALG1
// ===================================================================================

// ===================================================================================
// START:  Vermögen Bürgergeld
// ===================================================================================

function generateVermoegenWiderspruchPDF(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    // Layout-Konstanten und PDF-Schreibfunktionen (wie in der letzten funktionierenden Version)
    const margin = 20;
    const defaultLineHeight = 7;
    const spaceAfterParagraph = 3; 
    const subHeadingFontSize = 11;
    const textFontSize = 10;     
    const smallTextFontSize = 8;
    const betreffFontSize = 12;

    let y = margin;
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const usableHeight = pageHeight - margin;

    function writeLine(text, currentLineHeight = defaultLineHeight, fontStyle = "normal", fontSize = textFontSize) {
        const textToWrite = text === undefined || text === null ? "" : String(text);
        if (y + currentLineHeight > usableHeight - (margin/2)) { doc.addPage(); y = margin; }
        doc.setFontSize(fontSize);
        doc.setFont("times", fontStyle); 
        doc.text(textToWrite, margin, y);
        y += currentLineHeight;
    }

    function writeParagraph(text, paragraphLineHeight = defaultLineHeight, paragraphFontSize = textFontSize, options = {}) {
        const textToWrite = text === undefined || text === null ? "" : String(text);
        const fontStyle = options.fontStyle || "normal";
        const extraSpacing = options.extraSpacingAfter === undefined ? spaceAfterParagraph : options.extraSpacingAfter;
        doc.setFontSize(paragraphFontSize);
        doc.setFont("times", fontStyle);
        
        const lines = doc.splitTextToSize(textToWrite, pageWidth - (2 * margin));
        for (let i = 0; i < lines.length; i++) {
            if (y + paragraphLineHeight > usableHeight - (margin/2) ) { doc.addPage(); y = margin; }
            doc.text(lines[i], margin, y);
            y += paragraphLineHeight;
        }
        if (y + extraSpacing > usableHeight - (margin/2) && lines.length > 0) {
             doc.addPage(); y = margin;
        } else if (lines.length > 0) { 
            y += extraSpacing;
        }
    }
    
    // Formulardaten aus dem 'data' Objekt verwenden
    const {
        personName, bgNummer, anzahlPersonenVermoegen,
        personAdresse, personPlz, personOrt,
        jcName, jcAdresse,
        bescheidDatum, bescheidAktenzeichen, bescheidInhalt,
        widerspruchsgruende,
        textFreibetrag, textAltersvorsorge, textKfz, textEigenheim, textUnwirtschaftlichkeit,
        ergaenzendeArgumenteVermoegen, forderungVermoegen,
        anlagen, anlageSonstigesVermoegenWiderspruch
    } = data;

    const bescheidDatumFormatiert = getFormattedDateValue(bescheidDatum, "UNBEKANNT");

    doc.setFont("times", "normal");

    // Absender
    writeLine(personName);
    writeLine(personAdresse);
    writeLine(`${personPlz} ${personOrt}`);
    writeLine(`BG-Nummer: ${bgNummer}`);
    if (y + defaultLineHeight <= usableHeight) y += defaultLineHeight; else {doc.addPage(); y = margin;}

    // Empfänger
    writeLine(jcName);
    jcAdresse.split("\n").forEach(line => writeLine(line.trim()));
    if (y + defaultLineHeight * 2 <= usableHeight) y += defaultLineHeight * 2; else {doc.addPage(); y = margin;}

    // Datum
    const datumHeute = new Date().toLocaleDateString("de-DE");
    doc.setFontSize(textFontSize);
    const datumsBreite = doc.getStringUnitWidth(datumHeute) * textFontSize / doc.internal.scaleFactor;
    if (y + defaultLineHeight > usableHeight) { doc.addPage(); y = margin; }
    doc.text(datumHeute, pageWidth - margin - datumsBreite, y);
    y += defaultLineHeight * 2; 

    // Betreff
    let betreffText = `Widerspruch gegen Ihren Bescheid vom ${bescheidDatumFormatiert} wegen fehlerhafter Vermögensanrechnung`;
    if (bescheidAktenzeichen && bescheidAktenzeichen.trim() !== "") betreffText += `, Aktenzeichen: ${bescheidAktenzeichen}`;
    betreffText += `\nBedarfsgemeinschaft: ${bgNummer}, ${personName}`;
    
    writeParagraph(betreffText, defaultLineHeight, betreffFontSize, {fontStyle: "bold", extraSpacingAfter: defaultLineHeight});

    // Anrede
    writeParagraph("Sehr geehrte Damen und Herren,", defaultLineHeight, textFontSize, {extraSpacingAfter: defaultLineHeight * 0.5});

    // ======================================================
    // START: Logik für getrennte Textblöcke (Singular vs. Plural)
    // ======================================================

    if (anzahlPersonenVermoegen === "mehrerePersonen") {
        // --- TEXTBLOCK FÜR PLURAL ("WIR") ---
        writeParagraph(`hiermit legen wir fristgerecht und mit allem Nachdruck Widerspruch gegen Ihren oben genannten Bescheid vom ${bescheidDatumFormatiert} ein. Mit diesem Bescheid haben Sie unsere Leistungen mit der Begründung abgelehnt oder gekürzt, dass wir über zu hohes verwertbares Vermögen verfügen.`);
        writeParagraph(`Ihre Einschätzung ist nach unserer Auffassung rechtswidrig und beruht auf einer fehlerhaften Bewertung unseres Vermögens gemäß § 12 SGB II. Die Entscheidung verletzt uns in unserem Recht auf Sicherung des Existenzminimums.`);
        
        writeLine(`Begründung unseres Widerspruchs:`, defaultLineHeight, "bold", subHeadingFontSize);
        y += spaceAfterParagraph / 2; 
        writeParagraph(`Die von Ihnen vorgenommene Anrechnung unseres Vermögens ist aus den folgenden, gesetzlich verankerten Gründen unzulässig:`, defaultLineHeight, textFontSize, {fontStyle:"italic"});

        if (widerspruchsgruende.includes("freibetrag") && textFreibetrag && textFreibetrag.trim() !== "") {
            writeLine("Das Vermögen liegt innerhalb der gesetzlichen Vermögensfreibeträge (§ 12 Abs. 2 und 3 SGB II):", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textFreibetrag);
        }
        if (widerspruchsgruende.includes("altersvorsorge") && textAltersvorsorge && textAltersvorsorge.trim() !== "") {
            writeLine("Es handelt sich um geschütztes Vermögen der Altersvorsorge (§ 12 Abs. 1 Nr. 3 SGB II):", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textAltersvorsorge);
        }
        if (widerspruchsgruende.includes("kfz") && textKfz && textKfz.trim() !== "") {
            writeLine("Es handelt sich um ein angemessenes und geschütztes Kraftfahrzeug (§ 12 Abs. 1 Nr. 2 SGB II):", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textKfz);
        }
        if (widerspruchsgruende.includes("eigenheim") && textEigenheim && textEigenheim.trim() !== "") {
            writeLine("Es handelt sich um ein angemessenes und geschütztes selbstgenutztes Wohneigentum (§ 12 Abs. 1 Nr. 4 SGB II):", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textEigenheim);
        }
        if (widerspruchsgruende.includes("unwirtschaftlichkeit") && textUnwirtschaftlichkeit && textUnwirtschaftlichkeit.trim() !== "") {
            writeLine("Die Verwertung des Vermögens wäre offensichtlich unwirtschaftlich (§ 12 Abs. 1 Nr. 6 SGB II):", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textUnwirtschaftlichkeit);
        }
        if (ergaenzendeArgumenteVermoegen && ergaenzendeArgumenteVermoegen.trim() !== "") {
            writeLine("Weitere ergänzende Ausführungen:", defaultLineHeight, "bold", textFontSize);
            writeParagraph(ergaenzendeArgumenteVermoegen);
        }
        
        writeLine(`Unser Antrag im Widerspruchsverfahren:`, defaultLineHeight, "bold", subHeadingFontSize);
        y += spaceAfterParagraph / 2;
        writeParagraph(forderungVermoegen, defaultLineHeight, textFontSize, {fontStyle:"bold"});
    
    } else {
        // --- TEXTBLOCK FÜR SINGULAR ("ICH") ---
        writeParagraph(`hiermit lege ich fristgerecht und mit allem Nachdruck Widerspruch gegen Ihren oben genannten Bescheid vom ${bescheidDatumFormatiert} ein. Mit diesem Bescheid haben Sie meine Leistungen mit der Begründung abgelehnt oder gekürzt, dass ich über zu hohes verwertbares Vermögen verfüge.`);
        writeParagraph(`Ihre Einschätzung ist nach meiner Auffassung rechtswidrig und beruht auf einer fehlerhaften Bewertung meines Vermögens gemäß § 12 SGB II. Die von Ihnen getroffene Entscheidung verletzt mich in meinem Recht auf Sicherung des Existenzminimums.`);
        
        writeLine(`Begründung meines Widerspruchs:`, defaultLineHeight, "bold", subHeadingFontSize);
        y += spaceAfterParagraph / 2;
        writeParagraph(`Die von Ihnen vorgenommene Anrechnung meines Vermögens ist aus den folgenden, gesetzlich verankerten Gründen unzulässig:`, defaultLineHeight, textFontSize, {fontStyle:"italic"});

        if (widerspruchsgruende.includes("freibetrag") && textFreibetrag && textFreibetrag.trim() !== "") {
            writeLine("Das Vermögen liegt innerhalb der gesetzlichen Vermögensfreibeträge (§ 12 Abs. 2 und 3 SGB II):", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textFreibetrag);
        }
        if (widerspruchsgruende.includes("altersvorsorge") && textAltersvorsorge && textAltersvorsorge.trim() !== "") {
            writeLine("Es handelt sich um geschütztes Vermögen der Altersvorsorge (§ 12 Abs. 1 Nr. 3 SGB II):", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textAltersvorsorge);
        }
        if (widerspruchsgruende.includes("kfz") && textKfz && textKfz.trim() !== "") {
            writeLine("Es handelt sich um ein angemessenes und geschütztes Kraftfahrzeug (§ 12 Abs. 1 Nr. 2 SGB II):", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textKfz);
        }
        if (widerspruchsgruende.includes("eigenheim") && textEigenheim && textEigenheim.trim() !== "") {
            writeLine("Es handelt sich um ein angemessenes und geschütztes selbstgenutztes Wohneigentum (§ 12 Abs. 1 Nr. 4 SGB II):", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textEigenheim);
        }
        if (widerspruchsgruende.includes("unwirtschaftlichkeit") && textUnwirtschaftlichkeit && textUnwirtschaftlichkeit.trim() !== "") {
            writeLine("Die Verwertung des Vermögens wäre offensichtlich unwirtschaftlich (§ 12 Abs. 1 Nr. 6 SGB II):", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textUnwirtschaftlichkeit);
        }
        if (ergaenzendeArgumenteVermoegen && ergaenzendeArgumenteVermoegen.trim() !== "") {
            writeLine("Weitere ergänzende Ausführungen:", defaultLineHeight, "bold", textFontSize);
            writeParagraph(ergaenzendeArgumenteVermoegen);
        }

        writeLine(`Mein Antrag im Widerspruchsverfahren:`, defaultLineHeight, "bold", subHeadingFontSize);
        y += spaceAfterParagraph / 2;
        writeParagraph(forderungVermoegen, defaultLineHeight, textFontSize, {fontStyle:"bold"});
    }

    // --- Gemeinsamer Schlussteil ---
    if (anlagen && anlagen.length > 0) {
        writeLine("Anlagen:", defaultLineHeight, "bold", subHeadingFontSize);
        y += spaceAfterParagraph / 2;
        anlagen.forEach(anlage => {
            writeParagraph(`- ${anlage}`);
        });
        if (anlageSonstigesVermoegenWiderspruch && anlageSonstigesVermoegenWiderspruch.trim() !== "") { 
            writeParagraph(`- Sonstige Anlagen: ${anlageSonstigesVermoegenWiderspruch}`);
        }
    }
    
    writeParagraph(`Es wird daher aufgefordert, den Bescheid aufzuheben und über den Leistungsanspruch unter korrekter Anwendung der gesetzlichen Regelungen zum Schonvermögen und den Freibeträgen neu zu entscheiden.`, defaultLineHeight, textFontSize);
    writeParagraph(`Für den Fall, dass dem Widerspruch nicht oder nicht vollständig abgeholfen wird, bleibt die Einleitung weiterer rechtlicher Schritte ausdrücklich vorbehalten.`, defaultLineHeight, textFontSize, {fontStyle: "italic"});
    
    y += defaultLineHeight;
    
    writeParagraph("Mit freundlichen Grüßen");
    writeParagraph("\n\n_________________________"); 
    writeParagraph(personName);

    doc.save("widerspruch_vermoegensanrechnung.pdf");
}
// ===================================================================================
// ENDE:  Vermögen Bürgergeld
// ===================================================================================

// ===================================================================================
// START:  Mehrbedarf Bürgergeld
// ===================================================================================

function generateMehrbedarfWiderspruchPDF(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    const margin = 20;
    const defaultLineHeight = 7;
    const spaceAfterParagraph = 3; 
    const subHeadingFontSize = 11;
    const textFontSize = 10;     
    const smallTextFontSize = 8;
    const betreffFontSize = 12;

    let y = margin;
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const usableHeight = pageHeight - margin;

    function writeLine(text, currentLineHeight = defaultLineHeight, fontStyle = "normal", fontSize = textFontSize) {
        const textToWrite = text === undefined || text === null ? "" : String(text);
        if (y + currentLineHeight > usableHeight - (margin/2)) { doc.addPage(); y = margin; }
        doc.setFontSize(fontSize);
        doc.setFont("times", fontStyle); 
        doc.text(textToWrite, margin, y);
        y += currentLineHeight;
    }

    function writeParagraph(text, paragraphLineHeight = defaultLineHeight, paragraphFontSize = textFontSize, options = {}) {
        const textToWrite = text === undefined || text === null ? "" : String(text);
        const fontStyle = options.fontStyle || "normal";
        const extraSpacing = options.extraSpacingAfter === undefined ? spaceAfterParagraph : options.extraSpacingAfter;
        doc.setFontSize(paragraphFontSize);
        doc.setFont("times", fontStyle);
        
        const lines = doc.splitTextToSize(textToWrite, pageWidth - (2 * margin));
        for (let i = 0; i < lines.length; i++) {
            if (y + paragraphLineHeight > usableHeight - (margin/2) ) { doc.addPage(); y = margin; }
            doc.text(lines[i], margin, y);
            y += paragraphLineHeight;
        }
        if (y + extraSpacing > usableHeight - (margin/2) && lines.length > 0) {
             doc.addPage(); y = margin;
        } else if (lines.length > 0) { 
            y += extraSpacing;
        }
    }
    
    // Formulardaten aus dem 'data' Objekt verwenden
    const {
        personName, bgNummer, anzahlPersonenMehrbedarf,
        personAdresse, personPlz, personOrt,
        jcName, jcAdresse,
        bescheidDatum, bescheidAktenzeichen, antragDatumMehrbedarf,
        widerspruchsgruende,
        textSchwangerschaft, textAlleinerziehend, textErnaehrung, textBehinderung, textUnabweisbar,
        ergaenzendeArgumenteMehrbedarf, forderungMehrbedarf,
        anlagen, anlageSonstigesMehrbedarf
    } = data;

    const bescheidDatumFormatiert = getFormattedDateValue(bescheidDatum, "UNBEKANNT");
    const antragDatumFormatiert = getFormattedDateValue(antragDatumMehrbedarf, "");

    doc.setFont("times", "normal");

    // Absender
    writeLine(personName);
    writeLine(personAdresse);
    writeLine(`${personPlz} ${personOrt}`);
    writeLine(`BG-Nummer: ${bgNummer}`);
    if (y + defaultLineHeight <= usableHeight) y += defaultLineHeight; else {doc.addPage(); y = margin;}

    // Empfänger
    writeLine(jcName);
    jcAdresse.split("\n").forEach(line => writeLine(line.trim()));
    if (y + defaultLineHeight * 2 <= usableHeight) y += defaultLineHeight * 2; else {doc.addPage(); y = margin;}

    // Datum
    const datumHeute = new Date().toLocaleDateString("de-DE");
    doc.setFontSize(textFontSize);
    const datumsBreite = doc.getStringUnitWidth(datumHeute) * textFontSize / doc.internal.scaleFactor;
    if (y + defaultLineHeight > usableHeight) { doc.addPage(); y = margin; }
    doc.text(datumHeute, pageWidth - margin - datumsBreite, y);
    y += defaultLineHeight * 2; 

    // Betreff
    let betreffText = `Widerspruch gegen Ihren Bescheid vom ${bescheidDatumFormatiert} – Ablehnung von Mehrbedarfen nach § 21 SGB II`;
    if (bescheidAktenzeichen && bescheidAktenzeichen.trim() !== "") betreffText += `, Aktenzeichen: ${bescheidAktenzeichen}`;
    betreffText += `\nBedarfsgemeinschaft: ${bgNummer}, ${personName}`;
    
    writeParagraph(betreffText, defaultLineHeight, betreffFontSize, {fontStyle: "bold", extraSpacingAfter: defaultLineHeight});

    // Anrede
    writeParagraph("Sehr geehrte Damen und Herren,", defaultLineHeight, textFontSize, {extraSpacingAfter: defaultLineHeight * 0.5});

    // ======================================================
    // START: Logik für getrennte Textblöcke (Singular vs. Plural)
    // ======================================================

    if (anzahlPersonenMehrbedarf === "mehrerePersonen") {
        // --- TEXTBLOCK FÜR PLURAL ("WIR") ---
        writeParagraph(`hiermit legen wir fristgerecht und mit allem Nachdruck Widerspruch gegen Ihren oben genannten Bescheid vom ${bescheidDatumFormatiert} ein. Mit diesem Bescheid haben Sie unseren Antrag auf Gewährung von Mehrbedarfen nach § 21 SGB II ${antragDatumFormatiert ? 'vom ' + antragDatumFormatiert + ' ' : ''}ganz oder teilweise abgelehnt.`);
        writeParagraph(`Diese Entscheidung ist nach unserer Auffassung rechtswidrig, da uns die beantragten Mehrbedarfe gesetzlich zustehen und die Voraussetzungen dafür nachweislich erfüllt sind.`);
        
        writeLine(`Begründung unseres Widerspruchs:`, defaultLineHeight, "bold", subHeadingFontSize);
        y += spaceAfterParagraph / 2;
        writeParagraph(`Ihre Ablehnung, uns den beantragten Mehrbedarf zu gewähren, ist nicht haltbar. Wir begründen dies im Einzelnen wie folgt:`, defaultLineHeight, textFontSize, {fontStyle:"italic"});

        let hatBegruendung = false;
        if (widerspruchsgruende.includes("schwangerschaft") && textSchwangerschaft && textSchwangerschaft.trim() !== "") {
            writeLine("Anspruch auf Mehrbedarf für Schwangere (§ 21 Abs. 2 SGB II):", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textSchwangerschaft);
            hatBegruendung = true;
        }
        if (widerspruchsgruende.includes("alleinerziehend") && textAlleinerziehend && textAlleinerziehend.trim() !== "") {
            writeLine("Anspruch auf Mehrbedarf für Alleinerziehende (§ 21 Abs. 3 SGB II):", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textAlleinerziehend);
            hatBegruendung = true;
        }
        if (widerspruchsgruende.includes("ernaehrung") && textErnaehrung && textErnaehrung.trim() !== "") {
            writeLine("Anspruch auf Mehrbedarf für kostenaufwändige Ernährung (§ 21 Abs. 5 SGB II):", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textErnaehrung);
            hatBegruendung = true;
        }
        if (widerspruchsgruende.includes("behinderung") && textBehinderung && textBehinderung.trim() !== "") {
            writeLine("Anspruch auf Mehrbedarf bei Behinderung (§ 21 Abs. 4 SGB II):", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textBehinderung);
            hatBegruendung = true;
        }
        if (widerspruchsgruende.includes("unabweisbar") && textUnabweisbar && textUnabweisbar.trim() !== "") {
            writeLine("Anspruch auf einen unabweisbaren, laufenden, besonderen Bedarf (§ 21 Abs. 6 SGB II):", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textUnabweisbar);
            hatBegruendung = true;
        }
        if (ergaenzendeArgumenteMehrbedarf && ergaenzendeArgumenteMehrbedarf.trim() !== "") {
            writeLine("Weitere ergänzende Ausführungen:", defaultLineHeight, "bold", textFontSize);
            writeParagraph(ergaenzendeArgumenteMehrbedarf);
            hatBegruendung = true;
        }
        if (!hatBegruendung) {
             writeParagraph("[Die Begründung für den Widerspruch wurde nicht spezifiziert. Bitte fügen Sie eine detaillierte Begründung und entsprechende Nachweise bei!]", defaultLineHeight, textFontSize, {fontStyle:"bold"});
        }
        
        writeLine(`Unser Antrag im Widerspruchsverfahren:`, defaultLineHeight, "bold", subHeadingFontSize);
        y += spaceAfterParagraph / 2;
        writeParagraph(forderungMehrbedarf, defaultLineHeight, textFontSize, {fontStyle:"bold"});
    
    } else {
        // --- TEXTBLOCK FÜR SINGULAR ("ICH") ---
        writeParagraph(`hiermit lege ich fristgerecht und mit allem Nachdruck Widerspruch gegen Ihren oben genannten Bescheid vom ${bescheidDatumFormatiert} ein. Mit diesem Bescheid haben Sie meinen Antrag auf Gewährung von Mehrbedarfen nach § 21 SGB II ${antragDatumFormatiert ? 'vom ' + antragDatumFormatiert + ' ' : ''}ganz oder teilweise abgelehnt.`);
        writeParagraph(`Diese Entscheidung ist nach meiner Auffassung rechtswidrig, da mir der/die beantragte(n) Mehrbedarf(e) gesetzlich zusteht/zustehen und die Voraussetzungen dafür nachweislich erfüllt sind.`);
        
        writeLine(`Begründung meines Widerspruchs:`, defaultLineHeight, "bold", subHeadingFontSize);
        y += spaceAfterParagraph / 2;
        writeParagraph(`Ihre Ablehnung, mir den beantragten Mehrbedarf zu gewähren, ist nicht haltbar. Ich begründe dies im Einzelnen wie folgt:`, defaultLineHeight, textFontSize, {fontStyle:"italic"});

        let hatBegruendung = false;
        if (widerspruchsgruende.includes("schwangerschaft") && textSchwangerschaft && textSchwangerschaft.trim() !== "") {
            writeLine("Anspruch auf Mehrbedarf für Schwangere (§ 21 Abs. 2 SGB II):", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textSchwangerschaft);
            hatBegruendung = true;
        }
        if (widerspruchsgruende.includes("alleinerziehend") && textAlleinerziehend && textAlleinerziehend.trim() !== "") {
            writeLine("Anspruch auf Mehrbedarf für Alleinerziehende (§ 21 Abs. 3 SGB II):", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textAlleinerziehend);
            hatBegruendung = true;
        }
        if (widerspruchsgruende.includes("ernaehrung") && textErnaehrung && textErnaehrung.trim() !== "") {
            writeLine("Anspruch auf Mehrbedarf für kostenaufwändige Ernährung (§ 21 Abs. 5 SGB II):", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textErnaehrung);
            hatBegruendung = true;
        }
        if (widerspruchsgruende.includes("behinderung") && textBehinderung && textBehinderung.trim() !== "") {
            writeLine("Anspruch auf Mehrbedarf bei Behinderung (§ 21 Abs. 4 SGB II):", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textBehinderung);
            hatBegruendung = true;
        }
        if (widerspruchsgruende.includes("unabweisbar") && textUnabweisbar && textUnabweisbar.trim() !== "") {
            writeLine("Anspruch auf einen unabweisbaren, laufenden, besonderen Bedarf (§ 21 Abs. 6 SGB II):", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textUnabweisbar);
            hatBegruendung = true;
        }
        if (ergaenzendeArgumenteMehrbedarf && ergaenzendeArgumenteMehrbedarf.trim() !== "") {
            writeLine("Weitere ergänzende Ausführungen:", defaultLineHeight, "bold", textFontSize);
            writeParagraph(ergaenzendeArgumenteMehrbedarf);
        }
        if (!hatBegruendung) {
             writeParagraph("[Die Begründung für den Widerspruch wurde nicht spezifiziert. Bitte fügen Sie eine detaillierte Begründung und entsprechende Nachweise bei!]", defaultLineHeight, textFontSize, {fontStyle:"bold"});
        }

        writeLine(`Mein Antrag im Widerspruchsverfahren:`, defaultLineHeight, "bold", subHeadingFontSize);
        y += spaceAfterParagraph / 2;
        writeParagraph(forderungMehrbedarf, defaultLineHeight, textFontSize, {fontStyle:"bold"});
    }

    // --- Gemeinsamer Schlussteil ---
    writeParagraph(`Es wird daher nachdrücklich aufgefordert, den Bescheid vom ${bescheidDatumFormatiert} aufzuheben, die beantragten Mehrbedarfe ab dem Antragsmonat bzw. ab dem Zeitpunkt des Eintretens der Voraussetzungen anzuerkennen und die zustehenden Leistungen umgehend nachzuzahlen.`, defaultLineHeight, textFontSize, {fontStyle: "italic", extraSpacingAfter: defaultLineHeight*0.5});
    
    if (anlagen && anlagen.length > 0) {
        writeLine("Anlagen:", defaultLineHeight, "bold", subHeadingFontSize);
        y += spaceAfterParagraph / 2;
        anlagen.forEach(anlage => {
            writeParagraph(`- ${anlage}`);
        });
        if (anlageSonstigesMehrbedarf && anlageSonstigesMehrbedarf.trim() !== "") { 
            writeParagraph(`- Sonstige Anlagen: ${anlageSonstigesMehrbedarf}`);
        }
    }
    
    writeParagraph(`Es wird um eine schriftliche Bestätigung des Eingangs dieses Widerspruchs gebeten. Für den Fall, dass dem Widerspruch nicht oder nicht vollständig abgeholfen wird, bleibt die Einleitung weiterer rechtlicher Schritte ausdrücklich vorbehalten.`, defaultLineHeight, textFontSize);
    
    y += defaultLineHeight;
    
    writeParagraph("Mit freundlichen Grüßen");
    writeParagraph("\n\n_________________________"); 
    writeParagraph(personName);

    doc.save("widerspruch_mehrbedarf_buergergeld.pdf");
}
// ===================================================================================
// ENDE:  Mehrbedarf Bürgergeld
// ===================================================================================

// ===================================================================================
// START:  Einkommen Bürgergeld
// ===================================================================================

function generateEinkommenWiderspruchPDF(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    const margin = 20;
    const defaultLineHeight = 7;
    const spaceAfterParagraph = 3; 
    const subHeadingFontSize = 11;
    const textFontSize = 10;     
    const betreffFontSize = 12;

    let y = margin;
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const usableHeight = pageHeight - margin;

    function writeLine(text, currentLineHeight = defaultLineHeight, fontStyle = "normal", fontSize = textFontSize) {
        const textToWrite = text === undefined || text === null ? "" : String(text);
        if (y + currentLineHeight > usableHeight - (margin/2)) { doc.addPage(); y = margin; }
        doc.setFontSize(fontSize);
        doc.setFont("times", fontStyle); 
        doc.text(textToWrite, margin, y);
        y += currentLineHeight;
    }

    function writeParagraph(text, paragraphLineHeight = defaultLineHeight, paragraphFontSize = textFontSize, options = {}) {
        const textToWrite = text === undefined || text === null ? "" : String(text);
        const fontStyle = options.fontStyle || "normal";
        const extraSpacing = options.extraSpacingAfter === undefined ? spaceAfterParagraph : options.extraSpacingAfter;
        doc.setFontSize(paragraphFontSize);
        doc.setFont("times", fontStyle);
        
        const lines = doc.splitTextToSize(textToWrite, pageWidth - (2 * margin));
        for (let i = 0; i < lines.length; i++) {
            if (y + paragraphLineHeight > usableHeight - (margin/2) ) { doc.addPage(); y = margin; }
            doc.text(lines[i], margin, y);
            y += paragraphLineHeight;
        }
        if (y + extraSpacing > usableHeight - (margin/2) && lines.length > 0) {
             doc.addPage(); y = margin;
        } else if (lines.length > 0) { 
            y += extraSpacing;
        }
    }
    
    // Formulardaten aus dem 'data' Objekt verwenden
    const {
        personName, bgNummer, anzahlPersonenEinkommen,
        personAdresse, personPlz, personOrt,
        jcName, jcAdresse,
        bescheidDatum, bescheidAktenzeichen, leistungszeitraum,
        einkommensart, einkommenshoeheBrutto, berechnungJobcenter,
        widerspruchsgruende,
        textFreibetrag, textAbsetzungen, textEinmaleinnahme, textZuordnung,
        ergaenzendeArgumenteEinkommen, forderungEinkommen,
        anlagen, anlageSonstigesEinkommen
    } = data;

    const bescheidDatumFormatiert = getFormattedDateValue(bescheidDatum, "UNBEKANNT");
    const einkommenshoeheBruttoNum = parseFloat(einkommenshoeheBrutto) || 0;
    const berechnungJobcenterNum = parseFloat(berechnungJobcenter) || 0;


    doc.setFont("times", "normal");

    // Absender
    writeLine(personName);
    writeLine(personAdresse);
    writeLine(`${personPlz} ${personOrt}`);
    writeLine(`BG-Nummer: ${bgNummer}`);
    if (y + defaultLineHeight <= usableHeight) y += defaultLineHeight; else {doc.addPage(); y = margin;}

    // Empfänger
    writeLine(jcName);
    jcAdresse.split("\n").forEach(line => writeLine(line.trim()));
    if (y + defaultLineHeight * 2 <= usableHeight) y += defaultLineHeight * 2; else {doc.addPage(); y = margin;}

    // Datum
    const datumHeute = new Date().toLocaleDateString("de-DE");
    doc.setFontSize(textFontSize);
    const datumsBreite = doc.getStringUnitWidth(datumHeute) * textFontSize / doc.internal.scaleFactor;
    if (y + defaultLineHeight > usableHeight) { doc.addPage(); y = margin; }
    doc.text(datumHeute, pageWidth - margin - datumsBreite, y);
    y += defaultLineHeight * 2; 

    // Betreff
    let betreffText = `Widerspruch gegen Ihren Berechnungsbescheid vom ${bescheidDatumFormatiert}`;
    if (bescheidAktenzeichen && bescheidAktenzeichen.trim() !== "") betreffText += `, Aktenzeichen: ${bescheidAktenzeichen}`;
    betreffText += `\nBetreffend: Fehlerhafte Anrechnung von Einkommen im Leistungszeitraum ${leistungszeitraum || 'N/A'}`;
    betreffText += `\nBedarfsgemeinschaft: ${bgNummer}, ${personName}`;
    betreffText += `\n- Aufforderung zur unverzüglichen Korrektur und Nachzahlung -`;
    
    writeParagraph(betreffText, defaultLineHeight, betreffFontSize, {fontStyle: "bold", extraSpacingAfter: defaultLineHeight});

    // Anrede
    writeParagraph("Sehr geehrte Damen und Herren,", defaultLineHeight, textFontSize, {extraSpacingAfter: defaultLineHeight * 0.5});

    // ======================================================
    // START: Logik für getrennte Textblöcke (Singular vs. Plural)
    // ======================================================

    if (anzahlPersonenEinkommen === "mehrerePersonen") {
        // --- TEXTBLOCK FÜR PLURAL ("WIR") ---
        writeParagraph(`hiermit legen wir fristgerecht und mit allem Nachdruck Widerspruch gegen Ihren oben genannten Bescheid vom ${bescheidDatumFormatiert} ein.`);
        writeParagraph(`In diesem Bescheid haben Sie unser Einkommen für den Leistungszeitraum ${leistungszeitraum || 'N/A'} in einer Weise angerechnet, die nach unserer Auffassung rechtswidrig ist und uns in unseren Rechten verletzt.`);
        
        writeLine(`Begründung unseres Widerspruchs:`, defaultLineHeight, "bold", subHeadingFontSize);
        y += spaceAfterParagraph / 2; 
        writeParagraph(`Die von Ihnen vorgenommene Anrechnung unseres Einkommens aus "${einkommensart || 'nicht spezifiziert'}" (Bruttoeinkommen laut unseren Unterlagen: ${einkommenshoeheBruttoNum.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}) in Höhe von ${berechnungJobcenterNum.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} ist aus den folgenden Gründen fehlerhaft:`, defaultLineHeight, textFontSize);

        if (widerspruchsgruende.includes("freibetrag") && textFreibetrag && textFreibetrag.trim() !== "") {
            writeLine("Fehlerhafte/fehlende Berücksichtigung von Freibeträgen nach § 11b SGB II:", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textFreibetrag);
        }
        if (widerspruchsgruende.includes("absetzungen") && textAbsetzungen && textAbsetzungen.trim() !== "") {
            writeLine("Fehlerhafte/fehlende Berücksichtigung von Absetzbeträgen:", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textAbsetzungen);
        }
        if (widerspruchsgruende.includes("einmaleinnahme") && textEinmaleinnahme && textEinmaleinnahme.trim() !== "") {
            writeLine("Fehlerhafte Anrechnung einer einmaligen Einnahme:", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textEinmaleinnahme);
        }
        if (widerspruchsgruende.includes("zuordnung") && textZuordnung && textZuordnung.trim() !== "") {
            writeLine("Fehlerhafte Zuordnung von Einkommen:", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textZuordnung);
        }
        if (ergaenzendeArgumenteEinkommen && ergaenzendeArgumenteEinkommen.trim() !== "") {
            writeLine("Weitere ergänzende Ausführungen:", defaultLineHeight, "bold", textFontSize);
            writeParagraph(ergaenzendeArgumenteEinkommen);
        }
        
        writeLine(`Unser Antrag im Widerspruchsverfahren:`, defaultLineHeight, "bold", subHeadingFontSize);
        y += spaceAfterParagraph / 2;
        writeParagraph(forderungEinkommen, defaultLineHeight, textFontSize, {fontStyle:"bold"});
    
    } else {
        // --- TEXTBLOCK FÜR SINGULAR ("ICH") ---
        writeParagraph(`hiermit lege ich fristgerecht und mit allem Nachdruck Widerspruch gegen Ihren oben genannten Bescheid vom ${bescheidDatumFormatiert} ein.`);
        writeParagraph(`In diesem Bescheid haben Sie mein Einkommen für den Leistungszeitraum ${leistungszeitraum || 'N/A'} in einer Weise angerechnet, die nach meiner Auffassung rechtswidrig ist und mich in meinen Rechten verletzt.`);
        
        writeLine(`Begründung meines Widerspruchs:`, defaultLineHeight, "bold", subHeadingFontSize);
        y += spaceAfterParagraph / 2;
        writeParagraph(`Die von Ihnen vorgenommene Anrechnung meines Einkommens aus "${einkommensart || 'nicht spezifiziert'}" (Bruttoeinkommen laut meinen Unterlagen: ${einkommenshoeheBruttoNum.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}) in Höhe von ${berechnungJobcenterNum.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} ist aus den folgenden, von mir gewählten Gründen fehlerhaft:`, defaultLineHeight, textFontSize);

        if (widerspruchsgruende.includes("freibetrag") && textFreibetrag && textFreibetrag.trim() !== "") {
            writeLine("Fehlerhafte/fehlende Berücksichtigung von Freibeträgen nach § 11b SGB II:", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textFreibetrag);
        }
        if (widerspruchsgruende.includes("absetzungen") && textAbsetzungen && textAbsetzungen.trim() !== "") {
            writeLine("Fehlerhafte/fehlende Berücksichtigung von Absetzbeträgen:", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textAbsetzungen);
        }
        if (widerspruchsgruende.includes("einmaleinnahme") && textEinmaleinnahme && textEinmaleinnahme.trim() !== "") {
            writeLine("Fehlerhafte Anrechnung einer einmaligen Einnahme:", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textEinmaleinnahme);
        }
        if (widerspruchsgruende.includes("zuordnung") && textZuordnung && textZuordnung.trim() !== "") {
            writeLine("Fehlerhafte Zuordnung von Einkommen:", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textZuordnung);
        }
        if (ergaenzendeArgumenteEinkommen && ergaenzendeArgumenteEinkommen.trim() !== "") {
            writeLine("Weitere ergänzende Ausführungen:", defaultLineHeight, "bold", textFontSize);
            writeParagraph(ergaenzendeArgumenteEinkommen);
        }

        writeLine(`Mein Antrag im Widerspruchsverfahren:`, defaultLineHeight, "bold", subHeadingFontSize);
        y += spaceAfterParagraph / 2;
        writeParagraph(forderungEinkommen, defaultLineHeight, textFontSize, {fontStyle:"bold"});
    }

    // --- Gemeinsamer Schlussteil ---
    if (anlagen && anlagen.length > 0) {
        writeLine("Anlagen:", defaultLineHeight, "bold", subHeadingFontSize);
        y += spaceAfterParagraph / 2;
        anlagen.forEach(anlage => {
            writeParagraph(`- ${anlage}`);
        });
        const anlageSonstigesText = data.anlageSonstigesEinkommen || "";
        if (anlageSonstigesText.trim() !== "") { 
            writeParagraph(`- Sonstige Anlagen: ${anlageSonstigesText}`);
        }
    }
    
    writeParagraph(`Es wird aufgefordert, den Bescheid vom ${bescheidDatumFormatiert} aufzuheben und die Leistungsberechnung unter Berücksichtigung der dargelegten Punkte zu korrigieren. Zudem wird um die Zusendung eines korrigierten Bescheides sowie um die umgehende Nachzahlung der zu Unrecht einbehaltenen Leistungen gebeten.`, defaultLineHeight, textFontSize);
    writeParagraph(`Für den Fall, dass dem Widerspruch nicht oder nicht vollständig abgeholfen wird, bleibt die Einleitung weiterer rechtlicher Schritte ausdrücklich vorbehalten.`, defaultLineHeight, textFontSize, {fontStyle: "italic"});
    
    y += defaultLineHeight;
    
    writeParagraph("Mit freundlichen Grüßen");
    writeParagraph("\n\n_________________________"); 
    writeParagraph(personName);

    doc.save("widerspruch_einkommensanrechnung.pdf");
}
// ===================================================================================
// ENDE:  Einkommen Bürgergeld
// ===================================================================================

// ===================================================================================
// START:  KDU Bürgergeld
// ===================================================================================

function generateKduWiderspruchPDF(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    const margin = 20;
    const defaultLineHeight = 7;
    const spaceAfterParagraph = 3; 
    const subHeadingFontSize = 11;
    const textFontSize = 10;     
    const betreffFontSize = 12;

    let y = margin;
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const usableHeight = pageHeight - margin;

    function writeLine(text, currentLineHeight = defaultLineHeight, fontStyle = "normal", fontSize = textFontSize) {
        const textToWrite = text === undefined || text === null ? "" : String(text);
        if (y + currentLineHeight > usableHeight - (margin/2)) { doc.addPage(); y = margin; }
        doc.setFontSize(fontSize);
        doc.setFont("times", fontStyle); 
        doc.text(textToWrite, margin, y);
        y += currentLineHeight;
    }

    function writeParagraph(text, paragraphLineHeight = defaultLineHeight, paragraphFontSize = textFontSize, options = {}) {
        const textToWrite = text === undefined || text === null ? "" : String(text);
        const fontStyle = options.fontStyle || "normal";
        const extraSpacing = options.extraSpacingAfter === undefined ? spaceAfterParagraph : options.extraSpacingAfter;
        doc.setFontSize(paragraphFontSize);
        doc.setFont("times", fontStyle);
        
        const lines = doc.splitTextToSize(textToWrite, pageWidth - (2 * margin));
        for (let i = 0; i < lines.length; i++) {
            if (y + paragraphLineHeight > usableHeight - (margin/2) ) { doc.addPage(); y = margin; }
            doc.text(lines[i], margin, y);
            y += paragraphLineHeight;
        }
        if (y + extraSpacing > usableHeight - (margin/2) && lines.length > 0) {
             doc.addPage(); y = margin;
        } else if (lines.length > 0) { 
            y += extraSpacing;
        }
    }
    
    // Formulardaten aus dem übergebenen 'data' Objekt verwenden
    const {
        personName, bgNummer, anzahlPersonenKdu,
        personAdresse, personPlz, personOrt,
        jcName, jcAdresse,
        bescheidDatum, bescheidAktenzeichen, bescheidInhalt,
        wohnflaeche, personenImHaushalt, kaltmiete, nebenkosten, heizkosten,
        widerspruchsgruende,
        textAngemessenheit, textUnzumutbarkeit, textAbsehbaresEnde,
        ergaenzendeArgumenteKdu, forderungKdu,
        anlagen, anlageSonstigesKduWiderspruch
    } = data;

    const bescheidDatumFormatiert = getFormattedDateValue(bescheidDatum, "UNBEKANNT");

    doc.setFont("times", "normal");

    // Absender
    writeLine(personName);
    writeLine(personAdresse);
    writeLine(`${personPlz} ${personOrt}`);
    writeLine(`BG-Nummer: ${bgNummer}`);
    if (y + defaultLineHeight <= usableHeight) y += defaultLineHeight; else {doc.addPage(); y = margin;}

    // Empfänger
    writeLine(jcName);
    jcAdresse.split("\n").forEach(line => writeLine(line.trim()));
    if (y + defaultLineHeight * 2 <= usableHeight) y += defaultLineHeight * 2; else {doc.addPage(); y = margin;}

    // Datum
    const datumHeute = new Date().toLocaleDateString("de-DE");
    doc.setFontSize(textFontSize);
    const datumsBreite = doc.getStringUnitWidth(datumHeute) * textFontSize / doc.internal.scaleFactor;
    if (y + defaultLineHeight > usableHeight) { doc.addPage(); y = margin; }
    doc.text(datumHeute, pageWidth - margin - datumsBreite, y);
    y += defaultLineHeight * 2; 

    // Betreff
    let betreffText = `Widerspruch gegen Ihren Bescheid vom ${bescheidDatumFormatiert} zu den Kosten der Unterkunft und Heizung (KdU)`;
    if (bescheidAktenzeichen && bescheidAktenzeichen.trim() !== "") betreffText += `, Aktenzeichen: ${bescheidAktenzeichen}`;
    betreffText += `\nBedarfsgemeinschaft: ${bgNummer}, ${personName}`;
    betreffText += `\n- Aufforderung zur Rücknahme der Kostensenkungsaufforderung / Korrektur der Leistungsberechnung -`;
    
    writeParagraph(betreffText, defaultLineHeight, betreffFontSize, {fontStyle: "bold", extraSpacingAfter: defaultLineHeight});

    // Anrede
    writeParagraph("Sehr geehrte Damen und Herren,", defaultLineHeight, textFontSize, {extraSpacingAfter: defaultLineHeight * 0.5});

    // ======================================================
    // START: Logik für getrennte Textblöcke (Singular vs. Plural)
    // ======================================================

    if (anzahlPersonenKdu === "mehrerePersonen") {
        // --- TEXTBLOCK FÜR PLURAL ("WIR") ---
        writeParagraph(`hiermit legen wir fristgerecht und mit allem Nachdruck Widerspruch gegen Ihren oben genannten Bescheid vom ${bescheidDatumFormatiert} ein. Mit diesem Bescheid haben Sie über die Übernahme unserer Kosten für Unterkunft und Heizung entschieden (konkret: "${bescheidInhalt || 'siehe Ihr Bescheid'}").`);
        writeParagraph(`Diese Entscheidung ist nach unserer Auffassung rechtswidrig, da sie unsere tatsächlichen und angemessenen Wohnbedarfe nicht korrekt berücksichtigt und uns in unseren Rechten verletzt.`);
        
        // EINGEFÜGTER BLOCK MIT MIETDATEN
        writeLine("Grundlage unserer Kosten der Unterkunft:", defaultLineHeight, "bold", subHeadingFontSize);
        y += spaceAfterParagraph/2;
        writeParagraph(`Die betroffene Wohnung hat eine Größe von ${wohnflaeche || 'N/A'} m² und wird von ${personenImHaushalt || 'N/A'} Person(en) bewohnt. Die monatlichen Kosten setzen sich wie folgt zusammen:`);
        
        const kaltmieteNum = parseFloat(kaltmiete) || 0;
        const nebenkostenNum = parseFloat(nebenkosten) || 0;
        const heizkostenNum = parseFloat(heizkosten) || 0;
        const bruttowarmmiete = kaltmieteNum + nebenkostenNum + heizkostenNum;

        writeLine(`- Kaltmiete: ${kaltmieteNum.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}`);
        writeLine(`- Kalte Betriebskosten: ${nebenkostenNum.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}`);
        writeLine(`- Heizkosten: ${heizkostenNum.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}`);
        writeLine(`--------------------------------------------------------`);
        writeLine(`Gesamtmiete (bruttowarm): ${bruttowarmmiete.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}`, defaultLineHeight, "bold");
        y += spaceAfterParagraph;

        writeLine(`Begründung unseres Widerspruchs:`, defaultLineHeight, "bold", subHeadingFontSize);
        y += spaceAfterParagraph / 2; 

        if (widerspruchsgruende.includes("angemessenheit") && textAngemessenheit && textAngemessenheit.trim() !== "") {
            writeLine("Zur Angemessenheit der Kosten:", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textAngemessenheit);
        }
        if (widerspruchsgruende.includes("unzumutbarkeit") && textUnzumutbarkeit && textUnzumutbarkeit.trim() !== "") {
            writeLine("Zur Unzumutbarkeit eines Umzugs/einer Kostensenkung:", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textUnzumutbarkeit);
        }
        if (widerspruchsgruende.includes("absehbaresEnde") && textAbsehbaresEnde && textAbsehbaresEnde.trim() !== "") {
            writeLine("Zur Unwirtschaftlichkeit einer Kostensenkung:", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textAbsehbaresEnde);
        }
        if (ergaenzendeArgumenteKdu && ergaenzendeArgumenteKdu.trim() !== "") {
            writeLine("Weitere ergänzende Ausführungen:", defaultLineHeight, "bold", textFontSize);
            writeParagraph(ergaenzendeArgumenteKdu);
        }

        writeParagraph(`Wir fordern Sie auf, Ihre Entscheidung unter Berücksichtigung unserer dargelegten Gründe und der beigefügten Unterlagen zu revidieren.`);
        
        writeLine(`Unser Antrag im Widerspruchsverfahren:`, defaultLineHeight, "bold", subHeadingFontSize);
        y += spaceAfterParagraph / 2;
        writeParagraph(forderungKdu, defaultLineHeight, textFontSize, {fontStyle:"bold"});
    
    } else {
        // --- TEXTBLOCK FÜR SINGULAR ("ICH") ---
        writeParagraph(`hiermit lege ich fristgerecht und mit allem Nachdruck Widerspruch gegen Ihren oben genannten Bescheid vom ${bescheidDatumFormatiert} ein. Mit diesem Bescheid haben Sie über die Übernahme meiner Kosten für Unterkunft und Heizung entschieden (konkret: "${bescheidInhalt || 'siehe Ihr Bescheid'}").`);
        writeParagraph(`Diese Entscheidung ist nach meiner Auffassung rechtswidrig, da sie meine tatsächlichen und angemessenen Wohnbedarfe nicht korrekt berücksichtigt und mich in meinen Rechten verletzt.`);
        
        // EINGEFÜGTER BLOCK MIT MIETDATEN
        writeLine("Grundlage meiner Kosten der Unterkunft:", defaultLineHeight, "bold", subHeadingFontSize);
        y += spaceAfterParagraph/2;
        writeParagraph(`Die betroffene Wohnung hat eine Größe von ${wohnflaeche || 'N/A'} m² und wird von ${personenImHaushalt || 'N/A'} Person(en) bewohnt. Die monatlichen Kosten setzen sich wie folgt zusammen:`);
        
        const kaltmieteNum = parseFloat(kaltmiete) || 0;
        const nebenkostenNum = parseFloat(nebenkosten) || 0;
        const heizkostenNum = parseFloat(heizkosten) || 0;
        const bruttowarmmiete = kaltmieteNum + nebenkostenNum + heizkostenNum;

        writeLine(`- Kaltmiete: ${kaltmieteNum.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}`);
        writeLine(`- Kalte Betriebskosten: ${nebenkostenNum.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}`);
        writeLine(`- Heizkosten: ${heizkostenNum.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}`);
        writeLine(`--------------------------------------------------------`);
        writeLine(`Gesamtmiete (bruttowarm): ${bruttowarmmiete.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}`, defaultLineHeight, "bold");
        y += spaceAfterParagraph;

        writeLine(`Begründung meines Widerspruchs:`, defaultLineHeight, "bold", subHeadingFontSize);
        y += spaceAfterParagraph / 2;

        if (widerspruchsgruende.includes("angemessenheit") && textAngemessenheit && textAngemessenheit.trim() !== "") {
            writeLine("Zur Angemessenheit der Kosten:", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textAngemessenheit);
        }
        if (widerspruchsgruende.includes("unzumutbarkeit") && textUnzumutbarkeit && textUnzumutbarkeit.trim() !== "") {
            writeLine("Zur Unzumutbarkeit eines Umzugs/einer Kostensenkung:", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textUnzumutbarkeit);
        }
        if (widerspruchsgruende.includes("absehbaresEnde") && textAbsehbaresEnde && textAbsehbaresEnde.trim() !== "") {
            writeLine("Zur Unwirtschaftlichkeit einer Kostensenkung:", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textAbsehbaresEnde);
        }
        if (ergaenzendeArgumenteKdu && ergaenzendeArgumenteKdu.trim() !== "") {
            writeLine("Weitere ergänzende Ausführungen:", defaultLineHeight, "bold", textFontSize);
            writeParagraph(ergaenzendeArgumenteKdu);
        }

        writeParagraph(`Ich fordere Sie auf, Ihre Entscheidung unter Berücksichtigung meiner dargelegten Gründe und der beigefügten Unterlagen zu revidieren.`);
        
        writeLine(`Mein Antrag im Widerspruchsverfahren:`, defaultLineHeight, "bold", subHeadingFontSize);
        y += spaceAfterParagraph / 2;
        writeParagraph(forderungKdu, defaultLineHeight, textFontSize, {fontStyle:"bold"});
    }

    // --- Gemeinsamer Schlussteil ---
    if (anlagen && anlagen.length > 0) {
        writeLine("Anlagen:", defaultLineHeight, "bold", subHeadingFontSize);
        y += spaceAfterParagraph / 2;
        anlagen.forEach(anlage => {
            writeParagraph(`- ${anlage}`);
        });
        if (anlageSonstigesKduWiderspruch && anlageSonstigesKduWiderspruch.trim() !== "") { 
            writeParagraph(`- Sonstige Anlagen: ${anlageSonstigesKduWiderspruch}`);
        }
    }
    
    writeParagraph(`Es wird um eine schriftliche Bestätigung des Eingangs dieses Widerspruchs sowie um eine rechtsmittelfähige Entscheidung innerhalb der gesetzlichen Fristen gebeten.`, defaultLineHeight, textFontSize);
    writeParagraph(`Für den Fall, dass dem Widerspruch nicht oder nicht vollständig abgeholfen wird, bleibt die Einleitung weiterer rechtlicher Schritte ausdrücklich vorbehalten.`, defaultLineHeight, textFontSize, {fontStyle: "italic"});
    
    y += defaultLineHeight;
    
    writeParagraph("Mit freundlichen Grüßen");
    writeParagraph("\n\n_________________________"); 
    writeParagraph(personName);

    doc.save("widerspruch_kdu.pdf");
}
// ===================================================================================
// ENDE:  KDU Bürgergeld
// ===================================================================================

// ===================================================================================
// START:  Überprüfung sgb x Bürgergeld
// ===================================================================================

function generateUeberpruefungPDF(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    const margin = 20;
    const defaultLineHeight = 7;
    const spaceAfterParagraph = 3; 
    const subHeadingFontSize = 11;
    const textFontSize = 10;     
    const smallTextFontSize = 8; 
    const betreffFontSize = 12;

    let y = margin;
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const usableHeight = pageHeight - margin;

    function writeLine(text, currentLineHeight = defaultLineHeight, fontStyle = "normal", fontSize = textFontSize) {
        const textToWrite = text === undefined || text === null ? "" : String(text);
        if (y + currentLineHeight > usableHeight - (margin/2)) { doc.addPage(); y = margin; }
        doc.setFontSize(fontSize);
        doc.setFont("times", fontStyle); 
        doc.text(textToWrite, margin, y);
        y += currentLineHeight;
    }

    function writeParagraph(text, paragraphLineHeight = defaultLineHeight, paragraphFontSize = textFontSize, options = {}) {
        const textToWrite = text === undefined || text === null ? "" : String(text);
        const fontStyle = options.fontStyle || "normal";
        const extraSpacing = options.extraSpacingAfter === undefined ? spaceAfterParagraph : options.extraSpacingAfter;
        doc.setFontSize(paragraphFontSize);
        doc.setFont("times", fontStyle);
        
        const lines = doc.splitTextToSize(textToWrite, pageWidth - (2 * margin));
        for (let i = 0; i < lines.length; i++) {
            if (y + paragraphLineHeight > usableHeight - (margin/2) ) { doc.addPage(); y = margin; }
            doc.text(lines[i], margin, y);
            y += paragraphLineHeight;
        }
        if (y + extraSpacing > usableHeight - (margin/2) && lines.length > 0) {
             doc.addPage(); y = margin;
        } else if (lines.length > 0) { 
            y += extraSpacing;
        }
    }
    
    // Formulardaten aus dem übergebenen 'data' Objekt verwenden
    const {
        antragstellerName, bgNummer, anzahlPersonenUeberpruefung,
        antragstellerAdresse, antragstellerPlz, antragstellerOrt,
        behoerdeName, behoerdeAdresse,
        bescheidDatum, bescheidAktenzeichen, bescheidBetreff, weitereBescheide,
        fehlerBeschreibung, fehlerBegruendung, forderungUeberpruefung,
        anlagen, anlageSonstigesUeberpruefung
    } = data;

    const bescheidDatumFormatiert = getFormattedDateValue(bescheidDatum, "UNBEKANNT");

    doc.setFont("times", "normal");

    // Absender
    writeLine(antragstellerName);
    writeLine(antragstellerAdresse);
    writeLine(`${antragstellerPlz} ${antragstellerOrt}`);
    writeLine(`BG-Nummer / Kundennummer: ${bgNummer}`);
    if (y + defaultLineHeight <= usableHeight) y += defaultLineHeight; else {doc.addPage(); y = margin;}

    // Empfänger
    writeLine(behoerdeName);
    behoerdeAdresse.split("\n").forEach(line => writeLine(line.trim()));
    if (y + defaultLineHeight * 2 <= usableHeight) y += defaultLineHeight * 2; else {doc.addPage(); y = margin;}

    // Datum
    const datumHeute = new Date().toLocaleDateString("de-DE");
    doc.setFontSize(textFontSize);
    const datumsBreite = doc.getStringUnitWidth(datumHeute) * textFontSize / doc.internal.scaleFactor;
    if (y + defaultLineHeight > usableHeight) { doc.addPage(); y = margin; }
    doc.text(datumHeute, pageWidth - margin - datumsBreite, y);
    y += defaultLineHeight * 2; 

    // Betreff
    let betreffText = `Antrag auf Überprüfung eines Verwaltungsaktes nach § 44 SGB X`;
    betreffText += `\nIhr Bescheid vom ${bescheidDatumFormatiert}, Aktenzeichen: ${bescheidAktenzeichen || '(bitte zuordnen)'}`;
    betreffText += `\nAntragsteller: ${antragstellerName}, BG-Nummer: ${bgNummer}`;
    
    writeParagraph(betreffText, defaultLineHeight, betreffFontSize, {fontStyle: "bold", extraSpacingAfter: defaultLineHeight});

    // Anrede
    writeParagraph("Sehr geehrte Damen und Herren,", defaultLineHeight, textFontSize, {extraSpacingAfter: defaultLineHeight * 0.5});

    // ======================================================
    // START: Logik für getrennte Textblöcke (Singular vs. Plural)
    // ======================================================

    if (anzahlPersonenUeberpruefung === "mehrerePersonen") {
        // --- TEXTBLOCK FÜR PLURAL ("WIR") ---
        writeParagraph(`hiermit stellen wir, die Mitglieder der oben genannten Bedarfsgemeinschaft, einen Antrag auf Überprüfung des Bescheides vom ${bescheidDatumFormatiert} (Aktenzeichen: ${bescheidAktenzeichen || 'N/A'}) gemäß § 44 SGB X.`);
        if (weitereBescheide && weitereBescheide.trim() !== "") {
            writeParagraph(`Der Überprüfungsantrag erstreckt sich ebenso auf die folgenden Bescheide bzw. den gesamten Zeitraum: ${weitereBescheide}`);
        }
        writeParagraph("Nach unserer Auffassung ist der genannte Verwaltungsakt von Anfang an rechtswidrig und verletzt uns in unseren Rechten, da er auf einer fehlerhaften Rechtsanwendung bzw. einem unzutreffenden Sachverhalt beruht.");
        
        writeLine("Begründung unseres Antrags:", defaultLineHeight, "bold", subHeadingFontSize);
        y += spaceAfterParagraph/2;
        writeParagraph(`Der Fehler im Bescheid besteht im Wesentlichen in Folgendem:\n${fehlerBeschreibung || "[Beschreibung des Fehlers nicht angegeben]"}`);
        if (fehlerBegruendung && fehlerBegruendung.trim() !== "") {
            writeParagraph(`Dies begründen wir wie folgt:\n${fehlerBegruendung}`);
        }
        
        writeLine("Unser Antrag:", defaultLineHeight, "bold", subHeadingFontSize);
        y += spaceAfterParagraph/2;
        if (forderungUeberpruefung.trim() !== "") {
            writeParagraph(forderungUeberpruefung, defaultLineHeight, textFontSize, {fontStyle:"bold"});
        } else {
            writeParagraph(`Wir beantragen daher, den Bescheid vom ${bescheidDatumFormatiert} zurückzunehmen, neu und unter Beachtung der Rechtsauffassung zu unseren Gunsten zu entscheiden und uns die zu Unrecht vorenthaltenen Leistungen für den gesetzlich möglichen Zeitraum (bis zu vier Jahre rückwirkend) nachzuzahlen.`, defaultLineHeight, textFontSize, {fontStyle:"bold"});
        }
    
    } else {
        // --- TEXTBLOCK FÜR SINGULAR ("ICH") ---
        writeParagraph(`hiermit stelle ich einen Antrag auf Überprüfung des Bescheides vom ${bescheidDatumFormatiert} (Aktenzeichen: ${bescheidAktenzeichen || 'N/A'}) gemäß § 44 SGB X.`);
        if (weitereBescheide && weitereBescheide.trim() !== "") {
            writeParagraph(`Der Überprüfungsantrag erstreckt sich ebenso auf die folgenden Bescheide bzw. den gesamten Zeitraum: ${weitereBescheide}`);
        }
        writeParagraph("Nach meiner Auffassung ist der genannte Verwaltungsakt von Anfang an rechtswidrig und verletzt mich in meinen Rechten, da er auf einer fehlerhaften Rechtsanwendung bzw. einem unzutreffenden Sachverhalt beruht.");
        
        writeLine("Begründung meines Antrags:", defaultLineHeight, "bold", subHeadingFontSize);
        y += spaceAfterParagraph / 2;
        writeParagraph(`Der Fehler im Bescheid besteht im Wesentlichen in Folgendem:\n${fehlerBeschreibung || "[Beschreibung des Fehlers nicht angegeben]"}`);
        if (fehlerBegruendung && fehlerBegruendung.trim() !== "") {
            writeParagraph(`Dies begründe ich wie folgt:\n${fehlerBegruendung}`);
        }
        
        writeLine("Mein Antrag:", defaultLineHeight, "bold", subHeadingFontSize);
        y += spaceAfterParagraph / 2;
        if (forderungUeberpruefung.trim() !== "") {
            writeParagraph(forderungUeberpruefung, defaultLineHeight, textFontSize, {fontStyle:"bold"});
        } else {
            writeParagraph(`Ich beantrage daher, den Bescheid vom ${bescheidDatumFormatiert} zurückzunehmen, neu und unter Beachtung der Rechtsauffassung zu meinen Gunsten zu entscheiden und mir die zu Unrecht vorenthaltenen Leistungen für den gesetzlich möglichen Zeitraum (bis zu vier Jahre rückwirkend) nachzuzahlen.`, defaultLineHeight, textFontSize, {fontStyle:"bold"});
        }
    }

    // --- Gemeinsamer Schlussteil ---
    if (anlagen && anlagen.length > 0) {
        writeLine("Anlagen:", defaultLineHeight, "bold", subHeadingFontSize);
        y += spaceAfterParagraph / 2;
        anlagen.forEach(anlage => {
            writeParagraph(`- ${anlage}`);
        });
        if (anlageSonstigesUeberpruefung && anlageSonstigesUeberpruefung.trim() !== "") { 
            writeParagraph(`- Sonstige Anlagen: ${anlageSonstigesUeberpruefung}`);
        }
    }
    
    writeParagraph("Es wird um eine schriftliche Bestätigung des Eingangs dieses Antrags sowie um eine zügige Bearbeitung gebeten.", defaultLineHeight, textFontSize, {extraSpacingAfter: defaultLineHeight});
    
    writeParagraph("Mit freundlichen Grüßen");
    writeParagraph("\n\n_________________________"); 
    writeParagraph(antragstellerName);

    doc.save("antrag_ueberpruefung_sgbx.pdf");
}
// ===================================================================================
// ENDE:  überprüfung sbg x Bürgergeld
// ===================================================================================

// ===================================================================================
// START:  Sanktion Bürgergeld
// ===================================================================================

function generateSanktionWiderspruchPDF(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    const margin = 20;
    const defaultLineHeight = 7;
    const spaceAfterParagraph = 3; 
    const subHeadingFontSize = 11;
    const textFontSize = 10;     
    const smallTextFontSize = 8;
    const betreffFontSize = 12;

    let y = margin;
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const usableHeight = pageHeight - margin;

    function writeLine(text, currentLineHeight = defaultLineHeight, fontStyle = "normal", fontSize = textFontSize) {
        const textToWrite = text === undefined || text === null ? "" : String(text);
        if (y + currentLineHeight > usableHeight - (margin/2)) { doc.addPage(); y = margin; }
        doc.setFontSize(fontSize);
        doc.setFont("times", fontStyle); 
        doc.text(textToWrite, margin, y);
        y += currentLineHeight;
    }

    function writeParagraph(text, paragraphLineHeight = defaultLineHeight, paragraphFontSize = textFontSize, options = {}) {
        const textToWrite = text === undefined || text === null ? "" : String(text);
        const fontStyle = options.fontStyle || "normal";
        const extraSpacing = options.extraSpacingAfter === undefined ? spaceAfterParagraph : options.extraSpacingAfter;
        doc.setFontSize(paragraphFontSize);
        doc.setFont("times", fontStyle);
        
        const lines = doc.splitTextToSize(textToWrite, pageWidth - (2 * margin));
        for (let i = 0; i < lines.length; i++) {
            if (y + paragraphLineHeight > usableHeight - (margin/2) ) { doc.addPage(); y = margin; }
            doc.text(lines[i], margin, y);
            y += paragraphLineHeight;
        }
        if (y + extraSpacing > usableHeight - (margin/2) && lines.length > 0) {
             doc.addPage(); y = margin;
        } else if (lines.length > 0) { 
            y += extraSpacing;
        }
    }
    
    // Formulardaten aus dem übergebenen 'data' Objekt verwenden
    const {
        bgNummer, personName, personAdresse, personPlz, personOrt,
        anzahlPersonenWiderspruchSanktion,
        jcNameSanktion, jcAdresseSanktion,
        bescheidDatumSanktion, bescheidAktenzeichenSanktion, sanktionGrund, sanktionHoeheDauer,
        widerspruchsgruende, 
        textKeinePflichtverletzung, textWichtigerGrund, textAnhaerungFehlte, textFormelleFehlerSanktion,
        ergaenzendeArgumenteSanktion, forderungWiderspruchSanktion,
        bitteUmAkteneinsicht,
        anlagen, anlageSonstigesSanktion
    } = data;

    const bescheidDatumFormatiert = getFormattedDateValue(bescheidDatumSanktion, "UNBEKANNT");

    doc.setFont("times", "normal");

    // Absender
    writeLine(personName);
    writeLine(personAdresse);
    writeLine(`${personPlz} ${personOrt}`);
    writeLine(`BG-Nummer: ${bgNummer}`);
    if (y + defaultLineHeight <= usableHeight) y += defaultLineHeight; else {doc.addPage(); y = margin;}

    // Empfänger
    writeLine(jcNameSanktion);
    jcAdresseSanktion.split("\n").forEach(line => writeLine(line.trim()));
    if (y + defaultLineHeight * 2 <= usableHeight) y += defaultLineHeight * 2; else {doc.addPage(); y = margin;}

    // Datum
    const datumHeute = new Date().toLocaleDateString("de-DE");
    doc.setFontSize(textFontSize);
    const datumsBreite = doc.getStringUnitWidth(datumHeute) * textFontSize / doc.internal.scaleFactor;
    if (y + defaultLineHeight > usableHeight) { doc.addPage(); y = margin; }
    doc.text(datumHeute, pageWidth - margin - datumsBreite, y);
    y += defaultLineHeight * 2; 

    // Betreff
    let betreffText = `Widerspruch gegen Ihren Sanktionsbescheid vom ${bescheidDatumFormatiert}`;
    if (bescheidAktenzeichenSanktion && bescheidAktenzeichenSanktion.trim() !== "") betreffText += `, Aktenzeichen: ${bescheidAktenzeichenSanktion}`;
    betreffText += `\nBedarfsgemeinschaft: ${bgNummer}, ${personName}`;
    betreffText += `\n- Aufforderung zur Rücknahme der Leistungsminderung -`;
    
    writeParagraph(betreffText, defaultLineHeight, betreffFontSize, {fontStyle: "bold", extraSpacingAfter: defaultLineHeight});

    // Anrede
    writeParagraph("Sehr geehrte Damen und Herren,", defaultLineHeight, textFontSize, {extraSpacingAfter: defaultLineHeight * 0.5});

    // ======================================================
    // START: Logik für getrennte Textblöcke (Singular vs. Plural)
    // ======================================================

    if (anzahlPersonenWiderspruchSanktion === "mehrerePersonen") {
        // --- TEXTBLOCK FÜR PLURAL ("WIR") ---
        writeParagraph(`hiermit legen wir fristgerecht Widerspruch gegen Ihren oben genannten Bescheid vom ${bescheidDatumFormatiert} ein, mit dem Sie eine Leistungsminderung in Höhe von ${sanktionHoeheDauer || '[Höhe/Dauer]'} festsetzen.`);
        writeParagraph(`Die von Ihnen festgestellte Pflichtverletzung und die daraus resultierende Sanktion sind nach unserer Sicht rechtswidrig und werden vollumfänglich bestritten. Die Entscheidung verletzt uns in unseren Rechten.`);
        
        writeLine(`Begründung unseres Widerspruchs:`, defaultLineHeight, "bold", subHeadingFontSize);
        y += spaceAfterParagraph / 2;
        writeParagraph(`Der Vorwurf einer Pflichtverletzung (konkret: "${sanktionGrund || 'siehe Ihr Bescheid'}") trifft aus den folgenden, von Ihnen zu prüfenden Gründen nicht zu:`, defaultLineHeight, textFontSize, {fontStyle:"italic"});

        if (widerspruchsgruende.includes("keinePflichtverletzung") && textKeinePflichtverletzung && textKeinePflichtverletzung.trim() !== "") {
            writeLine("Es liegt keine Pflichtverletzung vor:", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textKeinePflichtverletzung);
        }
        if (widerspruchsgruende.includes("wichtigerGrund") && textWichtigerGrund && textWichtigerGrund.trim() !== "") {
            writeLine("Es lag ein wichtiger Grund für unser Handeln vor:", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textWichtigerGrund);
        }
        if (widerspruchsgruende.includes("anhaerungFehlte") && textAnhaerungFehlte && textAnhaerungFehlte.trim() !== "") {
            writeLine("Die erforderliche Anhörung vor Erlass des Bescheides fehlte oder war fehlerhaft:", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textAnhaerungFehlte);
        }
        if (widerspruchsgruende.includes("formelleFehler") && textFormelleFehlerSanktion && textFormelleFehlerSanktion.trim() !== "") {
            writeLine("Der Bescheid weist sonstige formelle Fehler auf:", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textFormelleFehlerSanktion);
        }
        if (ergaenzendeArgumenteSanktion && ergaenzendeArgumenteSanktion.trim() !== "") {
            writeLine("Weitere ergänzende Ausführungen:", defaultLineHeight, "bold", textFontSize);
            writeParagraph(ergaenzendeArgumenteSanktion);
        }
        
        writeParagraph(`Aufgrund der dargelegten Gründe ist die festgesetzte Sanktion rechtswidrig und aufzuheben. Die Androhung einer Leistungsminderung entbehrt somit jeglicher Grundlage.`, defaultLineHeight, textFontSize, {fontStyle: "italic", extraSpacingAfter: defaultLineHeight*0.5});
        
        writeLine(`Unser Antrag im Widerspruchsverfahren:`, defaultLineHeight, "bold", subHeadingFontSize);
        y += spaceAfterParagraph / 2;
        writeParagraph(forderungWiderspruchSanktion, defaultLineHeight, textFontSize, {fontStyle:"bold"});
        
        if (bitteUmAkteneinsicht) {
            writeParagraph(`Zusätzlich beantragen wir Akteneinsicht gemäß § 25 SGB X in die vollständigen Verwaltungsakten, die unserem Leistungsfall zugrunde liegen, um unsere Rechte vollumfänglich wahrnehmen zu können.`, defaultLineHeight, textFontSize);
        }

        const fristsetzungDatumText = new Date(Date.now() + 3 * 7 * 24 * 60 * 60 * 1000).toLocaleDateString("de-DE"); 
        writeParagraph(`Bitte bestätigen Sie uns den Eingang dieses Widerspruchs schriftlich. Da der Widerspruch aufschiebende Wirkung hat, gehen wir davon aus, dass die Leistungsminderung bis zur Entscheidung über diesen Widerspruch nicht vollzogen wird.`);
        writeParagraph(`Eine rechtsmittelfähige Entscheidung über unseren Widerspruch erwarten wir bis spätestens zum ${fristsetzungDatumText}.`);
        writeParagraph(`Sollte unserem Widerspruch nicht oder nicht vollumfänglich abgeholfen werden, behalten wir uns ausdrücklich die Einleitung weiterer rechtlicher Schritte, insbesondere die Klageerhebung vor dem Sozialgericht, vor.`);
    
    } else {
        // --- TEXTBLOCK FÜR SINGULAR ("ICH") ---
        writeParagraph(`hiermit lege ich fristgerecht Widerspruch gegen Ihren oben genannten Bescheid vom ${bescheidDatumFormatiert} ein, mit dem Sie eine Leistungsminderung in Höhe von ${sanktionHoeheDauer || '[Höhe/Dauer]'} festsetzen.`);
        writeParagraph(`Die von Ihnen festgestellte Pflichtverletzung und die daraus resultierende Sanktion sind nach meiner Sicht rechtswidrig und werden vollumfänglich bestritten. Die Entscheidung verletzt mich in meinen Rechten.`);

        writeLine(`Begründung meines Widerspruchs:`, defaultLineHeight, "bold", subHeadingFontSize);
        y += spaceAfterParagraph / 2;
        writeParagraph(`Der Vorwurf einer Pflichtverletzung (konkret: "${sanktionGrund || 'siehe Ihr Bescheid'}") trifft aus den folgenden, von Ihnen zu prüfenden Gründen nicht zu:`, defaultLineHeight, textFontSize, {fontStyle:"italic"});
        
        if (widerspruchsgruende.includes("keinePflichtverletzung") && textKeinePflichtverletzung && textKeinePflichtverletzung.trim() !== "") {
            writeLine("Es liegt keine Pflichtverletzung vor:", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textKeinePflichtverletzung);
        }
        if (widerspruchsgruende.includes("wichtigerGrund") && textWichtigerGrund && textWichtigerGrund.trim() !== "") {
            writeLine("Es lag ein wichtiger Grund für mein Handeln vor:", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textWichtigerGrund);
        }
        if (widerspruchsgruende.includes("anhaerungFehlte") && textAnhaerungFehlte && textAnhaerungFehlte.trim() !== "") {
            writeLine("Die erforderliche Anhörung vor Erlass des Bescheides fehlte oder war fehlerhaft:", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textAnhaerungFehlte);
        }
        if (widerspruchsgruende.includes("formelleFehler") && textFormelleFehlerSanktion && textFormelleFehlerSanktion.trim() !== "") {
            writeLine("Der Bescheid weist sonstige formelle Fehler auf:", defaultLineHeight, "bold", textFontSize);
            writeParagraph(textFormelleFehlerSanktion);
        }

        if (ergaenzendeArgumenteSanktion && ergaenzendeArgumenteSanktion.trim() !== "") {
            writeLine("Weitere ergänzende Ausführungen:", defaultLineHeight, "bold", textFontSize);
            writeParagraph(ergaenzendeArgumenteSanktion);
        }
        
        writeParagraph(`Aufgrund der dargelegten Gründe ist die festgesetzte Sanktion rechtswidrig und aufzuheben. Die Androhung einer Leistungsminderung entbehrt somit jeglicher Grundlage.`, defaultLineHeight, textFontSize, {fontStyle: "italic", extraSpacingAfter: defaultLineHeight*0.5});
        
        writeLine(`Mein Antrag im Widerspruchsverfahren:`, defaultLineHeight, "bold", subHeadingFontSize);
        y += spaceAfterParagraph / 2;
        writeParagraph(forderungWiderspruchSanktion, defaultLineHeight, textFontSize, {fontStyle:"bold"});
        
        if (bitteUmAkteneinsicht) {
            writeParagraph(`Zusätzlich beantrage ich Akteneinsicht gemäß § 25 SGB X in die vollständigen Verwaltungsakten, die meinem Leistungsfall zugrunde liegen, um meine Rechte vollumfänglich wahrnehmen zu können.`, defaultLineHeight, textFontSize);
        }

        const fristsetzungDatumText = new Date(Date.now() + 3 * 7 * 24 * 60 * 60 * 1000).toLocaleDateString("de-DE"); 
        writeParagraph(`Bitte bestätigen Sie mir den Eingang dieses Widerspruchs schriftlich. Da der Widerspruch aufschiebende Wirkung hat, gehe ich davon aus, dass die Leistungsminderung bis zur Entscheidung über diesen Widerspruch nicht vollzogen wird.`);
        writeParagraph(`Eine rechtsmittelfähige Entscheidung über meinen Widerspruch erwarte ich bis spätestens zum ${fristsetzungDatumText}.`);
        writeParagraph(`Sollte meinem Widerspruch nicht oder nicht vollumfänglich abgeholfen werden, behalte ich mir ausdrücklich die Einleitung weiterer rechtlicher Schritte, insbesondere die Klageerhebung vor dem Sozialgericht, vor.`);
    }

    // --- Gemeinsamer Schlussteil ---
    if (anlagen && anlagen.length > 0) {
        writeLine("Anlagen:", defaultLineHeight, "bold", subHeadingFontSize);
        y += spaceAfterParagraph / 2;
        anlagen.forEach(anlage => {
            writeParagraph(`- ${anlage}`);
        });
        if (anlageSonstigesSanktion && anlageSonstigesSanktion.trim() !== "") { 
            writeParagraph(`- Sonstige Anlagen: ${anlageSonstigesSanktion}`);
        }
    }
    
    if (y + defaultLineHeight <= usableHeight) y += defaultLineHeight; else { doc.addPage(); y = margin; }
    
    writeParagraph("Mit freundlichen Grüßen");
    writeParagraph("\n\n_________________________"); 
    writeParagraph(personName);

    doc.save("widerspruch_sanktionsbescheid_buergergeld.pdf");
}
// ===================================================================================
// ENDE:  Sanktion Bürgergeld
// ===================================================================================

// ===================================================================================
// START:  Leistungsbescheid Bürgergeld
// ===================================================================================

function generateBuergergeldWiderspruchPDF(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    const margin = 20;
    const defaultLineHeight = 7;
    const spaceAfterParagraph = 3; 
    const subHeadingFontSize = 11;
    const textFontSize = 10;     
    const smallTextFontSize = 8; 
    const headingFontSize = 14;

    let y = margin;
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const usableHeight = pageHeight - margin;

    function writeLine(text, currentLineHeight = defaultLineHeight, fontStyle = "normal", fontSize = textFontSize) {
        const textToWrite = text === undefined || text === null ? "" : String(text);
        if (y + currentLineHeight > usableHeight - (margin / 2)) { doc.addPage(); y = margin; }
        doc.setFontSize(fontSize);
        doc.setFont("times", fontStyle); 
        doc.text(textToWrite, margin, y);
        y += currentLineHeight;
    }

    function writeParagraph(text, paragraphLineHeight = defaultLineHeight, paragraphFontSize = textFontSize, options = {}) {
        const textToWrite = text === undefined || text === null ? "" : String(text);
        const fontStyle = options.fontStyle || "normal";
        const extraSpacing = options.extraSpacingAfter === undefined ? spaceAfterParagraph : options.extraSpacingAfter;
        doc.setFontSize(paragraphFontSize);
        doc.setFont("times", fontStyle);
        
        const lines = doc.splitTextToSize(textToWrite, pageWidth - (2 * margin));
        for (let i = 0; i < lines.length; i++) {
            if (y + paragraphLineHeight > usableHeight - (margin / 2) ) { doc.addPage(); y = margin; }
            doc.text(lines[i], margin, y);
            y += paragraphLineHeight;
        }
        if (y + extraSpacing > usableHeight - (margin / 2) && lines.length > 0) {
             doc.addPage(); y = margin;
        } else if (lines.length > 0) { 
            y += extraSpacing;
        }
    }
    
    // Formulardaten aus dem übergebenen 'data' Objekt verwenden
    const {
        bgBedarfsgemeinschaft, bgVorname, bgNachname, anzahlPersonenWiderspruch,
        bgStrasseNr, bgPlz, bgOrt, bgTelefon, bgEmail,
        jcName, jcStrasseNr, jcPlz: jcPlzJobcenter, jcOrt: jcOrtJobcenter,
        bescheidDatum, bescheidAktenzeichen, bescheidBetreff,
        hauptgrundWiderspruch,
        fehlerRegelbedarf, begruendungRegelbedarf,
        fehlerMehrbedarfe, begruendungMehrbedarfe,
        fehlerKdu, begruendungKdu,
        fehlerEinkommen, begruendungEinkommen,
        fehlerVermoegen, begruendungVermoegen,
        begruendungAblehnung, begruendungFormell,
        ausfuehrlicheBegruendung, 
        antragImWiderspruch, zusatzforderungText,
        bitteUmAkteneinsicht,
        anlagen, anlageSonstigesText
    } = data;

    const jobcenterFullAddress = `${jcStrasseNr || ""}\n${jcPlzJobcenter || ""} ${jcOrtJobcenter || ""}`.trim();
    const bescheidDatumFormatiert = getFormattedDateValue(bescheidDatum, "UNBEKANNT");

    doc.setFont("times", "normal");

    // Absender
    writeLine(`${bgVorname} ${bgNachname}`);
    writeLine(bgStrasseNr);
    writeLine(`${bgPlz} ${bgOrt}`);
    if (bgTelefon && bgTelefon.trim() !== "") writeLine(`Tel.: ${bgTelefon}`);
    if (bgEmail && bgEmail.trim() !== "") writeLine(`E-Mail: ${bgEmail}`);
    writeLine(`BG-Nummer: ${bgBedarfsgemeinschaft}`);
    if (y + defaultLineHeight <= usableHeight) y += defaultLineHeight; else {doc.addPage(); y = margin;}

    // Empfänger
    writeLine(jcName);
    jobcenterFullAddress.split("\n").forEach(line => writeLine(line.trim()));
    if (y + defaultLineHeight * 2 <= usableHeight) y += defaultLineHeight * 2; else {doc.addPage(); y = margin;}

    // Datum
    const datumHeute = new Date().toLocaleDateString("de-DE");
    doc.setFontSize(textFontSize);
    const datumsBreite = doc.getStringUnitWidth(datumHeute) * textFontSize / doc.internal.scaleFactor;
    if (y + defaultLineHeight > usableHeight) { doc.addPage(); y = margin; }
    doc.text(datumHeute, pageWidth - margin - datumsBreite, y);
    y += defaultLineHeight * 2; 

    // Betreff
    let betreffText = `Widerspruch gegen Ihren Bescheid vom ${bescheidDatumFormatiert}`;
    if (bescheidAktenzeichen && bescheidAktenzeichen.trim() !== "") betreffText += `, Aktenzeichen: ${bescheidAktenzeichen}`;
    betreffText += `\nBetreffend: ${bescheidBetreff || 'Leistungen zur Sicherung des Lebensunterhalts nach dem SGB II'}`;
    betreffText += `\nBedarfsgemeinschaft: ${bgBedarfsgemeinschaft}, ${bgVorname} ${bgNachname}`;
    betreffText += `\n- ERNEUTE DRINGENDE AUFFORDERUNG ZUR ÜBERPRÜFUNG UND KORREKTUR -`;
    
    const betreffFontSize = 12;
    writeParagraph(betreffText, defaultLineHeight, betreffFontSize, {fontStyle: "bold", extraSpacingAfter: defaultLineHeight});

    // Anrede
    writeParagraph("Sehr geehrte Damen und Herren,", defaultLineHeight, textFontSize, {extraSpacingAfter: defaultLineHeight * 0.5});

    // ======================================================
    // START: Logik für getrennte Textblöcke (Singular vs. Plural)
    // ======================================================

    if (anzahlPersonenWiderspruch === "mehrerePersonen") {
        // --- TEXTBLOCK FÜR PLURAL ("WIR") ---
        writeParagraph(`hiermit legen wir fristgerecht Widerspruch gegen Ihren oben genannten Bescheid vom ${bescheidDatumFormatiert} ein.`);
        writeParagraph(`Die in diesem Bescheid getroffene Entscheidung bezüglich unserer Leistungsansprüche nach dem SGB II ist aus unserer Sicht rechtswidrig und/oder sachlich unzutreffend und verletzt uns in unseren Rechten.`);
        
        writeLine(`Ausführliche Begründung unseres Widerspruchs:`, defaultLineHeight, "bold", subHeadingFontSize);
        y += spaceAfterParagraph / 2;
        
        if (hauptgrundWiderspruch === "leistungshoehe") {
            writeParagraph(`Die Höhe der bewilligten Leistungen wurde fehlerhaft berechnet. Insbesondere beanstanden wir folgende Punkte:`, defaultLineHeight, textFontSize, {fontStyle:"italic"});
            if (fehlerRegelbedarf && begruendungRegelbedarf && begruendungRegelbedarf.trim() !== "") writeParagraph(`- Regelbedarf:\n  ${begruendungRegelbedarf}`);
            if (fehlerMehrbedarfe && begruendungMehrbedarfe && begruendungMehrbedarfe.trim() !== "") writeParagraph(`- Mehrbedarfe:\n  ${begruendungMehrbedarfe}`);
            if (fehlerKdu && begruendungKdu && begruendungKdu.trim() !== "") writeParagraph(`- Kosten der Unterkunft und Heizung:\n  ${begruendungKdu}`);
            if (fehlerEinkommen && begruendungEinkommen && begruendungEinkommen.trim() !== "") writeParagraph(`- Anrechnung von Einkommen:\n  ${begruendungEinkommen}`);
            if (fehlerVermoegen && begruendungVermoegen && begruendungVermoegen.trim() !== "") writeParagraph(`- Anrechnung von Vermögen:\n  ${begruendungVermoegen}`);
        } else if (hauptgrundWiderspruch === "ablehnung" && begruendungAblehnung && begruendungAblehnung.trim() !== "") {
            writeParagraph(`Unser Antrag auf Bürgergeld wurde ganz oder teilweise abgelehnt. Diese Ablehnung ist nicht gerechtfertigt, da:\n${begruendungAblehnung}`);
        } else if (hauptgrundWiderspruch === "formell" && begruendungFormell && begruendungFormell.trim() !== "") {
            writeParagraph(`Der Bescheid weist folgende formelle Fehler auf, die seine Rechtmäßigkeit in Frage stellen:\n${begruendungFormell}`);
        }

        if (ausfuehrlicheBegruendung.trim() !== "") {
            writeParagraph(ausfuehrlicheBegruendung);
        }
        
        writeParagraph(`Wir fordern Sie auf, die Sachlage unter Berücksichtigung unserer Ausführungen und der beigefügten Unterlagen erneut umfassend zu prüfen. Die Sicherung des Existenzminimums ist ein Grundrecht, und eine fehlerhafte Entscheidung hat für uns erhebliche negative Konsequenzen.`, defaultLineHeight, textFontSize, {fontStyle: "italic", extraSpacingAfter: defaultLineHeight*0.5});
        
        writeLine(`Unser Antrag im Widerspruchsverfahren:`, defaultLineHeight, "bold", subHeadingFontSize);
        y += spaceAfterParagraph / 2;
        let forderungText = "";
        if (antragImWiderspruch === "neuberechnung") forderungText = `Wir beantragen, den Bescheid vom ${bescheidDatumFormatiert} aufzuheben und über unseren Leistungsanspruch unter Beachtung unserer dargelegten Gründe neu zu entscheiden und die Leistungen korrekt zu berechnen und zu bewilligen.`;
        else if (antragImWiderspruch === "bewilligung") forderungText = `Wir beantragen, den Ablehnungsbescheid vom ${bescheidDatumFormatiert} aufzuheben und uns die beantragten Leistungen in gesetzlicher Höhe zu bewilligen.`;
        else if (antragImWiderspruch === "korrektur_formell") forderungText = `Wir beantragen, den formell fehlerhaften Bescheid vom ${bescheidDatumFormatiert} aufzuheben und einen korrekten, umfassend begründeten und rechtsmittelfähigen Bescheid zu erlassen.`;
        if (zusatzforderungText && zusatzforderungText.trim() !== "") forderungText += ` ${zusatzforderungText}`;
        writeParagraph(forderungText, defaultLineHeight, textFontSize, {fontStyle:"bold"});
        
        if (bitteUmAkteneinsicht) writeParagraph(`Zusätzlich beantragen wir Akteneinsicht gemäß § 25 SGB X in die vollständigen Verwaltungsakten, die unserem Leistungsfall zugrunde liegen, um unsere Rechte vollumfänglich wahrnehmen zu können.`, defaultLineHeight, textFontSize);
        
        const fristsetzungDatumText = new Date(Date.now() + 4 * 7 * 24 * 60 * 60 * 1000).toLocaleDateString("de-DE"); 
        writeParagraph(`Bitte bestätigen Sie uns den Eingang dieses Widerspruchs umgehend schriftlich. Wir erwarten Ihre rechtsmittelfähige Entscheidung über unseren Widerspruch bis spätestens zum ${fristsetzungDatumText}.`);
        writeParagraph(`Sollte unserem Widerspruch nicht oder nicht vollumfänglich abgeholfen werden, behalten wir uns ausdrücklich die Einleitung weiterer rechtlicher Schritte, insbesondere die Klageerhebung vor dem zuständigen Sozialgericht, vor.`);
    
    } else {
        // --- TEXTBLOCK FÜR SINGULAR ("ICH") ---
        writeParagraph(`hiermit lege ich fristgerecht Widerspruch gegen Ihren oben genannten Bescheid vom ${bescheidDatumFormatiert} ein.`);
        writeParagraph(`Die in diesem Bescheid getroffene Entscheidung bezüglich meiner Leistungsansprüche nach dem SGB II ist aus meiner Sicht rechtswidrig und/oder sachlich unzutreffend und verletzt mich in meinen Rechten.`);

        writeLine(`Ausführliche Begründung meines Widerspruchs:`, defaultLineHeight, "bold", subHeadingFontSize);
        y += spaceAfterParagraph / 2;
        
        if (hauptgrundWiderspruch === "leistungshoehe") {
            writeParagraph(`Die Höhe der bewilligten Leistungen wurde fehlerhaft berechnet. Insbesondere beanstande ich folgende Punkte:`, defaultLineHeight, textFontSize, {fontStyle:"italic"});
            if (fehlerRegelbedarf && begruendungRegelbedarf && begruendungRegelbedarf.trim() !== "") writeParagraph(`- Regelbedarf:\n  ${begruendungRegelbedarf}`);
            if (fehlerMehrbedarfe && begruendungMehrbedarfe && begruendungMehrbedarfe.trim() !== "") writeParagraph(`- Mehrbedarfe:\n  ${begruendungMehrbedarfe}`);
            if (fehlerKdu && begruendungKdu && begruendungKdu.trim() !== "") writeParagraph(`- Kosten der Unterkunft und Heizung:\n  ${begruendungKdu}`);
            if (fehlerEinkommen && begruendungEinkommen && begruendungEinkommen.trim() !== "") writeParagraph(`- Anrechnung von Einkommen:\n  ${begruendungEinkommen}`);
            if (fehlerVermoegen && begruendungVermoegen && begruendungVermoegen.trim() !== "") writeParagraph(`- Anrechnung von Vermögen:\n  ${begruendungVermoegen}`);
        } else if (hauptgrundWiderspruch === "ablehnung" && begruendungAblehnung && begruendungAblehnung.trim() !== "") {
            writeParagraph(`Mein Antrag auf Bürgergeld wurde ganz oder teilweise abgelehnt. Diese Ablehnung ist nicht gerechtfertigt, da:\n${begruendungAblehnung}`);
        } else if (hauptgrundWiderspruch === "formell" && begruendungFormell && begruendungFormell.trim() !== "") {
            writeParagraph(`Der Bescheid weist folgende formelle Fehler auf, die seine Rechtmäßigkeit in Frage stellen:\n${begruendungFormell}`);
        }

        if (ausfuehrlicheBegruendung.trim() !== "") {
            writeParagraph(ausfuehrlicheBegruendung);
        }

        writeParagraph(`Ich fordere Sie auf, die Sachlage unter Berücksichtigung meiner Ausführungen und der beigefügten Unterlagen erneut umfassend zu prüfen. Die Sicherung des Existenzminimums ist ein Grundrecht, und eine fehlerhafte Entscheidung hat für mich erhebliche negative Konsequenzen.`, defaultLineHeight, textFontSize, {fontStyle: "italic", extraSpacingAfter: defaultLineHeight*0.5});
        
        writeLine(`Mein Antrag im Widerspruchsverfahren:`, defaultLineHeight, "bold", subHeadingFontSize);
        y += spaceAfterParagraph / 2;
        let forderungText = "";
        if (antragImWiderspruch === "neuberechnung") forderungText = `Ich beantrage, den Bescheid vom ${bescheidDatumFormatiert} aufzuheben und über meinen Leistungsanspruch unter Beachtung meiner dargelegten Gründe neu zu entscheiden und die Leistungen korrekt zu berechnen und zu bewilligen.`;
        else if (antragImWiderspruch === "bewilligung") forderungText = `Ich beantrage, den Ablehnungsbescheid vom ${bescheidDatumFormatiert} aufzuheben und mir die beantragten Leistungen in gesetzlicher Höhe zu bewilligen.`;
        else if (antragImWiderspruch === "korrektur_formell") forderungText = `Ich beantrage, den formell fehlerhaften Bescheid vom ${bescheidDatumFormatiert} aufzuheben und einen korrekten, umfassend begründeten und rechtsmittelfähigen Bescheid zu erlassen.`;
        if (zusatzforderungText && zusatzforderungText.trim() !== "") forderungText += ` ${zusatzforderungText}`;
        writeParagraph(forderungText, defaultLineHeight, textFontSize, {fontStyle:"bold"});
        
        if (bitteUmAkteneinsicht) writeParagraph(`Zusätzlich beantrage ich Akteneinsicht gemäß § 25 SGB X in die vollständigen Verwaltungsakten, die meinem Leistungsfall zugrunde liegen, um meine Rechte vollumfänglich wahrnehmen zu können.`, defaultLineHeight, textFontSize);

        const fristsetzungDatumText = new Date(Date.now() + 4 * 7 * 24 * 60 * 60 * 1000).toLocaleDateString("de-DE"); 
        writeParagraph(`Bitte bestätigen Sie mir den Eingang dieses Widerspruchs umgehend schriftlich. Ich erwarte Ihre rechtsmittelfähige Entscheidung über meinen Widerspruch bis spätestens zum ${fristsetzungDatumText}.`);
        writeParagraph(`Sollte meinem Widerspruch nicht oder nicht vollumfänglich abgeholfen werden, behalte ich mir ausdrücklich die Einleitung weiterer rechtlicher Schritte, insbesondere die Klageerhebung vor dem zuständigen Sozialgericht, vor.`);
    }

    // --- Gemeinsamer Schlussteil ---
    if (anlagen && anlagen.length > 0) {
        writeLine("Anlagen:", defaultLineHeight, "bold", subHeadingFontSize);
        y += spaceAfterParagraph / 2;
        anlagen.forEach(anlage => {
            writeParagraph(`- ${anlage}`);
        });
        if (anlageSonstigesText && anlageSonstigesText.trim() !== "") { 
            writeParagraph(`- Sonstige relevante Unterlagen: ${anlageSonstigesText}`);
        }
    }
    
    if (y + defaultLineHeight <= usableHeight) y += defaultLineHeight; else { doc.addPage(); y = margin; }
    
    writeParagraph("Mit freundlichen Grüßen");
    writeParagraph("\n\n_________________________"); 
    writeParagraph(`${bgVorname} ${bgNachname}`);

    doc.save("widerspruch_buergergeld.pdf");
}
// ===================================================================================
// ENDE:  Leistungsbescheid Bürgergeld
// ===================================================================================


// ===================================================================================
// START: REZEPT FÜR WIDERSPRUCH GEGEN BAFÖG-BESCHEID
// ===================================================================================

function generateBafogWiderspruchPDF(data) {
    // Initialisierung der PDF-Bibliothek
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    // Layout-Konstanten
    const margin = 20;
    const defaultLineHeight = 7;
    const spaceAfterParagraph = 3; 
    const subHeadingFontSize = 11;
    const textFontSize = 10;     
    const betreffFontSize = 12;

    let y = margin;
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const usableHeight = pageHeight - margin;

    // Interne Hilfsfunktionen zum Schreiben von Zeilen und Absätzen
    function writeLine(text, currentLineHeight = defaultLineHeight, fontStyle = "normal", fontSize = textFontSize) {
        const textToWrite = text === undefined || text === null ? "" : String(text);
        if (y + currentLineHeight > usableHeight - (margin/2)) { doc.addPage(); y = margin; }
        doc.setFontSize(fontSize);
        doc.setFont("times", fontStyle); 
        doc.text(textToWrite, margin, y);
        y += currentLineHeight;
    }

    function writeParagraph(text, paragraphLineHeight = defaultLineHeight, paragraphFontSize = textFontSize, options = {}) {
        const textToWrite = text === undefined || text === null ? "" : String(text);
        const fontStyle = options.fontStyle || "normal";
        const extraSpacing = options.extraSpacingAfter === undefined ? spaceAfterParagraph : options.extraSpacingAfter;
        doc.setFontSize(paragraphFontSize);
        doc.setFont("times", fontStyle);
        
        const lines = doc.splitTextToSize(textToWrite, pageWidth - (2 * margin));
        for (let i = 0; i < lines.length; i++) {
            if (y + paragraphLineHeight > usableHeight - (margin/2) ) { doc.addPage(); y = margin; }
            doc.text(lines[i], margin, y);
            y += paragraphLineHeight;
        }
        if (y + extraSpacing > usableHeight - (margin/2) && lines.length > 0) {
             doc.addPage(); y = margin;
        } else if (lines.length > 0) { 
            y += extraSpacing;
        }
    }
    
    // Formulardaten aus dem 'data'-Objekt extrahieren
    const {
        personName, foerderungsnummer, bafogArt,
        personAdresse, personPlz, personOrt,
        amtName, amtAdresse,
        bescheidDatum, bescheidAktenzeichen,
        widerspruchsgruende,
        textAblehnung, textEinkommenEltern, textEigenesEinkommen, textVermoegen, textFreibetraege,
        ergaenzendeArgumenteBafog, forderungBafog
    } = data;

    const bescheidDatumFormatiert = getFormattedDateValue(bescheidDatum, "UNBEKANNT");

    doc.setFont("times", "normal");

    // 1. Absenderblock
    writeLine(personName);
    writeLine(personAdresse);
    writeLine(`${personPlz} ${personOrt}`);
    y += defaultLineHeight;

    // 2. Empfängerblock
    writeLine("An das");
    writeLine(amtName);
    amtAdresse.split("\n").forEach(line => writeLine(line.trim()));
    y += defaultLineHeight * 2;

    // 3. Datum (rechtsbündig)
    const datumHeute = new Date().toLocaleDateString("de-DE");
    const datumsBreite = doc.getStringUnitWidth(datumHeute) * textFontSize / doc.internal.scaleFactor;
    doc.text(datumHeute, pageWidth - margin - datumsBreite, y);
    y += defaultLineHeight * 2; 

    // 4. Betreff (aussagekräftiger)
    let betreffText = `Widerspruch gegen den Bescheid über Leistungen nach dem Bundesausbildungsförderungsgesetz (BAföG) vom ${bescheidDatumFormatiert}`;
    if (bescheidAktenzeichen && bescheidAktenzeichen.trim() !== "") {
        betreffText += `\nIhr Aktenzeichen: ${bescheidAktenzeichen}`;
    }
    betreffText += `\nMeine Förderungsnummer: ${foerderungsnummer}`;
    
    writeParagraph(betreffText, defaultLineHeight, betreffFontSize, {fontStyle: "bold", extraSpacingAfter: defaultLineHeight});

    // 5. Anrede
    writeParagraph("Sehr geehrte Damen und Herren,", defaultLineHeight, textFontSize, {extraSpacingAfter: defaultLineHeight * 0.5});

    // 6. Einleitungstext (formeller)
    writeParagraph(`hiermit lege ich gegen den oben genannten Bescheid fristgerecht Widerspruch ein.`);
    writeParagraph(`Der angefochtene Bescheid ist nach meiner Auffassung rechtswidrig, da er auf einer fehlerhaften Sachverhaltsermittlung und/oder Rechtsanwendung beruht und mich in meinen Rechten auf Ausbildungsförderung erheblich verletzt.`);
        
    // 7. Begründungsteil (mit Verweisen auf Paragraphen)
    writeLine(`Begründung:`, defaultLineHeight, "bold", subHeadingFontSize);
    y += spaceAfterParagraph / 2;
    writeParagraph(`Die Rechtswidrigkeit des Bescheides ergibt sich insbesondere aus den folgenden Punkten:`);
    
    if (widerspruchsgruende.includes("ablehnung") && textAblehnung && textAblehnung.trim() !== "") {
        writeLine("1. Fehlerhafte Ablehnung dem Grunde nach:", defaultLineHeight, "bold", textFontSize);
        writeParagraph(textAblehnung);
    }
    if (widerspruchsgruende.includes("einkommenEltern") && textEinkommenEltern && textEinkommenEltern.trim() !== "") {
        writeLine("2. Fehlerhafte Feststellung des anzurechnenden Einkommens der Eltern (§§ 21 ff. BAföG):", defaultLineHeight, "bold", textFontSize);
        writeParagraph(textEinkommenEltern);
    }
    if (widerspruchsgruende.includes("eigenesEinkommen") && textEigenesEinkommen && textEigenesEinkommen.trim() !== "") {
        writeLine("3. Fehlerhafte Anrechnung meines eigenen Einkommens (§ 21 BAföG):", defaultLineHeight, "bold", textFontSize);
        writeParagraph(textEigenesEinkommen);
    }
    if (widerspruchsgruende.includes("vermoegen") && textVermoegen && textVermoegen.trim() !== "") {
        writeLine("4. Fehlerhafte Berücksichtigung meines Vermögens (§§ 27 ff. BAföG):", defaultLineHeight, "bold", textFontSize);
        writeParagraph(textVermoegen);
    }
    if (widerspruchsgruende.includes("freibetraege") && textFreibetraege && textFreibetraege.trim() !== "") {
        writeLine("5. Nichtberücksichtigung von Freibeträgen (z.B. für Geschwister, § 25 BAföG):", defaultLineHeight, "bold", textFontSize);
        writeParagraph(textFreibetraege);
    }

    if (ergaenzendeArgumenteBafog && ergaenzendeArgumenteBafog.trim() !== "") {
        writeLine("Weitere detaillierte Ausführungen:", defaultLineHeight, "bold", textFontSize);
        writeParagraph(ergaenzendeArgumenteBafog);
    }

    // 8. Antrag im Widerspruchsverfahren (präziser)
    writeLine(`Antrag:`, defaultLineHeight, "bold", subHeadingFontSize);
    y += spaceAfterParagraph / 2;
    writeParagraph(forderungBafog, defaultLineHeight, textFontSize, {fontStyle:"bold"});
    
    // 9. Schlusssatz und Grußformel (formeller)
    y += defaultLineHeight;
    writeParagraph(`Ich bitte um eine Überprüfung des Sachverhalts unter Berücksichtigung meiner Ausführungen sowie um eine schriftliche Bestätigung des Eingangs dieses Widerspruchs. Ich erwarte Ihre rechtsmittelfähige Entscheidung in Form eines Widerspruchsbescheides.`);
    writeParagraph(`Sollte meinem Widerspruch nicht oder nicht vollumfänglich abgeholfen werden, behalte ich mir die Klageerhebung vor dem zuständigen Verwaltungsgericht ausdrücklich vor.`);
    y += defaultLineHeight;
    writeParagraph("Mit freundlichen Grüßen");
    y += defaultLineHeight * 3; // Mehr Platz für Unterschrift
    writeParagraph(`(${personName})`);

    // 10. PDF speichern und Download auslösen
    doc.save("Widerspruch_BAfoeG.pdf");
}
// ===================================================================================
// ENDE: REZEPT FÜR WIDERSPRUCH GEGEN BAFÖG-BESCHEID
// ===================================================================================

// ===================================================================================
// Start: Widerspruch Asyl-Ablehnung
// ===================================================================================
function generateKlageAsylPDF(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    // ==================================================================
    // START: KORRIGIERTE SCHREIBFUNKTIONEN
    // ==================================================================
    const margin = 25;
    const defaultLineHeight = 7;
    const spaceAfterParagraph = 3;
    const textFontSize = 11;
    let y = margin;
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const usableHeight = pageHeight - margin;

    function writeLine(text, options = {}) {
        const currentLineHeight = options.lineHeight || defaultLineHeight;
        const fontStyle = options.fontStyle || "normal";
        const fontSize = options.fontSize || textFontSize;
        const align = options.align || "left";
        const textToWrite = text === undefined || text === null ? "" : String(text);

        if (y + currentLineHeight > usableHeight) { doc.addPage(); y = margin; }
        
        doc.setFontSize(fontSize);
        doc.setFont("times", fontStyle);
        
        const xPos = align === 'right' ? pageWidth - margin : margin;
        doc.text(textToWrite, xPos, y, { align: align });
        
        y += currentLineHeight;
    }

    function writeParagraph(text, options = {}) {
        const paragraphLineHeight = options.lineHeight || defaultLineHeight;
        const paragraphFontSize = options.fontSize || textFontSize;
        const fontStyle = options.fontStyle || "normal";
        const extraSpacing = options.extraSpacingAfter === undefined ? spaceAfterParagraph : options.extraSpacingAfter;
        const textToWrite = text === undefined || text === null ? "" : String(text);

        doc.setFontSize(paragraphFontSize);
        doc.setFont("times", fontStyle);

        const lines = doc.splitTextToSize(textToWrite, pageWidth - (2 * margin));
        lines.forEach(line => {
            writeLine(line, { lineHeight: paragraphLineHeight });
        });

        if (lines.length > 0) {
            y += extraSpacing;
        }
    }
    // ==================================================================
    // ENDE: KORRIGIERTE SCHREIBFUNKTIONEN
    // ==================================================================
    
    y = 30; // Startpunkt

    const { personName, geburtsdatum, staatsangehoerigkeit, personAdresse, bescheidDatum, bamfAktenzeichen, gerichtName, gerichtAdresse, kurzeBegruendung } = data;

    // Absenderblock
    const absenderText = `${personName} • ${personAdresse.replace(/\n/g, ' • ')}`;
    doc.setFontSize(8);
    doc.text(absenderText, margin, y);
    y += 10;

    // Empfänger
    writeParagraph(gerichtName, { fontStyle: "bold" });
    writeParagraph(gerichtAdresse);
    y += 14;
    
    // Datum
    writeLine(new Date().toLocaleDateString("de-DE"), { align: 'right' });
    y += 7;

    // Betreff
    writeLine(`Klage`, { fontStyle: "bold", lineHeight: 10 });
    writeParagraph(`des Herrn/der Frau ${personName}, geboren am ${new Date(geburtsdatum).toLocaleDateString("de-DE")}, Staatsangehörigkeit: ${staatsangehoerigkeit}, wohnhaft: ${personAdresse.replace(/\n/g, ', ')},`);
    writeLine(`- Kläger/in -`, { fontStyle: "bold", lineHeight: 10 });
    writeLine(`gegen`, {});
    writeParagraph(`die Bundesrepublik Deutschland, vertreten durch das Bundesamt für Migration und Flüchtlinge (BAMF),`);
    writeLine(`- Beklagte -`, { fontStyle: "bold", lineHeight: 10 });
    writeLine(`wegen: Asylrecht`, { fontStyle: "bold", lineHeight: 14 });
    
    // Haupttext
    writeParagraph(`hiermit erhebe ich Klage gegen den Bescheid des Bundesamtes für Migration und Flüchtlinge vom ${new Date(bescheidDatum).toLocaleDateString("de-DE")}, Aktenzeichen ${bamfAktenzeichen}.`);
    y += 7;
    
    // Anträge
    writeParagraph(`Ich beantrage,`);
    const antragText = `1. den Bescheid des Bundesamtes für Migration und Flüchtlinge vom ${new Date(bescheidDatum).toLocaleDateString("de-DE")} aufzuheben.\n2. die Beklagte zu verpflichten, mich als asylberechtigt anzuerkennen, hilfsweise mir die Flüchtlingseigenschaft zuzuerkennen, höchst hilfsweise mir subsidiären Schutz zu gewähren, äußerst hilfsweise festzustellen, dass Abschiebungsverbote nach § 60 Abs. 5 und 7 des Aufenthaltsgesetzes vorliegen.`;
    const antragLines = doc.splitTextToSize(antragText, pageWidth - (2 * margin) - 10);
    antragLines.forEach(line => {
        doc.text(line, margin + 5, y);
        y += defaultLineHeight;
    });
    y += 7;

    // Optionale Begründung
    if (kurzeBegruendung && kurzeBegruendung.trim() !== "") {
        writeLine("Zur vorläufigen Begründung wird ausgeführt:", { fontStyle: "bold", lineHeight: 10 });
        writeParagraph(kurzeBegruendung);
    }
    
    writeParagraph(`Eine ausführliche Klagebegründung erfolgt nach Beauftragung eines Rechtsanwalts und erfolgter Akteneinsicht.`);
    y += 14;

    // Grußformel
    writeLine("Mit freundlichen Grüßen");
    y += 21;
    writeLine("_________________________");
    writeLine(`(${personName})`);

    doc.save("Klage_gegen_Asyl-Ablehnung.pdf");
}

// ===================================================================================
// ENDE: Asyl Widerspruch Ablehnung
// ===================================================================================

// ===================================================================================
// Start: Fiktionsbescheinigung
// ===================================================================================


function generateFiktionsbescheinigungPDF(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    // ==================================================================
    // START: KORRIGIERTE SCHREIBFUNKTIONEN
    // ==================================================================
    const margin = 25;
    const defaultLineHeight = 7;
    const spaceAfterParagraph = 3;
    const textFontSize = 11;
    let y = margin;
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const usableHeight = pageHeight - margin;

    function writeLine(text, options = {}) {
        const currentLineHeight = options.lineHeight || defaultLineHeight;
        const fontStyle = options.fontStyle || "normal";
        const fontSize = options.fontSize || textFontSize;
        const align = options.align || "left";
        const textToWrite = text === undefined || text === null ? "" : String(text);

        if (y + currentLineHeight > usableHeight) { doc.addPage(); y = margin; }
        
        doc.setFontSize(fontSize);
        doc.setFont("times", fontStyle);
        
        const xPos = align === 'right' ? pageWidth - margin : margin;
        doc.text(textToWrite, xPos, y, { align: align });
        
        y += currentLineHeight;
    }

    function writeParagraph(text, options = {}) {
        const paragraphLineHeight = options.lineHeight || defaultLineHeight;
        const paragraphFontSize = options.fontSize || textFontSize;
        const fontStyle = options.fontStyle || "normal";
        const extraSpacing = options.extraSpacingAfter === undefined ? spaceAfterParagraph : options.extraSpacingAfter;
        const textToWrite = text === undefined || text === null ? "" : String(text);

        doc.setFontSize(paragraphFontSize);
        doc.setFont("times", fontStyle);

        const lines = doc.splitTextToSize(textToWrite, pageWidth - (2 * margin));
        lines.forEach(line => {
            writeLine(line, { lineHeight: paragraphLineHeight });
        });

        if (lines.length > 0) {
            y += extraSpacing;
        }
    }
    // ==================================================================
    // ENDE: KORRIGIERTE SCHREIBFUNKTIONEN
    // ==================================================================

    y = 30; // Startpunkt

    const { personName, geburtsdatum, personAdresse, artTitel, ablaufDatum, aktenzeichen, terminNachweis, behoerdeName, behoerdeAdresse } = data;

    // Absenderblock
    const absenderText = `${personName} • ${personAdresse.replace(/\n/g, ' • ')}`;
    doc.setFontSize(8);
    doc.text(absenderText, margin, y);
    y += 10;

    // Empfänger
    writeParagraph(behoerdeName, { fontStyle: "bold" });
    writeParagraph(behoerdeAdresse);
    y += 14;
    
    // Datum
    writeLine(new Date().toLocaleDateString("de-DE"), { align: 'right' });
    y += 7;

    // Betreff
    let betreff = `Antrag auf Ausstellung einer Fiktionsbescheinigung nach § 81 Abs. 3 AufenthG`;
    writeLine(betreff, { fontStyle: "bold", lineHeight: 8 });
    if (aktenzeichen && aktenzeichen.trim() !== "") {
        let zeichen = `Ihr Aktenzeichen: ${aktenzeichen}`;
        writeLine(zeichen, { fontStyle: "bold", lineHeight: 10 });
    }
    y += 7;
    
    // Haupttext
    writeLine("Sehr geehrte Damen und Herren,", { lineHeight: 14 });
    writeParagraph(`hiermit beantrage ich, ${personName}, geboren am ${new Date(geburtsdatum).toLocaleDateString("de-DE")}, die Ausstellung einer Fiktionsbescheinigung.`);
    writeParagraph(`Mein aktueller Aufenthaltstitel (${artTitel}) ist bis zum ${new Date(ablaufDatum).toLocaleDateString("de-DE")} gültig.`);
    y += 7;
    writeParagraph(`Ich habe bereits fristgerecht versucht, einen Antrag auf Verlängerung zu stellen und einen hierfür erforderlichen Termin bei Ihnen zu vereinbaren. Meine bisherigen Bemühungen sahen wie folgt aus:`);
    y += 5;
    
    // Begründung mit Einzug
    doc.setFont("times", "italic");
    const beweisLines = doc.splitTextToSize(terminNachweis, pageWidth - 2 * margin - 5);
    beweisLines.forEach(line => {
        doc.text(line, margin + 5, y);
        y += defaultLineHeight;
    });
    doc.setFont("times", "normal");
    y += 7;

    writeParagraph(`Da über meinen Verlängerungsantrag offensichtlich nicht vor Ablauf der Gültigkeit meines aktuellen Aufenthaltstitels entschieden werden kann und die fehlende Vorsprache nicht von mir zu vertreten ist, beantrage ich die umgehende Ausstellung einer Fiktionsbescheinigung gemäß § 81 Abs. 3 des Aufenthaltsgesetzes. Diese benötige ich dringend als Nachweis meines fortbestehenden legalen Aufenthalts.`);
    y += 14;

    // Grußformel
    writeLine("Mit freundlichen Grüßen");
    y += 21;
    writeLine("_________________________");
    writeLine(`(${personName})`);

    doc.save("Antrag_Fiktionsbescheinigung.pdf");
}

// ===================================================================================
// ENDE: Fiktionsbescheinigung
// ===================================================================================

// ===================================================================================
// Start: Untätigkeitsklage
// ===================================================================================


function generateUntaetigkeitsklagePDF(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    // ==================================================================
    // START: KORRIGIERTE SCHREIBFUNKTIONEN
    // ==================================================================
   const margin = 25;
    const defaultLineHeight = 7;
    const spaceAfterParagraph = 3;
    const textFontSize = 11;
    let y = margin;
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const usableHeight = pageHeight - margin;

    function writeLine(text, options = {}) {
        const currentLineHeight = options.lineHeight || defaultLineHeight;
        const fontStyle = options.fontStyle || "normal";
        const fontSize = options.fontSize || textFontSize;
        const align = options.align || "left";
        const textToWrite = text === undefined || text === null ? "" : String(text);

        if (y + currentLineHeight > usableHeight) { doc.addPage(); y = margin; }
        
        doc.setFontSize(fontSize);
        doc.setFont("times", fontStyle);
        
        const xPos = align === 'right' ? pageWidth - margin : margin;
        doc.text(textToWrite, xPos, y, { align: align });
        
        y += currentLineHeight;
    }

    function writeParagraph(text, options = {}) {
        const paragraphLineHeight = options.lineHeight || defaultLineHeight;
        const paragraphFontSize = options.fontSize || textFontSize;
        const fontStyle = options.fontStyle || "normal";
        const extraSpacing = options.extraSpacingAfter === undefined ? spaceAfterParagraph : options.extraSpacingAfter;
        const textToWrite = text === undefined || text === null ? "" : String(text);

        doc.setFontSize(paragraphFontSize);
        doc.setFont("times", fontStyle);

        const lines = doc.splitTextToSize(textToWrite, pageWidth - (2 * margin));
        lines.forEach(line => {
            writeLine(line, { lineHeight: paragraphLineHeight });
        });

        if (lines.length > 0) {
            y += extraSpacing;
        }
    }
    // ==================================================================
    // ENDE: KORRIGIERTE SCHREIBFUNKTIONEN
    // ==================================================================
    
    y = 30; // Startpunkt

    const { personName, geburtsdatum, personAdresse, antragDatum, antragArt, antragAktenzeichen, verklagteBehoerdeName, verklagteBehoerdeAdresse, gerichtName, gerichtAdresse } = data;

    // Absenderblock
    const absenderText = `${personName} • ${personAdresse.replace(/\n/g, ' • ')}`;
    doc.setFontSize(8);
    doc.text(absenderText, margin, y);
    y += 10;

    // Empfänger
    writeParagraph(gerichtName, { fontStyle: "bold" });
    writeParagraph(gerichtAdresse);
    y += 14;
    
    // Datum
    writeLine(new Date().toLocaleDateString("de-DE"), { align: 'right' });
    y += 7;

    // Betreff
    writeLine(`Untätigkeitsklage gemäß § 75 VwGO`, { fontStyle: "bold", lineHeight: 10 });
    writeParagraph(`des Herrn/der Frau ${personName}, geboren am ${new Date(geburtsdatum).toLocaleDateString("de-DE")}, wohnhaft: ${personAdresse.replace(/\n/g, ', ')},`);
    writeLine(`- Kläger/in -`, { fontStyle: "bold", lineHeight: 10 });
    writeLine(`gegen`, {});
    writeParagraph(`die ${verklagteBehoerdeName}, ${verklagteBehoerdeAdresse.replace(/\n/g, ', ')},`);
    writeLine(`- Beklagte -`, { fontStyle: "bold", lineHeight: 14 });
    
    // Haupttext
    writeParagraph(`hiermit erhebe ich Untätigkeitsklage gegen die Beklagte.`);
    y += 7;
    writeParagraph(`Ich habe am ${new Date(antragDatum).toLocaleDateString("de-DE")} einen ${antragArt} bei der Beklagten gestellt. Das Aktenzeichen lautet, soweit bekannt: ${antragAktenzeichen || "nicht bekannt"}.`);
    y += 7;
    writeParagraph(`Über diesen Antrag wurde bis zum heutigen Tage ohne Mitteilung eines zureichenden Grundes sachlich nicht entschieden, obwohl die gesetzliche Frist von drei Monaten verstrichen ist.`);
    y += 7;
    writeParagraph(`Ich beantrage daher,`);
    y += 5;
    
    // Antrag als eingerückter Text
    doc.setFont("times", "bold");
    const antragText = `die Beklagte zu verpflichten, über meinen Antrag vom ${new Date(antragDatum).toLocaleDateString("de-DE")} auf "${antragArt}" zu entscheiden.`;
    const antragLines = doc.splitTextToSize(antragText, pageWidth - 2 * margin - 5);
    antragLines.forEach(line => {
        doc.text(line, margin + 5, y);
        y += defaultLineHeight;
    });
    doc.setFont("times", "normal");
    y += 14;

    // Grußformel
    writeLine("Mit freundlichen Grüßen");
    y += 21;
    writeLine("_________________________");
    writeLine(`(${personName})`);

    doc.save("Untaetigkeitsklage.pdf");
}

// ===================================================================================
// ENDE: Untätigkeitsklage
// ===================================================================================

// ===================================================================================
// Start: Antrag Erstausstattung
// ===================================================================================
function generateErstausstattungPDF(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    // ==================================================================
    // START: KORRIGIERTE SCHREIBFUNKTIONEN
    // ==================================================================
    const margin = 25;
    const defaultLineHeight = 7;
    const spaceAfterParagraph = 3;
    const textFontSize = 11;
    let y = margin;
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const usableHeight = pageHeight - margin;

    function writeLine(text, options = {}) {
        const currentLineHeight = options.lineHeight || defaultLineHeight;
        const fontStyle = options.fontStyle || "normal";
        const fontSize = options.fontSize || textFontSize;
        const align = options.align || "left";
        const textToWrite = text === undefined || text === null ? "" : String(text);

        if (y + currentLineHeight > usableHeight) { doc.addPage(); y = margin; }
        
        doc.setFontSize(fontSize);
        doc.setFont("times", fontStyle);
        
        const xPos = align === 'right' ? pageWidth - margin : margin;
        doc.text(textToWrite, xPos, y, { align: align });
        
        y += currentLineHeight;
    }

    function writeParagraph(text, options = {}) {
        const paragraphLineHeight = options.lineHeight || defaultLineHeight;
        const paragraphFontSize = options.fontSize || textFontSize;
        const fontStyle = options.fontStyle || "normal";
        const extraSpacing = options.extraSpacingAfter === undefined ? spaceAfterParagraph : options.extraSpacingAfter;
        const textToWrite = text === undefined || text === null ? "" : String(text);

        doc.setFontSize(paragraphFontSize);
        doc.setFont("times", fontStyle);

        const lines = doc.splitTextToSize(textToWrite, pageWidth - (2 * margin));
        lines.forEach(line => {
            writeLine(line, { lineHeight: paragraphLineHeight });
        });

        if (lines.length > 0) {
            y += extraSpacing;
        }
    }
    // ==================================================================
    // ENDE: KORRIGIERTE SCHREIBFUNKTIONEN
    // ==================================================================

    y = 30; // Startpunkt

    const { personName, personAdresse, kundennummer, adresseNeueWohnung, mietbeginn, begruendung, bedarf, bedarfSonstiges, behoerdeName, behoerdeAdresse } = data;

    // Absenderblock
    const absenderText = `${personName} • ${personAdresse.replace(/\n/g, ' • ')}`;
    doc.setFontSize(8);
    doc.text(absenderText, margin, y);
    y += 10;

    // Empfänger
    writeParagraph(behoerdeName, { fontStyle: "bold" });
    writeParagraph(behoerdeAdresse);
    y += 14;
    
    // Datum
    writeLine(new Date().toLocaleDateString("de-DE"), { align: 'right' });
    y += 7;

    // Betreff
    writeLine(`Antrag auf Leistungen für die Erstausstattung der Wohnung`, { fontStyle: "bold", lineHeight: 8 });
    writeLine(`gemäß § 24 Abs. 3 S. 1 Nr. 1 SGB II / § 31 SGB XII`, { fontStyle: "bold", lineHeight: 8 });
    writeLine(`BG-Nummer / Kundennummer: ${kundennummer}`, { fontStyle: "bold", lineHeight: 10 });
    y += 7;
    
    // Haupttext
    writeLine("Sehr geehrte Damen und Herren,", { lineHeight: 14 });
    writeParagraph(`hiermit beantrage ich, ${personName}, die Gewährung einer Beihilfe für die Erstausstattung meiner Wohnung in der ${adresseNeueWohnung.replace(/\n/g, ', ')} zum Mietbeginn am ${new Date(mietbeginn).toLocaleDateString("de-DE")}.`);
    y += 7;
    
    writeLine("Begründung:", { fontStyle: "bold", lineHeight: 10 });
    writeParagraph(begruendung);
    y += 7;

    writeParagraph(`Da ich über keine ausreichende Möblierung und keine notwendigen Haushaltsgegenstände verfüge, beantrage ich folgende Erstausstattung:`);
    y += 7;

    // Bedarfsliste
    bedarf.forEach(item => {
        writeLine(`- ${item}`, { lineHeight: 6 });
    });
    if (bedarfSonstiges && bedarfSonstiges.trim() !== "") {
        writeLine(`- ${bedarfSonstiges.trim()}`);
    }
    y += 10;
    
    writeParagraph(`Ich bitte um eine Prüfung meines Bedarfs und eine schriftliche Entscheidung über meinen Antrag. Bitte teilen Sie mir mit, in welcher Form (Geld-, Sach- oder Gutscheinleistung) die Hilfe gewährt wird.`);
    y += 14;

    // Grußformel
    writeLine("Mit freundlichen Grüßen");
    y += 21;
    writeLine("_________________________");
    writeLine(`(${personName})`);

    doc.save("Antrag_Erstausstattung.pdf");
}

// ===================================================================================
// ENDE: Erstausstattung
// ===================================================================================


// ===================================================================================
// Start: Deckblatt Aufenthalt
// ===================================================================================
function generateDeckblattAufenthaltPDF(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    // ==================================================================
    // START: KORRIGIERTE SCHREIBFUNKTIONEN (HIER WAR DER FEHLER)
    // ==================================================================
    const margin = 25;
    const defaultLineHeight = 7;
    const spaceAfterParagraph = 3;
    const textFontSize = 11;
    let y = margin;
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const usableHeight = pageHeight - margin;

    function writeLine(text, options = {}) {
        const currentLineHeight = options.lineHeight || defaultLineHeight;
        const fontStyle = options.fontStyle || "normal";
        const fontSize = options.fontSize || textFontSize;
        const align = options.align || "left";
        const textToWrite = text === undefined || text === null ? "" : String(text);

        if (y + currentLineHeight > usableHeight) { doc.addPage(); y = margin; }
        
        doc.setFontSize(fontSize);
        doc.setFont("times", fontStyle);
        
        const xPos = align === 'right' ? pageWidth - margin : margin;
        doc.text(textToWrite, xPos, y, { align: align });
        
        y += currentLineHeight;
    }

    function writeParagraph(text, options = {}) {
        const paragraphLineHeight = options.lineHeight || defaultLineHeight;
        const paragraphFontSize = options.fontSize || textFontSize;
        const fontStyle = options.fontStyle || "normal";
        const extraSpacing = options.extraSpacingAfter === undefined ? spaceAfterParagraph : options.extraSpacingAfter;
        const textToWrite = text === undefined || text === null ? "" : String(text);

        doc.setFontSize(paragraphFontSize);
        doc.setFont("times", fontStyle);

        const lines = doc.splitTextToSize(textToWrite, pageWidth - (2 * margin));
        lines.forEach(line => {
            writeLine(line, { lineHeight: paragraphLineHeight });
        });

        if (lines.length > 0) {
            y += extraSpacing;
        }
    }
    // ==================================================================
    // ENDE: KORRIGIERTE SCHREIBFUNKTIONEN
    // ==================================================================
    
    y = 30; // Setzen den Startpunkt nach dem Header

    const { personName, personAdresse, aktenzeichen, antragArt, anlagen, anlagenSonstige, behoerdeName, behoerdeAdresse } = data;

    // Absenderblock (klein über der Anschrift)
    const absenderText = `${personName} • ${personAdresse.replace(/\n/g, ' • ')}`;
    doc.setFontSize(8);
    doc.text(absenderText, margin, y);
    y += 10;

    // Empfänger
    writeParagraph(behoerdeName, { fontStyle: "bold" });
    writeParagraph(behoerdeAdresse);
    y += 14;
    
    // Datum rechtsbündig
    const datumHeute = new Date().toLocaleDateString("de-DE");
    writeLine(datumHeute, { align: 'right' });
    y += 7;

    // Betreff
    let betreff = `Betreff: ${antragArt}`;
    writeLine(betreff, { fontStyle: "bold", lineHeight: 8 });
    if (aktenzeichen && aktenzeichen.trim() !== "") {
        let zeichen = `Ihr Aktenzeichen: ${aktenzeichen}`;
        writeLine(zeichen, { fontStyle: "bold", lineHeight: 10 });
    }
    y += 7;
    
    // Haupttext
    writeLine("Sehr geehrte Damen und Herren,", { lineHeight: 14 });
    writeParagraph(`hiermit überreiche ich Ihnen meinen oben genannten Antrag.`);
    writeParagraph(`Zur Prüfung der Voraussetzungen füge ich diesem Schreiben die folgenden Unterlagen in Kopie bei:`);
    y += 5;

    // Anlagenliste
    writeLine("Anlagen:", { fontStyle: "bold", lineHeight: 8 });

    anlagen.forEach(item => {
        writeLine(`- ${item}`, { lineHeight: 6 });
    });
    if (anlagenSonstige && anlagenSonstige.trim() !== "") {
        anlagenSonstige.split('\n').forEach(line => {
             if (line.trim()) writeLine(`- ${line.trim()}`, { lineHeight: 6 });
        });
    }
    y += 10;
    
    writeParagraph(`Ich bitte um eine Prüfung meines Antrags sowie um eine schriftliche Bestätigung über den Eingang dieser Unterlagen. Für eventuelle Rückfragen stehe ich Ihnen jederzeit gerne zur Verfügung.`);
    y += 14;

    // Grußformel
    writeLine("Mit freundlichen Grüßen");
    y += 21;
    writeLine("_________________________");
    writeLine(`(${personName})`);

    doc.save("Deckblatt_Antrag_Aufenthaltstitel.pdf");
}
// ===================================================================================
// ENDE: Deckblatt Aufenthalt
// ===================================================================================

// ===================================================================================
// Start: REZEPT FÜR WIDERSPRUCH GEGEN Mahnbescheid
// ===================================================================================


function generateMahnbescheidWiderspruchPDF(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    // Layout-Konstanten und PDF-Schreibfunktionen
    const margin = 25;
    const defaultLineHeight = 8;
    const spaceAfterParagraph = 4;
    const textFontSize = 11;
    const betreffFontSize = 13;

    let y = margin;
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const usableHeight = pageHeight - margin;

    function writeLine(text, currentLineHeight = defaultLineHeight, fontStyle = "normal", fontSize = textFontSize) {
        if (y + currentLineHeight > usableHeight) { doc.addPage(); y = margin; }
        doc.setFontSize(fontSize);
        doc.setFont("times", fontStyle);
        doc.text(text, margin, y);
        y += currentLineHeight;
    }

    function writeParagraph(text, paragraphLineHeight = defaultLineHeight, paragraphFontSize = textFontSize, options = {}) {
        const fontStyle = options.fontStyle || "normal";
        const extraSpacing = options.extraSpacingAfter === undefined ? spaceAfterParagraph : options.extraSpacingAfter;
        doc.setFontSize(paragraphFontSize);
        doc.setFont("times", fontStyle);
        const lines = doc.splitTextToSize(text, pageWidth - (2 * margin));
        lines.forEach(line => {
            if (y + paragraphLineHeight > usableHeight) { doc.addPage(); y = margin; }
            doc.text(line, margin, y);
            y += paragraphLineHeight;
        });
        if (lines.length > 0) y += extraSpacing;
    }

    // Formulardaten aus dem 'data' Objekt verwenden
    const {
        personName, personAdresse, personPlz, personOrt,
        mahngerichtName, mahngerichtAdresse,
        bescheidAktenzeichen, bescheidDatum,
        glaeubigerName
    } = data;

    const bescheidDatumFormatiert = getFormattedDateValue(bescheidDatum, "UNBEKANNT"); // Nutzt deine globale Hilfsfunktion

    // Absender (klein oben links)
    doc.setFontSize(9);
    doc.setFont("times", "normal");
    const absenderText = `${personName} · ${personAdresse} · ${personPlz} ${personOrt}`;
    doc.text(absenderText, margin, margin - 10);

    // Empfänger (Gericht)
    y += 15;
    writeLine(mahngerichtName);
    mahngerichtAdresse.split("\n").forEach(line => writeLine(line.trim()));
    y += defaultLineHeight * 2;

    // Datum (rechtsbündig)
    const datumHeute = new Date().toLocaleDateString("de-DE");
    const datumsBreite = doc.getStringUnitWidth(datumHeute) * textFontSize / doc.internal.scaleFactor;
    doc.text(datumHeute, pageWidth - margin - datumsBreite, y);
    y += defaultLineHeight * 2;

    // Betreff
    const betreffText = `Widerspruch gegen den Mahnbescheid vom ${bescheidDatumFormatiert}`;
    writeParagraph(betreffText, defaultLineHeight, betreffFontSize, {fontStyle: "bold", extraSpacingAfter: defaultLineHeight / 2});
    writeParagraph(`Aktenzeichen: ${bescheidAktenzeichen}`, defaultLineHeight, betreffFontSize, {fontStyle: "bold", extraSpacingAfter: defaultLineHeight});
    
    // Nennung der Parteien
    writeParagraph(`Antragsteller: ${glaeubigerName || '(Name des Gläubigers)'}`, defaultLineHeight, textFontSize, {extraSpacingAfter: 2});
    writeParagraph(`Antragsgegner: ${personName}`, defaultLineHeight, textFontSize, {extraSpacingAfter: defaultLineHeight});

    // Anrede
    writeParagraph("Sehr geehrte Damen und Herren,", defaultLineHeight, textFontSize);

    // Haupttext des Widerspruchs
    writeParagraph("hiermit erhebe ich gegen den oben genannten Mahnbescheid");
    
    // Der eigentliche Widerspruch - fett und zentriert
    doc.setFontSize(textFontSize);
    doc.setFont("times", "bold");
    const widerspruchSatz = "W I D E R S P R U C H";
    const widerspruchSatzBreite = doc.getStringUnitWidth(widerspruchSatz) * textFontSize / doc.internal.scaleFactor;
    doc.text(widerspruchSatz, (pageWidth - widerspruchSatzBreite) / 2, y + 2);
    y += defaultLineHeight + spaceAfterParagraph;
    
    writeParagraph("ein.");
    
    writeParagraph("Der Widerspruch richtet sich gegen den Anspruch insgesamt.", defaultLineHeight, textFontSize, {fontStyle: "bold"});

    y += defaultLineHeight * 2;

    // Grußformel und Unterschrift
    writeParagraph("Mit freundlichen Grüßen");
    y += defaultLineHeight * 4; // Platz für handschriftliche Unterschrift
    writeParagraph("_________________________");
    writeParagraph(`(${personName})`);

    doc.save("Widerspruch_Mahnbescheid.pdf");
}

// ===================================================================================
// ENDE: REZEPT FÜR WIDERSPRUCH GEGEN MA delusionalESCHEID
// ===================================================================================

// ===================================================================================
// START: REZEPT FÜR WIDERSPRUCH GEGEN FORDERUNG (INKASSO/GLÄUBIGER)
// ===================================================================================

function generateForderungWiderspruchPDF(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    // Layout-Konstanten und PDF-Schreibfunktionen
    const margin = 25;
    const defaultLineHeight = 7;
    const spaceAfterParagraph = 3;
    const textFontSize = 11;
    const betreffFontSize = 13;

    let y = margin;
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const usableHeight = pageHeight - margin;

    function writeLine(text, currentLineHeight = defaultLineHeight, fontStyle = "normal", fontSize = textFontSize) {
        if (y + currentLineHeight > usableHeight) { doc.addPage(); y = margin; }
        doc.setFontSize(fontSize);
        doc.setFont("times", fontStyle);
        doc.text(text, margin, y);
        y += currentLineHeight;
    }

    function writeParagraph(text, options = {}) {
        const paragraphLineHeight = options.lineHeight || defaultLineHeight;
        const paragraphFontSize = options.fontSize || textFontSize;
        const fontStyle = options.fontStyle || "normal";
        const extraSpacing = options.extraSpacingAfter === undefined ? spaceAfterParagraph : options.extraSpacingAfter;
        
        doc.setFontSize(paragraphFontSize);
        doc.setFont("times", fontStyle);
        const lines = doc.splitTextToSize(text, pageWidth - (2 * margin));
        
        lines.forEach(line => {
            if (y + paragraphLineHeight > usableHeight) { doc.addPage(); y = margin; }
            doc.text(line, margin, y);
            y += paragraphLineHeight;
        });
        if (lines.length > 0) y += extraSpacing;
    }

    // Formulardaten aus dem 'data' Objekt
    const {
        personName, personAdresse, personPlz, personOrt,
        empfaengerName, empfaengerAdresse,
        schreibenDatum, aktenzeichen, originalglaeubigerName,
        widerspruchsgruende, textBestehtNicht,
        zusatzforderungen
    } = data;

    const schreibenDatumFormatiert = getFormattedDateValue(schreibenDatum, "UNBEKANNT");

    // Absender (klein oben links)
    doc.setFontSize(9);
    doc.text(`${personName} · ${personAdresse} · ${personPlz} ${personOrt}`, margin, margin - 10);
    y += 10;

    // Empfänger
    writeLine(empfaengerName, defaultLineHeight, "normal", textFontSize);
    empfaengerAdresse.split("\n").forEach(line => writeLine(line.trim(), defaultLineHeight, "normal", textFontSize));
    y += defaultLineHeight * 2;

    // Datum (rechtsbündig)
    const datumHeute = new Date().toLocaleString("de-DE");
    const datumsBreite = doc.getStringUnitWidth(datumHeute) * textFontSize / doc.internal.scaleFactor;
    doc.text(datumHeute, pageWidth - margin - datumsBreite, y);
    y += defaultLineHeight * 2;

    // Betreff
    writeParagraph(`Widerspruch gegen Ihre Forderung vom ${schreibenDatumFormatiert}`, { fontSize: betreffFontSize, fontStyle: "bold", extraSpacingAfter: 2 });
    writeParagraph(`Ihr Zeichen: ${aktenzeichen}`, { fontSize: betreffFontSize, fontStyle: "bold", extraSpacingAfter: defaultLineHeight });

    // Anrede
    writeParagraph("Sehr geehrte Damen und Herren,");

    // Einleitung
    writeParagraph(`hiermit widerspreche ich der von Ihnen mit Schreiben vom ${schreibenDatumFormatiert} geltend gemachten Forderung im Namen von "${originalglaeubigerName}" vollumfänglich.`);
    
    // Begründung (dynamisch)
    writeParagraph("Begründung:", { fontStyle: "bold", extraSpacingAfter: 2 });

    if (widerspruchsgruende.includes("unbekannt")) {
        writeParagraph("- Die von Ihnen genannte Forderung ist mir gänzlich unbekannt.");
    }
    if (widerspruchsgruende.includes("bestehtNicht")) {
        let begruendung = "- Die Forderung besteht nicht bzw. nicht mehr.";
        if (textBestehtNicht && textBestehtNicht.trim() !== "") {
            begruendung += ` Zur Erläuterung: ${textBestehtNicht.trim()}`;
        }
        writeParagraph(begruendung);
    }
    if (widerspruchsgruende.includes("hoeheFalsch")) {
        writeParagraph("- Die Höhe der Hauptforderung wird bestritten.");
    }
    if (widerspruchsgruende.includes("inkassoKosten")) {
        writeParagraph("- Insbesondere widerspreche ich den von Ihnen angesetzten Inkasso- und Mahngebühren. Diese sind in der vorliegenden Form und Höhe nicht erstattungsfähig.");
    }
    if (widerspruchsgruende.includes("verjaehrt")) {
        writeParagraph("- Rein vorsorglich erhebe ich die Einrede der Verjährung.");
    }
    if (widerspruchsgruende.includes("nachweise")) {
        writeParagraph("- Ich bestreite die Forderung vorsorglich dem Grunde und der Höhe nach. Ein Vertragsschluss wird ausdrücklich bestritten.");
    }
    
    // Zusatzforderungen (dynamisch)
    y += spaceAfterParagraph;
    if (widerspruchsgruende.includes("nachweise")) {
         writeParagraph("Ich fordere Sie auf, mir zur Prüfung des Sachverhalts folgende Unterlagen in Kopie vorzulegen: eine detaillierte Forderungsaufstellung, eine Kopie des ursprünglichen Vertrags sowie eine Kopie der Rechnung.", { fontStyle: "bold" });
    }
    if (zusatzforderungen.includes("vollmacht")) {
        writeParagraph("Zudem fordere ich Sie auf, mir eine Kopie der originalen Vollmachtsurkunde nach § 174 BGB vorzulegen, die Ihre Beauftragung durch den Gläubiger nachweist.", { fontStyle: "bold" });
    }
    if (zusatzforderungen.includes("datenschutz")) {
        writeParagraph("Ich untersage Ihnen die Weitergabe meiner Daten an Dritte, insbesondere an Auskunfteien (z.B. Schufa). Einem entsprechenden Eintrag widerspreche ich bereits jetzt. Gleichzeitig widerspreche ich der Speicherung und Verarbeitung meiner personenbezogenen Daten über das für die Abwicklung notwendige Maß hinaus.", { fontStyle: "bold" });
    }

    // Schlussteil
    y += defaultLineHeight;
    writeParagraph("Bis zur Vorlage der geforderten Nachweise und einer Klärung des Sachverhalts werde ich keine Zahlungen leisten. Ich erwarte, dass Sie von weiteren Mahnungen, Anrufen oder anderweitigen Kontaktversuchen absehen. Einer telefonischen Kontaktaufnahme widerspreche ich ausdrücklich.");
    writeParagraph("Ich setze Ihnen eine Frist zur schriftlichen Rückmeldung von 14 Tagen ab Erhalt dieses Schreibens.");
    writeParagraph("Sollten Sie ohne Klärung weitere Schritte einleiten, behalte ich mir vor, rechtliche Hilfe in Anspruch zu nehmen.", { fontStyle: "italic" });

    // Grußformel
    y += defaultLineHeight;
    writeParagraph("Mit freundlichen Grüßen");
    y += defaultLineHeight * 4;
    writeParagraph(`(${personName})`);

    doc.save("Widerspruch_Forderung.pdf");
}

// ===================================================================================
// ENDE: REZEPT FÜR WIDERSPRUCH GEGEN FORDERUNG (INKASSO/GLÄUBIGER)
// ===================================================================================

// ===================================================================================
// START: REZEPT FÜR RATENZAHLUNGS- & VERGLEICHSANGEBOT
// ===================================================================================

function generateRatenzahlungPDF(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    // Layout-Konstanten und PDF-Schreibfunktionen (wiederverwendet)
    const margin = 25;
    const defaultLineHeight = 7;
    const spaceAfterParagraph = 3;
    const textFontSize = 11;
    const betreffFontSize = 13;

    let y = margin;
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const usableHeight = pageHeight - margin;

    function writeParagraph(text, options = {}) {
        // Diese Hilfsfunktion kann aus einem anderen Generator kopiert werden
        const paragraphLineHeight = options.lineHeight || defaultLineHeight;
        const paragraphFontSize = options.fontSize || textFontSize;
        const fontStyle = options.fontStyle || "normal";
        const extraSpacing = options.extraSpacingAfter === undefined ? spaceAfterParagraph : options.extraSpacingAfter;
        doc.setFontSize(paragraphFontSize);
        doc.setFont("times", fontStyle);
        const lines = doc.splitTextToSize(text, pageWidth - (2 * margin));
        lines.forEach(line => {
            if (y + paragraphLineHeight > usableHeight) { doc.addPage(); y = margin; }
            doc.text(line, margin, y);
            y += paragraphLineHeight;
        });
        if (lines.length > 0) y += extraSpacing;
    }

    // Formulardaten aus dem 'data' Objekt
    const {
        personName, personAdresse, personPlz, personOrt,
        empfaengerName, empfaengerAdresse, aktenzeichen, forderungshoehe,
        angebotTyp, wunschrate, vergleichsbetrag
    } = data;
    
    const forderungshoeheFormatted = (parseFloat(forderungshoehe) || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
    const wunschrateFormatted = (parseFloat(wunschrate) || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
    const vergleichsbetragFormatted = (parseFloat(vergleichsbetrag) || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });

    // Absender (klein oben)
    doc.setFontSize(9);
    doc.text(`${personName} · ${personAdresse} · ${personPlz} ${personOrt}`, margin, margin - 10);
    y += 10;

    // Empfänger
    empfaengerName.split("\n").forEach(line => writeParagraph(line.trim(), { extraSpacingAfter: 0 }));
    empfaengerAdresse.split("\n").forEach(line => writeParagraph(line.trim(), { extraSpacingAfter: 0 }));
    y += defaultLineHeight * 2;
    
    // Datum
    const datumHeute = new Date().toLocaleDateString("de-DE");
    doc.text(datumHeute, pageWidth - margin - doc.getStringUnitWidth(datumHeute) * textFontSize / doc.internal.scaleFactor, y);
    y += defaultLineHeight * 2;

    // Betreff
    writeParagraph(`Angebot zur außergerichtlichen Einigung Ihrer Forderung, Zeichen: ${aktenzeichen}`, { fontSize: betreffFontSize, fontStyle: "bold" });

    // Anrede
    writeParagraph("Sehr geehrte Damen und Herren,");

    // Einleitung
    writeParagraph(`ich beziehe mich auf Ihre Forderung in der oben genannten Angelegenheit in Höhe von ${forderungshoeheFormatted}.`);
    writeParagraph(`Ich möchte betonen, dass ich gewillt bin, die Angelegenheit zu klären. Aufgrund meiner derzeitigen finanziellen Situation ist es mir jedoch nicht möglich, die gesamte Summe auf einmal zu begleichen.`);
    writeParagraph("Um eine für beide Seiten tragfähige und außergerichtliche Lösung zu finden und weitere Kosten zu vermeiden, unterbreite ich Ihnen daher den folgenden Vorschlag:");

    // Dynamischer Angebotsteil
    if (angebotTyp === 'ratenzahlung') {
        writeParagraph("Vorschlag zur Ratenzahlung:", { fontStyle: "bold", extraSpacingAfter: 2 });
        writeParagraph(`Ich biete Ihnen an, die offene Forderung in monatlichen Raten in Höhe von ${wunschrateFormatted} zu tilgen.`);
        const naechsterErster = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleDateString("de-DE");
        writeParagraph(`Die erste Rate würde ich zum ${naechsterErster} an Sie überweisen. Ich bitte um Ihr Einverständnis und den Verzicht auf weitere Zinsen und Gebühren, solange die Raten pünktlich gezahlt werden.`);
    } else if (angebotTyp === 'vergleich') {
        writeParagraph("Vorschlag zur Erledigung durch eine Vergleichszahlung:", { fontStyle: "bold", extraSpacingAfter: 2 });
        writeParagraph(`Ich biete Ihnen an, zur vollständigen und endgültigen Abgeltung Ihrer Forderung eine Einmalzahlung in Höhe von ${vergleichsbetragFormatted} zu leisten.`);
        writeParagraph("Die Zahlung würde innerhalb von 14 Tagen nach Erhalt Ihrer schriftlichen Zustimmung zu diesem Vergleich erfolgen. Mit Eingang des Betrags bei Ihnen sind alle gegenseitigen Ansprüche aus dieser Angelegenheit, inklusive aller Kosten und Zinsen, erledigt.");
    }

    // Schlussteil
    y += defaultLineHeight;
    writeParagraph("Ich bitte Sie um eine schriftliche Rückmeldung innerhalb von 14 Tagen, ob Sie meinen Vorschlag annehmen. Einer telefonischen Kontaktaufnahme widerspreche ich.");
    
    // Grußformel
    y += defaultLineHeight;
    writeParagraph("Mit freundlichen Grüßen");
    y += defaultLineHeight * 4;
    writeParagraph(`(${personName})`);

    doc.save("Angebot_Ratenzahlung_Vergleich.pdf");
}

// ===================================================================================
// ENDE: REZEPT FÜR RATENZAHLUNGS- & VERGLEICHSANGEBOT
// ===================================================================================

// ===================================================================================
// START: REZEPT FÜR BUDGET- & HAUSHALTSPLAN
// ===================================================================================

function generateHaushaltsplanPDF(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    // --- Helper zum Formatieren und Zeichnen ---
    const margin = 20;
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = margin;
    const col1 = margin;
    const col2 = 150;
    const lineHeight = 8;
    const sectionSpacing = 12;

    function checkPageBreak() {
        if (y > pageHeight - margin) {
            doc.addPage();
            y = margin;
        }
    }

    // --- KORRIGIERTE addRow Funktion ---
    function addRow(label, value, isBold = false, isTotal = false) {
        checkPageBreak();
        const formattedValue = (parseFloat(value) || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
        
        // Sorgt für sauberen Abstand VOR der Summenzeile
        if (isTotal) {
            y += 2; 
            doc.line(col1, y, col2 + 25, y); // Linie zeichnen
            y += 5; // Abstand NACH der Linie, bevor der Text kommt
        }

        doc.setFont("times", isBold ? "bold" : "normal");
        doc.text(label, col1, y);
        doc.text(formattedValue, col2, y, { align: 'right' });

        // Normaler Zeilenabstand nach jeder Zeile
        y += lineHeight;
    }
    
    function addSection(title) {
        checkPageBreak();
        y += sectionSpacing;
        doc.setFontSize(14);
        doc.setFont("times", "bold");
        doc.text(title, col1, y);
        y += lineHeight + 2;
        doc.setFontSize(11);
    }
    
    // --- PDF-Inhalt (bleibt gleich, nutzt aber die korrigierten Daten) ---
    doc.setFontSize(18);
    doc.setFont("times", "bold");
    doc.text("Haushaltsplan", margin, y);
    y += lineHeight;
    
    doc.setFontSize(12);
    doc.setFont("times", "normal");
    doc.text(`für ${data.personName || 'N/A'}, Zeitraum: ${data.zeitraumMonat} ${data.zeitraumJahr}`, margin, y);
    y += 4;
    doc.text(`Anzahl Personen im Haushalt: ${data.anzahlPersonenHaushalt || 'N/A'}`, margin, y);

    // Einnahmen
    addSection("Monatliche Einnahmen");
    addRow("Lohn/Gehalt (Netto)", data.einkommenNetto);
    addRow("Bürgergeld / Sozialleistungen", data.einkommenBuergergeld);
    addRow("Rente / Pension", data.einkommenRente);
    addRow("Kindergeld", data.einkommenKindergeld);
    addRow("Unterhalt (erhalten)", data.einkommenUnterhalt);
    addRow("Wohngeld / Lastenzuschuss", data.einkommenWohngeld);
    addRow("Sonstiges", data.einkommenSonstige);
    addRow("Summe Einnahmen", data.summeEinnahmen, true, true); // Nutzt jetzt die korrekte Zahl

    // Ausgaben
    addSection("Monatliche Ausgaben");
    doc.setFont("times", "bolditalic");
    doc.text("Wohnen", col1, y); y += lineHeight;
    doc.setFont("times", "normal");
    addRow("Miete (warm, inkl. NK/HK)", data.ausgabeMiete);
    addRow("Strom", data.ausgabeStrom);
    addRow("Rundfunkbeitrag", data.ausgabeRundfunk);
    
    y += 4;
    doc.setFont("times", "bolditalic");
    doc.text("Versicherungen & Finanzen", col1, y); y += lineHeight;
    doc.setFont("times", "normal");
    addRow("Versicherungen", data.ausgabeVersicherungen);
    addRow("Bestehende Kreditraten", data.ausgabeKredite);
    addRow("Unterhaltszahlungen", data.ausgabeUnterhalt);

    y += 4;
    doc.setFont("times", "bolditalic");
    doc.text("Allgemeine Lebenshaltung", col1, y); y += lineHeight;
    doc.setFont("times", "normal");
    addRow("Lebensmittel & Drogerie", data.ausgabeLebensmittel);
    addRow("Mobilität (Fahrkarten, Tanken)", data.ausgabeMobilitaet);
    addRow("Telefon, Internet, Handy", data.ausgabeKommunikation);
    addRow("Freizeit, Kultur, Hobbies", data.ausgabeFreizeit);
    addRow("Sonstige Ausgaben", data.ausgabeSonstige);
    addRow("Summe Ausgaben", data.summeAusgaben, true, true); // Nutzt jetzt die korrekte Zahl

    // Ergebnis
    addSection("Ergebnis");
    addRow("Überschuss / Defizit", data.ergebnis, true, false); // Nutzt jetzt die korrekte Zahl

    // Footer
    const erstelldatum = new Date().toLocaleDateString("de-DE");
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Erstellt mit sozial-lotse.de am ${erstelldatum}`, margin, pageHeight - 10);

    doc.save(`Haushaltsplan_${data.personName}_${data.zeitraumMonat}_${data.zeitraumJahr}.pdf`);
}
// ===================================================================================
// ENDE: REZEPT FÜR BUDGET- & HAUSHALTSPLAN
// ===================================================================================

// ===================================================================================
// START: REZEPT FÜR ANTRAG AUF STUNDUNG
// ===================================================================================

function generateStundungPDF(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    // Layout-Konstanten und PDF-Schreibfunktionen (wiederverwendet)
    const margin = 25;
    const defaultLineHeight = 7;
    const spaceAfterParagraph = 4;
    const textFontSize = 11;
    const betreffFontSize = 13;

    let y = margin;
    const pageWidth = doc.internal.pageSize.getWidth();

    function writeParagraph(text, options = {}) {
        // Diese Hilfsfunktion kann aus einem anderen Generator kopiert werden
        const paragraphLineHeight = options.lineHeight || defaultLineHeight;
        const paragraphFontSize = options.fontSize || textFontSize;
        const fontStyle = options.fontStyle || "normal";
        const extraSpacing = options.extraSpacingAfter === undefined ? spaceAfterParagraph : options.extraSpacingAfter;
        doc.setFontSize(paragraphFontSize);
        doc.setFont("times", fontStyle);
        const lines = doc.splitTextToSize(text, pageWidth - (2 * margin));
        lines.forEach(line => {
            if (y + paragraphLineHeight > doc.internal.pageSize.getHeight() - margin) { doc.addPage(); y = margin; }
            doc.text(line, margin, y);
            y += paragraphLineHeight;
        });
        if (lines.length > 0) y += extraSpacing;
    }

    const {
        personName, personAdresse, personPlzOrt, steuernummer,
        empfaengerName, empfaengerAdresse, rechnungsnummer, rechnungsdatum,
        forderungshoehe, faelligkeitsdatum, begruendungText, stundungBisDatum
    } = data;
    
    // Formatierung der Datums- und Währungsangaben
    const rechnungsdatumFmt = getFormattedDateValue(rechnungsdatum);
    const faelligkeitsdatumFmt = getFormattedDateValue(faelligkeitsdatum);
    const stundungBisDatumFmt = getFormattedDateValue(stundungBisDatum);
    const forderungshoeheFmt = (parseFloat(forderungshoehe) || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });

    // Absender
    writeParagraph(`${personName}\n${personAdresse}\n${personPlzOrt}`, { extraSpacingAfter: defaultLineHeight * 2 });

    // Empfänger
    writeParagraph(empfaengerName);
    empfaengerAdresse.split("\n").forEach(line => writeParagraph(line.trim(), { extraSpacingAfter: 0 }));
    y += defaultLineHeight * 2;

    // Datum
    const datumHeute = new Date().toLocaleDateString("de-DE");
    doc.text(datumHeute, pageWidth - margin - doc.getStringUnitWidth(datumHeute) * textFontSize / doc.internal.scaleFactor, y);
    y += defaultLineHeight * 2;

    // Betreff
    let betreff = `Antrag auf Stundung der Forderung vom ${rechnungsdatumFmt}`;
    betreff += `\nRechnungs-Nr. / Aktenzeichen: ${rechnungsnummer}`;
    if (steuernummer) {
        betreff += `\nSteuernummer / Kundennummer: ${steuernummer}`;
    }
    writeParagraph(betreff, { fontSize: betreffFontSize, fontStyle: "bold" });

    // Anrede
    writeParagraph("Sehr geehrte Damen und Herren,");

    // Haupttext
    writeParagraph(`hiermit beantrage ich die Stundung der oben genannten Forderung in Höhe von ${forderungshoeheFmt}, die ursprünglich am ${faelligkeitsdatumFmt} zur Zahlung fällig war.`);
    
    writeParagraph("Begründung:", { fontStyle: "bold", extraSpacingAfter: 2 });
    writeParagraph(`Aufgrund eines unvorhersehbaren und vorübergehenden finanziellen Engpasses ist es mir bedauerlicherweise nicht möglich, die Forderung fristgerecht zu begleichen. Der Grund hierfür ist folgender:`);
    writeParagraph(begruendungText, { fontStyle: "italic" });
    writeParagraph("Ich möchte betonen, dass es sich um eine temporäre Situation handelt und die Begleichung der Forderung zu einem späteren Zeitpunkt vollständig gesichert ist.");

    writeParagraph("Vorschlag:", { fontStyle: "bold", extraSpacingAfter: 2 });
    writeParagraph(`Ich bitte Sie daher höflich, die Forderung bis zum ${stundungBisDatumFmt} zu stunden. Ich versichere Ihnen, den ausstehenden Gesamtbetrag bis zu diesem Datum vollständig an Sie zu überweisen.`);

    // Schlussteil
    writeParagraph("Ich bedanke mich im Voraus für Ihr Verständnis und Entgegenkommen und bitte um eine kurze schriftliche Bestätigung meines Antrags.");

    // Grußformel
    y += defaultLineHeight;
    writeParagraph("Mit freundlichen Grüßen");
    y += defaultLineHeight * 4;
    writeParagraph(`(${personName})`);

    doc.save("Antrag_auf_Stundung.pdf");
}

// ===================================================================================
// ENDE: REZEPT FÜR ANTRAG AUF STUNDUNG
// ===================================================================================

// ===================================================================================
// START: REZEPT FÜR P-KONTO-SCHREIBEN AN DIE BANK
// ===================================================================================

function generatePKontoPDF(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    // Layout-Konstanten und PDF-Schreibfunktionen (wiederverwendet)
    const margin = 25;
    const defaultLineHeight = 7;
    const spaceAfterParagraph = 4;
    const textFontSize = 11;
    const betreffFontSize = 13;

    let y = margin;
    const pageWidth = doc.internal.pageSize.getWidth();

    function writeParagraph(text, options = {}) {
        const paragraphLineHeight = options.lineHeight || defaultLineHeight;
        const paragraphFontSize = options.fontSize || textFontSize;
        const fontStyle = options.fontStyle || "normal";
        const extraSpacing = options.extraSpacingAfter === undefined ? spaceAfterParagraph : options.extraSpacingAfter;
        doc.setFontSize(paragraphFontSize);
        doc.setFont("times", fontStyle);
        const lines = doc.splitTextToSize(text, pageWidth - (2 * margin));
        lines.forEach(line => {
            if (y + paragraphLineHeight > doc.internal.pageSize.getHeight() - margin) { doc.addPage(); y = margin; }
            doc.text(line, margin, y);
            y += paragraphLineHeight;
        });
        if (lines.length > 0) y += extraSpacing;
    }

    const {
        personName, personAdresse, personPlzOrt, geburtsdatum,
        bankName, bankAdresse, iban, schreibenTyp, ausstellerBescheinigung
    } = data;
    
    const geburtsdatumFmt = getFormattedDateValue(geburtsdatum);

    // Absender
    writeParagraph(`${personName}\n${personAdresse}\n${personPlzOrt}`, { extraSpacingAfter: defaultLineHeight * 2 });

    // Empfänger (Bank)
    writeParagraph(bankName);
    bankAdresse.split("\n").forEach(line => writeParagraph(line.trim(), { extraSpacingAfter: 0 }));
    y += defaultLineHeight * 2;

    // Datum
    const datumHeute = new Date().toLocaleDateString("de-DE");
    doc.text(datumHeute, pageWidth - margin - doc.getStringUnitWidth(datumHeute) * textFontSize / doc.internal.scaleFactor, y);
    y += defaultLineHeight * 2;

    // Betreff (dynamisch)
    let betreff = "";
    if (schreibenTyp === 'umwandlung') {
        betreff = "Antrag auf Umwandlung meines Girokontos in ein Pfändungsschutzkonto (P-Konto)";
    } else if (schreibenTyp === 'bescheinigung') {
        betreff = "Einreichung einer P-Konto-Bescheinigung zur Erhöhung der Freibeträge";
    } else { // 'beides'
        betreff = "Antrag auf Umwandlung in ein P-Konto und Einreichung einer Bescheinigung";
    }
    writeParagraph(betreff, { fontSize: betreffFontSize, fontStyle: "bold" });
    writeParagraph(`Kontoinhaber: ${personName}, geb. am ${geburtsdatumFmt}`, { extraSpacingAfter: 0 });
    writeParagraph(`IBAN: ${iban}`);

    // Anrede
    writeParagraph("Sehr geehrte Damen und Herren,");

    // Haupttext (dynamisch)
    if (schreibenTyp === 'umwandlung' || schreibenTyp === 'beides') {
        writeParagraph("hiermit beantrage ich gemäß § 850k Abs. 7 ZPO die sofortige Umwandlung meines oben genannten Girokontos in ein Pfändungsschutzkonto (P-Konto).");
        writeParagraph("Ich versichere, dass ich kein weiteres Pfändungsschutzkonto bei einem anderen Kreditinstitut führe.");
    }
    
    if (schreibenTyp === 'bescheinigung' || schreibenTyp === 'beides') {
        if (schreibenTyp === 'bescheinigung') { // Einleitung nur bei alleinigem Bescheinigungs-Schreiben
             writeParagraph("zu meinem oben genannten Pfändungsschutzkonto (P-Konto) reiche ich Ihnen die beigefügte Bescheinigung nach § 903 ZPO ein.");
        } else { // Text bei 'beides'
             writeParagraph("Zusätzlich reiche ich Ihnen die beigefügte Bescheinigung nach § 903 ZPO zur Berücksichtigung erhöhter Freibeträge ein.");
        }
        writeParagraph(`Die Bescheinigung wurde ausgestellt von: ${ausstellerBescheinigung}.`);
        writeParagraph("Ich bitte Sie, die darin genannten Freibeträge schnellstmöglich in meinem P-Konto einzurichten und mir die korrekte Einrichtung kurz schriftlich zu bestätigen.");
    }

    if (schreibenTyp === 'umwandlung') { // Schlusssatz nur bei reiner Umwandlung
        writeParagraph("Bitte bestätigen Sie mir die Umwandlung meines Kontos schriftlich.");
    }

    // Grußformel
    y += defaultLineHeight;
    writeParagraph("Mit freundlichen Grüßen");
    y += defaultLineHeight * 4;
    writeParagraph(`(${personName})`);
    
    if (schreibenTyp === 'bescheinigung' || schreibenTyp === 'beides') {
        writeParagraph("Anlage: P-Konto-Bescheinigung im Original", { fontStyle: 'italic', fontSize: 10 });
    }

    doc.save("Antrag_P-Konto.pdf");
}

// ===================================================================================
// ENDE: REZEPT FÜR P-KONTO-SCHREIBEN AN DIE BANK
// ===================================================================================

// ===================================================================================
// START: REZEPT FÜR BITTE UM ZAHLUNGSAUFSCHUB
// ===================================================================================

function generateZahlungsaufschubPDF(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    // Layout-Konstanten und PDF-Schreibfunktionen (wiederverwendet)
    const margin = 25;
    const defaultLineHeight = 7;
    const spaceAfterParagraph = 4;
    const textFontSize = 11;
    const betreffFontSize = 13;

    let y = margin;
    const pageWidth = doc.internal.pageSize.getWidth();

    function writeParagraph(text, options = {}) {
        // Diese Hilfsfunktion kann aus einem anderen Generator kopiert werden
        const paragraphLineHeight = options.lineHeight || defaultLineHeight;
        const paragraphFontSize = options.fontSize || textFontSize;
        const fontStyle = options.fontStyle || "normal";
        const extraSpacing = options.extraSpacingAfter === undefined ? spaceAfterParagraph : options.extraSpacingAfter;
        doc.setFontSize(paragraphFontSize);
        doc.setFont("times", fontStyle);
        const lines = doc.splitTextToSize(text, pageWidth - (2 * margin));
        lines.forEach(line => {
            if (y + paragraphLineHeight > doc.internal.pageSize.getHeight() - margin) { doc.addPage(); y = margin; }
            doc.text(line, margin, y);
            y += paragraphLineHeight;
        });
        if (lines.length > 0) y += extraSpacing;
    }

    const {
        personName, personAdresse, personPlzOrt, kundennummer,
        empfaengerName, empfaengerAdresse, rechnungsnummer, rechnungsdatum,
        forderungshoehe, faelligkeitsdatum, begruendungText, neuesDatumVorschlag
    } = data;
    
    // Formatierung
    const rechnungsdatumFmt = getFormattedDateValue(rechnungsdatum);
    const faelligkeitsdatumFmt = getFormattedDateValue(faelligkeitsdatum);
    const neuesDatumVorschlagFmt = getFormattedDateValue(neuesDatumVorschlag);
    const forderungshoeheFmt = (parseFloat(forderungshoehe) || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });

    // Absender
    writeParagraph(`${personName}\n${personAdresse}\n${personPlzOrt}`, { extraSpacingAfter: defaultLineHeight * 2 });

    // Empfänger
    writeParagraph(empfaengerName);
    empfaengerAdresse.split("\n").forEach(line => writeParagraph(line.trim(), { extraSpacingAfter: 0 }));
    y += defaultLineHeight * 2;

    // Datum
    const datumHeute = new Date().toLocaleDateString("de-DE");
    doc.text(datumHeute, pageWidth - margin - doc.getStringUnitWidth(datumHeute) * textFontSize / doc.internal.scaleFactor, y);
    y += defaultLineHeight * 2;

    // Betreff
    let betreff = `Bitte um Zahlungsaufschub für Rechnung Nr. ${rechnungsnummer}`;
    if (kundennummer) {
        betreff += `\nKundennummer: ${kundennummer}`;
    }
    writeParagraph(betreff, { fontSize: betreffFontSize, fontStyle: "bold" });

    // Anrede
    writeParagraph("Sehr geehrte Damen und Herren,");

    // Haupttext
    writeParagraph(`ich beziehe mich auf Ihre oben genannte Rechnung vom ${rechnungsdatumFmt} in Höhe von ${forderungshoeheFmt}.`);
    
    let begruendung = `Leider ist es mir aufgrund eines kurzfristigen finanziellen Engpasses nicht möglich, den Betrag bis zur Fälligkeit am ${faelligkeitsdatumFmt} vollständig zu begleichen.`;
    if (begruendungText && begruendungText.trim() !== "") {
        begruendung += ` ${begruendungText.trim()}`;
    }
    writeParagraph(begruendung);
    
    writeParagraph(`Ich möchte Sie daher höflich um einen kurzen Zahlungsaufschub und eine Verlängerung der Zahlungsfrist bitten.`);
    writeParagraph(`Ich schlage vor, den gesamten ausstehenden Betrag bis spätestens zum ${neuesDatumVorschlagFmt} an Sie zu überweisen und versichere Ihnen die vollständige Begleichung der Rechnung.`);

    // Schlussteil
    writeParagraph("Ich hoffe sehr auf Ihr Verständnis und bedanke mich im Voraus für Ihr Entgegenkommen. Über eine kurze Bestätigung Ihres Einverständnisses würde ich mich freuen.");

    // Grußformel
    y += defaultLineHeight;
    writeParagraph("Mit freundlichen Grüßen");
    y += defaultLineHeight * 4;
    writeParagraph(`(${personName})`);

    doc.save("Bitte_um_Zahlungsaufschub.pdf");
}

// ===================================================================================
// ENDE: REZEPT FÜR BITTE UM ZAHLUNGSAUFSCHUB
// ===================================================================================


