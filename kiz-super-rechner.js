// kiz-super-rechner.js
// Logik für Kinderzuschlag (Stand 2026 Annahme: 297€ Maxbetrag)
// Beinhaltet Logik für Basis-Check, Verlust-Warnung und Kombi-Check.

/* --- Konfiguration (Werte 2026) --- */
const KIZ_MAX = 297; // Euro pro Kind
const MIN_INCOME_COUPLE = 900; // Brutto
const MIN_INCOME_SINGLE = 600; // Brutto
// Regelsätze (vereinfacht für Bedarfsschätzung)
const REGELSATZ_SINGLE = 563;
const REGELSATZ_PARTNER = 506;
const REGELSATZ_CHILD_AVG = 400; // Durchschnittswert

/* --- Hilfsfunktionen --- */
function n(el) { 
    if (!el) return 0; 
    const v = Number((el.value || "").toString().replace(",", ".")); 
    return Number.isFinite(v) ? v : 0; 
}
function euro(v) { 
    return v.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €"; 
}

document.addEventListener("DOMContentLoaded", () => {
    // Elemente
    const modusSelect = document.getElementById("kiz_modus_select");
    const groups = {
        basic: document.getElementById("group_basic"),
        warning: document.getElementById("group_warning")
    };
    const inputs = {
        // Basic / Combo Inputs
        eltern: document.getElementById("kiz_eltern"),
        kinder: document.getElementById("kiz_kinder"),
        brutto: document.getElementById("kiz_brutto"),
        netto: document.getElementById("kiz_netto"),
        miete: document.getElementById("kiz_miete"),
        // Warning Inputs
        wNettoOld: document.getElementById("kiz_warn_netto_old"),
        wNettoNew: document.getElementById("kiz_warn_netto_new"),
        wKinder: document.getElementById("kiz_warn_kinder"),
        wMiete: document.getElementById("kiz_warn_miete"),
        wStatus: document.getElementById("kiz_current_status")
    };

    const btn = document.getElementById("kiz_berechnen");
    const out = document.getElementById("kiz_ergebnis");
    const legend = document.getElementById("kiz_legend");

    // --- Tab Switching Logic (nun Dropdown) ---
    function updateModus() {
        let mode = modusSelect.value;
        out.innerHTML = ""; // Reset Output

        if (mode === "warning") {
            groups.basic.style.display = "none";
            groups.warning.style.display = "block";
            legend.innerText = "Einkommensvergleich";
        } else {
            groups.basic.style.display = "block";
            groups.warning.style.display = "none";
            legend.innerText = (mode === "combo") ? "Daten für Kombi-Check" : "Daten für 1-Minuten-Check";
        }
    }

    // Initiale Dropdown Einstellung
    modusSelect.addEventListener("change", updateModus);
    updateModus();


    // --- BERECHNUNGSLOGIK ---

    // Funktion: Schätzt den Elternbedarf (Regelsatz + Mietanteil Eltern)
    function calculateParentsNeeds(isSingle, rent) {
        // Annahme: Mietanteil Eltern.
        // Bei 1 Kind: Eltern ~ 66% der Miete
        // Bei 2 Kindern: Eltern ~ 55% der Miete
        // Vereinfacht: Eltern tragen ca. 60% der Wohnkosten in dieser Schätzung.
        const rentShare = rent * 0.6; 
        const livingNeeds = isSingle ? REGELSATZ_SINGLE : (REGELSATZ_PARTNER * 2);
        return livingNeeds + rentShare;
    }

    // Funktion: KiZ Berechnung Kern
    function calculateKiZValue(netto, parentsNeeds, childCount) {
        const totalKiZMax = childCount * KIZ_MAX;
        
        // Haben Eltern genug für sich selbst?
        const excessIncome = netto - parentsNeeds;

        if (excessIncome <= 0) {
            // Eltern haben weniger als ihren Bedarf -> Voller KiZ Anspruch (potenziell)
            // Lücke wird durch Wohngeld geschlossen.
            return { amount: totalKiZMax, reduction: 0, gap: excessIncome };
        } else {
            // Eltern haben mehr als Bedarf -> Anrechnung zu 45%
            const reduction = excessIncome * 0.45;
            const finalKiZ = Math.max(0, totalKiZMax - reduction);
            return { amount: finalKiZ, reduction: reduction, gap: excessIncome };
        }
    }


    btn.addEventListener("click", () => {
        let mode = modusSelect.value;
        out.innerHTML = "";

        // --- MODUS: CHECK & COMBO ---
        if (mode === "check" || mode === "combo") {
            const brutto = n(inputs.brutto);
            const netto = n(inputs.netto);
            const miete = n(inputs.miete);
            const kinder = parseInt(inputs.kinder.value);
            const isSingle = inputs.eltern.value === "alleinerziehend";

            // Validierung
            if (brutto <= 0 || netto <= 0 || miete <= 0) {
                out.innerHTML = `<div class="warning-box" style="background:#fff3cd; color:#856404;">Bitte füllen Sie alle Einkommens- und Mietfelder aus.</div>`;
                return;
            }

            // 1. Mindesteinkommen Check
            const minLimit = isSingle ? MIN_INCOME_SINGLE : MIN_INCOME_COUPLE;
            if (brutto < minLimit) {
                 renderResult("red", "Absage wahrscheinlich (Mindesteinkommen)", 
                    `Ihr Brutto-Einkommen liegt unter ${minLimit} €. Damit besteht vorrangig Anspruch auf <strong>Grundsicherungsgeld</strong>, nicht auf Kinderzuschlag.`, [], mode);
                 return;
            }

            // 2. Berechnung
            const parentsNeeds = calculateParentsNeeds(isSingle, miete);
            const res = calculateKiZValue(netto, parentsNeeds, kinder);

            // 3. Ergebnis Interpretation
            let color = "green";
            let headline = "KiZ Anspruch wahrscheinlich";
            let details = [];

            if (res.amount === 0) {
                color = "red";
                headline = "Einkommen zu hoch";
                details.push("Ihr Einkommen deckt den Bedarf der Familie (inkl. Kinder) voraussichtlich komplett ab, sodass der KiZ durch die Verrechnung auf 0 € sinkt.");
            } else if (res.reduction > 0) {
                color = "yellow"; // Teilweiser Anspruch
                headline = "Anspruch möglich (Reduziert)";
                details.push(`Da Ihr Einkommen den Bedarf der Eltern übersteigt, wird der KiZ etwas gemindert (45 Cent für jeden Euro darüber).`);
                details.push(`Geschätzter KiZ: <strong>ca. ${euro(res.amount)}</strong> (statt ${euro(kinder * KIZ_MAX)})`);
            } else {
                // Voller Anspruch
                details.push(`Sie liegen im optimalen Bereich. Voraussichtlich <strong>voller KiZ (${euro(res.amount)})</strong>.`);
                if (res.gap < 0) {
                    details.push("Da Ihr Einkommen unter dem Elternbedarf liegt, ist Wohngeld fast sicher notwendig und möglich!");
                }
            }

            // Modus Combo Zusatzinfos
            if (mode === "combo" && res.amount > 0) {
                headline = "Kombi-Leistungen möglich!";
                details.push("<br><strong>Der Kombi-Effekt:</strong>");
                details.push("<strong>Kinderzuschlag:</strong> ca. " + euro(res.amount));
                details.push("<strong>Wohngeld:</strong> Sehr wahrscheinlich zusätzlich möglich.");
                details.push("<strong>Kita/OGS:</strong> Gebührenbefreiung möglich.");
                details.push("<strong>Bildungspaket:</strong> Schulbedarf, Mittagessen, Ausflüge inklusive.");
            }

            renderResult(color, headline, "", details, mode);
        }

        // --- MODUS: WARNING (GEHALTSERHÖHUNG) ---
        else if (mode === "warning") {
            const netOld = n(inputs.wNettoOld);
            const netNew = n(inputs.wNettoNew);
            const miete = n(inputs.wMiete);
            const kinder = n(inputs.wKinder);
            
            if (netOld <= 0 || netNew <= 0 || miete <= 0) {
                out.innerHTML = `<div class="warning-box" style="background:#fff3cd; color:#856404;">Bitte geben Sie altes und neues Netto sowie die Miete an.</div>`;
                return;
            }

            const parentsNeeds = calculateParentsNeeds(false, miete); // Gehe konservativ von Paar aus oder füge Switch hinzu
            
            const kizOld = calculateKiZValue(netOld, parentsNeeds, kinder);
            const kizNew = calculateKiZValue(netNew, parentsNeeds, kinder);

            const diffKiZ = kizNew.amount - kizOld.amount; // Wird negativ sein bei Verlust
            const incomeGain = netNew - netOld;
            const totalBalance = incomeGain + diffKiZ;

            let color = "green";
            let headline = "Lohnt sich!";
            let text = "";
            let list = [];

            if (kizNew.amount <= 0 && kizOld.amount > 0) {
                color = "red";
                headline = "Achtung: KiZ fällt weg!";
                text = "Durch die Gehaltserhöhung sinkt der KiZ auf 0 €.";
                list.push(`Sie verdienen netto <strong>+${euro(incomeGain)}</strong> mehr.`);
                list.push(`Verlieren aber <strong>${euro(Math.abs(diffKiZ))}</strong> an KiZ.`);
                
                if (totalBalance < 0) {
                    list.push(`<strong>Netto-Verlust:</strong> Sie haben am Ende ca. <strong>${euro(totalBalance)} weniger</strong> in der Tasche!`);
                    list.push("Zusätzlich entfallen Kita-Befreiung und Bildungspaket!");
                } else {
                    color = "yellow";
                    list.push(`<strong>Fazit:</strong> Sie haben zwar ${euro(totalBalance)} mehr, aber verlieren möglicherweise die Nebenleistungen (Kita-Gebühren). Rechnen Sie das genau durch.`);
                }
            } else if (diffKiZ < 0) {
                color = "yellow";
                headline = "KiZ sinkt, aber Lohn lohnt sich";
                text = "Der KiZ wird reduziert, aber nicht komplett gestrichen.";
                list.push(`Lohn-Plus: +${euro(incomeGain)}`);
                list.push(`KiZ-Minus: ${euro(diffKiZ)} (wegen 45% Anrechnung)`);
                list.push(`<strong>Gesamt-Plus: +${euro(totalBalance)}</strong>`);
                list.push("Kita-Befreiung & Wohngeld bleiben oft erhalten, solange noch 1€ KiZ gezahlt wird.");
            } else {
                text = "Die Gehaltserhöhung hat keine negativen Auswirkungen auf den KiZ (z.B. weil Sie vorher weit unter der Grenze waren).";
            }

            renderResult(color, headline, text, list, mode);
        }
    });

    // --- RENDER FUNKTION ---
    function renderResult(color, headline, text, listItems, mode) {
        let bgCol = "#d4edda"; let textCol = "#155724";
        if (color === "yellow") { bgCol = "#fff3cd"; textCol = "#856404"; }
        if (color === "red") { bgCol = "#f8d7da"; textCol = "#721c24"; }

        const resultHtml = `
            <div id="kiz_result_card" class="pflegegrad-result-card" style="margin-top: 30px;">
                <h2>Ihr Ergebnis</h2>
                
                <div style="background:${bgCol}; color:${textCol}; padding:20px; border-radius:8px; text-align:center; margin-bottom:20px; border:1px solid rgba(0,0,0,0.1);">
                    <h3 style="margin:0; font-size:1.4rem;">${headline}</h3>
                    ${text ? `<p style="margin:10px 0 0 0;">${text}</p>` : ''}
                </div>

                <h3>Details zur Berechnung</h3>
                <ul style="list-style-type: disc; padding-left: 20px; margin-top:10px;">
                    ${listItems.map(item => `<li style="margin-bottom:8px;">${item}</li>`).join('')}
                </ul>

                ${mode === 'check' || mode === 'combo' ? `
                <div class="highlight-box" style="margin-top:20px; background-color:#eaf2f8; border-left:4px solid #2980b9;">
                    <p><strong>Wichtig:</strong> Dies ist eine Schätzung. Der tatsächliche Anspruch hängt von detaillierten Faktoren wie Heizkosten, Fahrtkosten zur Arbeit und Vermögen ab.</p>
                </div>
                ` : ''}

                <div class="button-container" style="display:flex; gap:10px; margin-top:20px; flex-wrap:wrap;">
                    
                    <a href="https://www.arbeitsagentur.de/familie-und-kinder/kiz-lotse" target="_blank" class="button button-secondary">Zum offiziellen Antrag</a>
                </div>
            </div>
        `;

        out.innerHTML = resultHtml;
        out.scrollIntoView({ behavior: "smooth" });
        setupPdfGenerator();
    }

    function setupPdfGenerator() {
         setTimeout(() => {
            const pdfBtn = document.getElementById("kiz_pdf_btn");
            const elementToPrint = document.getElementById("kiz_result_card");
            
            if(pdfBtn && elementToPrint) {
                pdfBtn.addEventListener("click", () => {
                    const originalText = pdfBtn.innerText;
                    pdfBtn.innerText = "Wird erstellt...";
                    
                    const btnContainer = elementToPrint.querySelector('.button-container');
                    if(btnContainer) btnContainer.style.display = 'none';
                    
                    const opt = {
                        margin:       [0.5, 0.5],
                        filename:     'kiz-check-ergebnis.pdf',
                        image:        { type: 'jpeg', quality: 0.98 },
                        html2canvas:  { scale: 2, useCORS: true, logging: false },
                        jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
                    };
                    
                    html2pdf().from(elementToPrint).set(opt).save().then(() => {
                        if(btnContainer) btnContainer.style.display = 'flex';
                        pdfBtn.innerText = originalText;
                    });
                });
            }
        }, 500);
    }
});