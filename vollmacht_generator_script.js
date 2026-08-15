document.addEventListener("DOMContentLoaded", () => {
    
    // --- 1. SIGNATUR-PADS INITIALISIEREN ---
    const canvasGeber = document.getElementById("canvasGeber");
    const canvasNehmer = document.getElementById("canvasNehmer");
    
    // Canvas-Größe für hochauflösende Displays anpassen (sonst ist die Mausposition verschoben)
    function resizeCanvas(canvas) {
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        canvas.width = canvas.offsetWidth * ratio;
        canvas.height = canvas.offsetHeight * ratio;
        canvas.getContext("2d").scale(ratio, ratio);
    }

    // Beim Laden und bei Fenstergrößenänderung anpassen
    window.addEventListener("resize", () => {
        resizeCanvas(canvasGeber);
        resizeCanvas(canvasNehmer);
    });
    resizeCanvas(canvasGeber);
    resizeCanvas(canvasNehmer);

    // SignaturePads instanziieren
    const sigPadGeber = new SignaturePad(canvasGeber, { penColor: "rgb(0, 0, 100)" });
    const sigPadNehmer = new SignaturePad(canvasNehmer, { penColor: "rgb(0, 0, 100)" });

    // Löschen-Buttons für die Signatur
    document.querySelectorAll(".clear-sig").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const targetId = e.target.getAttribute("data-target");
            if (targetId === "canvasGeber") sigPadGeber.clear();
            if (targetId === "canvasNehmer") sigPadNehmer.clear();
        });
    });


    // --- 2. PDF GENERIERUNG BEIM FORMULAR-SUBMIT ---
    const form = document.getElementById("vollmachtForm");
    
    form.addEventListener("submit", function(event) {
        event.preventDefault(); // Verhindert das Neuladen der Seite

        // jspdf Initialisierung
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF("p", "mm", "a4");
        
        // Konstanten für das Layout
        const margin = 20;
        const pageWidth = 210;
        const textWidth = pageWidth - 2 * margin;
        let cursorY = margin;

        // Hilfsfunktion: Text schreiben und Y-Cursor verschieben
        function printText(text, fontSize = 11, isBold = false, align = "left", color = [0, 0, 0]) {
            doc.setFontSize(fontSize);
            doc.setFont("helvetica", isBold ? "bold" : "normal");
            doc.setTextColor(color[0], color[1], color[2]);
            
            const lines = doc.splitTextToSize(text, textWidth);
            const xPos = align === "center" ? pageWidth / 2 : margin;
            
            doc.text(lines, xPos, cursorY, { align: align });
            // Cursor nach unten verschieben (abhängig von Zeilenanzahl und Schriftgröße)
            cursorY += (lines.length * fontSize * 0.45) + 3; 
        }

        // --- DATEN AUS DEM FORMULAR AUSLESEN ---
        // Vollmachtgeber
        const vgName = document.getElementById("vgName").value.trim();
        const vgAdresse = document.getElementById("vgAdresse").value.trim();
        const vgGeburt = document.getElementById("vgGeburt").value;
        const vgAusweis = document.getElementById("vgAusweis").value.trim();
        const vgBGNummer = document.getElementById("vgBGNummer").value.trim();
        
        // Bevollmächtigter
        const bvName = document.getElementById("bvName").value.trim();
        const bvAdresse = document.getElementById("bvAdresse").value.trim();
        const bvGeburt = document.getElementById("bvGeburt").value;

        // Befugnisse (Checkboxen)
        const befugnisse = [];
        document.querySelectorAll('.checkbox-group input[type="checkbox"]:checked').forEach(cb => {
            befugnisse.push(cb.value);
        });
        const sonstiges = document.getElementById("authSonstigesText").value.trim();
        if (sonstiges !== "") befugnisse.push(sonstiges);

        // Gültigkeit
        const isDauerhaft = document.getElementById("gueltigWiderruf").checked;
        const gueltigDatum = document.getElementById("gueltigDatum").value;

        // Datum heute formatieren
        const heute = new Date().toLocaleDateString("de-DE");
        // Geburtsdaten formatieren
        const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString("de-DE") : "";

        // Design-Auswahl
        const design = document.getElementById("pdfDesign").value;

        // --- LAYOUT LOGIK ---

        if (design === "classic") {
            // -- DESIGN 1: KLASSISCH (Behörden-Stil) --
            
            // Absender (Vollmachtgeber) oben links
            printText("Vollmachtgeber:", 9, true, "left", [100, 100, 100]);
            printText(`${vgName}\n${vgAdresse}`, 11);
            if(vgBGNummer) printText(`Aktenzeichen / Kunden-Nr.: ${vgBGNummer}`, 10);
            
            // Datum rechtsbündig (manuelles Setzen, da printText 'left' standardmäßig hat)
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(0, 0, 0);
            doc.text(`Datum: ${heute}`, pageWidth - margin, margin, { align: "right" });
            
            cursorY += 15;

            // Überschrift
            printText("VOLLMACHT", 18, true, "center");
            cursorY += 10;

            // Einleitungstext
            const einleitung = `Hiermit bevollmächtige ich, ${vgName} (geb. am ${formatDate(vgGeburt)}), wohnhaft in der oben genannten Adresse${vgAusweis ? ', Ausweis-Nr.: ' + vgAusweis : ''}, die nachfolgend genannte Person:`;
            printText(einleitung, 11, false, "left");
            cursorY += 5;

            // Bevollmächtigter Block eingerückt
            doc.setFillColor(245, 245, 245);
            doc.rect(margin, cursorY, textWidth, 25, 'F'); // Grauer Hintergrund
            cursorY += 6;
            const bvText = `${bvName}\nGeboren am: ${formatDate(bvGeburt)}\nWohnhaft in: ${bvAdresse.replace(/\n/g, ", ")}`;
            doc.setFont("helvetica", "bold");
            doc.text("Vertrauensperson (Bevollmächtigter):", margin + 5, cursorY);
            doc.setFont("helvetica", "normal");
            doc.text(doc.splitTextToSize(bvText, textWidth - 10), margin + 5, cursorY + 6);
            cursorY += 25;

            // Umfang der Vollmacht
            printText("Die Vollmacht berechtigt zu folgenden Handlungen in meinem Namen:", 11, true);
            cursorY += 2;

            if (befugnisse.length === 0) {
                printText("- Keine spezifischen Befugnisse ausgewählt.", 11);
            } else {
                befugnisse.forEach(befugnis => {
                    printText(`• ${befugnis}`, 11);
                });
            }
            cursorY += 5;

            // Gültigkeit
            printText("Gültigkeit:", 11, true);
            if (isDauerhaft) {
                printText("Diese Vollmacht ist ab sofort gültig und gilt bis auf schriftlichen Widerruf.", 11);
            } else {
                printText(`Diese Vollmacht gilt einmalig für den folgenden Termin/Tag: ${formatDate(gueltigDatum)}.`, 11);
            }
            
        } else {
            // -- DESIGN 2: MODERN --
            
            // Kopfzeile mit farbigem Balken
            doc.setFillColor(46, 125, 50); // Sozial-Lotse Grün
            doc.rect(0, 0, pageWidth, 15, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(16);
            doc.text("VOLLMACHT", margin, 10.5);
            
            cursorY = 25;
            doc.setTextColor(0, 0, 0);

            // Side-by-Side: Vollmachtgeber vs. Bevollmächtigter
            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.text("VOLLMACHTGEBER:", margin, cursorY);
            doc.text("BEVOLLMÄCHTIGTER:", pageWidth / 2 + 5, cursorY);
            
            doc.setFontSize(11);
            doc.setFont("helvetica", "normal");
            cursorY += 5;
            
            const vgLines = doc.splitTextToSize(`${vgName}\n${vgAdresse}\nGeb.: ${formatDate(vgGeburt)}${vgAusweis ? '\nAusweis: ' + vgAusweis : ''}${vgBGNummer ? '\nKunden-Nr.: ' + vgBGNummer : ''}`, (pageWidth/2) - margin - 5);
            const bvLines = doc.splitTextToSize(`${bvName}\n${bvAdresse}\nGeb.: ${formatDate(bvGeburt)}`, (pageWidth/2) - margin - 5);
            
            doc.text(vgLines, margin, cursorY);
            doc.text(bvLines, pageWidth / 2 + 5, cursorY);
            
            // Y-Cursor unter den längeren Block setzen
            cursorY += Math.max(vgLines.length, bvLines.length) * 5 + 10;
            
            doc.setDrawColor(200, 200, 200);
            doc.line(margin, cursorY, pageWidth - margin, cursorY); // Trennlinie
            cursorY += 10;

            printText("Hiermit ermächtige ich die oben genannte Person, mich in meinen Angelegenheiten rechtsverbindlich zu vertreten.", 11);
            cursorY += 5;

            printText("Umfang der Bevollmächtigung:", 12, true, "left", [46, 125, 50]); // Grüne Überschrift
            cursorY += 2;
            
            if (befugnisse.length === 0) {
                printText("- Keine spezifischen Befugnisse ausgewählt.", 11);
            } else {
                befugnisse.forEach(befugnis => {
                    printText(`• ${befugnis}`, 11);
                });
            }
            cursorY += 5;

            printText("Gültigkeit der Vollmacht:", 12, true, "left", [46, 125, 50]);
            if (isDauerhaft) {
                printText("Gültig ab: " + heute + " (Gilt dauerhaft bis auf Widerruf)", 11);
            } else {
                printText("Einmalig gültig für den: " + formatDate(gueltigDatum), 11);
            }
        }

        // --- UNTERSCHRIFTEN-BEREICH ---
        
        // Prüfen ob wir eine neue Seite für die Unterschriften brauchen
        if (cursorY > 230) {
            doc.addPage();
            cursorY = margin;
        } else {
            cursorY = 240; // Fest am unteren Rand positionieren, wenn Platz ist
        }

        // NEU: Ort und Datum auslesen
        const signOrt = document.getElementById("signOrt").value.trim();
        const signDatumInput = document.getElementById("signDatum").value;
        const signDatum = signDatumInput ? new Date(signDatumInput).toLocaleDateString("de-DE") : heute;

        // Ort/Datum Text formatieren (z.B. "Berlin, 15.08.2026")
        let ortDatumString = "";
        if (signOrt) {
            ortDatumString = `${signOrt}, den ${signDatum}`;
        }

        // Ort/Datum in PDF schreiben
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        
        // Wenn ein Ort eingegeben wurde, drucken wir ihn knapp über die Linie
        if (ortDatumString) {
            doc.text(ortDatumString, margin, cursorY - 2); 
        }
        
        doc.text(`__________________________________`, margin, cursorY);
        doc.text(`Ort, Datum`, margin, cursorY + 5);

        cursorY += 20;

        // Vollmachtgeber Unterschrift
        if (!sigPadGeber.isEmpty()) {
            doc.addImage(sigPadGeber.toDataURL("image/png"), "PNG", margin, cursorY - 15, 60, 25);
        }
        doc.text(`__________________________________`, margin, cursorY + 10);
        doc.text(`Unterschrift Vollmachtgeber`, margin, cursorY + 15);
        doc.text(`(${vgName})`, margin, cursorY + 20);

        // Bevollmächtigter Unterschrift (rechts)
        const rightColX = pageWidth / 2 + 10;
        if (!sigPadNehmer.isEmpty()) {
            doc.addImage(sigPadNehmer.toDataURL("image/png"), "PNG", rightColX, cursorY - 15, 60, 25);
        }
        doc.text(`__________________________________`, rightColX, cursorY + 10);
        doc.text(`Unterschrift Bevollmächtigter (freiwillig)`, rightColX, cursorY + 15);
        doc.text(`(${bvName})`, rightColX, cursorY + 20);


        // --- PDF HERUNTERLADEN ---
        const fileName = `Vollmacht_${vgName.replace(/\s+/g, '_')}_${heute.replace(/\./g, '')}.pdf`;
        doc.save(fileName);
        
        // Kleines Feedback für den User
        const btn = document.getElementById("createVollmachtBtn");
        const originalText = btn.innerText;
        btn.innerText = "✓ PDF erfolgreich erstellt!";
        btn.style.backgroundColor = "#2e7d32";
        setTimeout(() => {
            btn.innerText = originalText;
            btn.style.backgroundColor = "#d35400";
        }, 3000);
    });
});
