// sperrzeit-checker.js
// Logik: Prüfung auf Sperrzeittatbestände (§ 159 SGB III) und Ruhenszeitraum (§ 158 SGB III)

document.addEventListener("DOMContentLoaded", () => {
    const inputs = {
        art: document.getElementById("ks_art"),
        grund: document.getElementById("ks_grund"),
        meldung: document.getElementById("ks_meldung"),
        frist: document.getElementById("ks_frist"),
        divGrund: document.getElementById("div_wichtiger_grund")
    };

    const btn = document.getElementById("ks_berechnen");
    const reset = document.getElementById("ks_reset");
    const out = document.getElementById("ks_ergebnis");

    // Dynamisches Einblenden des "Wichtigen Grundes"
    inputs.art.addEventListener("change", () => {
        const val = inputs.art.value;
        if (val === "eigen" || val === "aufhebung") {
            inputs.divGrund.style.display = "block";
        } else {
            inputs.divGrund.style.display = "none";
            inputs.grund.value = "nein"; // Reset logic
        }
        out.innerHTML = "";
    });

    // --- LOGIK & BERECHNUNG ---
    btn.addEventListener("click", () => {
        out.innerHTML = ""; 

        const art = inputs.art.value;
        const hatGrund = inputs.grund.value === "ja";
        const meldungOk = inputs.meldung.value === "ja";
        const fristOk = inputs.frist.value === "ja";

        let riskLevel = "low"; // low, med, high
        let sperrzeitWochen = 0;
        let reasons = [];
        let tips = [];
        let headline = "Geringes Risiko";
        let colorClass = "#d4edda"; // Grün
        let textColor = "#155724";

        // 1. Check: Beendigungsgrund (Hauptsperrzeit)
        if (art === "eigen") {
            if (hatGrund) {
                riskLevel = "low";
                reasons.push("Eigenkündigung liegt vor, aber ein wichtiger Grund wurde angegeben. (Nachweispflicht!)");
                tips.push("Sammle Beweise für deinen wichtigen Grund (z.B. ärztliches Attest VOR Kündigung, Meldebescheinigung des Ehepartners).");
            } else {
                riskLevel = "high";
                sperrzeitWochen += 12;
                reasons.push("Eigenkündigung ohne wichtigen Grund führt meist zu 12 Wochen Sperrzeit.");
                tips.push("Prüfe genau, ob doch ein wichtiger Grund vorliegt. Sprich sofort mit der Agentur für Arbeit.");
            }
        } else if (art === "aufhebung") {
            if (hatGrund) {
                 riskLevel = "med"; // Aufhebungsvertrag ist immer heikel
                 reasons.push("Aufhebungsvertrag mit wichtigem Grund (z.B. zur Vermeidung einer betriebsbedingten Kündigung).");
                 tips.push("Lass dir vom Arbeitgeber bestätigen, dass sonst eine ordentliche Kündigung erfolgt wäre.");
            } else {
                riskLevel = "high";
                sperrzeitWochen += 12;
                reasons.push("Aufhebungsvertrag ohne wichtigen Grund wird oft als Arbeitsaufgabe gewertet (12 Wochen Sperrzeit).");
            }
        } else if (art === "ag_verhalten") {
            riskLevel = "high";
            sperrzeitWochen += 12;
            reasons.push("Verhaltensbedingte Kündigung (Arbeitslosigkeit selbst herbeigeführt).");
            tips.push("Wenn die Vorwürfe falsch sind: Kündigungsschutzklage prüfen! Das kann die Sperrzeit verhindern.");
        } else {
            // AG Betriebsbedingt
            reasons.push("Betriebsbedingte/Personenbedingte Kündigung: Normalerweise keine Sperrzeit.");
        }

        // 2. Check: Meldeversäumnis
        if (!meldungOk) {
            sperrzeitWochen += 1;
            reasons.push("Verspätete Arbeitsuchendmeldung (§ 38 SGB III).");
            tips.push("Melde dich JETZT sofort online oder persönlich, um die Sperrzeit (1 Woche) nicht weiter zu verlängern.");
            if (riskLevel === "low") riskLevel = "med";
        }

        // 3. Check: Nichteinhaltung Kündigungsfrist (Ruhen des Anspruchs)
        let ruhenText = "";
        if (!fristOk) {
            ruhenText = "Achtung: Da die Kündigungsfrist nicht eingehalten wurde (z.B. durch Aufhebungsvertrag/Abfindung), <strong>ruht der Anspruch</strong> bis zu dem Tag, an dem die Frist regulär geendet hätte. Das ist keine Sperrzeit, aber du bekommst erst später Geld.";
            tips.push("Krankenversicherungsschutz prüfen! Während der Ruhezeit bist du ggf. nicht über das Arbeitsamt versichert.");
            if (riskLevel === "low") riskLevel = "med";
        }

        // Farbe und Text bestimmen
        if (sperrzeitWochen >= 12 || riskLevel === "high") {
            headline = "Hohes Risiko: Sperrzeit droht!";
            colorClass = "#f8d7da"; // Rot
            textColor = "#721c24";
        } else if (sperrzeitWochen > 0 || riskLevel === "med") {
            headline = "Mittleres Risiko / Handlung nötig";
            colorClass = "#fff3cd"; // Gelb/Orange
            textColor = "#856404";
        }

        // HTML Generierung
        const resultHtml = `
            <h2>Dein Ergebnis</h2>
            <div id="ks_result_card" class="pflegegrad-result-card">
                
                <div style="background:${colorClass}; color:${textColor}; padding:15px; border-radius:4px; margin-bottom:20px; text-align:center; border: 1px solid rgba(0,0,0,0.1);">
                    <span style="font-size:1.5rem; display:block; margin-bottom:5px;">${riskLevel === 'high' ? '🔴' : (riskLevel === 'med' ? '🟠' : '🟢')}</span>
                    <strong style="font-size:1.2rem;">${headline}</strong>
                    ${sperrzeitWochen > 0 ? `<br>Drohende Sperrzeit: <strong>ca. ${sperrzeitWochen} Wochen</strong>` : '<br>Voraussichtlich keine Sperrzeit.'}
                </div>

                <h3>Analyse der Situation</h3>
                <ul style="list-style-type: none; padding:0;">
                    ${reasons.map(r => `<li style="margin-bottom:8px; padding-left:20px; position:relative;">👉 ${r}</li>`).join('')}
                </ul>

                ${ruhenText ? `<div class="warning-box" style="margin-top:15px; margin-bottom:15px;">${ruhenText}</div>` : ''}

                <h3>Deine To-Dos & Tipps</h3>
                <div class="highlight-box" style="background-color:#f9f9f9; border-left: 4px solid #2980b9;">
                    <ul style="margin:0; padding-left:20px;">
                         ${tips.length > 0 ? tips.map(t => `<li style="margin-bottom:5px;">${t}</li>`).join('') : '<li>Alles sieht gut aus. Stelle deinen Antrag fristgerecht.</li>'}
                         <li>Bereite alle Unterlagen (Kündigungsschreiben, Lebenslauf) für das Gespräch vor.</li>
                    </ul>
                </div>

                <div class="button-container" style="display:flex; gap:10px; margin-top:20px; flex-wrap:wrap;">
                    <button id="ks_pdf_btn" class="button">📄 Analyse als PDF</button>
                </div>
                <p class="hinweis" style="margin-top:10px;">Dies ist eine Ersteinschätzung basierend auf SGB III. Die Entscheidung trifft die Agentur für Arbeit.</p>
            </div>
        `;

        out.innerHTML = resultHtml;
        out.scrollIntoView({ behavior: "smooth" });

        // --- PDF EXPORT (STABILE KLON-METHODE) ---
        setTimeout(() => {
            const pdfBtn = document.getElementById("ks_pdf_btn");
            const elementToPrint = document.getElementById("ks_result_card");

            if(pdfBtn && elementToPrint) {
                pdfBtn.addEventListener("click", () => {
                    const originalText = pdfBtn.innerText;
                    pdfBtn.innerText = "⏳ Wird erstellt...";
                    
                    const clonedElement = elementToPrint.cloneNode(true);
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
                margin:       [10, 10, 10, 10], // Ränder: Oben, Rechts, Unten, Links
                filename:     "kinderkrankengeld-berechnung.pdf",
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { 
                    scale: 2,           // Bessere Qualität
                    useCORS: true,      // Erlaubt externe Bilder/Fonts
                    logging: true,      // Zeigt Rendering-Prozess in Konsole
                    scrollY: 0,         // WICHTIG: Ignoriert Scroll-Position
                    windowWidth: document.documentElement.offsetWidth // Stellt sicher, dass Layout passt
                },
                jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
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
            inputs.divGrund.style.display = "none";
            setTimeout(() => { out.innerHTML = ""; }, 50);
        });
    }
});