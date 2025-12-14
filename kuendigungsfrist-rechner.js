// kuendigungsfrist-rechner.js
// Logik basierend auf § 622 BGB (Bürgerliches Gesetzbuch)

document.addEventListener("DOMContentLoaded", () => {
    const inputs = {
        jahre: document.getElementById("kf_jahre"),
        probezeit: document.getElementById("kf_probezeit"),
        vertrag: document.getElementById("kf_vertrag"),
        customDiv: document.getElementById("div_custom_input"),
        customText: document.getElementById("kf_custom_text")
    };

    const btn = document.getElementById("kf_berechnen");
    const reset = document.getElementById("kf_reset");
    const out = document.getElementById("kf_ergebnis");

    // Toggle für manuelles Textfeld
    inputs.vertrag.addEventListener("change", () => {
        if(inputs.vertrag.value === "custom") {
            inputs.customDiv.style.display = "block";
        } else {
            inputs.customDiv.style.display = "none";
        }
    });

    // --- LOGIK ---
    btn.addEventListener("click", () => {
        out.innerHTML = "";

        const years = parseFloat(inputs.jahre.value.replace(',', '.'));
        const isProbe = inputs.probezeit.checked;
        const contractType = inputs.vertrag.value;
        const customVal = inputs.customText.value;

        // Validierung
        if (isNaN(years) && !isProbe) {
             out.innerHTML = `<div class="warning-box" style="background:#fff3cd; color:#856404;">Bitte gib die Dauer der Beschäftigung in Jahren an.</div>`;
             return;
        }

        let fristAN = "";
        let fristAG = "";
        let note = "";

        // 1. Fall: Probezeit
        if (isProbe) {
            const text = "2 Wochen (zu jedem beliebigen Tag)";
            fristAN = text;
            fristAG = text;
            note = "In der Probezeit (§ 622 Abs. 3 BGB) verkürzt sich die Frist auf 2 Wochen. Eine Kündigung ist hier nicht an den 15. oder Monatsende gebunden, sofern nicht anders vereinbart.";
        } 
        // 2. Fall: Manuelle Eingabe im Vertrag
        else if (contractType === "custom" && customVal.trim() !== "") {
            fristAN = customVal;
            fristAG = customVal; // Annahme: gilt meist beidseitig
            note = "Es gilt vorrangig die im Arbeitsvertrag vereinbarte Frist. Achtung: Die Frist für den Arbeitnehmer darf nicht länger sein als für den Arbeitgeber (§ 622 Abs. 6 BGB).";
        }
        // 3. Fall: Gesetzliche Regelung (§ 622 BGB)
        else {
            // Arbeitnehmer (Kündigt selbst)
            // Grundsatz: 4 Wochen zum 15. oder Monatsende.
            // Ausnahme: Vertrag sagt "Es gelten die gesetzlichen Fristen für den AG auch für den AN".
            // Wir zeigen hier den reinen gesetzlichen Standard an.
            fristAN = "4 Wochen zum 15. oder zum Monatsende";

            // Arbeitgeber (Kündigt den Mitarbeiter) - Staffelung nach Jahren
            if (years < 2) {
                fristAG = "4 Wochen zum 15. oder zum Monatsende";
            } else if (years < 5) {
                fristAG = "1 Monat zum Ende eines Kalendermonats";
            } else if (years < 8) {
                fristAG = "2 Monate zum Ende eines Kalendermonats";
            } else if (years < 10) {
                fristAG = "3 Monate zum Ende eines Kalendermonats";
            } else if (years < 12) {
                fristAG = "4 Monate zum Ende eines Kalendermonats";
            } else if (years < 15) {
                fristAG = "5 Monate zum Ende eines Kalendermonats";
            } else if (years < 20) {
                fristAG = "6 Monate zum Ende eines Kalendermonats";
            } else {
                fristAG = "7 Monate zum Ende eines Kalendermonats";
            }

            note = "Die verlängerten Fristen bei langer Betriebszugehörigkeit gelten laut Gesetz (§ 622 Abs. 2 BGB) nur, wenn der Arbeitgeber kündigt. Für dich als Arbeitnehmer bleibt es bei 4 Wochen, außer dein Vertrag besagt: 'Die verlängerten Kündigungsfristen gelten für beide Parteien'. Das ist sehr häufig der Fall!";
        }

        // HTML Output
        const resultHtml = `
            <h2>Dein Ergebnis</h2>
            <div id="kf_result_card" class="pflegegrad-result-card">
                
                <h3>Gesetzliche / Voraussichtliche Fristen</h3>
                <table class="pflegegrad-tabelle">
                    <thead>
                        <tr>
                            <th>Situation</th>
                            <th>Kündigungsfrist</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><strong>Du kündigst (Arbeitnehmer)</strong></td>
                            <td style="color:#2c3e50; font-weight:bold;">${fristAN}</td>
                        </tr>
                        <tr style="background-color:#f8f9fa;">
                            <td><strong>Chef kündigt (Arbeitgeber)</strong></td>
                            <td style="color:#c0392b; font-weight:bold;">${fristAG}</td>
                        </tr>
                    </tbody>
                </table>

                <div class="highlight-box" style="margin-top:20px; border-left: 4px solid #2980b9; background-color:#eaf2f8;">
                    <p><strong>Hinweis:</strong> ${note}</p>
                </div>

                <div class="warning-box">
                   <p><strong>Wichtig:</strong> Prüfe unbedingt deinen Arbeitsvertrag oder Tarifvertrag! Diese gehen der gesetzlichen Regelung vor, sofern sie für dich günstiger sind oder (in Tarifverträgen) auch kürzere Fristen erlauben.</p>
                </div>

                <div class="button-container" style="display:flex; gap:10px; margin-top:20px; flex-wrap:wrap;">
                    <button id="kf_pdf_btn" class="button">📄 Ergebnis als PDF</button>
                </div>
            </div>
        `;

        out.innerHTML = resultHtml;
        out.scrollIntoView({ behavior: "smooth" });

        // --- PDF EXPORT (STABILE KLON-METHODE) ---
        setTimeout(() => {
            const pdfBtn = document.getElementById("kf_pdf_btn");
            const elementToPrint = document.getElementById("kf_result_card");

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
                        filename:     'kuendigungsfrist-berechnung.pdf',
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
            inputs.customDiv.style.display = "none";
            setTimeout(() => { out.innerHTML = ""; }, 50);
        });
    }
});