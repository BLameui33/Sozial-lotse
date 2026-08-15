document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('blankoBriefForm');
    const saveBtn = document.getElementById('saveBtnBlanko');
    const loadBtn = document.getElementById('loadBtnBlanko');
    const storageKey = 'blankoBriefFormData';
    let signaturePad;


    // Felder für Speichern/Laden
    const formElementIds = [ 
        "absenderName", "absenderAdresse", "absenderZusatz",
        "empfaengerName", "empfaengerAdresse",
        "briefDatum", "briefAktenzeichen", "briefBetreff", "briefText", "briefAnlagen", "pdfDesign"
    ];

    // --- Speichern & Laden (Lokal) ---
    if (saveBtn) {
        saveBtn.addEventListener('click', function() {
            const data = {};
            formElementIds.forEach(id => {
                const el = document.getElementById(id);
                if (el) data[id] = el.value;
            });
            localStorage.setItem(storageKey, JSON.stringify(data));
            alert('Ihre Eingaben wurden lokal im Browser gespeichert!');
        });
    }

    if (loadBtn) {
        loadBtn.addEventListener('click', function() {
            const savedData = localStorage.getItem(storageKey);
            if (savedData) {
                const data = JSON.parse(savedData);
                formElementIds.forEach(id => {
                    const el = document.getElementById(id);
                    if (el && data[id] !== undefined) el.value = data[id];
                });
                alert('Gespeicherte Eingaben wurden geladen!');
            } else {
                alert('Keine gespeicherten Daten gefunden.');
            }
        });
    }

    // PDF Generierung auslösen
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            generateBlankoPDF(); 
        });
    }

    // ==========================================
    // --- NEU: Live-Vorschau Fensterumschlag ---
    // ==========================================
    
    // Die HTML-Elemente der Vorschau
    const previewSender = document.getElementById('previewSender');
    const previewReceiver = document.getElementById('previewReceiver');

    // Die Input-Felder des Formulars
    const inputAbsName = document.getElementById('absenderName');
    const inputAbsAdr = document.getElementById('absenderAdresse');
    const inputEmpfName = document.getElementById('empfaengerName');
    const inputEmpfAdr = document.getElementById('empfaengerAdresse');

    // Funktion zum Aktualisieren der Vorschau
    function updateEnvelopePreview() {
        if (!previewSender || !previewReceiver) return;

        // 1. Absender (Rücksendezeile) bauen
        const absName = inputAbsName.value.trim() || "Max Mustermann";
        const absAdr = inputAbsAdr.value.trim() || "Musterstraße 1\n12345 Musterstadt";
        // Zeilenumbrüche durch Punkte ersetzen
        const inlineAbsender = `${absName} • ${absAdr.replace(/\n/g, " • ")}`;
        previewSender.textContent = inlineAbsender;

        // 2. Empfängeradresse bauen
        const empfName = inputEmpfName.value.trim() || "Behörde / Firma";
        const empfAdr = inputEmpfAdr.value.trim() || "Behördenallee 10\n12345 Musterstadt";
        // textContent zusammen mit "white-space: pre-wrap" im CSS rendert Zeilenumbrüche korrekt und sicher
        previewReceiver.textContent = `${empfName}\n${empfAdr}`;
    }

    // Event-Listener an die Eingabefelder hängen (reagiert bei jedem Tastendruck)
    if (inputAbsName) inputAbsName.addEventListener('input', updateEnvelopePreview);
    if (inputAbsAdr) inputAbsAdr.addEventListener('input', updateEnvelopePreview);
    if (inputEmpfName) inputEmpfName.addEventListener('input', updateEnvelopePreview);
    if (inputEmpfAdr) inputEmpfAdr.addEventListener('input', updateEnvelopePreview);

    // Initial einmal aufrufen, um eventuell vom Browser vorausgefüllte Daten anzuzeigen
    updateEnvelopePreview();
});

function generateBlankoPDF() {
    const { jsPDF } = window.jspdf;
    // A4 Format in Millimetern
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    // Daten auslesen
    const absName = document.getElementById('absenderName').value.trim();
    const absAdr = document.getElementById('absenderAdresse').value.trim();
    const absZusatz = document.getElementById('absenderZusatz').value.trim();
    const empfName = document.getElementById('empfaengerName').value.trim();
    const empfAdr = document.getElementById('empfaengerAdresse').value.trim();
    
    let datumRaw = document.getElementById('briefDatum').value;
    const datum = datumRaw ? new Date(datumRaw).toLocaleDateString("de-DE") : new Date().toLocaleDateString("de-DE");
    
    const aktenzeichen = document.getElementById('briefAktenzeichen').value.trim();
    const betreff = document.getElementById('briefBetreff').value.trim();
    const hauptText = document.getElementById('briefText').value.trim();
    const anlagenText = document.getElementById('briefAnlagen') ? document.getElementById('briefAnlagen').value.trim() : "";
    const design = document.getElementById('pdfDesign').value;

    const pageHeight = 297;
    const pageWidth = 210;
    
    // Globale Ränder für den Textkörper
    const marginL = 25;
    const marginR = 20;
    const textWidth = pageWidth - marginL - marginR;
    let y = 0; // Laufende Y-Koordinate, wird vom Design gesetzt

    // Hilfsfunktion für einzeilige Adresse
    const inlineAbsender = `${absName} • ${absAdr.replace(/\n/g, " • ")}`;

    // ==========================================
    // BRIEFKOPF DESIGNS
    // ==========================================
    
    if (design === 'din5008_classic') {
        // DESIGN 1: Der Klassiker (Strenge DIN 5008 Form A/B Hybrid)
        doc.setFont("times", "normal");
        
        // Eigene Absenderdaten rechts oben
        doc.setFontSize(10);
        let absY = 25;
        doc.text(absName, 130, absY); absY += 5;
        absAdr.split("\n").forEach(line => { doc.text(line, 130, absY); absY += 5; });
        if (absZusatz) { doc.text(absZusatz, 130, absY); absY += 5; }

        // Fensterumschlag Sichtfenster (ca. ab Y=45)
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(inlineAbsender, 25, 45); // Rücksendeangabe
        doc.setDrawColor(180, 180, 180);
        doc.line(25, 46.5, 105, 46.5); // feine Linie darunter
        
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(11);
        doc.text(empfName, 25, 53);
        let empfY = 58;
        empfAdr.split("\n").forEach(line => { doc.text(line, 25, empfY); empfY += 5; });

        // Aktenzeichen & Datum rechtsbündig
        doc.setFontSize(11);
        if (aktenzeichen) {
            doc.text(`Mein Zeichen: ${aktenzeichen}`, 130, 85);
        }
        const datumText = `${datum}`;
        doc.text(datumText, pageWidth - marginR - (doc.getStringUnitWidth(datumText) * 11 / doc.internal.scaleFactor), 95);

        y = 105; // Start Betreff
        doc.setFont("times", "bold");

    } else if (design === 'modern_clean') {
        // DESIGN 2: Modern & Clean (Zentriert, serifenlos)
        doc.setFont("helvetica", "normal");

        // Header Balken dezent grau
        doc.setFillColor(245, 245, 245);
        doc.rect(0, 0, pageWidth, 40, 'F');

        // Absender Zentriert
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        const nameWidth = doc.getStringUnitWidth(absName) * 14 / doc.internal.scaleFactor;
        doc.text(absName, (pageWidth - nameWidth) / 2, 20);
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        const adrWidth = doc.getStringUnitWidth(inlineAbsender) * 9 / doc.internal.scaleFactor;
        doc.text(inlineAbsender, (pageWidth - adrWidth) / 2, 26);
        if (absZusatz) {
            const zusWidth = doc.getStringUnitWidth(absZusatz) * 9 / doc.internal.scaleFactor;
            doc.text(absZusatz, (pageWidth - zusWidth) / 2, 31);
        }

        // Empfänger
        doc.setFontSize(11);
        doc.text(empfName, marginL, 55);
        let empfY = 60;
        empfAdr.split("\n").forEach(line => { doc.text(line, marginL, empfY); empfY += 5; });

        // Datum rechts
        const datumText = datum;
        doc.text(datumText, pageWidth - marginR - (doc.getStringUnitWidth(datumText) * 11 / doc.internal.scaleFactor), 80);

        if (aktenzeichen) {
            doc.text(`Zeichen: ${aktenzeichen}`, marginL, 85);
        }

        y = 95;
        doc.setFont("helvetica", "bold");

    } else if (design === 'behoerden_pro') {
        // DESIGN 3: Behörden-Pro (Infoblock rechts)
        doc.setFont("helvetica", "normal");
        
        // Empfänger im Fenster
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text(inlineAbsender, 25, 45);
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.text(empfName, 25, 52);
        let empfY = 57;
        empfAdr.split("\n").forEach(line => { doc.text(line, 25, empfY); empfY += 5; });

        // Rechter fetter Infoblock (Behörden-Style)
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.3);
        doc.line(130, 25, 130, 80); // Vertikale Linie
        
        let infoY = 30;
        doc.setFont("helvetica", "bold");
        doc.text("Absender:", 135, infoY); infoY += 5;
        doc.setFont("helvetica", "normal");
        doc.text(absName, 135, infoY); infoY += 5;
        absAdr.split("\n").forEach(line => { doc.text(line, 135, infoY); infoY += 5; });
        if (absZusatz) { doc.text(absZusatz, 135, infoY); infoY += 5; }
        
        infoY += 5;
        if (aktenzeichen) {
            doc.setFont("helvetica", "bold");
            doc.text("Aktenzeichen/Kunden-Nr.:", 135, infoY); infoY += 5;
            doc.setFont("helvetica", "normal");
            doc.text(aktenzeichen, 135, infoY); infoY += 8;
        }
        
        doc.setFont("helvetica", "bold");
        doc.text("Datum:", 135, infoY); infoY += 5;
        doc.setFont("helvetica", "normal");
        doc.text(datum, 135, infoY);

        y = 100;
        doc.setFont("helvetica", "bold");

    } else if (design === 'elegant_legal') {
        // DESIGN 4: Elegant & Juristisch (Linke Seitenlinie, Times)
        doc.setFont("times", "normal");
        
        // Grüne elegante Linie links
        doc.setDrawColor(46, 125, 50); // Sozial-Lotse Grün
        doc.setLineWidth(1.5);
        doc.line(15, 20, 15, pageHeight - 20);

        // Absender (Rechtsbündig)
        doc.setFontSize(12);
        doc.setFont("times", "bold");
        let absRightX = pageWidth - marginR;
        doc.text(absName, absRightX - (doc.getStringUnitWidth(absName)*12/doc.internal.scaleFactor), 25);
        
        doc.setFontSize(10);
        doc.setFont("times", "normal");
        let absY = 30;
        absAdr.split("\n").forEach(line => { 
            doc.text(line, absRightX - (doc.getStringUnitWidth(line)*10/doc.internal.scaleFactor), absY); 
            absY += 5; 
        });

        // Empfänger
        doc.setFontSize(11);
        doc.text(empfName, marginL, 55);
        let empfY = 60;
        empfAdr.split("\n").forEach(line => { doc.text(line, marginL, empfY); empfY += 5; });

        // Block rechts
        doc.setFontSize(10);
        let infoY = 80;
        doc.text(`Datum: ${datum}`, absRightX - (doc.getStringUnitWidth(`Datum: ${datum}`)*10/doc.internal.scaleFactor), infoY);
        if (aktenzeichen) {
            infoY += 5;
            let azText = `Zeichen: ${aktenzeichen}`;
            doc.text(azText, absRightX - (doc.getStringUnitWidth(azText)*10/doc.internal.scaleFactor), infoY);
        }

        y = 100;
        doc.setFont("times", "bold");
    }

    // ==========================================
    // TEXTKÖRPER VERARBEITEN
    // ==========================================
    
    // Betreff rendern
    doc.setFontSize(12);
    // (Bold wurde am Ende der if-Blöcke gesetzt)
    const betreffLines = doc.splitTextToSize(betreff, textWidth);
    betreffLines.forEach(line => {
        doc.text(line, marginL, y);
        y += 6;
    });
    
    y += 8; // Abstand nach Betreff

    // Normalen Font für Haupttext setzen
    doc.setFontSize(11);
    if (design === 'modern_clean' || design === 'behoerden_pro') {
        doc.setFont("helvetica", "normal");
    } else {
        doc.setFont("times", "normal");
    }

    // Text splitten am Zeilenumbruch (\n aus Textarea)
    const absaetze = hauptText.split('\n');

    absaetze.forEach(absatz => {
        // Leere Zeilen aus der Textarea verarbeiten
        if (absatz.trim() === '') {
            y += 5; // Abstand für Leerzeile
            return;
        }

        // jsPDF Zeilenumbruch (Word Wrap) für lange Absätze
        const lines = doc.splitTextToSize(absatz, textWidth);
        
        lines.forEach(line => {
            // Seitenumbruch Logik
            if (y > pageHeight - 25) {
                doc.addPage();
                
                // Wenn "Elegant Legal", die Linie auf der neuen Seite zeichnen
                if (design === 'elegant_legal') {
                    doc.setDrawColor(46, 125, 50);
                    doc.setLineWidth(1.5);
                    doc.line(15, 20, 15, pageHeight - 20);
                }
                
                // Normaler Font wieder sicherstellen
                doc.setFontSize(11);
                if (design === 'modern_clean' || design === 'behoerden_pro') doc.setFont("helvetica", "normal");
                else doc.setFont("times", "normal");
                
                y = 30; // Margin Top für neue Seite
            }
            doc.text(line, marginL, y);
            y += 5.5; // Zeilenabstand im Absatz
        });
        
        y += 3; // Zusätzlicher Abstand nach einem kompletten Absatz
    });

    // Unterschriften-Bereich
    y += 15;
    if (y > pageHeight - 35) { 
        doc.addPage(); 
        if (design === 'elegant_legal') {
            doc.setDrawColor(46, 125, 50);
            doc.setLineWidth(1.5);
            doc.line(15, 20, 15, pageHeight - 20);
        }
        y = 30; 
    }
    
    // Unterschriften-Linie & Name
    
    if (typeof signaturePad !== 'undefined' && !signaturePad.isEmpty()) {
        
        // Unterschrift als Bild auslesen (PNG)
        const sigDataUrl = signaturePad.toDataURL("image/png");
        
        // Bild ins PDF einfügen (Bilddaten, Format, X-Position, Y-Position, Breite, Höhe)
        doc.addImage(sigDataUrl, 'PNG', marginL, y - 8, 45, 15);
        
        // Name direkt darunter drucken (ohne die Linie!)
        y += 12; 
        doc.setFontSize(10);
        doc.text(absName, marginL, y);

    } else {
        
        doc.text("__________________________________", marginL, y);
        y += 6;
        doc.setFontSize(10);
        doc.text(absName, marginL, y);
        
    }

    // ==========================================
    // --- NEU: Anlagen-Verzeichnis ---
    // ==========================================
    
    if (anlagenText !== "") {
        // Trenne die Anlagen anhand von Zeilenumbrüchen und werfe leere Zeilen raus
        const anlagenListe = anlagenText.split('\n').filter(line => line.trim() !== "");
        
        if (anlagenListe.length > 0) {
            y += 15; // Abstand nach der Unterschrift
            
            // Seitenumbruch prüfen
            if (y > pageHeight - 30) {
                doc.addPage();
                if (design === 'elegant_legal') {
                    doc.setDrawColor(46, 125, 50);
                    doc.setLineWidth(1.5);
                    doc.line(15, 20, 15, pageHeight - 20);
                }
                y = 30;
            }
            
            // Überschrift "Anlagen" (Fett)
            doc.setFontSize(11);
            if (design === 'modern_clean' || design === 'behoerden_pro') {
                doc.setFont("helvetica", "bold");
            } else {
                doc.setFont("times", "bold");
            }
            
            doc.text("Anlagen", marginL, y);
            y += 6;
            
            // Listen-Punkte (Normal)
            if (design === 'modern_clean' || design === 'behoerden_pro') {
                doc.setFont("helvetica", "normal");
            } else {
                doc.setFont("times", "normal");
            }
            
            anlagenListe.forEach(anlage => {
                // Seitenumbruch prüfen für lange Listen
                if (y > pageHeight - 20) {
                    doc.addPage();
                    if (design === 'elegant_legal') {
                        doc.setDrawColor(46, 125, 50);
                        doc.setLineWidth(1.5);
                        doc.line(15, 20, 15, pageHeight - 20);
                    }
                    y = 30;
                }
                doc.text("- " + anlage.trim(), marginL, y);
                y += 5.5;
            });
        }
    }

    // PDF herunterladen
    doc.save("Brief_formatiert.pdf");
}

// --- Signature Pad initialisieren ---
    const canvas = document.getElementById('signatureCanvas');
    const clearButton = document.getElementById('clearSignatureBtn');

    if (canvas) {
        // Skalierung für scharfe Linien auf hochauflösenden Displays (Handys)
        function resizeCanvas() {
            const ratio =  Math.max(window.devicePixelRatio || 1, 1);
            canvas.width = canvas.offsetWidth * ratio;
            canvas.height = canvas.offsetHeight * ratio;
            canvas.getContext("2d").scale(ratio, ratio);
        }
        window.addEventListener("resize", resizeCanvas);
        resizeCanvas();

        // Das eigentliche Pad starten ("Kugelschreiber-Blau" als Farbe)
        signaturePad = new SignaturePad(canvas, {
            penColor: "rgb(0, 51, 153)", 
            backgroundColor: "rgba(0,0,0,0)" // Transparent, damit es im PDF gut aussieht
        });

        // Unterschrift-Löschen-Button
        if (clearButton) {
            clearButton.addEventListener('click', function () {
                signaturePad.clear();
            });
        }
    }
