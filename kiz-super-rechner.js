// kiz-super-rechner.js
// Logik für Kinderzuschlag (Stand 2026 Annahme: 297 Euro Maxbetrag)

/* --- Konfiguration (Werte 2026) --- */
const KIZ_MAX = 297;
const MIN_INCOME_COUPLE = 900;
const MIN_INCOME_SINGLE = 600;
const REGELSATZ_SINGLE = 563;
const REGELSATZ_PARTNER = 506;
const REGELSATZ_CHILD_AVG = 400;

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

    const modusRadios = document.querySelectorAll('input[name="kiz_modus"]');

    function getModus() {
        const checked = document.querySelector('input[name="kiz_modus"]:checked');
        return checked ? checked.value : "check";
    }

    const groups = {
        basic: document.getElementById("group-basic"),
        warning: document.getElementById("group-warning")
    };

    const inputs = {
        eltern: document.getElementById("kiz_eltern"),
        kinder: document.getElementById("kiz_kinder"),
        brutto: document.getElementById("kiz_brutto"),
        netto: document.getElementById("kiz_netto"),
        miete: document.getElementById("kiz_miete"),
        wNettoOld: document.getElementById("kiz_warn_netto_old"),
        wNettoNew: document.getElementById("kiz_warn_netto_new"),
        wKinder: document.getElementById("kiz_warn_kinder"),
        wMiete: document.getElementById("kiz_warn_miete"),
        wStatus: document.getElementById("kiz_current_status")
    };

    const btn = document.getElementById("kiz_berechnen");
    const out = document.getElementById("kiz_ergebnis");

    function updateModus() {
        const mode = getModus();
        out.innerHTML = "";

        if (mode === "warning") {
            groups.basic.style.display = "none";
            groups.warning.style.display = "block";
        } else {
            groups.basic.style.display = "block";
            groups.warning.style.display = "none";
        }
    }

    modusRadios.forEach(radio => radio.addEventListener("change", updateModus));
    updateModus();

    function calculateParentsNeeds(isSingle, rent) {
        const rentShare = rent * 0.6;
        const livingNeeds = isSingle ? REGELSATZ_SINGLE : (REGELSATZ_PARTNER * 2);
        return livingNeeds + rentShare;
    }

    function calculateKiZValue(netto, parentsNeeds, childCount) {
        const totalKiZMax = childCount * KIZ_MAX;
        const excessIncome = netto - parentsNeeds;

        if (excessIncome <= 0) {
            return { amount: totalKiZMax, reduction: 0, gap: excessIncome };
        } else {
            const reduction = excessIncome * 0.45;
            const finalKiZ = Math.max(0, totalKiZMax - reduction);
            return { amount: finalKiZ, reduction: reduction, gap: excessIncome };
        }
    }

    btn.addEventListener("click", () => {
        const mode = getModus();
        out.innerHTML = "";

        if (mode === "check" || mode === "combo") {
            const brutto = n(inputs.brutto);
            const netto = n(inputs.netto);
            const miete = n(inputs.miete);
            const kinder = parseInt(inputs.kinder.value);
            const isSingle = inputs.eltern.value === "alleinerziehend";

            if (brutto <= 0 || netto <= 0 || miete <= 0) {
                out.innerHTML = `<div style="background:#fff3cd; color:#856404; padding:15px; border-radius:8px; margin-top:20px;">Bitte füllen Sie alle Einkommens- und Mietfelder aus.</div>`;
                return;
            }

            const minLimit = isSingle ? MIN_INCOME_SINGLE : MIN_INCOME_COUPLE;
            if (brutto < minLimit) {
                renderResult("red", "Absage wahrscheinlich (Mindesteinkommen)",
                    `Ihr Brutto-Einkommen liegt unter ${minLimit} €. Damit besteht vorrangig Anspruch auf <strong>Grundsicherung</strong>, nicht auf Kinderzuschlag.`,
                    [], mode);
                return;
            }

            const parentsNeeds = calculateParentsNeeds(isSingle, miete);
            const res = calculateKiZValue(netto, parentsNeeds, kinder);

            let color = "green";
            let headline = "KiZ Anspruch wahrscheinlich";
            let details = [];

            if (res.amount === 0) {
                color = "red";
                headline = "Einkommen zu hoch";
                details.push("Ihr Einkommen deckt den Bedarf der Familie (inkl. Kinder) voraussichtlich komplett ab, sodass der KiZ durch die Verrechnung auf 0 € sinkt.");
            } else if (res.reduction > 0) {
                color = "yellow";
                headline = "Anspruch möglich (Reduziert)";
                details.push(`Da Ihr Einkommen den Bedarf der Eltern übersteigt, wird der KiZ etwas gemindert (45 Cent für jeden Euro darüber).`);
                details.push(`Geschätzter KiZ: <strong>ca. ${euro(res.amount)}</strong> (statt ${euro(kinder * KIZ_MAX)})`);
            } else {
                details.push(`Sie liegen im optimalen Bereich. Voraussichtlich <strong>voller KiZ (${euro(res.amount)})</strong>.`);
                if (res.gap < 0) {
                    details.push("Da Ihr Einkommen unter dem Elternbedarf liegt, ist Wohngeld fast sicher notwendig und möglich.");
                }
            }

            if (mode === "combo" && res.amount > 0) {
                headline = "Kombi-Leistungen möglich";
                details.push("<strong>Der Kombi-Effekt:</strong>");
                details.push("<strong>Kinderzuschlag:</strong> ca. " + euro(res.amount));
                details.push("<strong>Wohngeld:</strong> Sehr wahrscheinlich zusätzlich möglich.");
                details.push("<strong>Kita/OGS:</strong> Gebührenbefreiung möglich.");
                details.push("<strong>Bildungspaket:</strong> Schulbedarf, Mittagessen, Ausflüge inklusive.");
            }

            renderResult(color, headline, "", details, mode);
        }

        else if (mode === "warning") {
            const netOld = n(inputs.wNettoOld);
            const netNew = n(inputs.wNettoNew);
            const miete = n(inputs.wMiete);
            const kinder = n(inputs.wKinder);

            if (netOld <= 0 || netNew <= 0 || miete <= 0) {
                out.innerHTML = `<div style="background:#fff3cd; color:#856404; padding:15px; border-radius:8px; margin-top:20px;">Bitte geben Sie altes und neues Netto sowie die Miete an.</div>`;
                return;
            }

            const parentsNeeds = calculateParentsNeeds(false, miete);

            const kizOld = calculateKiZValue(netOld, parentsNeeds, kinder);
            const kizNew = calculateKiZValue(netNew, parentsNeeds, kinder);

            const diffKiZ = kizNew.amount - kizOld.amount;
            const incomeGain = netNew - netOld;
            const totalBalance = incomeGain + diffKiZ;

            let color = "green";
            let headline = "Lohnt sich";
            let text = "";
            let list = [];

            if (kizNew.amount <= 0 && kizOld.amount > 0) {
                color = "red";
                headline = "Achtung: KiZ fällt weg";
                text = "Durch die Gehaltserhöhung sinkt der KiZ auf 0 €.";
                list.push(`Sie verdienen netto <strong>+${euro(incomeGain)}</strong> mehr.`);
                list.push(`Verlieren aber <strong>${euro(Math.abs(diffKiZ))}</strong> an KiZ.`);

                if (totalBalance < 0) {
                    list.push(`<strong>Netto-Verlust:</strong> Sie haben am Ende ca. <strong>${euro(totalBalance)} weniger</strong> in der Tasche.`);
                    list.push("Zusätzlich entfallen Kita-Befreiung und Bildungspaket.");
                } else {
                    color = "yellow";
                    list.push(`<strong>Fazit:</strong> Sie haben zwar ${euro(totalBalance)} mehr, verlieren aber möglicherweise die Nebenleistungen (Kita-Gebühren). Rechnen Sie das genau durch.`);
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

    function renderResult(color, headline, text, listItems, mode) {
        let bgCol = "#d4edda";
        let textCol = "#155724";
        if (color === "yellow") { bgCol = "#fff3cd"; textCol = "#856404"; }
        if (color === "red") { bgCol = "#f8d7da"; textCol = "#721c24"; }

        const listHtml = listItems.length
            ? `<h3 style="margin-top:20px;">Details zur Berechnung</h3>
               <ul style="list-style-type:disc; padding-left:20px; margin-top:10px;">
                   ${listItems.map(item => `<li style="margin-bottom:8px;">${item}</li>`).join('')}
               </ul>`
            : '';

        const disclaimerHtml = (mode === 'check' || mode === 'combo')
            ? `<div style="margin-top:20px; background:#eaf2f8; border-left:4px solid #2980b9; padding:15px;">
                   <p style="margin:0;"><strong>Wichtig:</strong> Dies ist eine Schätzung. Der tatsächliche Anspruch hängt von detaillierten Faktoren wie Heizkosten, Fahrtkosten zur Arbeit und Vermögen ab.</p>
               </div>`
            : '';

        const resultHtml = `
            <div id="kiz_result_card" style="margin-top:30px; padding:20px; border:1px solid #ddd; border-radius:8px; background:#fff;">
                <h2 style="margin-top:0;">Ihr Ergebnis</h2>
                
                <div style="background:${bgCol}; color:${textCol}; padding:20px; border-radius:8px; text-align:center; margin-bottom:20px; border:1px solid rgba(0,0,0,0.1);">
                    <h3 style="margin:0; font-size:1.4rem;">${headline}</h3>
                    ${text ? `<p style="margin:10px 0 0 0;">${text}</p>` : ''}
                </div>

                ${listHtml}
                ${disclaimerHtml}

                <div style="display:flex; gap:10px; margin-top:20px; flex-wrap:wrap;">
                    <button type="button" id="kiz_pdf_btn" class="button-secondary">Ergebnis als PDF speichern</button>
                    <a href="https://www.arbeitsagentur.de/familie-und-kinder/kiz-lotse" target="_blank" rel="noopener" class="button-secondary">Zum offiziellen Antrag</a>
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

            if (pdfBtn && elementToPrint) {
                pdfBtn.addEventListener("click", () => {
                    const originalText = pdfBtn.innerText;
                    pdfBtn.innerText = "Wird erstellt...";

                    const btnContainer = elementToPrint.querySelector('div[style*="display:flex"]');
                    if (btnContainer) btnContainer.style.display = 'none';

                    const opt = {
                        margin:       [0.5, 0.5],
                        filename:     'kiz-check-ergebnis.pdf',
                        image:        { type: 'jpeg', quality: 0.98 },
                        html2canvas:  { scale: 2, useCORS: true, logging: false },
                        jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
                    };

                    html2pdf().from(elementToPrint).set(opt).save().then(() => {
                        if (btnContainer) btnContainer.style.display = 'flex';
                        pdfBtn.innerText = originalText;
                    });
                });
            }
        }, 500);
    }
});