document.addEventListener("DOMContentLoaded", () => {
    // --- 1. DOM Elemente laden ---
    const form = document.getElementById("quittungForm");
    
    // Inputs
    const betragZahlen = document.getElementById("betragZahlen");
    const betragWorten = document.getElementById("betragWorten");
    const verwendungszweck = document.getElementById("verwendungszweck");
    const zahlerName = document.getElementById("zahlerName");
    const empfaengerName = document.getElementById("empfaengerName");
    const quittungOrt = document.getElementById("quittungOrt");
    const quittungDatum = document.getElementById("quittungDatum");
    const keineSteuer = document.getElementById("keineSteuer");

    // Preview
    const prevBetrag = document.getElementById("prevBetrag");
    const prevWorte = document.getElementById("prevWorte");
    const prevZahler = document.getElementById("prevZahler");
    const prevZweck = document.getElementById("prevZweck");

    // Signature
    const canvas = document.getElementById("signatureCanvas");
    const clearSignatureBtn = document.getElementById("clearSignatureBtn");
    
    // --- 2. Unterschriften-Feld (Signature Pad) initialisieren ---
    let signaturePad;
    
    function resizeCanvas() {
        // Skaliert das Canvas korrekt für hochauflösende Displays (Retina, Smartphones)
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        canvas.width = canvas.offsetWidth * ratio;
        canvas.height = canvas.offsetHeight * ratio;
        canvas.getContext("2d").scale(ratio, ratio);
        if (signaturePad) {
            signaturePad.clear(); // Beim Skalieren löschen, um Verzerrungen zu vermeiden
        }
    }
    
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas(); // Direkt beim Laden anwenden
    
    signaturePad = new SignaturePad(canvas, {
        penColor: "rgb(0, 0, 150)" // Klassische blaue Kugelschreiberfarbe
    });

    clearSignatureBtn.addEventListener("click", () => {
        signaturePad.clear();
    });

    // --- 3. Zahl in Wort-Umwandler (Fälschungsschutz) ---
    function zahlZuWort(n) {
        if (n === 0) return "Null";
        const einer = ["", "ein", "zwei", "drei", "vier", "fünf", "sechs", "sieben", "acht", "neun"];
        const zehner = ["", "zehn", "zwanzig", "dreißig", "vierzig", "fünfzig", "sechzig", "siebzig", "achtzig", "neunzig"];
        const elfBisNeunzehn = ["zehn", "elf", "zwölf", "dreizehn", "vierzehn", "fünfzehn", "sechzehn", "siebzehn", "achtzehn", "neunzehn"];

        function hunderter(num) {
            if (num === 0) return "";
            if (num === 1) return "eins";
            let str = "";
            let h = Math.floor(num / 100);
            let rest = num % 100;

            if (h > 0) str += einer[h] + "hundert";
            if (rest > 0) {
                if (rest === 1) str += "eins";
                else if (rest < 10) str += einer[rest];
                else if (rest < 20) str += elfBisNeunzehn[rest - 10];
                else {
                    let z = Math.floor(rest / 10);
                    let e = rest % 10;
                    if (e > 0) str += einer[e] + "und" + zehner[z];
                    else str += zehner[z];
                }
            }
            return str;
        }

        let result = "";
        let millionen = Math.floor(n / 1000000);
        let tausender = Math.floor((n % 1000000) / 1000);
        let rest = n % 1000;

        if (millionen > 0) {
            if (millionen === 1) result += "eine Million ";
            else result += hunderter(millionen) + " Millionen ";
        }
        if (tausender > 0) {
            if (tausender === 1) result += "eintausend";
            else {
                let tStr = hunderter(tausender);
                if (tStr.endsWith("eins")) tStr = tStr.slice(0, -1); // zweihundertein(s)tausend
                result += tStr + "tausend";
            }
        }
        if (rest > 0) {
            result += hunderter(rest);
        }

        return result.charAt(0).toUpperCase() + result.slice(1);
    }

    function formatiereGeldZuWorten(betragStr) {
        if (!betragStr) return "";
        let parts = betragStr.replace(',', '.').split('.');
        let euros = parseInt(parts[0]) || 0;
        let cents = parts.length > 1 ? parts[1].padEnd(2, '0').substring(0, 2) : "00";
        
        let euroWorte = zahlZuWort(euros);
        
        // Grammatik-Fixes
        if (euros === 1) euroWorte = "Ein"; // "Ein Euro" statt "Eins Euro"
        
        if (euros === 0) {
            return cents + " Cent";
        }
        if (cents === "00") {
            return euroWorte + " Euro";
        } else {
            return euroWorte + " Euro und " + cents + " Cent";
        }
    }

    // --- 4. Live-Vorschau aktualisieren ---
    function updatePreview() {
        // Betrag
        let rawBetrag = betragZahlen.value;
        if (rawBetrag) {
            let numBetrag = parseFloat(rawBetrag.replace(',', '.'));
            if (!isNaN(numBetrag)) {
                // Anzeige formatieren auf 2 Nachkommastellen (z.B. 150,50)
                let formatBetrag = numBetrag.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                prevBetrag.textContent = formatBetrag;
                
                // In Worte
                let worte = formatiereGeldZuWorten(rawBetrag);
                betragWorten.value = worte;
                prevWorte.textContent = worte;
            }
        } else {
            prevBetrag.textContent = "0,00";
            betragWorten.value = "";
            prevWorte.textContent = "Null";
        }

        // Andere Felder
        prevZahler.textContent = zahlerName.value || "________________________";
        prevZweck.textContent = verwendungszweck.value || "________________________";
    }

    // Event-Listener für Live-Vorschau binden
    const inputElements = [betragZahlen, verwendungszweck, zahlerName];
    inputElements.forEach(el => {
        el.addEventListener("input", updatePreview);
    });

    // --- 5. PDF Generierung (jsPDF) ---
    form.addEventListener("submit", function(e) {
        e.preventDefault(); 

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF("p", "mm", "a4"); // A4 Hochformat

        // Werte auslesen
        let numBetrag = parseFloat(betragZahlen.value.replace(',', '.')) || 0;
        let formatBetrag = numBetrag.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        let worte = betragWorten.value;
        let vonWem = zahlerName.value;
        let empfaenger = empfaengerName.value;
        let zweck = verwendungszweck.value;
        let ort = quittungOrt.value;
        let datumVal = quittungDatum.value;
        let privat = keineSteuer.checked;

        let datumStr = datumVal ? new Date(datumVal).toLocaleDateString('de-DE') : new Date().toLocaleDateString('de-DE');

        // --- Behördenfreundliches, klares A4 Design (Schwarz-Weiß) ---
        const startX = 25; // Schöner, breiter Rand für Locher/Hefter der Behörde
        let currentY = 30;

        // Header
        doc.setFont("helvetica", "bold");
        doc.setFontSize(24);
        doc.text("QUITTUNG", startX, currentY);
        
        // Betrag groß rechtsbündig
        doc.setFontSize(20);
        doc.text(formatBetrag + " EUR", 185, currentY, { align: "right" });
        
        currentY += 15;
        doc.setLineWidth(0.5);
        doc.line(startX, currentY, 185, currentY); // Trennlinie
        
        currentY += 15;

        // Funktion für saubere Zeilen
        function addRow(label, value, yPos) {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(12);
            doc.text(label, startX, yPos);
            
            doc.setFont("helvetica", "normal");
            // Falls der Text zu lang ist (z.B. beim Zweck), umbrechen
            let lines = doc.splitTextToSize(value, 110);
            doc.text(lines, startX + 45, yPos);
            return lines.length; // Gibt Anzahl der Zeilen zurück für den Abstand
        }

        addRow("Betrag in Worten:", worte, currentY);
        currentY += 15;

        addRow("Zahler:", vonWem, currentY);
        currentY += 15;

        let zweckLinesCount = addRow("Verwendungszweck:", zweck, currentY);
        currentY += 10 + (zweckLinesCount * 6); // Dynamischer Abstand, falls Zweck sehr lang ist

        // Optionaler Steuerhinweis
        if (privat) {
            doc.setFont("helvetica", "italic");
            doc.setFontSize(10);
            doc.setTextColor(80, 80, 80);
            doc.text("Es handelt sich um einen Privatverkauf / eine Privatleistung.", startX, currentY);
            doc.text("Ein Ausweis von Umsatzsteuer findet nicht statt.", startX, currentY + 5);
            doc.setTextColor(0, 0, 0); // Zurück auf schwarz
            currentY += 20;
        } else {
            currentY += 10;
        }

        // Ort, Datum & Unterschrift
        doc.setLineWidth(0.2);
        doc.line(startX, currentY, 185, currentY);
        currentY += 15;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(12);
        doc.text(ort + ", den " + datumStr, startX, currentY);

        // Unterschriften-Linie & Text
        doc.line(110, currentY + 15, 185, currentY + 15);
        doc.setFontSize(10);
        doc.text("Unterschrift (" + empfaenger + ")", 110, currentY + 20);

        // Unterschrift aus dem Canvas einfügen (falls vorhanden)
        if (!signaturePad.isEmpty()) {
            const signatureImage = signaturePad.toDataURL("image/png");
            doc.addImage(signatureImage, "PNG", 115, currentY - 5, 60, 20);
        }

        // Hinweis für die Akte unten auf der Seite
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text("Beleg generiert via Sozial-Lotse | Erfüllt die gesetzlichen Anforderungen an eine Quittung gem. § 368 BGB.", startX, 280);

        // PDF speichern
        doc.save(`Quittung_${datumStr.replace(/\./g, '')}.pdf`);
    });

    // Initiale Vorschau laden (damit Nullen gesetzt sind)
    updatePreview();
});