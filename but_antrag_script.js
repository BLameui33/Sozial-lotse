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


// ====================================================================================
// START: DOMContentLoaded-Listener (für die Interaktivität der Seite)
// ====================================================================================

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('antragButForm');
    const saveBtn = document.getElementById('saveBtnButAntrag');
    const loadBtn = document.getElementById('loadBtnButAntrag');
    const closePopupBtn = document.getElementById('closePopupBtnButAntrag'); // Angenommene ID
    const spendenPopup = document.getElementById('spendenPopupButAntrag');   // Angenommene ID
    const storageKey = 'antragButFormData_v1';

    // Keine komplexen dynamischen Felder in diesem Formular, daher keine spezifischen Event-Listener hierfür nötig.

    // --- Speichern & Laden Logik ---
    const formElementIds = [
        "personName", "bgNummer", "anzahlPersonenBut",
        "personAdresse", "personPlz", "personOrt",
        "behoerdeName", "behoerdeAdresse",
        "kindNameGeburtsdatum", "schuleKita",
        "ergaenzendeArgumenteBut",
        "anlageSonstigesBut"
    ];
    const antragsgrundCheckboxName = "antragsgrundBut";
    const anlagenCheckboxName = "anlagenBut";

    function getFormData() {
        const data = {};
        formElementIds.forEach(id => {
            data[id] = getElementValue(id);
        });
        
        data.antragsgruende = [];
        document.querySelectorAll(`input[name="${antragsgrundCheckboxName}"]:checked`).forEach(cb => data.antragsgruende.push(cb.value));
        
        data.anlagen = [];
        document.querySelectorAll(`input[name="${anlagenCheckboxName}"]:checked`).forEach(cb => data.anlagen.push(cb.value));
        
        return data;
    }

    function populateForm(data) {
        formElementIds.forEach(id => {
            const element = document.getElementById(id);
            if (element && data[id] !== undefined) {
                element.value = data[id];
            }
        });

        document.querySelectorAll(`input[name="${antragsgrundCheckboxName}"]`).forEach(cb => {
            if (cb) {
                cb.checked = !!(data.antragsgruende && data.antragsgruende.includes(cb.value));
            }
        });
        
        document.querySelectorAll(`input[name="${anlagenCheckboxName}"]`).forEach(cb => {
            if (cb) cb.checked = !!(data.anlagen && data.anlagen.includes(cb.value));
        });
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', function() {
            const data = getFormData();
            if (data.antragsgruende.length === 0) {
                 alert("Bitte wählen Sie mindestens eine Leistung für Bildung und Teilhabe aus, die Sie beantragen möchten.");
                 return;
            }
            if (getElementValue("ergaenzendeArgumenteBut").trim() === "") {
                 alert("Bitte geben Sie eine detaillierte Begründung für die beantragten Leistungen an.");
                 return;
            }
            localStorage.setItem(storageKey, JSON.stringify(data));
            alert('Ihre Eingaben wurden im Browser gespeichert!');
        });
    }

    if (loadBtn) {
        loadBtn.addEventListener('click', function() {
            const savedData = localStorage.getItem(storageKey);
            if (savedData) {
                populateForm(JSON.parse(savedData));
                alert('Gespeicherte Eingaben wurden geladen!');
            } else {
                alert('Keine gespeicherten Daten gefunden.');
            }
        });
    }
    
    const autoLoadData = localStorage.getItem(storageKey);
    if (autoLoadData) {
      try {
        populateForm(JSON.parse(autoLoadData));
      } catch (e) {
        console.error("Fehler beim Laden der Daten für BuT-Antrag:", e);
        localStorage.removeItem(storageKey); 
      }
    }

    if (closePopupBtn && spendenPopup) {
        closePopupBtn.addEventListener('click', function() {
            spendenPopup.style.display = 'none';
        });
    }
    
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = getFormData();
            if (formData.antragsgruende.length === 0) {
                alert("Bitte wählen Sie mindestens eine Leistung für Bildung und Teilhabe aus, die Sie beantragen möchten.");
                return;
            }
            if (getElementValue("ergaenzendeArgumenteBut").trim() === "") {
                 alert("Bitte geben Sie eine detaillierte Begründung für die beantragten Leistungen an.");
                 document.getElementById("ergaenzendeArgumenteBut").focus();
                 return;
            }
            generateButAntragPDF(formData); 
        });
    }
}); // Ende DOMContentLoaded


function generateButAntragPDF(data) {
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
        personName, bgNummer, anzahlPersonenBut,
        personAdresse, personPlz, personOrt,
        behoerdeName, behoerdeAdresse,
        kindNameGeburtsdatum, schuleKita,
        antragsgruende,
        ergaenzendeArgumenteBut,
        anlagen, anlageSonstigesBut
    } = data;

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
    let betreffText = `Antrag auf Leistungen für Bildung und Teilhabe (BuT)`;
    betreffText += `\nAntragsteller: ${personName}, BG-Nummer: ${bgNummer}`;
    if (kindNameGeburtsdatum && kindNameGeburtsdatum.trim() !== "") {
        betreffText += `\nfür das Kind / die Kinder: ${kindNameGeburtsdatum}`;
    }
    
    writeParagraph(betreffText, defaultLineHeight, betreffFontSize, {fontStyle: "bold", extraSpacingAfter: defaultLineHeight});

    // Anrede
    writeParagraph("Sehr geehrte Damen und Herren,", defaultLineHeight, textFontSize, {extraSpacingAfter: defaultLineHeight * 0.5});

    // ======================================================
    // START: Logik für getrennte Textblöcke (Singular vs. Plural)
    // ======================================================

    if (anzahlPersonenBut === "mehrerePersonen") {
        // --- TEXTBLOCK FÜR PLURAL ("WIR") ---
        writeParagraph(`hiermit beantragen wir als Eltern für unser Kind / unsere Kinder ${kindNameGeburtsdatum || ''} die folgenden Leistungen für Bildung und Teilhabe:`);
        
        writeLine("Beantragte Leistungen:", defaultLineHeight, "bold", subHeadingFontSize);
        y += spaceAfterParagraph/2; 
        
        if(antragsgruende.length > 0){
            antragsgruende.forEach(grund => {
                let grundText = "";
                switch(grund){
                    case "schulbedarf": grundText = "Persönlicher Schulbedarf"; break;
                    case "ausfluege": grundText = "Übernahme der Kosten für eintägige Ausflüge von Schule/Kita"; break;
                    case "klassenfahrten": grundText = "Übernahme der Kosten für mehrtägige Klassenfahrten"; break;
                    case "lernfoerderung": grundText = "Lernförderung (Nachhilfe)"; break;
                    case "mittagessen": grundText = "Gemeinschaftliches Mittagessen in Schule/Hort/Kita"; break;
                    case "schuelerbefoerderung": grundText = "Schülerbeförderung"; break;
                    case "teilhabe": grundText = "Teilhabe am sozialen und kulturellen Leben"; break;
                }
                writeParagraph(`- ${grundText}`);
            });
        }
        y += spaceAfterParagraph;
        
        writeLine(`Begründung und Erläuterung unseres Antrags:`, defaultLineHeight, "bold", subHeadingFontSize);
        y += spaceAfterParagraph / 2;
        writeParagraph(ergaenzendeArgumenteBut);

        writeParagraph(`Als Bezieher von [z.B. Bürgergeld, Wohngeld] sind wir anspruchsberechtigt. Die entsprechenden Nachweise liegen Ihnen bereits vor oder sind diesem Schreiben beigefügt.`);
    
    } else {
        // --- TEXTBLOCK FÜR SINGULAR ("ICH") ---
        writeParagraph(`hiermit beantrage ich für mein Kind / meine Kinder ${kindNameGeburtsdatum || ''} die folgenden Leistungen für Bildung und Teilhabe:`);
        
        writeLine("Beantragte Leistungen:", defaultLineHeight, "bold", subHeadingFontSize);
        y += spaceAfterParagraph/2; 
        
        if(antragsgruende.length > 0){
            antragsgruende.forEach(grund => {
                let grundText = "";
                switch(grund){
                    case "schulbedarf": grundText = "Persönlicher Schulbedarf"; break;
                    case "ausfluege": grundText = "Übernahme der Kosten für eintägige Ausflüge von Schule/Kita"; break;
                    case "klassenfahrten": grundText = "Übernahme der Kosten für mehrtägige Klassenfahrten"; break;
                    case "lernfoerderung": grundText = "Lernförderung (Nachhilfe)"; break;
                    case "mittagessen": grundText = "Gemeinschaftliches Mittagessen in Schule/Hort/Kita"; break;
                    case "schuelerbefoerderung": grundText = "Schülerbeförderung"; break;
                    case "teilhabe": grundText = "Teilhabe am sozialen und kulturellen Leben"; break;
                }
                writeParagraph(`- ${grundText}`);
            });
        }
        y += spaceAfterParagraph;
        
        writeLine(`Begründung und Erläuterung meines Antrags:`, defaultLineHeight, "bold", subHeadingFontSize);
        y += spaceAfterParagraph / 2;
        writeParagraph(ergaenzendeArgumenteBut);

        writeParagraph(`Als Bezieherin/Bezieher von [z.B. Bürgergeld, Wohngeld] bin ich anspruchsberechtigt. Die entsprechenden Nachweise liegen Ihnen bereits vor oder sind diesem Schreiben beigefügt.`);
    }

    // --- Gemeinsamer Schlussteil ---
    if (anlagen && anlagen.length > 0) {
        writeLine("Anlagen:", defaultLineHeight, "bold", subHeadingFontSize);
        y += spaceAfterParagraph / 2;
        anlagen.forEach(anlage => {
            writeParagraph(`- ${anlage}`);
        });
        const anlageSonstigesText = data.anlageSonstigesBut || "";
        if (anlageSonstigesText.trim() !== "") { 
            writeParagraph(`- Sonstige Anlagen: ${anlageSonstigesText}`);
        }
    }
    
    writeParagraph(`Mit bitte um eine wohlwollende Prüfung unseres Antrags und um Zusendung eines rechtsmittelfähigen Bescheides.`, defaultLineHeight, textFontSize);
    
    y += defaultLineHeight;
    
    writeParagraph("Mit freundlichen Grüßen");
    writeParagraph("\n\n_________________________"); 
    writeParagraph(personName);

    doc.save("antrag_but.pdf");

    const spendenPopupElement = document.getElementById("spendenPopupButAntrag");
    if (spendenPopupElement) {
        // Pop-up Logik
        spendenPopupElement.style.display = "flex";
    }
}