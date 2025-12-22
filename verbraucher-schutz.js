// verbraucher-schutz.js - Kombi-Rechner für 10, 11 und 13

document.addEventListener("DOMContentLoaded", () => {
    const radios = document.getElementsByName("vs_modus");
    const fields = {
        widerruf: document.getElementById("fs_widerruf"),
        abo: document.getElementById("fs_abo"),
        raten: document.getElementById("fs_raten")
    };
    const out = document.getElementById("vs_ergebnis");

    // Tab-Wechsel
    radios.forEach(r => r.addEventListener("change", () => {
        Object.keys(fields).forEach(key => fields[key].style.display = (r.value === key) ? "block" : "none");
        out.innerHTML = "";
    }));

    document.getElementById("vs_calc").addEventListener("click", () => {
        const mode = document.querySelector('input[name="vs_modus"]:checked').value;
        out.innerHTML = "";

        if (mode === "widerruf") {
            handleWiderruf();
        } else if (mode === "abo") {
            handleAbo();
        } else if (mode === "raten") {
            handleRaten();
        }
        out.scrollIntoView({ behavior: "smooth" });
    });

    // --- 10. WIDERRUF ---
    function handleWiderruf() {
        const art = document.getElementById("wd_art").value;
        const datumVal = document.getElementById("wd_datum").value;
        if (!datumVal) return showWarn("Bitte Datum wählen.");

        const start = new Date(datumVal);
        const heute = new Date();
        heute.setHours(0,0,0,0);

        if (art === "laden") {
            out.innerHTML = `<div class="pflegegrad-result-card" style="border-left:5px solid #e67e22;">
                <h3>Kein gesetzliches Widerrufsrecht</h3>
                <p>Bei Kauf im Laden gibt es kein gesetzliches Rückgaberecht ("Gekauft ist gekauft").</p>
                <p><strong>Tipp:</strong> Viele Händler bieten Kulanz (z.B. 14 Tage Umtausch).</p>
            </div>`;
            return;
        }

        const fristEnde = new Date(start);
        fristEnde.setDate(start.getDate() + 14);
        const nochMoeglich = heute <= fristEnde;

        out.innerHTML = `
            <div class="pflegegrad-result-card" style="border-left:5px solid ${nochMoeglich ? '#27ae60' : '#c0392b'};">
                <h3>Widerruf möglich: ${nochMoeglich ? 'JA ✅' : 'NEIN ❌'}</h3>
                <p>Letzter Tag der Frist: <strong>${fristEnde.toLocaleDateString('de-DE')}</strong></p>
                <hr>
                <h4>Muster-Text:</h4>
                <div style="background:#f9f9f9; padding:10px; font-family:monospace; font-size:0.9rem; border:1px solid #ddd;">
                    Hiermit widerrufe ich meinen Vertrag vom ${start.toLocaleDateString('de-DE')}. <br>
                    Vertragsnummer: [Nummer eintragen]<br>
                    Bitte bestätigen Sie mir den Erhalt des Widerrufs.
                </div>
            </div>`;
    }

    // --- 11. ABO ---
    function handleAbo() {
        const startVal = document.getElementById("abo_start").value;
        const laufzeit = parseInt(document.getElementById("abo_laufzeit").value);
        const art = document.getElementById("abo_art").value;

        if (!startVal) return showWarn("Bitte Vertragsbeginn wählen.");

        const startDate = new Date(startVal);
        const heute = new Date();
        
        // Erstes Laufzeitende
        let endeMindestlaufzeit = new Date(startDate);
        endeMindestlaufzeit.setMonth(startDate.getMonth() + laufzeit);

        let kündigungsText = "";
        if (heute < endeMindestlaufzeit) {
            kündigungsText = `Die Mindestlaufzeit endet am ${endeMindestlaufzeit.toLocaleDateString('de-DE')}.`;
        } else {
            kündigungsText = (art === "monatlich") 
                ? "Die Mindestlaufzeit ist vorbei. Du kannst jetzt jederzeit mit 1-Monats-Frist kündigen!" 
                : "Achtung: Bei Altverträgen verlängert sich das Abo oft um ein Jahr, wenn nicht rechtzeitig gekündigt wurde.";
        }

        out.innerHTML = `
            <div class="pflegegrad-result-card">
                <h3>Kündigungs-Check</h3>
                <p>${kündigungsText}</p>
                <div class="highlight-box">
                    <strong>Hinweis Sonderkündigung:</strong> Bei Preiserhöhungen oder Umzug (wenn Leistung nicht erbracht werden kann) hast du oft ein außerordentliches Kündigungsrecht!
                </div>
            </div>`;
    }

    // --- 13. RATENKAUF ---
    function handleRaten() {
        const rate = parseFloat(document.getElementById("rk_rate").value);
        const monate = parseInt(document.getElementById("rk_monate").value);
        
        if (!rate || !monate) return showWarn("Bitte Rate und Laufzeit ausfüllen.");

        const gesamt = rate * monate;

        out.innerHTML = `
            <div class="pflegegrad-result-card">
                <h3>Kosten-Analyse Ratenkauf</h3>
                <div style="font-size:2rem; font-weight:bold; color:#c0392b; margin:10px 0;">
                    Gesamtkosten: ${gesamt.toLocaleString('de-DE', {minimumFractionDigits: 2})} €
                </div>
                <p>Du zahlst insgesamt <strong>${monate} Raten</strong>.</p>
                
                <div class="warning-box" style="background:#fff3cd; color:#856404; padding:15px; border-radius:8px;">
                    <strong>⚠️ Belastungs-Warnung:</strong><br>
                    Diese Rate reduziert dein frei verfügbares Einkommen für die nächsten ${Math.round(monate/12 * 10)/10} Jahre. 
                    Stelle sicher, dass du auch bei unvorhersehbaren Kosten (Reparaturen etc.) zahlungsfähig bleibst.
                </div>
            </div>`;
    }

    function showWarn(msg) {
        out.innerHTML = `<div class="warning-box" style="color:red;">${msg}</div>`;
    }
});