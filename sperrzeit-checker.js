// sperrzeit-checker.js
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
            inputs.grund.value = "nein";
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

        let riskLevel = "low";
        let sperrzeitWochen = 0;
        let reasons = [];
        let tips = [];
        let headline = "Geringes Risiko";
        let colorClass = "#d4edda";
        let textColor = "#155724";
        let iconSymbol = "✓";

        // 1. Check: Beendigungsgrund
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
                 riskLevel = "med";
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
            reasons.push("Betriebsbedingte/Personenbedingte Kündigung: Normalerweise keine Sperrzeit.");
        }

        // 2. Check: Meldeversäumnis
        if (!meldungOk) {
            sperrzeitWochen += 1;
            reasons.push("Verspätete Arbeitsuchendmeldung (§ 38 SGB III).");
            tips.push("Melde dich JETZT sofort online oder persönlich, um die Sperrzeit (1 Woche) nicht weiter zu verlängern.");
            if (riskLevel === "low") riskLevel = "med";
        }

        // 3. Check: Nichteinhaltung Kündigungsfrist
        let ruhenText = "";
        if (!fristOk) {
            ruhenText = "Da die Kündigungsfrist nicht eingehalten wurde (z.B. durch Aufhebungsvertrag/Abfindung), <strong>ruht der Anspruch</strong> bis zu dem Tag, an dem die Frist regulär geendet hätte. Das ist keine Sperrzeit, aber du bekommst erst später Geld.";
            tips.push("Krankenversicherungsschutz prüfen! Während der Ruhezeit bist du ggf. nicht über das Arbeitsamt versichert.");
            if (riskLevel === "low") riskLevel = "med";
        }

        // Farbe und Text bestimmen
        if (sperrzeitWochen >= 12 || riskLevel === "high") {
            headline = "Hohes Risiko: Sperrzeit droht!";
            colorClass = "#f8d7da";
            textColor = "#721c24";
            iconSymbol = "✕";
        } else if (sperrzeitWochen > 0 || riskLevel === "med") {
            headline = "Mittleres Risiko / Handlung nötig";
            colorClass = "#fff3cd";
            textColor = "#856404";
            iconSymbol = "!";
        }

        // HTML Generierung
        const resultHtml = `
            <h2>Dein Ergebnis</h2>
            <div id="ks_result_card">
                
                <div class="ks-status-badge" style="background:${colorClass}; color:${textColor};">
                    <span class="ks-status-icon">${iconSymbol}</span>
                    <div class="ks-status-title">${headline}</div>
                    <div class="ks-status-detail">
                        ${sperrzeitWochen > 0 ? `Drohende Sperrzeit: ca. ${sperrzeitWochen} Wochen` : 'Voraussichtlich keine Sperrzeit.'}
                    </div>
                </div>

                <h3>Analyse der Situation</h3>
                <ul class="ks-reasons-list">
                    ${reasons.map(r => `<li>${r}</li>`).join('')}
                </ul>

                ${ruhenText ? `<div class="ks-warning-box">${ruhenText}</div>` : ''}

                <h3>Deine To-Dos & Tipps</h3>
                <div class="ks-tips-box">
                    <ul>
                         ${tips.length > 0 ? tips.map(t => `<li>${t}</li>`).join('') : '<li>Alles sieht gut aus. Stelle deinen Antrag fristgerecht.</li>'}
                         <li>Bereite alle Unterlagen (Kündigungsschreiben, Lebenslauf) für das Gespräch vor.</li>
                    </ul>
                </div>

                <p class="ks-disclaimer">Dies ist eine Ersteinschätzung basierend auf SGB III. Die verbindliche Entscheidung trifft die Agentur für Arbeit.</p>
            </div>
        `;

        out.innerHTML = resultHtml;
        out.scrollIntoView({ behavior: "smooth" });
    });

    if (reset) {
        reset.addEventListener("click", () => {
            inputs.divGrund.style.display = "none";
            setTimeout(() => { out.innerHTML = ""; }, 50);
        });
    }
});