// Überstunden-Vergütungscheck basierend auf Arbeitsrecht (Anordnung, Tarif, Vertrag)

/* --- Hilfsfunktionen --- */
function n(el) { 
    if (!el) return 0; 
    const v = Number((el.value || "").toString().replace(",", ".")); 
    return Number.isFinite(v) ? v : 0; 
}

document.addEventListener("DOMContentLoaded", () => {
    const inputs = {
        anordnung: document.getElementById("ue_anordnung"),
        stunden: document.getElementById("ue_stunden"),
        zuschlagRegel: document.getElementById("ue_zuschlag_regelung"),
        zuschlagProzent: document.getElementById("ue_zuschlag_prozent"),
        abgeltung: document.getElementById("ue_abgeltung")
    };

    const btn = document.getElementById("ue_berechnen");
    const reset = document.getElementById("ue_reset");
    const out = document.getElementById("ue_ergebnis");

    // --- LOGIK ---
    btn.addEventListener("click", () => {
        out.innerHTML = ""; 

        // 1. Eingaben
        const isOrdered = inputs.anordnung.value === "ja";
        const hours = n(inputs.stunden);
        const bonusPercent = n(inputs.zuschlagProzent);
        const paymentType = inputs.abgeltung.value; // freizeit, auszahlung, nicht_geregelt
        const hasTariff = inputs.zuschlagRegel.value === "ja_tarif";

        // Grundlegende Validierung
        if (hours <= 0) {
             out.innerHTML = `<div style="background:#fff3cd; color:#856404; padding: 15px; border-radius: 4px; border-left: 4px solid #ffeeba;">Bitte gib die Anzahl der Überstunden an.</div>`;
             return;
        }

        let mainAction = "";
        let riskNote = "";
        let analysis = [];
        let todos = [];
        let colorCode = "green"; 

        // 2. Prüfen des Anspruchs dem Grunde nach
        if (!isOrdered) {
            colorCode = "red";
            mainAction = "Kein Anspruch dem Grunde nach";
            riskNote = "Du hast die Stunden <strong>eigenmächtig</strong> geleistet, ohne dass der Arbeitgeber sie verlangt oder gebilligt hat. In diesem Fall besteht leider kein gesetzlicher Anspruch auf Vergütung oder Freizeitausgleich.";
            analysis.push("<strong>Keine Anordnung:</strong> Fehlt die Weisung oder die Duldung des Arbeitgebers, ist eine Vergütung schwer durchsetzbar.");
            todos.push("Sprich mit deinem Chef, ob er die geleistete Arbeit nachträglich anerkennt. Sei darauf vorbereitet, dass sie nicht vergütet wird.");
            todos.push("Dokumentiere in Zukunft <strong>vorab</strong> die Notwendigkeit von Mehrarbeit und hole die Genehmigung ein.");
        } else {
            // Anordnung liegt vor -> Anspruch besteht
            analysis.push("<strong>Anordnung liegt vor:</strong> Der Anspruch auf Vergütung oder Freizeitausgleich besteht dem Grunde nach.");

            // 3. Vergütungsart prüfen
            if (paymentType === "freizeit") {
                mainAction = "Voraussichtlich Freizeitausgleich";
                riskNote = `Der Vertrag sieht <strong>Freizeitausgleich</strong> vor. Du hast Anspruch auf <strong>${hours} Stunden</strong> bezahlte Freizeit.`;
                analysis.push("<strong>Vertraglich geregelt:</strong> Die Stunden werden in der Regel 1:1 durch Freizeit ausgeglichen.");
                todos.push("Plane den Ausgleich der Stunden rechtzeitig mit deinem Vorgesetzten und halte die Vereinbarung schriftlich fest.");
            
            } else if (paymentType === "auszahlung") {
                mainAction = "Voraussichtlich Auszahlung";
                riskNote = `Der Vertrag sieht <strong>Auszahlung</strong> vor. Dein Anspruch liegt bei ${hours} Stunden × Stundensatz (zzgl. etwaiger Zuschläge).`;
                analysis.push("<strong>Vertraglich geregelt:</strong> Die Stunden sollten mit der nächsten Gehaltsabrechnung ausgezahlt werden.");
                todos.push(`Überprüfe deine nächste Lohnabrechnung genau auf die korrekte Erfassung der ${hours} Überstunden.`);
            
            } else if (paymentType === "nicht_geregelt") {
                mainAction = "Freizeit ODER Auszahlung";
                riskNote = "Die Art der Abgeltung ist nicht klar geregelt. Nachrangig steht dem Arbeitnehmer die <strong>Auszahlung</strong> zu, wenn der Arbeitgeber den Freizeitausgleich nicht anbietet.";
                colorCode = "orange";
                analysis.push("<strong>Unklare Regelung:</strong> Es bedarf einer aktiven Forderung zur Klärung der Abgeltung an den Arbeitgeber.");
                todos.push("Stelle eine schriftliche Anfrage: Wann und wie sollen die Stunden abgegolten werden (konkrete Frist setzen).");
            }

            // 4. Zuschlag prüfen
            if (bonusPercent > 0) {
                analysis.push(`<strong>Überstundenzuschlag:</strong> Vertraglich/Tariflich sind <strong>${bonusPercent}%</strong> Zuschlag hinterlegt.`);
                
                if (hasTariff) {
                    riskNote += ` <strong>Der Zuschlag von ${bonusPercent}% ist durch den Tarifvertrag verbindlich.</strong>`;
                } else if (paymentType === "auszahlung") {
                    riskNote += ` <strong>Der vertragliche Zuschlag muss bei Auszahlung ebenfalls berechnet werden.</strong>`;
                }
            }
        }

        // 5. To-Dos & Nachweis-Tipps (immer relevant)
        todos.push("Führe eine <strong>detaillierte Stundenaufzeichnung</strong> (Beginn, Ende, Pausen, Tätigkeiten) als Nachweis.");
        todos.push("Prüfe, ob du unter die Gruppe der <strong>Besserverdiener</strong> fällst (Führungskräfte / hohes Gehalt), bei denen Überstunden oft rechtmäßig mit dem Grundgehalt abgegolten sind.");

        // Styling Variablen für das Design
        let statusStyle = "";
        let statusLabel = "";

        if (colorCode === "green") { 
            statusStyle = "background-color: #e8f5e9; border-left: 6px solid #2e7d32; color: #1b5e20;";
            statusLabel = "Anspruch positiv";
        } else if (colorCode === "orange") { 
            statusStyle = "background-color: #fff8e1; border-left: 6px solid #f57f17; color: #e65100;";
            statusLabel = "Klärungsbedarf";
        } else if (colorCode === "red") { 
            statusStyle = "background-color: #ffebee; border-left: 6px solid #c62828; color: #b71c1c;";
            statusLabel = "Anspruch kritisch";
        }

        // HTML Output (Modernes, aufgeräumtes Design ohne Emojis)
        const resultHtml = `
            <div id="ue_result_card" style="font-family: Arial, sans-serif; max-width: 800px; margin: 20px auto; color: #333;">
                <h2 style="margin-bottom: 15px; font-size: 1.5rem; color: #222;">Ergebnis der Überstunden-Prüfung</h2>
                
                <div style="padding: 20px; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin-bottom: 25px; ${statusStyle}">
                    <div style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px; opacity: 0.8;">${statusLabel}</div>
                    <h3 style="margin: 0 0 10px 0; font-size: 1.4rem;">${mainAction}</h3>
                    <p style="margin: 0; font-size: 1rem;">Erfasste Überstunden: <strong>${hours}</strong></p>
                </div>

                <div style="margin-bottom: 25px;">
                    <h3 style="font-size: 1.2rem; border-bottom: 1px solid #eee; padding-bottom: 8px; margin-bottom: 15px;">Zusammenfassung & Bewertung</h3>
                    <p style="line-height: 1.5;">${riskNote}</p>
                    <ul style="list-style-type: disc; padding-left: 20px; line-height: 1.6; color: #444;">
                        ${analysis.map(a => `<li style="margin-bottom: 8px;">${a}</li>`).join('')}
                    </ul>
                </div>

                <div style="background-color: #f8f9fa; border: 1px solid #e9ecef; border-left: 4px solid #0056b3; padding: 20px; border-radius: 4px; margin-bottom: 25px;">
                    <h3 style="margin: 0 0 15px 0; font-size: 1.1rem; color: #0056b3;">Empfohlene Handlungsschritte</h3>
                    <ul style="margin: 0; padding-left: 20px; line-height: 1.6;">
                        ${todos.map(t => `<li style="margin-bottom: 8px;">${t}</li>`).join('')}
                    </ul>
                    <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #dee2e6; font-size: 0.9rem; color: #6c757d;">
                        <strong>Hinweis zur Beweislast:</strong> Im Streitfall musst du beweisen, dass die Überstunden geleistet und vom Arbeitgeber geduldet/angeordnet wurden.
                    </div>
                </div>

                <div class="button-container" style="display: flex; margin-top: 20px;">
                   
                </div>
            </div>
        `;

        out.innerHTML = resultHtml;
        out.scrollIntoView({ behavior: "smooth", block: "start" });

        // --- PDF EXPORT (STABILE KLON-METHODE) ---
        setTimeout(() => {
            const pdfBtn = document.getElementById("ue_pdf_btn");
            const elementToPrint = document.getElementById("ue_result_card");

            if(pdfBtn && elementToPrint) {
                pdfBtn.addEventListener("click", () => {
                    const originalText = pdfBtn.innerText;
                    pdfBtn.innerText = "Wird erstellt...";
                    pdfBtn.style.opacity = "0.7";
                    
                    // Klonen & Isolieren
                    const clonedElement = elementToPrint.cloneNode(true);
                    const btnContainer = clonedElement.querySelector('.button-container');
                    if(btnContainer) btnContainer.style.display = 'none';

                    clonedElement.style.position = 'fixed';
                    clonedElement.style.top = '0';
                    clonedElement.style.left = '-9999px';
                    clonedElement.style.width = '800px'; 
                    clonedElement.style.backgroundColor = '#ffffff';
                    clonedElement.style.padding = '20px';
                    document.body.appendChild(clonedElement);

                    const opt = {
                        margin:       0.5,
                        filename:     'ueberstunden-check.pdf',
                        image:        { type: 'jpeg', quality: 0.98 },
                        html2canvas:  { scale: 2, useCORS: true, logging: false },
                        jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
                    };

                    html2pdf().from(clonedElement).set(opt).save().then(() => {
                        document.body.removeChild(clonedElement);
                        pdfBtn.innerText = originalText;
                        pdfBtn.style.opacity = "1";
                    }).catch(err => {
                        console.error(err);
                        document.body.removeChild(clonedElement);
                        pdfBtn.innerText = "Fehler beim Export!";
                        pdfBtn.style.backgroundColor = "#dc3545";
                    });
                });
            }
        }, 500);
    });

    if (reset) {
        reset.addEventListener("click", () => {
            setTimeout(() => { out.innerHTML = ""; }, 50);
        });
    }
});