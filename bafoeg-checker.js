// bafoeg-expert-checker.js - Aktualisiert für 2026, korrigierte Logik und neues Design

document.addEventListener("DOMContentLoaded", () => {
    const typSelect = document.getElementById("be_typ");
    const wohnSelect = document.getElementById("be_wohnen");
    const boxSchulweg = document.getElementById("box_schulweg");
    const out = document.getElementById("be_ergebnis");

    // UI-Update: Schulweg-Feld nur anzeigen, wenn Schüler + allein wohnend
    const updateUI = () => {
        const isSchule = (typSelect.value === "schule_allg" || typSelect.value === "schule_beruf");
        const isAllein = (wohnSelect.value === "allein");
        if (boxSchulweg) {
            boxSchulweg.style.display = (isSchule && isAllein) ? "block" : "none";
        }
    };
    
    if (typSelect) typSelect.addEventListener("change", updateUI);
    if (wohnSelect) wohnSelect.addEventListener("change", updateUI);

    document.getElementById("be_calc").addEventListener("click", () => {
        // 1. Werte einlesen
        const typ = typSelect.value;
        const vorausb = document.getElementById("be_vorausbildung").value === "ja";
        const alter = parseInt(document.getElementById("be_alter").value) || 0;
        const arbeit = parseInt(document.getElementById("be_arbeit").value) || 0;
        const wohnen = wohnSelect.value;
        const fern = document.getElementById("be_fern") ? document.getElementById("be_fern").checked : false;
        const hatKV = document.getElementById("be_kv").value === "ja";
        
        const eigenesEinkommen = parseFloat(document.getElementById("be_einkommen").value) || 0;
        const kinderBetreuung = parseInt(document.getElementById("be_kinder_betreuung").value) || 0;
        const vermoegen = parseFloat(document.getElementById("be_vermoegen").value) || 0;
        const vermoegenZuschlagAnzahl = parseInt(document.getElementById("be_vermoegen_zuschlag").value) || 0;
        
        const elternStatus = document.getElementById("be_eltern_status").value;
        const geschwisterAnzahl = parseInt(document.getElementById("be_geschwister").value) || 0;
        const elternNetto = parseFloat(document.getElementById("be_eltern_netto").value) || 0;

        // 2. PRÜFUNG: ELTERNUNABHÄNGIGKEIT
        let istUnabhaengig = false;
        let grundUnabhaengig = "";
        if (alter >= 30) { 
            istUnabhaengig = true; 
            grundUnabhaengig = "Sie sind 30 Jahre oder älter."; 
        } else if (arbeit >= 5) { 
            istUnabhaengig = true; 
            grundUnabhaengig = "Sie können mindestens 5 Jahre Erwerbstätigkeit nachweisen."; 
        } else if (vorausb && arbeit >= 3) { 
            istUnabhaengig = true; 
            grundUnabhaengig = "Sie haben eine abgeschlossene Erstausbildung und mindestens 3 Jahre gearbeitet."; 
        } else if (typ === "kolleg" || typ === "abendgymnasium") { 
            istUnabhaengig = true; 
            grundUnabhaengig = "Sie besuchen ein Kolleg oder ein Abendgymnasium."; 
        }

        // 3. PRÜFUNG: SCHÜLER-HÜRDE (§ 13 BAföG)
        let berechtigt = true;
        let ablehnungsgrund = "";
        if (typ === "schule_allg" || typ === "schule_beruf") {
            if (wohnen === "eltern") {
                berechtigt = false;
                ablehnungsgrund = "Schüler, die bei ihren Eltern wohnen, erfüllen in der Regel nicht die Voraussetzungen für BAföG.";
            } else if (!fern && !vorausb && alter < 30) {
                berechtigt = false;
                ablehnungsgrund = "Ein eigener Hausstand ist für Schüler nur förderfähig, wenn ein weiter Schulweg vorliegt oder eine abgeschlossene Vorbildung vorhanden ist.";
            }
        }

        // 4. BEDARFSBERECHNUNG (Korrigierte, realistische Näherungswerte)
        // LOGIK-FIX: Der Grundbedarf ist beim Wohnen zu Hause niedriger als beim Auswärtswohnen.
        let basisbedarf = (wohnen === "eltern") ? 364 : 502; 
        let wohnkosten = (wohnen === "allein") ? 380 : 0;
        
        let kvZuschlag = 0;
        if (hatKV) {
            kvZuschlag = (alter < 30) ? 137 : 233; // Pauschale für Kranken- und Pflegeversicherung
        }
        
        let kinderZuschlag = kinderBetreuung * 160; // 160 € pro Kind

        const gesamtbedarf = basisbedarf + wohnkosten + kvZuschlag + kinderZuschlag;

        // 5. ANRECHNUNG EIGENES EINKOMMEN
        let anrechnungEinkommen = 0;
        const einkommensFreibetrag = 603; // Aktueller Freibetrag (Stand 2026)
        if (eigenesEinkommen > einkommensFreibetrag) {
            anrechnungEinkommen = eigenesEinkommen - einkommensFreibetrag;
        }

        // 6. ANRECHNUNG ELTERN (nur wenn abhängig)
        let anrechnungEltern = 0;
        if (!istUnabhaengig) {
            let freibetragEltern = (elternStatus === "zusammen") ? 2540 : 1690;
            freibetragEltern += (geschwisterAnzahl * 770); // 770 € je unterhaltsberechtigtes Kind
            
            const anrechenbaresElternEinkommen = Math.max(0, elternNetto - freibetragEltern);
            anrechnungEltern = anrechenbaresElternEinkommen * 0.5; // 50% des übersteigenden Betrags
        }

        // 7. ANRECHNUNG VERMÖGEN (§ 11 BAföG)
        let anrechnungVermoegen = 0;
        let vermoegensFreibetrag = (alter >= 30) ? 45000 : 15000;
        vermoegensFreibetrag += (vermoegenZuschlagAnzahl * 2300); 
        
        if (vermoegen > vermoegensFreibetrag) {
            anrechnungVermoegen = (vermoegen - vermoegensFreibetrag) / 12; // Verteilung auf 12 Monate
        }

        // 8. ENDGEREBNIS
        const voraussichtlichesBafoeg = Math.max(0, gesamtbedarf - anrechnungEltern - anrechnungVermoegen - anrechnungEinkommen);

        // 9. OUTPUT RENDERING
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
            typ,
            wohnen
        );
    });

    function renderExpertResult(ok, grund, indep, indepReason, final, max, minusEltern, minusVermoegen, minusEinkommen, fVermoegen, typ, wohnen) {
        if (!ok) {
            // Fehlerfall: Freundlich, klar, OHNE border-left
            out.innerHTML = `
                <div class="bafoeg-error-card">
                    <h3>Kein Förderanspruch festgestellt</h3>
                    <p style="margin-bottom: 0; line-height: 1.6;">${grund}</p>
                    <p class="hinweis" style="margin-top: 16px; margin-bottom: 0; background-color: #fff; border: 1px solid #fecaca;">
                        Bitte prüfen Sie Ihre Angaben. In Einzelfällen kann es Ausnahmen geben. Wenden Sie sich im Zweifel an das BAföG-Amt Ihrer Hochschule oder Schule.
                    </p>
                </div>`;
            out.scrollIntoView({ behavior: "smooth", block: "center" });
            return;
        }

        // Erfolgsfall: Strukturiert, viel Weißraum, blaue Akzente
        const foerderartText = (typ === 'uni' || typ === 'fachschule' || typ === 'meister') 
            ? "50 % Zuschuss (geschenkt) / 50 % rückzahlungspflichtiges, zinsloses Darlehen." 
            : "100 % Zuschuss (nicht rückzahlbar).";

        const wohnhinweis = (wohnen === "allein") 
            ? "<p class='hinweis' style='margin-top: 20px;'>Hinweis: Die Wohnkostenpauschale wird pauschal mit 380 € angesetzt. Ab dem Sommersemester 2027 ist eine Anhebung auf 440 € gesetzlich beschlossen.</p>" 
            : "";

        out.innerHTML = `
            <div class="pflegegrad-result-card">
                <h2 style="margin-top: 0; color: #0f172a;">Ihr vorläufiges BAföG-Ergebnis</h2>
                <p style="color: #475569; margin-bottom: 24px;">
                    Basierend auf Ihren Angaben ergibt sich eine monatliche Förderung von:
                </p>
                
                <div style="font-size: 2.5rem; font-weight: 700; color: #2563eb; margin: 16px 0 32px 0;">
                    ca. ${final.toFixed(0)} € <span style="font-size: 1.25rem; font-weight: 500; color: #64748b;">/ Monat</span>
                </div>
                
                <p style="margin-bottom: 8px;">
                    <strong>Förderstatus:</strong> ${indep ? 'Elternunabhängig' : 'Elternabhängig'} 
                    ${indep ? `<span style="color: #475569; font-weight: 400;">(${indepReason})</span>` : ''}
                </p>

                <ul class="bafoeg-breakdown">
                    <li>
                        <span class="label">Gesamtbedarf (Grundbedarf + Wohnen + Versicherung)</span>
                        <span class="value">${max.toFixed(0)} €</span>
                    </li>
                    ${minusEltern > 0 ? `
                    <li>
                        <span class="label">Abzug wegen elterlichem Einkommen</span>
                        <span class="value deduction">- ${minusEltern.toFixed(0)} €</span>
                    </li>` : ''}
                    ${minusEinkommen > 0 ? `
                    <li>
                        <span class="label">Abzug wegen eigenem Einkommen</span>
                        <span class="value deduction">- ${minusEinkommen.toFixed(0)} €</span>
                    </li>` : ''}
                    ${minusVermoegen > 0 ? `
                    <li>
                        <span class="label">Abzug wegen Vermögen (Freibetrag: ${fVermoegen.toLocaleString('de-DE')} €)</span>
                        <span class="value deduction">- ${minusVermoegen.toFixed(0)} €</span>
                    </li>` : `
                    <li>
                        <span class="label">Vermögensanrechnung</span>
                        <span class="value positive">Keine (innerhalb des Freibetrags)</span>
                    </li>`}
                </ul>

                <div class="bafoeg-highlight">
                    <strong>Art der Förderung:</strong><br>
                    ${foerderartText}
                </div>
                
                ${wohnhinweis}

                <p class="hinweis" style="margin-top: 24px;">
                    <strong>Wichtiger Hinweis:</strong> Dies ist eine vereinfachte Orientierungsberechnung. Die endgültige Höhe wird vom zuständigen BAföG-Amt auf Grundlage Ihrer eingereichten Nachweise (z. B. Mietvertrag, Einkommenssteuerbescheide der Eltern) verbindlich festgesetzt.
                </p>
            </div>`;
            
        out.scrollIntoView({ behavior: "smooth", block: "start" });
    }
});