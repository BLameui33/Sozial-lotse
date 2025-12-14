// arbeitszeit-check.js
// Prüfung auf Einhaltung des Arbeitszeitgesetzes (ArbZG)

/* --- Hilfsfunktionen --- */
function n(el) { 
    if (!el) return 0; 
    const v = Number((el.value || "").toString().replace(",", ".")); 
    return Number.isFinite(v) ? v : 0; 
}

document.addEventListener("DOMContentLoaded", () => {
    const inputs = {
        stunden: document.getElementById("az_stunden"),
        ausgleich: document.getElementById("az_ausgleich"),
        pause: document.getElementById("az_pause"),
        ruhezeit: document.getElementById("az_ruhezeit"),
        sonder: document.getElementById("az_sonder")
    };

    const btn = document.getElementById("az_berechnen");
    const reset = document.getElementById("az_reset");
    const out = document.getElementById("az_ergebnis");

    // --- LOGIK ---
    btn.addEventListener("click", () => {
        out.innerHTML = ""; 

        // 1. Eingaben
        const dailyHours = n(inputs.stunden);
        const hasBalance = inputs.ausgleich.value === "ja";
        const pauseMins = n(inputs.pause);
        const restHours = n(inputs.ruhezeit);
        const specialSector = inputs.sonder.value;

        // Grundlegende Validierung
        if (dailyHours <= 0) {
             out.innerHTML = `<div class="warning-box" style="background:#fff3cd; color:#856404;">Bitte gib deine tägliche Arbeitszeit an.</div>`;
             return;
        }

        let headline = "Arbeitszeit konform";
        let riskLevel = "green";
        let findings = [];
        let warnings = [];
        let todos = [];

        // --- A. Prüfung der Höchstarbeitszeit (§ 3 ArbZG) ---
        if (dailyHours > 10) {
            riskLevel = "red";
            findings.push(`🔴 **Unzulässige Arbeitszeit:** Die tägliche Arbeitszeit von ${dailyHours}h überschreitet die absolute Obergrenze von 10 Stunden (§ 3 ArbZG).`);
        } else if (dailyHours > 8) {
            // 8h ist die gesetzliche Regel
            if (hasBalance) {
                // Ausgleich ist vorgesehen (Verlängerung auf max. 10h ist erlaubt)
                riskLevel = "yellow";
                findings.push(`🟡 **Verlängerte Arbeitszeit:** ${dailyHours}h sind erlaubt, müssen aber innerhalb von 6 Monaten/24 Wochen auf 8h/Tag ausgeglichen werden.`);
                todos.push("Überprüfe, ob der Ausgleich tatsächlich stattfindet und dokumentiere die durchschnittliche Arbeitszeit.");
            } else {
                // Keine Ausgleichs-Regelung
                riskLevel = "red";
                findings.push(`🔴 **Arbeitszeitüberschreitung:** ${dailyHours}h überschreiten die gesetzliche Regelarbeitszeit von 8 Stunden. Ohne Ausgleichsregelung ist das ein klarer Verstoß.`);
            }
        } else {
            // <= 8 Stunden
            findings.push(`🟢 **Regelarbeitszeit:** Die tägliche Arbeitszeit von ${dailyHours}h liegt im gesetzlichen Rahmen.`);
        }

        // --- B. Prüfung der Pausen (§ 4 ArbZG) ---
        let requiredPause = 0;
        if (dailyHours > 9) {
            requiredPause = 45; // 45 Minuten bei > 9h
        } else if (dailyHours > 6) {
            requiredPause = 30; // 30 Minuten bei > 6h
        }

        if (requiredPause > 0 && pauseMins < requiredPause) {
            if (riskLevel !== "red") riskLevel = "yellow";
            findings.push(`🟡 **Pausen-Verstoß:** Du hast nur ${pauseMins} min Pause genommen, obwohl ${requiredPause} min erforderlich wären.`);
            todos.push("Achte darauf, dass du die gesetzlichen Pausen nimmst. Der Arbeitgeber muss dies ermöglichen.");
        } else if (requiredPause > 0) {
             findings.push(`🟢 **Pausen konform:** ${pauseMins} min Pause sind ausreichend.`);
        }

        // --- C. Prüfung der Ruhezeit (§ 5 ArbZG) ---
        const minRestHours = (specialSector === "krankenhaus" || specialSector === "gastgewerbe") ? 10 : 11;
        
        if (restHours < minRestHours) {
            riskLevel = "red";
            findings.push(`🔴 **Ruhezeit unterschritten:** Nur ${restHours}h Ruhezeit. Gesetzliches Minimum ist ${minRestHours} Stunden (ununterbrochen).`);
            todos.push("Bestehe auf die Einhaltung der 11 (bzw. 10) Stunden Ruhezeit zwischen den Schichten. Bei Verstoß drohen Bußgelder für den Arbeitgeber.");
        } else {
             findings.push(`🟢 **Ruhezeit konform:** ${restHours}h Ruhezeit sind ausreichend.`);
        }
        
        // --- D. Schicht-/Nachtarbeit Hinweise ---
        if (specialSector === "schicht") {
            warnings.push("Bei regelmäßiger Schicht-/Nachtarbeit ist nach § 6 ArbZG zusätzlich ein Ausgleich (Freizeit oder Geld) für die Belastung zu leisten.");
            if (riskLevel === "green") riskLevel = "yellow";
        }


        // 4. Endgültiges Risiko festlegen
        if (riskLevel === "red") {
            headline = "Hohe Gefahr: Klarer Verstoß gegen ArbZG";
        } else if (riskLevel === "yellow") {
            headline = "Mittleres Risiko: Handlung nötig";
        } else {
            headline = "Gesetzliche Zeiten eingehalten";
        }

        // Styling Variablen
        let bgCol = "#d4edda"; 
        let textCol = "#155724";
        let icon = "🟢";

        if (riskLevel === "yellow") { bgCol = "#fff3cd"; textCol = "#856404"; icon = "🟠"; }
        if (riskLevel === "red") { bgCol = "#f8d7da"; textCol = "#721c24"; icon = "🔴"; }


        // HTML Output
        const resultHtml = `
            <h2>Dein Ergebnis</h2>
            <div id="az_result_card" class="pflegegrad-result-card">
                
                <div style="background:${bgCol}; color:${textCol}; padding:20px; border-radius:8px; text-align:center; margin-bottom:20px; border:1px solid rgba(0,0,0,0.1);">
                    <div style="font-size:3rem; line-height:1; margin-bottom:10px;">${icon}</div>
                    <h3 style="margin:0; font-size:1.4rem;">${headline}</h3>
                </div>

                <h3>Detaillierte Prüfung</h3>
                <ul style="list-style-type: none; padding:0; margin-top:10px;">
                    ${findings.map(f => `<li style="margin-bottom:8px; padding-left:20px; position:relative;">${f}</li>`).join('')}
                </ul>

                ${warnings.length > 0 ? 
                    `<div class="warning-box" style="margin-top:15px; border-left: 4px solid #f39c12;">
                        ${warnings.map(w => `<p style="margin:0;">${w}</p>`).join('')}
                    </div>` : ''}

                <h3>Deine To-Dos</h3>
                <div class="highlight-box" style="background-color:#fff; border:1px solid #ddd; border-left:4px solid #2980b9;">
                    <ul style="margin:0; padding-left:20px;">
                        ${todos.length > 0 ? todos.map(t => `<li style="margin-bottom:8px;">${t}</li>`).join('') : '<li>Alles sieht konform aus. Weiter so!</li>'}
                        <li>Führe ein lückenloses Protokoll über deine Arbeitszeiten, um Verstöße belegen zu können.</li>
                        <li>Bei wiederholten Verstößen: Wende dich an den Betriebsrat oder das zuständige Gewerbeaufsichtsamt.</li>
                    </ul>
                </div>

                <div class="button-container" style="display:flex; gap:10px; margin-top:20px; flex-wrap:wrap;">
                    <button id="az_pdf_btn" class="button">📄 Checkliste als PDF</button>
                </div>
            </div>
        `;

        out.innerHTML = resultHtml;
        out.scrollIntoView({ behavior: "smooth" });

        // --- PDF EXPORT (STABILE KLON-METHODE) ---
        setTimeout(() => {
            const pdfBtn = document.getElementById("az_pdf_btn");
            const elementToPrint = document.getElementById("az_result_card");

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
                        filename:     'arbeitszeit-ruhezeit-check.pdf',
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