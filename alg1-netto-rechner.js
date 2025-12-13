// alg1-netto-rechner.js
// Berechnung des Arbeitslosengeldes nach pauschaliertem Nettoentgelt
// Stand 2025 (BBG West ca. 7550€)

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

document.addEventListener("DOMContentLoaded", () => {
    const inputs = {
        brutto: document.getElementById("an_brutto"),
        stk: document.getElementById("an_stk"),
        kinder: document.getElementById("an_kinder")
    };

    const btn = document.getElementById("an_berechnen");
    const reset = document.getElementById("an_reset");
    const out = document.getElementById("an_ergebnis");

    // --- BERECHNUNG ---
    btn.addEventListener("click", () => {
        out.innerHTML = ""; 

        // 1. Eingabe
        const grossInput = n(inputs.brutto);
        const taxClass = inputs.stk.value;
        const hasKids = inputs.kinder.value === "ja";

        if (grossInput <= 0) {
            out.innerHTML = `<div class="warning-box" style="background:#fff3cd; color:#856404;">Bitte gib ein gültiges Brutto-Gehalt ein.</div>`;
            return;
        }

        // 2. Beitragsbemessungsgrenze (BBG) prüfen
        // Stand 2025 (West, Prognose): ca. 7.550 Euro/Monat
        const BBG = 7550;
        let usedGross = grossInput;
        let isCapped = false;

        if (usedGross > BBG) {
            usedGross = BBG;
            isCapped = true;
        }

        // 3. Faktor-Logik (Brutto -> ALG Netto)
        // Wir simulieren die Abzüge (Lohnsteuer + 20% Sozialpauschale), um auf das "Leistungsentgelt" zu kommen.
        // Das ALG ist dann 60% (ohne Kind) oder 67% (mit Kind) davon.
        
        // Diese Faktoren sind statistische Mittelwerte für 2024/2025
        // Faktor = (Netto-Alg-Auszahlung / Brutto-Lohn)
        
        let factor = 0.0;

        switch (taxClass) {
            case "sk1": // Single
            case "sk4": // Verheiratet Standard
                // Netto ca 62% vom Brutto -> davon 60% = 37.2%
                factor = hasKids ? 0.415 : 0.372;
                break;
            case "sk3": // Steuerbegünstigt (Viel Netto vom Brutto)
                // Netto ca 72% vom Brutto -> davon 60% = 43.2%
                factor = hasKids ? 0.485 : 0.435;
                break;
            case "sk5": // Steuerbelastet (Wenig Netto vom Brutto)
                // Netto ca 50% vom Brutto -> davon 60% = 30%
                factor = hasKids ? 0.335 : 0.300;
                break;
            case "sk6": // Sehr hohe Abzüge
                factor = hasKids ? 0.310 : 0.280;
                break;
            default:
                factor = 0.37;
        }

        // Berechnung
        const resultAlg = usedGross * factor;

        // Gap Berechnung (Lücke zum alten Netto)
        // Schätzung des alten Nettos für den Vergleich (ca. Werte)
        let estimatedNettoQuote = 0.63; // Standard
        if(taxClass === "sk3") estimatedNettoQuote = 0.73;
        if(taxClass === "sk5") estimatedNettoQuote = 0.50;
        if(taxClass === "sk6") estimatedNettoQuote = 0.48;
        
        const estimatedOldNetto = grossInput * estimatedNettoQuote; 
        const gap = estimatedOldNetto - resultAlg;


        // 4. HTML Output
        const resultHtml = `
            <h2>Dein Ergebnis</h2>
            <div id="an_result_card" class="pflegegrad-result-card">
                
                <div style="display:flex; justify-content:space-between; align-items:flex-end; border-bottom:1px solid #ddd; padding-bottom:10px; margin-bottom:15px;">
                    <div>
                        <span style="font-size:0.9em; color:#666;">Dein Brutto</span><br>
                        <span style="font-size:1.1em;">${euro(grossInput)}</span>
                        ${isCapped ? '<br><span style="font-size:0.75em; color:#d9534f;">(Gedeckelt auf BBG)</span>' : ''}
                    </div>
                    <div style="text-align:right;">
                        <span style="font-size:0.9em; color:#666;">ALG-Faktor</span><br>
                        <span style="font-weight:bold;">${hasKids ? '67%' : '60%'}</span>
                    </div>
                </div>

                <div style="background-color:#f0f8ff; padding:20px; border-radius:8px; text-align:center; margin-bottom:20px;">
                    <span style="font-size:1rem; color:#2c3e50;">Geschätztes Arbeitslosengeld (mtl.)</span><br>
                    <span style="font-size:2.5rem; font-weight:bold; color:#2c3e50; line-height:1.2;">${euro(resultAlg)}</span>
                </div>

                <h3>Vergleich: Vorher / Nachher</h3>
                <table class="pflegegrad-tabelle">
                    <tr>
                        <td>Dein geschätztes Netto (Job)</td>
                        <td style="color:#666;">~ ${euro(estimatedOldNetto)}</td>
                    </tr>
                    <tr>
                        <td>Dein Arbeitslosengeld</td>
                        <td style="font-weight:bold;">${euro(resultAlg)}</td>
                    </tr>
                    <tr style="background-color:#fff5f5; color:#c0392b;">
                        <td><strong>Monatliche Lücke (Gap)</strong></td>
                        <td><strong>- ${euro(gap)}</strong></td>
                    </tr>
                </table>

                <div class="warning-box">
                   <p><strong>Hinweis:</strong> Sozialversicherungsbeiträge (Kranken-, Pflege-, Rentenversicherung) übernimmt beim Bezug von ALG I das Arbeitsamt. Du musst diese <strong>nicht</strong> von dem hier angezeigten Betrag zahlen.</p>
                </div>

                <div class="button-container" style="display:flex; gap:10px; margin-top:20px; flex-wrap:wrap;">
                    <button id="an_pdf_btn" class="button">📄 Ergebnis als PDF</button>
                </div>
                 <p class="hinweis" style="margin-top:10px;">Berechnung ist eine Näherung. Der exakte Bescheid der Agentur für Arbeit ist maßgeblich.</p>
            </div>
        `;

        out.innerHTML = resultHtml;
        out.scrollIntoView({ behavior: "smooth" });

        // --- PDF EXPORT (STABILE KLON-METHODE) ---
        setTimeout(() => {
            const pdfBtn = document.getElementById("an_pdf_btn");
            const elementToPrint = document.getElementById("an_result_card");

            if(pdfBtn && elementToPrint) {
                pdfBtn.addEventListener("click", () => {
                    const originalText = pdfBtn.innerText;
                    pdfBtn.innerText = "⏳ Wird erstellt...";
                    
                    // Klonen
                    const clonedElement = elementToPrint.cloneNode(true);
                    
                    // Button entfernen
                    const btnContainer = clonedElement.querySelector('.button-container');
                    if(btnContainer) btnContainer.style.display = 'none';

                    // Klon isolieren
                    clonedElement.style.position = 'fixed';
                    clonedElement.style.top = '0';
                    clonedElement.style.left = '-9999px';
                    clonedElement.style.width = '800px'; 
                    clonedElement.style.backgroundColor = '#ffffff';
                    document.body.appendChild(clonedElement);

                    const opt = {
                        margin:       [0.5, 0.5],
                        filename:     'alg1-berechnung.pdf',
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