// fakeshop-checker.js
// Tool zur Risikoeinschätzung von Online-Shops.
// Hinweis: Algorithmus basiert auf Heuristiken, keine Garantie.

document.addEventListener("DOMContentLoaded", () => {
    const inputs = {
        impressum: document.getElementById("fs_impressum"),
        domain: document.getElementById("fs_domain"),
        preis: document.getElementById("fs_preis"),
        zahlung: document.getElementById("fs_zahlung"),
        verfuegbar: document.getElementById("fs_verfuegbar"),
        siegel: document.getElementById("fs_siegel")
    };

    const btn = document.getElementById("fs_berechnen");
    const reset = document.getElementById("fs_reset");
    const out = document.getElementById("fs_ergebnis");

    btn.addEventListener("click", () => {
        out.innerHTML = ""; 
        
        // Werte auslesen
        const val = {
            impressum: inputs.impressum.value,
            domain: inputs.domain.value,
            preis: inputs.preis.value,
            zahlung: inputs.zahlung.value,
            verfuegbar: inputs.verfuegbar.value,
            siegel: inputs.siegel.value
        };

        // --- Logik & Scoring ---
        // Score: 0 (Sicher) bis 100+ (Extrem gefährlich)
        let score = 0;
        let warnings = [];
        let positives = [];
        let fatalFlags = []; // K.O. Kriterien

        // 1. Impressum
        if (val.impressum === "nein") {
            score += 40;
            warnings.push("Kein oder unvollständiges Impressum gefunden. Das ist ein starkes Warnsignal – prüfen Sie Anbieterangaben besonders kritisch.");
        } else if (val.impressum === "ausland") {
            score += 20;
            warnings.push("Impressum/Adresse wirkt außerhalb der EU: Im Problemfall kann die Rechtsdurchsetzung deutlich schwieriger sein.");
        } else {
            positives.push("Impressum wirkt auf den ersten Blick vorhanden (trotzdem Angaben bei Unsicherheit gegenprüfen).");
        }

        // 2. Domain
        if (val.domain === "komisch") {
            score += 20;
            warnings.push("Die Internetadresse (URL) wirkt ungewöhnlich oder sehr „keyword-lastig“. Das kann ein Warnsignal sein.");
        }

        // 3. Preis
        if (val.preis === "billig") {
            score += 15;
            warnings.push("Der Preis ist deutlich günstiger als bei vergleichbaren Shops. Prüfen Sie besonders sorgfältig.");
        } else if (val.preis === "unrealistisch") {
            score += 35;
            warnings.push("Der Preis wirkt unrealistisch niedrig. Extrem-„Schnäppchen“ sind ein häufiges Lockmittel bei Fake-Shops.");
        }

        // 4. Zahlung (Das wichtigste Kriterium!)
        if (val.zahlung === "vorkasse") {
            score += 50;
            fatalFlags.push("Nur Vorkasse möglich");
            warnings.push("⚠️ <strong>Sehr starkes Warnsignal:</strong> An der Kasse ist nur Vorkasse/Überweisung möglich (oft trotz anderer Logos vorher). Das ist ein typisches Fake-Shop-Muster – hohes Verlustrisiko.");
        } else {
            positives.push("Sichere Zahlungsarten scheinen möglich (z.B. Rechnung/Lastschrift/PayPal mit Käuferschutz – abhängig vom Anbieter).");
        }

        // 5. Verfügbarkeit
        if (val.verfuegbar === "alles") {
            score += 10;
            warnings.push("Alles in allen Größen/Farben verfügbar kann bei begehrter Ware unplausibel sein – je nach Produkt ein Warnsignal.");
        }

        // 6. Siegel
        if (val.siegel === "bild") {
            score += 30;
            warnings.push("Das Gütesiegel ist nur ein Bild und nicht verifizierbar (nicht klickbar). Das ist ein häufiges Fälschungsmerkmal.");
        } else if (val.siegel === "klickbar") {
            score -= 10; // Bonus für echtes Siegel
            positives.push("Gütesiegel wirkt verifizierbar (führt zum Zertifikat). Prüfen Sie dort, ob Shop/Domain wirklich übereinstimmen.");
        }

        // --- Auswertung ---

        let headline = "";
        let riskLevel = "green"; // green, yellow, orange, red
        let summaryText = "";
        
        // Risikostufen definieren
        if (score >= 50) {
            riskLevel = "red";
            headline = "Hohes Betrugsrisiko";
            summaryText = "Es wurden mehrere starke Warnsignale gefunden. Ein Kauf ist risikoreich – besser nicht bestellen, bis der Shop eindeutig verifiziert ist.";
        } else if (score >= 25) {
            riskLevel = "orange";
            headline = "Vorsicht: bitte gründlich prüfen";
            summaryText = "Es gibt auffällige Merkmale. Prüfen Sie den Shop sehr genau und nutzen Sie nur sichere Zahlungsarten (keine Vorkasse).";
        } else if (score > 10) {
            riskLevel = "yellow";
            headline = "Leichte Auffälligkeiten";
            summaryText = "Der Shop wirkt überwiegend unauffällig, aber es gibt kleinere Warnzeichen. Kaufen Sie nur mit Käuferschutz/zahlungssicheren Methoden.";
        } else {
            riskLevel = "green";
            headline = "Wirkt derzeit unauffällig";
            summaryText = "Basierend auf Ihren Angaben wurden keine typischen Fake-Shop-Muster gefunden. Eine Garantie gibt es dennoch nicht.";
        }

        // Farben setzen
        let bgCol = "#e2e3e5"; 
        let textCol = "#383d41";
        let icon = "✅";

        if (riskLevel === "yellow") { bgCol = "#fff3cd"; textCol = "#856404"; icon = "🤔"; }
        if (riskLevel === "orange") { bgCol = "#ffe5d0"; textCol = "#e67e22"; icon = "✋"; }
        if (riskLevel === "red") { bgCol = "#f8d7da"; textCol = "#721c24"; icon = "⛔"; }

        // HTML zusammenbauen
        const resultHtml = `
            <h2>Ergebnis des Schnelltests</h2>
            <div id="fs_result_card" class="result-card" style="border: 1px solid #ddd; padding: 20px; border-radius: 8px; background: #fff; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                
                <div style="background:${bgCol}; color:${textCol}; padding:20px; border-radius:8px; text-align:center; margin-bottom:20px;">
                    <div style="font-size:3rem; margin-bottom:10px;">${icon}</div>
                    <h3 style="margin:0; font-size:1.5rem;">${headline}</h3>
                    <p style="margin-top:10px; font-weight:bold;">${summaryText}</p>
                    <p style="margin:10px 0 0 0; font-size:0.95em; opacity:0.9;">
                        Hinweis: Automatisierte Risiko-Einschätzung anhand typischer Merkmale (keine Garantie).
                    </p>
                </div>

                ${warnings.length > 0 ? `
                    <h3 style="color:#c0392b;">⚠️ Gefundene Risikofaktoren:</h3>
                    <ul style="color:#c0392b; list-style-type: none; padding-left: 0;">
                        ${warnings.map(w => `<li style="background:#fff0f0; padding:8px; border-left:3px solid #c0392b; margin-bottom:8px;">${w}</li>`).join('')}
                    </ul>
                ` : ''}

                ${positives.length > 0 ? `
                    <h3 style="color:#27ae60;">👍 Positive Merkmale:</h3>
                    <ul style="color:#27ae60; list-style-type: none; padding-left: 0;">
                        ${positives.map(p => `<li style="background:#f0fff4; padding:8px; border-left:3px solid #27ae60; margin-bottom:8px;">${p}</li>`).join('')}
                    </ul>
                ` : ''}

                <div style="margin-top:20px; padding-top:20px; border-top:1px solid #eee;">
                    <strong>Unser Tipp:</strong>
                    ${riskLevel === "red" || riskLevel === "orange" 
                        ? "Suchen Sie den Shop-Namen + Domain bei Google zusammen mit „Erfahrungen“, „Warnung“ oder „Fake“. Nutzen Sie nach Möglichkeit einen etablierten Shop oder bezahlen Sie nur mit Käuferschutz (keine Vorkasse). Wenn Sie bereits bezahlt haben: sofort Belege sichern und umgehend Bank/Zahlungsdienst kontaktieren, um eine Rückbuchung/Chargeback zu prüfen." 
                        : "Bleiben Sie bei unbekannten Shops vorsichtig: bevorzugen Sie Käuferschutz (z.B. Rechnung/Lastschrift/Kreditkarte je nach Anbieter) und vermeiden Sie Überweisungen/Vorkasse, wenn Sie den Shop nicht sicher verifizieren können."}
                </div>
            </div>
        `;

        out.innerHTML = resultHtml;
        out.scrollIntoView({ behavior: "smooth" });
    });

    if (reset) {
        reset.addEventListener("click", () => {
            setTimeout(() => { out.innerHTML = ""; }, 50);
        });
    }
});
