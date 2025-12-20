// bafoeg-expert-checker.js - Update mit Vermögensprüfung

document.addEventListener("DOMContentLoaded", () => {
    const typSelect = document.getElementById("be_typ");
    const wohnSelect = document.getElementById("be_wohnen");
    const boxSchulweg = document.getElementById("box_schulweg");
    const out = document.getElementById("be_ergebnis");

    const updateUI = () => {
        const isSchule = (typSelect.value === "schule_allg" || typSelect.value === "schule_beruf");
        const isAllein = (wohnSelect.value === "allein");
        boxSchulweg.style.display = (isSchule && isAllein) ? "block" : "none";
    };
    typSelect.addEventListener("change", updateUI);
    wohnSelect.addEventListener("change", updateUI);

    document.getElementById("be_calc").addEventListener("click", () => {
        const typ = typSelect.value;
        const vorausb = document.getElementById("be_vorausbildung").value === "ja";
        const alter = parseInt(document.getElementById("be_alter").value);
        const arbeit = parseInt(document.getElementById("be_arbeit").value);
        const wohnen = wohnSelect.value;
        const fern = document.getElementById("be_fern").checked;
        const hatKV = document.getElementById("be_kv").value === "ja";
        const elternNetto = parseFloat(document.getElementById("be_eltern_netto").value || 0);
        const vermoegen = parseFloat(document.getElementById("be_vermoegen").value || 0);

        // --- 1. PRÜFUNG: ELTERNUNABHÄNGIGKEIT ---
        let istUnabhaengig = false;
        let grundUnabhaengig = "";
        if (alter >= 30) { istUnabhaengig = true; grundUnabhaengig = "Alter über 30 Jahre."; }
        else if (arbeit >= 5) { istUnabhaengig = true; grundUnabhaengig = "5 Jahre Erwerbstätigkeit."; }
        else if (vorausb && arbeit >= 3) { istUnabhaengig = true; grundUnabhaengig = "Ausbildung + 3 Jahre Arbeit."; }
        else if (typ === "kolleg" || typ === "abendgymnasium") { istUnabhaengig = true; grundUnabhaengig = "Kolleg / Abendgymnasium."; }

        // --- 2. PRÜFUNG: SCHÜLER-HÜRDE ---
        let berechtigt = true;
        let ablehnungsgrund = "";
        if (typ === "schule_allg" || typ === "schule_beruf") {
            if (wohnen === "eltern") {
                berechtigt = false;
                ablehnungsgrund = "Schüler bei den Eltern erhalten i.d.R. kein BAföG.";
            } else if (!fern && !vorausb && alter < 30) {
                berechtigt = false;
                ablehnungsgrund = "Eigene Wohnung nur bei weitem Schulweg oder Vor-Ausbildung förderfähig.";
            }
        }

        // --- 3. BEDARFSBERECHNUNG ---
        let grundbedarf = (typ === "schule_allg") ? 262 : 475;
        if (typ === "schule_beruf" && wohnen === "eltern") grundbedarf = 262;
        let wohnkosten = (wohnen === "allein") ? 380 : 59;
        let kvZuschlag = hatKV ? 122 : 0;
        const gesamtbedarf = grundbedarf + wohnkosten + kvZuschlag;

        // --- 4. ANRECHNUNG ELTERN ---
        let anrechnungEltern = 0;
        if (!istUnabhaengig) {
            const freibetrag = 2415;
            anrechnungEltern = Math.max(0, (elternNetto - freibetrag) * 0.5);
        }

        // --- 5. ANRECHNUNG VERMÖGEN (§ 11 Abs. 2) ---
        let anrechnungVermoegen = 0;
        const vermoegensFreibetrag = (alter >= 30) ? 45000 : 15000;
        if (vermoegen > vermoegensFreibetrag) {
            // Der übersteigende Betrag wird durch die BWZ-Dauer (meist 12 Monate) geteilt
            anrechnungVermoegen = (vermoegen - vermoegensFreibetrag) / 12;
        }

        const voraussichtlichesBafoeg = Math.max(0, gesamtbedarf - anrechnungEltern - anrechnungVermoegen);

        // --- OUTPUT ---
        renderExpertResult(berechtigt, ablehnungsgrund, istUnabhaengig, grundUnabhaengig, voraussichtlichesBafoeg, gesamtbedarf, anrechnungEltern, anrechnungVermoegen, vermoegensFreibetrag, typ);
    });

    function renderExpertResult(ok, grund, indep, indepReason, final, max, minusEltern, minusVermoegen, fVermoegen, typ) {
        if (!ok) {
            out.innerHTML = `<div class="pflegegrad-result-card" style="border-left:5px solid #c0392b;"><h3>Kein Anspruch</h3><p>${grund}</p></div>`;
            return;
        }

        out.innerHTML = `
            <div class="pflegegrad-result-card">
                <h3>Voraussichtliches BAföG</h3>
                <div style="font-size:2.5rem; font-weight:bold; color:#27ae60; margin:10px 0;">ca. ${final.toFixed(0)} €</div>
                
                <p>Status: <strong>${indep ? 'Elternunabhängig' : 'Elternabhängig'}</strong></p>
                <ul style="list-style:none; padding:0; font-size:0.95rem; line-height:1.6;">
                    <li><strong>Bedarf:</strong> ${max.toFixed(0)} €</li>
                    ${minusEltern > 0 ? `<li style="color:#e67e22;">- Anrechnung Eltern: ${minusEltern.toFixed(0)} €</li>` : ''}
                    ${minusVermoegen > 0 ? `<li style="color:#e67e22;">- Anrechnung Vermögen: ${minusVermoegen.toFixed(0)} € (Freibetrag ${fVermoegen.toLocaleString()}€ überschritten)</li>` : '<li>✓ Vermögen innerhalb des Freibetrags</li>'}
                </ul>

                <div class="highlight-box" style="margin-top:20px;">
                    <strong>Förderungsart:</strong> ${(typ === 'uni' || typ === 'fachschule') ? '50% Zuschuss / 50% Darlehen' : '100% Zuschuss'}
                </div>
            </div>`;
        out.scrollIntoView({ behavior: "smooth" });
    }
});