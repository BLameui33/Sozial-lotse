// bafoeg-checker.js
// BAföG Anspruch, Höhe und Bürgergeld-Abgrenzung (Werte Stand 2024/2025)

document.addEventListener("DOMContentLoaded", () => {
    const radios = document.getElementsByName("bafoeg_modus");
    const divAnspruch = document.getElementById("div_anspruch_extra");
    const divHoehe = document.getElementById("div_hoehe_extra");
    const btn = document.getElementById("bf_berechnen");
    const out = document.getElementById("bf_ergebnis");

    // Tab-Switch
    radios.forEach(r => r.addEventListener("change", () => {
        const mode = document.querySelector('input[name="bafoeg_modus"]:checked').value;
        divAnspruch.style.display = (mode === "anspruch") ? "block" : "none";
        divHoehe.style.display = (mode === "hoehe") ? "block" : "none";
        out.innerHTML = "";
    }));

    btn.addEventListener("click", () => {
        const mode = document.querySelector('input[name="bafoeg_modus"]:checked').value;
        const typ = document.getElementById("bf_typ").value;
        const alter = parseInt(document.getElementById("bf_alter").value);
        const wohnen = document.getElementById("bf_wohnen").value;
        
        out.innerHTML = "";

        // --- BASIS-WERTE 2024/2025 (Gerundet) ---
        let grundbedarf = (typ === "studium") ? 475 : 262; // Vereinfacht für Schüler/Studenten
        let wohnpauschale = (wohnen === "allein") ? 380 : 0;
        let kv_zuschlag = 0;
        
        if (mode === "hoehe") {
            const hatKV = document.getElementById("bf_kv").value === "ja";
            if (hatKV) kv_zuschlag = 122; // KV + PV Zuschlag
        }

        const maxSatz = grundbedarf + wohnpauschale + kv_zuschlag;

        // --- LOGIK 1: ANSPRUCH & BÜRGERGELD ---
        if (mode === "anspruch") {
            const eltern = document.getElementById("bf_eltern_einkommen").value;
            let wahrscheinlichkeit = "Hoch";
            let farbe = "green";
            let bg = "#e8f5e9";
            
            if (eltern === "hoch") { wahrscheinlichkeit = "Gering (wegen Elterneinkommen)"; farbe = "red"; bg = "#f8d7da"; }
            if (eltern === "mittel") { wahrscheinlichkeit = "Grenzwertig / Teil-BAföG"; farbe = "orange"; bg = "#fff3cd"; }
            if (alter > 45) { wahrscheinlichkeit = "Eher nicht (Altersgrenze 45 J.)"; farbe = "red"; bg = "#f8d7da"; }

            // Bürgergeld Check
            let bgInfo = "";
            if (typ === "studium" && wohnen === "allein") {
                bgInfo = "⚠️ <strong>Bürgergeld-Ausschluss:</strong> Als Student in eigener Wohnung hast du i.d.R. <strong>keinen</strong> Anspruch auf Bürgergeld, auch wenn das BAföG nicht reicht.";
            } else if (typ === "schule" && wohnen === "eltern") {
                bgInfo = "ℹ️ <strong>Bürgergeld-Kombi:</strong> Hier ist oft Bürgergeld vorrangig oder ergänzend möglich, da Schüler-BAföG oft nicht den vollen Bedarf deckt.";
            }

            out.innerHTML = `
                <div class="pflegegrad-result-card" style="background:${bg}; border:1px solid ${farbe};">
                    <h3 style="color:${farbe};">Ergebnis: ${wahrscheinlichkeit}</h3>
                    <p>Typ: <strong>${typ === 'studium' ? 'Studenten-BAföG' : 'Schüler-BAföG'}</strong></p>
                    <p>${bgInfo}</p>
                    <p style="font-size:0.9em; margin-top:10px;"><strong>Nächster Schritt:</strong> Antrag beim zuständigen Studierendenwerk (Studium) oder Amt für Ausbildungsförderung (Schule) stellen.</p>
                </div>
            `;
        }

        // --- LOGIK 2: HÖHEN-SCHÄTZER ---
        else {
            const job = parseFloat(document.getElementById("bf_job").value || 0);
            let abzugJob = Math.max(0, job - 556); // Freibetrag Minijob ca. 556€
            
            const geschaetzterSatz = Math.max(0, maxSatz - abzugJob);

            out.innerHTML = `
                <div class="pflegegrad-result-card">
                    <h3>Geschätzter BAföG-Betrag</h3>
                    <div style="font-size:2.5rem; font-weight:bold; color:#2980b9; margin:15px 0;">
                        ca. ${geschaetzterSatz.toFixed(0)} € <span style="font-size:1rem; color:#666;">/ Monat</span>
                    </div>
                    <ul style="list-style:none; padding:0;">
                        <li>📍 Grundbedarf: ${grundbedarf} €</li>
                        <li>📍 Wohnpauschale: ${wohnpauschale} €</li>
                        ${kv_zuschlag > 0 ? `<li>📍 KV/PV-Zuschlag: ${kv_zuschlag} €</li>` : ''}
                        ${abzugJob > 0 ? `<li style="color:red;">📍 Abzug Einkommen: -${abzugJob.toFixed(0)} €</li>` : ''}
                    </ul>
                    <div class="highlight-box" style="margin-top:20px;">
                        <strong>Finanzierungs-Info:</strong><br>
                        ${typ === 'studium' 
                            ? "Das Studium-BAföG besteht zur <strong>Hälfte aus einem Zuschuss</strong> (Geschenk) und zur <strong>Hälfte aus einem zinslosen Darlehen</strong> (Rückzahlung max. 10.010 €)." 
                            : "Schüler-BAföG wird in der Regel als <strong>Vollzuschuss</strong> gewährt (du musst nichts zurückzahlen)."}
                    </div>
                </div>
            `;
        }
        out.scrollIntoView({ behavior: "smooth" });
    });
});