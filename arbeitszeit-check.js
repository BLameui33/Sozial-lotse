// arbeitszeit-check.js
// Prüfung auf Einhaltung des Arbeitszeitgesetzes (ArbZG)

/* --- Hilfsfunktionen --- */
function parseNumber(el) { 
    if (!el) return 0; 
    const v = Number((el.value || "").toString().replace(",", ".")); 
    return Number.isFinite(v) ? v : 0; 
}

/* --- Design-Injektion (Sorgt für hochwertiges, mobil-optimiertes Design mit Weißraum und blauen Akzenten) --- */
function injectStyles() {
    if (document.getElementById('az-check-styles')) return;
    const style = document.createElement('style');
    style.id = 'az-check-styles';
    style.textContent = `
        .az-card { font-family: system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03); overflow: hidden; color: #334155; line-height: 1.6; }
        .az-header { padding: 2rem 1.5rem; text-align: center; border-bottom: 1px solid #e2e8f0; }
        .az-header h2 { margin: 0; font-size: 1.5rem; font-weight: 600; color: #0f172a; }
        .az-status { margin: 1.5rem; padding: 1.5rem; border-radius: 8px; border-left: 4px solid #cbd5e1; }
        .az-status.green { background-color: #f0fdf4; border-left-color: #10b981; color: #065f46; }
        .az-status.yellow { background-color: #fffbeb; border-left-color: #f59e0b; color: #92400e; }
        .az-status.red { background-color: #fef2f2; border-left-color: #ef4444; color: #991b1b; }
        .az-status-title { font-size: 1.25rem; font-weight: 600; margin: 0 0 0.5rem 0; }
        .az-section { padding: 1.5rem; border-bottom: 1px solid #f1f5f9; }
        .az-section:last-of-type { border-bottom: none; }
        .az-section h3 { margin: 0 0 1rem 0; font-size: 1.1rem; font-weight: 600; color: #2563eb; }
        .az-list { list-style: none; padding: 0; margin: 0; }
        .az-list li { margin-bottom: 0.75rem; padding-left: 1.25rem; position: relative; }
        .az-list li::before { content: ""; position: absolute; left: 0; top: 0.65rem; width: 6px; height: 6px; border-radius: 50%; background-color: #2563eb; }
        .az-warning { background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 1rem 1.5rem; margin: 1.5rem; border-radius: 8px; color: #92400e; }
        .az-warning p { margin: 0; }
        .az-todo { background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #2563eb; padding: 1.5rem; margin: 1.5rem; border-radius: 8px; }
        .az-todo ul { margin: 0; padding-left: 1.25rem; }
        .az-todo li { margin-bottom: 0.75rem; }
        .az-btn { display: inline-flex; align-items: center; justify-content: center; width: 100%; padding: 0.875rem 1.5rem; background-color: #2563eb; color: #ffffff; font-weight: 500; border: none; border-radius: 8px; cursor: pointer; font-size: 1rem; transition: background-color 0.2s ease; }
        .az-btn:hover { background-color: #1d4ed8; }
        .az-btn:disabled { background-color: #94a3b8; cursor: not-allowed; }
        .az-button-container { padding: 0 1.5rem 1.5rem 1.5rem; }
        @media (max-width: 640px) { .az-card { margin: 0; border-radius: 0; box-shadow: none; } }
    `;
    document.head.appendChild(style);
}

document.addEventListener("DOMContentLoaded", () => {
    injectStyles();

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

    if (!btn || !out) return;

    btn.addEventListener("click", () => {
        out.innerHTML = ""; 

        // 1. Eingaben validieren und parsen
        const dailyHours = parseNumber(inputs.stunden);
        const hasBalance = inputs.ausgleich?.value === "ja";
        const pauseMins = parseNumber(inputs.pause);
        const restHours = parseNumber(inputs.ruhezeit);
        const specialSector = inputs.sonder?.value || "normal";

        if (dailyHours <= 0) {
             out.innerHTML = `<div class="az-warning" style="margin: 1rem;">Bitte gib eine gültige tägliche Arbeitszeit ein, um die Prüfung zu starten.</div>`;
             return;
        }

        let riskLevel = "green";
        const findings = [];
        const warnings = [];
        const todos = [];

        // --- A. Prüfung der Höchstarbeitszeit (§ 3 ArbZG) ---
        if (dailyHours > 10) {
            riskLevel = "red";
            findings.push(`Die erfasste Arbeitszeit von ${dailyHours} Stunden überschreitet die absolute gesetzliche Höchstgrenze von 10 Stunden pro Tag (§ 3 ArbZG).`);
        } else if (dailyHours > 8) {
            if (hasBalance) {
                riskLevel = "yellow";
                findings.push(`Eine Arbeitszeit von ${dailyHours} Stunden ist unter der Voraussetzung zulässig, dass innerhalb von sechs Monaten oder 24 Wochen ein Ausgleich auf durchschnittlich 8 Stunden werktäglich geschaffen wird (§ 3 Abs. 2 ArbZG).`);
                todos.push("Dokumentiere sorgfältig, dass der zeitliche Ausgleich tatsächlich innerhalb der gesetzlichen Frist erfolgt.");
            } else {
                riskLevel = "red";
                findings.push(`Die Arbeitszeit von ${dailyHours} Stunden überschreitet die gesetzliche Regelarbeitszeit von 8 Stunden. Ohne eine nachweisbare Ausgleichsregelung liegt hier ein Verstoß vor.`);
            }
        } else {
            findings.push(`Die tägliche Arbeitszeit von ${dailyHours} Stunden liegt im gesetzlichen Rahmen und entspricht der Regelarbeitszeit.`);
        }

        // --- B. Prüfung der Pausen (§ 4 ArbZG) ---
        let requiredPause = 0;
        let pauseThreshold = "";
        if (dailyHours > 9) {
            requiredPause = 45;
            pauseThreshold = "9";
        } else if (dailyHours > 6) {
            requiredPause = 30;
            pauseThreshold = "6";
        }

        if (requiredPause > 0) {
            if (pauseMins < requiredPause) {
                if (riskLevel === "green") riskLevel = "yellow";
                findings.push(`Die genommene Pause von ${pauseMins} Minuten reicht nicht aus. Bei einer Arbeitszeit von mehr als ${pauseThreshold} Stunden sind gesetzlich mindestens ${requiredPause} Minuten Pause vorgeschrieben (§ 4 ArbZG).`);
                todos.push("Sprich deinen Arbeitgeber darauf an, dass die gesetzlichen Pausenzeiten eingehalten und gewährt werden müssen.");
            } else {
                findings.push(`Die Pause von ${pauseMins} Minuten erfüllt die gesetzlichen Anforderungen für eine Arbeitszeit von über ${pauseThreshold} Stunden.`);
            }
        } else {
            findings.push("Bei einer Arbeitszeit von bis zu 6 Stunden ist keine gesetzliche Pause vorgeschrieben.");
        }

        // --- C. Prüfung der Ruhezeit (§ 5 ArbZG) ---
        const minRestHours = (specialSector === "krankenhaus" || specialSector === "gastgewerbe") ? 10 : 11;
        const sectorText = (specialSector === "krankenhaus" || specialSector === "gastgewerbe") ? " (Branchenausnahme gemäß § 15 Abs. 2 ArbZG)" : "";
        
        if (restHours < minRestHours) {
            riskLevel = "red";
            findings.push(`Die Ruhezeit von ${restHours} Stunden unterschreitet das gesetzliche Minimum von ${minRestHours} ununterbrochenen Stunden${sectorText} (§ 5 ArbZG).`);
            todos.push("Bestehe auf die Einhaltung der gesetzlichen Ruhezeit zwischen den Schichten. Bei wiederholten Verstößen drohen dem Arbeitgeber Bußgelder.");
        } else {
            findings.push(`Die Ruhezeit von ${restHours} Stunden erfüllt die gesetzlichen Vorgaben von mindestens ${minRestHours} Stunden${sectorText}.`);
        }
        
        // --- D. Schicht-/Nachtarbeit Hinweise ---
        if (specialSector === "schicht" || specialSector === "nacht") {
            warnings.push("Hinweis: Bei regelmäßiger Nacht- oder Schichtarbeit ist nach § 6 ArbZG zusätzlich ein angemessener Ausgleich (in Form von bezahlter Freizeit oder Zuschlägen) für die gesundheitliche Belastung zu leisten.");
            if (riskLevel === "green") riskLevel = "yellow";
        }

        // 2. Status-Texte festlegen
        let headline = "Gesetzliche Vorgaben eingehalten";
        if (riskLevel === "red") headline = "Handlungsbedarf: Arbeitszeitgesetz nicht eingehalten";
        else if (riskLevel === "yellow") headline = "Bitte beachten: Ausgleich oder Anpassung erforderlich";

        // 3. HTML Output zusammenbauen
        const resultHtml = `
            <div id="az_result_card" class="az-card">
                <div class="az-header">
                    <h2>Dein Prüfergebnis</h2>
                </div>
                
                <div class="az-status ${riskLevel}">
                    <div class="az-status-title">${headline}</div>
                    <div style="font-size: 0.95rem; opacity: 0.9;">Basierend auf den von dir eingegebenen Daten.</div>
                </div>

                <div class="az-section">
                    <h3>Detaillierte Prüfung</h3>
                    <ul class="az-list">
                        ${findings.map(f => `<li>${f}</li>`).join('')}
                    </ul>
                </div>

                ${warnings.length > 0 ? `
                <div class="az-warning">
                    ${warnings.map(w => `<p>${w}</p>`).join('')}
                </div>` : ''}

                <div class="az-section">
                    <h3>Empfohlene nächste Schritte</h3>
                    <div class="az-todo">
                        <ul>
                            ${todos.length > 0 ? todos.map(t => `<li>${t}</li>`).join('') : '<li>Aktuell sind keine Abweichungen feststellbar. Bitte behalte deine Dokumentation bei.</li>'}
                            <li>Führe ein lückenloses, privates Protokoll über deine Arbeitszeiten, Pausen und Ruhezeiten, um Verstöße im Zweifel belegen zu können.</li>
                            <li>Wende dich bei wiederholten Verstößen vertrauensvoll an den Betriebsrat, die Personalabteilung oder das zuständige Gewerbeaufsichtsamt.</li>
                        </ul>
                    </div>
                </div>

                <div class="az-button-container">
                    
                </div>
            </div>
        `;

        out.innerHTML = resultHtml;
        out.scrollIntoView({ behavior: "smooth", block: "start" });

        // --- PDF EXPORT (Stabile Klon-Methode) ---
        setTimeout(() => {
            const pdfBtn = document.getElementById("az_pdf_btn");
            const elementToPrint = document.getElementById("az_result_card");

            if (pdfBtn && elementToPrint) {
                pdfBtn.addEventListener("click", () => {
                    // Prüfen, ob html2pdf verfügbar ist
                    if (typeof html2pdf === 'undefined') {
                        alert("Die PDF-Bibliothek konnte nicht geladen werden. Bitte lade die Seite neu.");
                        return;
                    }

                    const originalText = pdfBtn.innerText;
                    pdfBtn.innerText = "Wird erstellt...";
                    pdfBtn.disabled = true;
                    
                    // Klonen & Isolieren für sauberen Druck
                    const clonedElement = elementToPrint.cloneNode(true);
                    const btnContainer = clonedElement.querySelector('.az-button-container');
                    if (btnContainer) btnContainer.style.display = 'none';

                    // Styles für den Klon sicherstellen
                    const styleClone = document.getElementById('az-check-styles')?.cloneNode(true);
                    if (styleClone) clonedElement.prepend(styleClone);

                    clonedElement.style.position = 'fixed';
                    clonedElement.style.top = '0';
                    clonedElement.style.left = '-9999px';
                    clonedElement.style.width = '800px'; // Optimale Breite für A4 PDF
                    clonedElement.style.backgroundColor = '#ffffff';
                    document.body.appendChild(clonedElement);

                    const opt = {
                        margin:       [0.5, 0.5, 0.5, 0.5],
                        filename:     `arbeitszeit-check_${new Date().toISOString().slice(0,10)}.pdf`,
                        image:        { type: 'jpeg', quality: 0.98 },
                        html2canvas:  { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' },
                        jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
                    };

                    html2pdf().from(clonedElement).set(opt).save().then(() => {
                        document.body.removeChild(clonedElement);
                        pdfBtn.innerText = originalText;
                        pdfBtn.disabled = false;
                    }).catch(err => {
                        console.error("PDF Export Fehler:", err);
                        document.body.removeChild(clonedElement);
                        pdfBtn.innerText = "Fehler beim Export";
                        setTimeout(() => { 
                            pdfBtn.innerText = originalText; 
                            pdfBtn.disabled = false;
                        }, 3000);
                    });
                });
            }
        }, 300);
    });

    if (reset) {
        reset.addEventListener("click", () => {
            out.innerHTML = "";
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    }
});