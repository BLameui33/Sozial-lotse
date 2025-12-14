// ueberstunden-check.js
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
             out.innerHTML = `<div class="warning-box" style="background:#fff3cd; color:#856404;">Bitte gib die Anzahl der Überstunden an.</div>`;
             return;
        }

        let mainAction = "";
        let riskNote = "";
        let analysis = [];
        let todos = [];
        let colorCode = "green"; 

        // 2. Prüfen des Anspruchs dem Grunde nach
        if (!isOrdered) {
            // Keine Anordnung oder Billigung
            colorCode = "red";
            mainAction = "Kein Anspruch dem Grunde nach";
            riskNote = "Du hast die Stunden **eigenmächtig** geleistet, ohne dass der Arbeitgeber sie verlangt oder gebilligt hat. In diesem Fall besteht leider kein gesetzlicher Anspruch auf Vergütung oder Freizeitausgleich.";
            analysis.push("🚫 **Keine Anordnung:** Fehlt die Weisung oder die Duldung des Arbeitgebers, ist eine Vergütung schwer durchsetzbar.");
            todos.push("Spreche mit deinem Chef, ob er die geleistete Arbeit nachträglich anerkennt. Sei darauf vorbereitet, dass sie nicht vergütet wird.");
            todos.push("Dokumentiere in Zukunft **vorab** die Notwendigkeit von Mehrarbeit und hole die Genehmigung ein.");
        } else {
            // Anordnung liegt vor -> Anspruch besteht!
            
            // 3. Vergütungsart prüfen (Freizeit oder Auszahlung)
            analysis.push(`✅ **Anordnung liegt vor:** Der Anspruch auf Vergütung oder Freizeitausgleich besteht.`);

            if (paymentType === "freizeit") {
                mainAction = "Voraussichtlich Freizeitausgleich";
                riskNote = `Der Vertrag sieht **Freizeitausgleich** vor. Du hast Anspruch auf **${hours} Stunden** bezahlte Freizeit.`;
                analysis.push("⏳ **Vertraglich geregelt:** Die Stunden werden in der Regel 1:1 durch Freizeit ausgeglichen.");
                todos.push("Plane den Ausgleich der Stunden mit deinem Vorgesetzten und halte die Vereinbarung schriftlich fest.");
            
            } else if (paymentType === "auszahlung") {
                mainAction = "Voraussichtlich Auszahlung";
                riskNote = `Der Vertrag sieht **Auszahlung** vor. Dein Anspruch liegt bei ${hours} Stunden * Stundensatz (plus Zuschlag).`;
                analysis.push("💶 **Vertraglich geregelt:** Die Stunden sollten mit der nächsten Gehaltsabrechnung ausgezahlt werden.");
                todos.push("Überprüfe deine nächste Lohnabrechnung genau auf die korrekte Erfassung der ${hours} Überstunden.");
            
            } else if (paymentType === "nicht_geregelt") {
                mainAction = "Freizeit ODER Auszahlung (Prüfung nötig)";
                riskNote = `Die Art der Abgeltung ist nicht klar geregelt. Nachrangig steht dem Arbeitnehmer die **Auszahlung** zu, wenn der Arbeitgeber den Freizeitausgleich nicht innerhalb der Fristen anordnet.`;
                colorCode = "orange";
                analysis.push("❓ **Unklare Regelung:** Forderung zur Klärung der Abgeltung an den Arbeitgeber stellen.");
                todos.push("Stelle eine schriftliche Anfrage: Wann und wie sollen die Stunden abgegolten werden (Frist setzen).");
            }

            // 4. Zuschlag prüfen (Zusätzlich zur normalen Vergütung)
            if (bonusPercent > 0) {
                const effectiveBonus = hasTariff ? bonusPercent : 0; // Annahme: vertraglicher Bonus ist seltener wirksam
                analysis.push(`➕ **Überstundenzuschlag:** Vertraglich/Tariflich sind **${bonusPercent}%** Zuschlag geregelt.`);
                
                if (hasTariff) {
                    riskNote += ` **Der Zuschlag von ${bonusPercent}% ist durch den Tarifvertrag verbindlich.**`;
                } else if (bonusPercent > 0 && paymentType === "auszahlung") {
                    riskNote += ` **Der vertragliche Zuschlag sollte ebenfalls ausgezahlt werden.**`;
                }
            }
        }


        // 5. To-Dos & Nachweis-Tipps (immer relevant)
        todos.push("Führe eine **detaillierte Stundenaufzeichnung** (Beginn, Ende, Pausen, Tätigkeiten) als Nachweis.");
        todos.push("Prüfe, ob du unter die Gruppe der **Besserverdiener** fällst (hohes Gehalt), bei denen Überstunden oft mit dem Grundgehalt 'abgegolten' sind.");


        // Styling Variablen
        let bgCol = "#d4edda"; 
        let textCol = "#155724";
        let icon = "🟢";

        if (colorCode === "orange") { bgCol = "#fff3cd"; textCol = "#856404"; icon = "🟠"; }
        if (colorCode === "red") { bgCol = "#f8d7da"; textCol = "#721c24"; icon = "🔴"; }


        // HTML Output
        const resultHtml = `
            <h2>Dein Ergebnis</h2>
            <div id="ue_result_card" class="pflegegrad-result-card">
                
                <div style="background:${bgCol}; color:${textCol}; padding:20px; border-radius:8px; text-align:center; margin-bottom:20px; border:1px solid rgba(0,0,0,0.1);">
                    <div style="font-size:3rem; line-height:1; margin-bottom:10px;">${icon}</div>
                    <h3 style="margin:0; font-size:1.4rem;">${mainAction}</h3>
                    <p style="margin:5px 0 0 0;">Anzahl Überstunden: <strong>${hours}</strong></p>
                </div>

                <h3>Analyse und Hinweise</h3>
                <p>${riskNote}</p>
                
                <ul style="list-style-type: none; padding:0; margin-top:20px;">
                    ${analysis.map(a => `<li style="margin-bottom:8px; padding-left:20px; position:relative;">${a}</li>`).join('')}
                </ul>


                <h3>Wichtige Schritte & Nachweis</h3>
                <div class="highlight-box" style="background-color:#fff; border:1px solid #ddd; border-left:4px solid #2980b9;">
                    <ul style="margin:0; padding-left:20px;">
                        ${todos.map(t => `<li style="margin-bottom:8px;">${t}</li>`).join('')}
                    </ul>
                    <p class="hinweis" style="margin-top:15px;">**Wichtig:** Du musst im Streitfall beweisen, dass du Überstunden geleistet hast. Eine lückenlose Zeiterfassung ist essentiell!</p>
                </div>

                <div class="button-container" style="display:flex; gap:10px; margin-top:20px; flex-wrap:wrap;">
                    <button id="ue_pdf_btn" class="button">📄 Checkliste als PDF</button>
                </div>
            </div>
        `;

        out.innerHTML = resultHtml;
        out.scrollIntoView({ behavior: "smooth" });

        // --- PDF EXPORT (STABILE KLON-METHODE) ---
        setTimeout(() => {
            const pdfBtn = document.getElementById("ue_pdf_btn");
            const elementToPrint = document.getElementById("ue_result_card");

            if(pdfBtn && elementToPrint) {
                pdfBtn.addEventListener("click", () => {
                    const originalText = pdfBtn.innerText;
                    pdfBtn.innerText = "⏳ Wird erstellt...";
                    
                    // Klonen & Isolieren
                    const clonedElement = elementToPrint.cloneNode(true);
                    const btnContainer = clonedElement.querySelector('.button-container');
                    if(btnContainer) btnContainer.style.display = 'none';

                    clonedElement.style.position = 'fixed';
                    clonedElement.style.top = '0';
                    clonedElement.style.left = '-9999px';
                    clonedElement.style.width = '800px'; 
                    clonedElement.style.backgroundColor = '#ffffff';
                    document.body.appendChild(clonedElement);

                    const opt = {
                        margin:       [0.5, 0.5],
                        filename:     'ueberstunden-check.pdf',
                        image:        { type: 'jpeg', quality: 0.98 },
                        html2canvas:  { scale: 2, useCORS: true, logging: false },
                        jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
                    };

                    html2pdf().from(clonedElement).set(opt).save().then(() => {
                        document.body.removeChild(clonedElement);
                        pdfBtn.innerText = originalText;
                    }).catch(err => {
                        console.error(err);
                        document.body.removeChild(clonedElement);
                        pdfBtn.innerText = "Fehler!";
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