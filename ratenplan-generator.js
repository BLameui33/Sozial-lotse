// ratenplan-generator.js
// Berechnung eines Tilgungsplans mit Zinsen

/* --- Hilfsfunktionen --- */
function n(el) { 
    if (!el) return 0; 
    const v = Number((el.value || "").toString().replace(",", ".")); 
    return Number.isFinite(v) ? v : 0; 
}

function euro(v) { 
    const x = Number.isFinite(v) ? v : 0; 
    return x.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €"; 
}

function formatDate(d) {
    if(!d || isNaN(d.getTime())) return "–";
    const dd = ("0"+d.getDate()).slice(-2);
    const mm = ("0"+(d.getMonth()+1)).slice(-2);
    return `${dd}.${mm}.${d.getFullYear()}`;
}

// Stellt sicher, dass das Datum der 1. des nächsten Monats ist
function getNextFirstOfMonth() {
    const today = new Date();
    let nextMonth = today.getMonth() + 1;
    let nextYear = today.getFullYear();
    if (nextMonth > 11) {
        nextMonth = 0;
        nextYear++;
    }
    return new Date(nextYear, nextMonth, 1);
}


document.addEventListener("DOMContentLoaded", () => {
    // Setze das Startdatum auf den 1. des nächsten Monats
    const inpStart = document.getElementById("rp_start");
    if (inpStart) {
        const nextFirst = getNextFirstOfMonth();
        inpStart.value = nextFirst.toISOString().substring(0, 10);
    }

    const inputs = {
        schuld: document.getElementById("rp_schuld"),
        rate: document.getElementById("rp_rate"),
        zins: document.getElementById("rp_zins"),
        start: inpStart
    };

    const btn = document.getElementById("rp_berechnen");
    const reset = document.getElementById("rp_reset");
    const out = document.getElementById("rp_ergebnis");

    // --- LOGIK ---
    btn.addEventListener("click", () => {
        out.innerHTML = ""; 

        // 1. Eingaben
        let remainingDebt = n(inputs.schuld);
        const monthlyRate = n(inputs.rate);
        const annualInterest = n(inputs.zins) / 100;
        const startDate = new Date(inputs.start.value);

        // Validierung
        if (remainingDebt <= 0 || monthlyRate <= 0 || isNaN(startDate.getTime())) {
             out.innerHTML = `<div class="warning-box" style="background:#fff3cd; color:#856404;">Bitte gib die Schuld und die Rate an.</div>`;
             return;
        }

        if (monthlyRate > remainingDebt) {
            out.innerHTML = `<div class="warning-box" style="background:#fff3cd; color:#856404;">Die Rate ist höher als die Schuld. Zahl einfach sofort alles.</div>`;
            return;
        }
        
        if (annualInterest > 0.3) { // 30% Zinsen ist zu hoch für eine realistische Berechnung
             out.innerHTML = `<div class="warning-box" style="background:#fff3cd; color:#856404;">Der angegebene Zinssatz ist unrealistisch hoch. Bitte prüfen (z.B. 0% bei Kulanz, ansonsten ggf. 5-10%).</div>`;
             return;
        }
        
        
        const monthlyInterestRate = annualInterest / 12;
        let payments = [];
        let totalInterestPaid = 0;
        let currentMonth = new Date(startDate);
        let paymentCount = 0;

        // 2. Berechnung des Ratenplans (Tilgungsplan)
        while (remainingDebt > 0) {
            paymentCount++;
            
            // Zinsen berechnen (basierend auf der Restschuld des Vormonats)
            const interestPayment = remainingDebt * monthlyInterestRate;
            
            // Tatsächliche Tilgung
            let principalPayment;
            let currentPayment = monthlyRate;

            if (remainingDebt + interestPayment <= monthlyRate) {
                // Letzte Rate: zahlt Restschuld + Zinsen
                currentPayment = remainingDebt + interestPayment;
                principalPayment = remainingDebt;
                remainingDebt = 0; // Schuld ist getilgt
            } else {
                // Reguläre Rate
                principalPayment = monthlyRate - interestPayment;
                remainingDebt -= principalPayment;
            }
            
            totalInterestPaid += interestPayment;

            payments.push({
                fälligkeit: new Date(currentMonth),
                rate: currentPayment,
                tilgung: principalPayment,
                zinsen: interestPayment,
                restschuld: remainingDebt
            });

            // Nächster Monat
            currentMonth.setMonth(currentMonth.getMonth() + 1);
            if (paymentCount > 1000) { // Abbruchschutz (bei 1000 Raten / ca. 83 Jahren)
                break;
            }
        }
        
        const finalDate = payments.length > 0 ? payments[payments.length - 1].fälligkeit : startDate;
        const finalDebt = n(inputs.schuld);
        const totalCost = finalDebt + totalInterestPaid;
        
        const years = Math.floor(paymentCount / 12);
        const months = paymentCount % 12;

        // 3. Ergebnisdarstellung
        
        // Tabellen-HTML für die ersten 12 Raten
        const tableRows = payments.slice(0, 12).map((p, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${formatDate(p.fälligkeit)}</td>
                <td>${euro(p.rate)}</td>
                <td>${euro(p.tilgung)}</td>
                <td>${euro(p.zinsen)}</td>
                <td>${euro(p.restschuld)}</td>
            </tr>
        `).join('');

        const resultHtml = `
            <h2>Dein Ratenplan</h2>
            <div id="rp_result_card" class="pflegegrad-result-card">
                
                <h3>Zusammenfassung der Tilgung</h3>
                <table class="pflegegrad-tabelle" style="font-weight:bold;">
                    <tr>
                        <td>Gesamtschuld:</td>
                        <td>${euro(finalDebt)}</td>
                    </tr>
                    <tr>
                        <td>Rate monatlich:</td>
                        <td>${euro(monthlyRate)}</td>
                    </tr>
                    <tr>
                        <td>Tilgungsdauer:</td>
                        <td style="color:#c0392b;">${years} Jahre und ${months} Monate (${paymentCount} Raten)</td>
                    </tr>
                    <tr>
                        <td>Starttermin:</td>
                        <td>${formatDate(startDate)}</td>
                    </tr>
                    <tr>
                        <td>Voraussichtliches Ende:</td>
                        <td style="color:#2980b9;">${formatDate(finalDate)}</td>
                    </tr>
                </table>

                <div class="highlight-box" style="margin-top:20px; border-left: 4px solid #2980b9; background-color:#eaf2f8;">
                    <p><strong>Gesamtkosten:</strong> ${euro(totalCost)}</p>
                    <p>Davon Zinsen: <strong>${euro(totalInterestPaid)}</strong> (bei ${annualInterest * 100} % p.a.)</p>
                </div>
                
                <h3>Detailplan (Die ersten 12 Raten)</h3>
                <table class="pflegegrad-tabelle ratenplan-table" style="font-size:0.9em;">
                    <thead>
                        <tr>
                            <th>Nr.</th>
                            <th>Fälligkeit</th>
                            <th>Rate</th>
                            <th>Tilgung</th>
                            <th>Zinsen</th>
                            <th>Restschuld</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
                ${payments.length > 12 ? `<p class="hinweis" style="text-align:center;">... und ${payments.length - 12} weitere Raten folgen.</p>` : ''}
                
                <div class="warning-box" style="margin-top:20px;">
                    <strong>Wichtig:</strong> Dieser Plan dient als Basis für dein **Angebot** an den Gläubiger. Du solltest immer versuchen, die Zinsen auf 0% zu verhandeln, besonders wenn es sich um ältere Schulden handelt.
                </div>

                <div class="button-container" style="display:flex; gap:10px; margin-top:20px; flex-wrap:wrap;">
                    <button id="rp_pdf_btn" class="button">📄 Ratenplan als PDF</button>
                </div>
            </div>
        `;

        out.innerHTML = resultHtml;
        out.scrollIntoView({ behavior: "smooth" });

       // --- PDF EXPORT (ROBUSTE OVERLAY-METHODE) ---
        setTimeout(() => {
            const pdfBtn = document.getElementById("rp_pdf_btn");
            const elementToPrint = document.getElementById("rp_result_card");

            if(pdfBtn && elementToPrint) {
                pdfBtn.addEventListener("click", () => {
                    const originalText = pdfBtn.innerText;
                    pdfBtn.innerText = "⏳ Wird erstellt...";
                    
                    // 1. Klon erstellen
                    const clone = elementToPrint.cloneNode(true);
                    
                    // 2. Klon bearbeiten (Buttons entfernen)
                    const btnContainer = clone.querySelector('.button-container');
                    if(btnContainer) btnContainer.remove();

                    // 3. Klon STYLING erzwingen (WICHTIG für Sichtbarkeit)
                    // Wir legen den Klon absolut über die gesamte Seite ganz oben links an.
                    Object.assign(clone.style, {
                        position: 'absolute',
                        top: '0px',
                        left: '0px',
                        width: '100%',     // Oder '800px' für feste A4 Breite
                        maxWidth: '800px', // Begrenzen damit es auf A4 passt
                        zIndex: '99999',   // Ganz oben drauf
                        background: '#ffffff', // Weißer Hintergrund ist Pflicht
                        margin: '0',
                        padding: '20px',
                        height: 'auto'
                    });

                    // 4. Klon dem Body hinzufügen (damit er gerendert werden kann)
                    document.body.appendChild(clone);

                    // Optional: Kurz nach oben scrollen, hilft manchmal bei Rendering-Bugs
                    // window.scrollTo(0,0); 

                    const opt = {
                        margin:       [10, 10, 10, 10],
                        filename:     'ratenplan-uebersicht.pdf',
                        image:        { type: 'jpeg', quality: 0.98 },
                        html2canvas:  { 
                            scale: 2, 
                            useCORS: true, 
                            logging: true,
                            scrollY: 0, // WICHTIG: Sagt dem Canvas, dass wir oben sind
                            windowHeight: document.body.scrollHeight // Gesamte Höhe erfassen
                        },
                        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
                    };

                    // 5. PDF generieren und aufräumen
                    html2pdf().from(clone).set(opt).save()
                    .then(() => {
                        document.body.removeChild(clone); // Klon löschen
                        pdfBtn.innerText = originalText;
                    })
                    .catch(err => {
                        console.error("PDF Fehler:", err);
                        if(document.body.contains(clone)) {
                             document.body.removeChild(clone);
                        }
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