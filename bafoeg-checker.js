// bafoeg-expert-checker.js - Update mit aktuellen 2026 Werten

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
        const alter = parseInt(document.getElementById("be_alter").value) || 0;
        const arbeit = parseInt(document.getElementById("be_arbeit").value) || 0;
        const wohnen = wohnSelect.value;
        const fern = document.getElementById("be_fern").checked;
        const hatKV = document.getElementById("be_kv").value === "ja";
        
        const eigenesEinkommen = parseFloat(document.getElementById("be_einkommen").value) || 0;
        const kinderBetreuung = parseInt(document.getElementById("be_kinder_betreuung").value) || 0;
        const vermoegen = parseFloat(document.getElementById("be_vermoegen").value) || 0;
        const vermoegenZuschlagAnzahl = parseInt(document.getElementById("be_vermoegen_zuschlag").value) || 0;
        
        const elternStatus = document.getElementById("be_eltern_status").value;
        const geschwisterAnzahl = parseInt(document.getElementById("be_geschwister").value) || 0;
        const elternNetto = parseFloat(document.getElementById("be_eltern_netto").value) || 0;

        // --- 1. PRÜFUNG: ELTERNUNABHÄNGIGKEIT ---
        let istUnabhaengig = false;
        let grundUnabhaengig = "";
        if (alter >= 30) { 
            istUnabhaengig = true; 
            grundUnabhaengig = "Alter über 30 Jahre."; 
        } else if (arbeit >= 5) { 
            istUnabhaengig = true; 
            grundUnabhaengig = "5 Jahre Erwerbstätigkeit."; 
        } else if (vorausb && arbeit >= 3) { 
            istUnabhaengig = true; 
            grundUnabhaengig = "Abgeschlossene Ausbildung + 3 Jahre Arbeit."; 
        } else if (typ === "kolleg" || typ === "abendgymnasium") { 
            istUnabhaengig = true; 
            grundUnabhaengig = "Kolleg / Abendgymnasium."; 
        }

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

        // --- 3. BEDARFSBERECHNUNG (Aktuelle Werte 2026) ---
        // Höchstsatz (allein, selbst versichert <30) = 475 (Grund) + 380 (Wohnen) + 137 (KV) = 992 €
        let basisbedarf = (wohnen === "eltern") ? 671 : 475;
        let wohnkosten = (wohnen === "allein") ? 380 : 0;
        
        // KV/PV Zuschlag altersabhängig
        let kvZuschlag = 0;
        if (hatKV) {
            kvZuschlag = (alter < 30) ? 137 : 233;
        }
        
        // Kinderbetreuungszuschlag
        let kinderZuschlag = kinderBetreuung * 160;

        const gesamtbedarf = basisbedarf + wohnkosten + kvZuschlag + kinderZuschlag;

        // --- 4. ANRECHNUNG EIGENES EINKOMMEN ---
        let anrechnungEinkommen = 0;
        const einkommensFreibetrag = 603; // Seit 01.01.2026
        if (eigenesEinkommen > einkommensFreibetrag) {
            anrechnungEinkommen = eigenesEinkommen - einkommensFreibetrag;
        }

        // --- 5. ANRECHNUNG ELTERN ---
        let anrechnungEltern = 0;
        if (!istUnabhaengig) {
            let freibetragEltern = (elternStatus === "zusammen") ? 2540 : 1690;
            freibetragEltern += (geschwisterAnzahl * 770); // 770 € je Kind/Geschwister
            
            const anrechenbaresElternEinkommen = Math.max(0, elternNetto - freibetragEltern);
            anrechnungEltern = anrechenbaresElternEinkommen * 0.5; // Standard BAföG Anrechnungssatz
        }

        // --- 6. ANRECHNUNG VERMÖGEN (§ 11 Abs. 2) ---
        let anrechnungVermoegen = 0;
        let vermoegensFreibetrag = (alter >= 30) ? 45000 : 15000;
        vermoegensFreibetrag += (vermoegenZuschlagAnzahl * 2300); // Aufschlag für Ehepartner/Kinder
        
        if (vermoegen > vermoegensFreibetrag) {
            // Der übersteigende Betrag wird durch die Bewilligungsdauer (meist 12 Monate) geteilt
            anrechnungVermoegen = (vermoegen - vermoegensFreibetrag) / 12;
        }

        // --- 7. ENDGEREBNIS ---
        const voraussichtlichesBafoeg = Math.max(0, gesamtbedarf - anrechnungEltern - anrechnungVermoegen - anrechnungEinkommen);

        // --- OUTPUT ---
        renderExpertResult(
            berechtigt, 
            ablehnungsgrund, 
            istUnabhaengig, 
            grundUnabhaengig, 
            voraussichtlichesBafoeg, 
            gesamtbedarf, 
            anrechnungEltern, 
            anrechnungVermoegen, 
            anrechnungEinkommen,
            vermoegensFreibetrag, 
            typ
        );
    });

    function renderExpertResult(ok, grund, indep, indepReason, final, max, minusEltern, minusVermoegen, minusEinkommen, fVermoegen, typ) {
        if (!ok) {
            out.innerHTML = `<div class="pflegegrad-result-card" style="border-left:5px solid #c0392b;"><h3>Kein Anspruch</h3><p>${grund}</p></div>`;
            return;
        }

        let einkommenHtml = '';
        if (minusEinkommen > 0) {
            einkommenHtml = `<li style="color:#e67e22;">- Anrechnung eigenes Einkommen: ${minusEinkommen.toFixed(0)} €</li>`;
        }

        out.innerHTML = `
            <div class="pflegegrad-result-card">
                <h3>Voraussichtliches BAföG</h3>
                <div style="font-size:2.5rem; font-weight:bold; color:#27ae60; margin:10px 0;">ca. ${final.toFixed(0)} € / Monat</div>
                
                <p>Status: <strong>${indep ? 'Elternunabhängig' : 'Elternabhängig'}</strong> ${indep ? '(' + indepReason + ')' : ''}</p>
                <ul style="list-style:none; padding:0; font-size:0.95rem; line-height:1.6;">
                    <li><strong>Gesamtbedarf:</strong> ${max.toFixed(0)} €</li>
                    ${minusEltern > 0 ? `<li style="color:#e67e22;">- Anrechnung Eltern: ${minusEltern.toFixed(0)} €</li>` : ''}
                    ${minusEinkommen > 0 ? einkommenHtml : ''}
                    ${minusVermoegen > 0 ? `<li style="color:#e67e22;">- Anrechnung Vermögen: ${minusVermoegen.toFixed(0)} € (Freibetrag ${fVermoegen.toLocaleString()} € überschritten)</li>` : '<li style="color:#27ae60;">✓ Vermögen innerhalb des Freibetrags</li>'}
                </ul>

                <div class="highlight-box" style="margin-top:20px;">
                    <strong>Förderungsart:</strong> ${(typ === 'uni' || typ === 'fachschule') ? '50% Zuschuss / 50% rückzahlungspflichtiges Darlehen' : '100% Zuschuss (nicht rückzahlbar)'}
                </div>
                <p class="hinweis" style="margin-top:15px; font-size:0.85rem;">Hinweis: Ab Sommersemester 2027 ist eine Anhebung der Wohnkostenpauschale von 380 € auf 440 € beschlossen.</p>
            </div>`;
        out.scrollIntoView({ behavior: "smooth" });
    }
});