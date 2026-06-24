// but-checker.js
// Kombi-Rechner für Bildung und Teilhabe (BuT)

document.addEventListener("DOMContentLoaded", () => {
    // UI Elemente
    const butForm = document.getElementById("but-form");
    const checkFahrt = document.getElementById("check_fahrt");
    const checkNachhilfe = document.getElementById("check_nachhilfe");
    const boxFahrt = document.getElementById("box_fahrt");
    const boxNachhilfe = document.getElementById("box_nachhilfe");
    const btnCalc = document.getElementById("but_berechnen");
    const out = document.getElementById("but_ergebnis");

    // Toggles für optionale Boxen
    checkFahrt.addEventListener("change", () => boxFahrt.style.display = checkFahrt.checked ? "block" : "none");
    checkNachhilfe.addEventListener("change", () => boxNachhilfe.style.display = checkNachhilfe.checked ? "block" : "none");

    btnCalc.addEventListener("click", () => {
        // Eingaben sammeln
        const bezug = document.getElementById("but_bezug").value;
        const age = parseInt(document.getElementById("but_alter").value);
        const institution = document.getElementById("but_schule").value;
        const needsTrip = checkFahrt.checked;
        const tripCosts = parseFloat(document.getElementById("but_fahrt_kosten").value || 0);
        const needsTutoring = checkNachhilfe.checked;
        const hasProblems = document.getElementById("but_probleme").checked;

        out.innerHTML = "";

        // 1. Grund-Check
        if (bezug === "keiner") {
            out.innerHTML = `
                <div class="warning-box" style="background:#f8d7da; color:#721c24; border:1px solid #f5c6cb; padding:20px; border-radius:8px;">
                    <h3>❌ Kein Anspruch über BuT</h3>
                    <p>BuT-Leistungen stehen nur Familien zu, die Sozialleistungen (KiZ, Wohngeld, Grundsicherungsgeld etc.) beziehen. Dein Einkommen scheint dafür aktuell zu hoch zu sein.</p>
                </div>`;
            return;
        }

        let anspruchsListe = [];
        let highlights = [];
        
        // 2. Leistungen definieren
        // Schulbedarf (Werte ca. 2025)
        if (institution === "schule" || institution === "ausbildung") {
            anspruchsListe.push({ title: "Schulbedarfspaket", status: "✓", desc: "Zuschuss für Stifte, Hefte, Tornister (ca. 195€ pro Schuljahr)." });
        }

        // Mittagessen
        if (institution === "kita" || institution === "schule") {
            anspruchsListe.push({ title: "Kostenloses Mittagessen", status: "✓", desc: "Die Kosten für gemeinschaftliches Mittagessen werden voll übernommen." });
        }

        // Teilhabe (Vereine/Kultur) - meist bis 18 J.
        if (age < 18) {
            anspruchsListe.push({ title: "Soziale & Kulturelle Teilhabe", status: "✓", desc: "15 € monatlich für Sportverein, Musikschule oder Freizeiten." });
        }

        // Schülerbeförderung
        if (institution === "schule" || institution === "ausbildung") {
            anspruchsListe.push({ title: "Schülerbeförderung", status: "✓", desc: "Übernahme der Fahrtkosten, wenn die Schule weit entfernt ist und die Kosten nicht anderweitig gedeckt sind." });
        }

        // 3. Spezial-Checks (Klassenfahrt)
        let tripHtml = "";
        if (needsTrip) {
            const isLikely = (bezug !== "keiner");
            tripHtml = `
                <div class="highlight-box" style="border-left: 4px solid #e67e22; margin-top:20px;">
                    <h3>🚌 Klassenfahrt-Check</h3>
                    <p>Kosten: <strong>${tripCosts > 0 ? tripCosts.toFixed(2) + " €" : "Nicht angegeben"}</strong></p>
                    <p><strong>Ergebnis:</strong> ${isLikely ? "Übernahme wahrscheinlich <strong>VOLLSTÄNDIG</strong>" : "Keine Übernahme"}</p>
                    <p style="font-size:0.9em; color:#555;">Handlungsschritte: 1. Bestätigung der Schule holen. 2. Antrag beim zuständigen Amt (Jobcenter oder Wohngeldstelle) stellen. 3. Abtretungserklärung an Schule möglich.</p>
                </div>
            `;
        }

        // 4. Spezial-Checks (Lernförderung)
        let tutoringHtml = "";
        if (needsTutoring) {
            const possible = (hasProblems && (institution === "schule" || institution === "ausbildung"));
            tutoringHtml = `
                <div class="highlight-box" style="border-left: 4px solid #9b59b6; margin-top:20px;">
                    <h3>📚 Lernförderung-Vorcheck</h3>
                    <p>Status: ${possible ? "✅ <strong>Möglich</strong>" : "❌ <strong>Schwierig</strong>"}</p>
                    <p>${possible ? "Da Schulprobleme vorliegen, kann Nachhilfe bezahlt werden." : "Nachhilfe über BuT wird meist nur bei Versetzungsgefahr genehmigt, nicht zur reinen Notenverbesserung."}</p>
                    <p style="font-size:0.9em; color:#555;">Nächster Schritt: Der Fachlehrer muss schriftlich bestätigen, dass die Lernförderung notwendig ist, um das Lernziel zu erreichen.</p>
                </div>
            `;
        }

        // 5. Gesamtausgabe
        const listHtml = anspruchsListe.map(item => `
            <div style="display:flex; align-items:flex-start; gap:15px; margin-bottom:15px; border-bottom:1px solid #eee; padding-bottom:10px;">
                <div style="font-size:1.5rem; color:green;">${item.status}</div>
                <div>
                    <strong style="display:block;">${item.title}</strong>
                    <span style="font-size:0.9rem; color:#666;">${item.desc}</span>
                </div>
            </div>
        `).join('');

        out.innerHTML = `
            <h2>Deine BuT-Analyse</h2>
            <div class="pflegegrad-result-card" style="padding:20px;">
                <div style="background:#e8f5e9; padding:15px; border-radius:8px; margin-bottom:20px;">
                    <p style="margin:0; font-weight:bold; color:#2e7d32;">Voraussetzung erfüllt: Du beziehst ${document.getElementById("but_bezug").options[document.getElementById("but_bezug").selectedIndex].text}.</p>
                </div>
                
                <h3>Mögliche Leistungen:</h3>
                <div style="margin-top:15px;">
                    ${listHtml}
                </div>

                ${tripHtml}
                ${tutoringHtml}

                <div class="warning-box" style="margin-top:25px; background:#f0f7ff; color:#004085; border:1px solid #b8daff;">
                    <strong>Wichtiger Hinweis:</strong> 
                    Anträge für Klassenfahrten und Lernförderung sollten <strong>vor</strong> Entstehen der Kosten gestellt werden. Rückwirkende Übernahmen sind oft kompliziert!
                </div>
            </div>
        `;

        out.scrollIntoView({ behavior: "smooth" });
    });
});