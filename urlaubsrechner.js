// urlaubsrechner.js
// Berechnung nach Bundesurlaubsgesetz (BUrlG)

/* --- Hilfsfunktionen --- */
function n(el) { 
    if (!el) return 0; 
    const v = Number((el.value || "").toString().replace(",", ".")); 
    return Number.isFinite(v) ? v : 0; 
}

function formatDate(d) {
    if(!d || isNaN(d.getTime())) return "–";
    const dd = ("0"+d.getDate()).slice(-2);
    const mm = ("0"+(d.getMonth()+1)).slice(-2);
    return `${dd}.${mm}.${d.getFullYear()}`;
}

document.addEventListener("DOMContentLoaded", () => {
    const today = new Date();
    const currentYear = today.getFullYear();
    
    const inpStart = document.getElementById("ur_eintritt");
    const inpEnd = document.getElementById("ur_austritt");

    if (inpStart) inpStart.value = `${currentYear}-01-01`;
    if (inpEnd) inpEnd.value = `${currentYear}-12-31`;

    const inputs = {
        total: document.getElementById("ur_jahresurlaub"),
        daysPerWeek: document.getElementById("ur_wochentage"),
        start: inpStart,
        end: inpEnd,
        taken: document.getElementById("ur_genommen")
    };

    const btn = document.getElementById("ur_berechnen");
    const reset = document.getElementById("ur_reset");
    const out = document.getElementById("ur_ergebnis");

    // --- LOGIK ---
    btn.addEventListener("click", () => {
        out.innerHTML = ""; 

        // 1. Werte holen
        const annualLeave = n(inputs.total);
        const takenDays = n(inputs.taken);
        
        const dStart = new Date(inputs.start.value);
        const dEnd = new Date(inputs.end.value);

        // Validierung
        if (isNaN(dStart.getTime()) || isNaN(dEnd.getTime()) || annualLeave <= 0) {
             out.innerHTML = `<div style="background:#fee2e2; border-left:4px solid #ef4444; color:#991b1b; padding:1rem; border-radius:4px; margin-top:1rem;">Bitte gib den Jahresurlaub und gültige Datumsangaben an.</div>`;
             return;
        }
        if (dEnd < dStart) {
             out.innerHTML = `<div style="background:#fee2e2; border-left:4px solid #ef4444; color:#991b1b; padding:1rem; border-radius:4px; margin-top:1rem;">Das Austrittsdatum liegt vor dem Eintrittsdatum.</div>`;
             return;
        }

        // 2. Volle Monate berechnen (nach BGB § 188)
        let fullMonths = 0;
        let tempDate = new Date(dStart);
        
        for (let m = 1; m <= 12; m++) {
            let checkDate = new Date(dStart.getFullYear(), dStart.getMonth() + m, dStart.getDate() - 1);
            
            // Korrektur für Monatsenden (z.B. Start 31.01. -> +1 Monat sollte 28./29.02. sein)
            if (checkDate.getMonth() !== (dStart.getMonth() + m) % 12) {
                checkDate = new Date(dStart.getFullYear(), dStart.getMonth() + m + 1, 0); 
            }

            if (checkDate <= dEnd) {
                fullMonths = m;
            } else {
                break;
            }
        }

        // 3. Berechnung Anspruch
        const exactClaim = (annualLeave / 12) * fullMonths;
        const fraction = exactClaim % 1;
        let finalClaim = exactClaim;
        
        let roundingInfo = "";
        if (fraction >= 0.5) {
            finalClaim = Math.ceil(exactClaim);
            roundingInfo = "Aufgerundet gemäß § 5 Abs. 2 BUrlG";
        } else if (fraction > 0) {
            finalClaim = Math.floor(exactClaim * 100) / 100;
            roundingInfo = "Keine gesetzliche Rundungspflicht";
        }

        // 4. Sonderfall: 2. Jahreshälfte & Wartezeit (§ 4 & § 5 Abs. 1 c BUrlG)
        let waitPeriodEnd = new Date(dStart.getFullYear(), dStart.getMonth() + 6, dStart.getDate() - 1);
        const passedWait = dEnd >= waitPeriodEnd;
        const exitInSecondHalf = dEnd.getMonth() >= 6; // Juli oder später

        let specialNote = "";
        if (passedWait && exitInSecondHalf && fullMonths < 12) {
             specialNote = `
                <div style="background:#f8fafc; border-left:4px solid #334155; padding:1.5rem; margin-top:2rem; border-radius:0 8px 8px 0;">
                    <strong style="color:#0f172a; display:block; margin-bottom:0.5rem; font-size:1.1rem;">Hinweis zur 2. Jahreshälfte</strong>
                    <p style="margin:0; color:#475569; line-height:1.6;">
                        Da das Austrittsdatum in der zweiten Jahreshälfte liegt und die sechsmonatige Wartezeit erfüllt ist, 
                        steht laut BUrlG oft der volle gesetzliche Mindesturlaub (bei 5-Tage-Woche: 20 Tage) zu. 
                        Ohne "pro rata temporis"-Klausel im Arbeitsvertrag besteht unter Umständen sogar Anspruch auf den vollen vertraglichen Jahresurlaub.
                    </p>
                </div>
             `;
        }

        const remaining = finalClaim - takenDays;

        // HTML Output mit modernem, weißraum-orientiertem Design und blauen Akzenten
        const resultHtml = `
            <style>
                .ur-result-container {
                    font-family: system-ui, -apple-system, sans-serif;
                    background-color: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    padding: 2.5rem;
                    margin-top: 2rem;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
                    max-width: 700px;
                    color: #0f172a;
                }
                .ur-heading {
                    font-size: 1.5rem;
                    font-weight: 600;
                    margin: 0 0 2rem 0;
                    color: #0f172a;
                }
                .ur-section-title {
                    font-size: 0.875rem;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    font-weight: 600;
                    color: #64748b;
                    margin: 0 0 1rem 0;
                }
                .ur-grid-row {
                    display: grid;
                    grid-template-columns: 1fr auto;
                    padding: 1rem 0;
                    border-bottom: 1px solid #f1f5f9;
                }
                .ur-grid-row:last-child {
                    border-bottom: none;
                }
                .ur-label {
                    color: #475569;
                }
                .ur-value {
                    font-weight: 500;
                    color: #0f172a;
                    text-align: right;
                }
                .ur-highlight-box {
                    background-color: #eff6ff;
                    border-left: 4px solid #2563eb;
                    padding: 2rem;
                    border-radius: 0 8px 8px 0;
                    text-align: center;
                    margin: 2rem 0;
                }
                .ur-highlight-value {
                    font-size: 3rem;
                    font-weight: 700;
                    color: #1e3a8a;
                    line-height: 1.2;
                }
                .ur-highlight-sub {
                    font-size: 0.875rem;
                    color: #3b82f6;
                    margin-top: 0.5rem;
                    display: block;
                }
                .ur-final-row {
                    display: grid;
                    grid-template-columns: 1fr auto;
                    padding: 1.25rem 0;
                    border-top: 2px solid #e2e8f0;
                    margin-top: 1rem;
                    font-size: 1.125rem;
                    font-weight: 600;
                }
            </style>

            <div class="ur-result-container">
                <h2 class="ur-heading">Berechnungsergebnis</h2>
                
                <h3 class="ur-section-title">Grunddaten</h3>
                <div class="ur-grid-row">
                    <span class="ur-label">Betrachteter Zeitraum</span>
                    <span class="ur-value">${formatDate(dStart)} – ${formatDate(dEnd)}</span>
                </div>
                <div class="ur-grid-row">
                    <span class="ur-label">Volle Beschäftigungsmonate</span>
                    <span class="ur-value">${fullMonths}</span>
                </div>
                <div class="ur-grid-row">
                    <span class="ur-label">Vertraglicher Jahresurlaub</span>
                    <span class="ur-value">${annualLeave} Tage</span>
                </div>

                <div class="ur-highlight-box">
                    <span class="ur-label" style="display:block; margin-bottom:0.5rem; color:#1e40af; font-weight:500;">Anteiliger Anspruch</span>
                    <div class="ur-highlight-value">${finalClaim.toLocaleString('de-DE')} Tage</div>
                    ${roundingInfo ? `<span class="ur-highlight-sub">${roundingInfo}</span>` : ''}
                </div>

                <h3 class="ur-section-title" style="margin-top: 2.5rem;">Abrechnung</h3>
                <div class="ur-grid-row">
                    <span class="ur-label">Gesamtanspruch (anteilig)</span>
                    <span class="ur-value">${finalClaim.toLocaleString('de-DE')} Tage</span>
                </div>
                <div class="ur-grid-row">
                    <span class="ur-label">Bereits genommen</span>
                    <span class="ur-value" style="color: #ef4444;">- ${takenDays.toLocaleString('de-DE')} Tage</span>
                </div>
                <div class="ur-final-row">
                    <span class="ur-label" style="color: #0f172a;">Verbleibender Resturlaub</span>
                    <span class="ur-value" style="color: #2563eb;">${remaining.toLocaleString('de-DE')} Tage</span>
                </div>

                ${specialNote}
            </div>
        `;

        out.innerHTML = resultHtml;
        out.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    if (reset) {
        reset.addEventListener("click", () => {
            setTimeout(() => { out.innerHTML = ""; }, 50);
        });
    }
});