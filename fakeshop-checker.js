// fakeshop-checker.js
// Tool zur Risikoeinschätzung von Online-Shops.
// Hinweis: Algorithmus basiert auf Heuristiken, keine Garantie.

document.addEventListener("DOMContentLoaded", function() {
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

    btn.addEventListener("click", function() {
        out.innerHTML = ""; 
        
        const val = {
            impressum: inputs.impressum.value,
            domain: inputs.domain.value,
            preis: inputs.preis.value,
            zahlung: inputs.zahlung.value,
            verfuegbar: inputs.verfuegbar.value,
            siegel: inputs.siegel.value
        };

        let score = 0;
        let warnings = [];
        let positives = [];
        let fatalFlags = [];

        // 1. Impressum
        if (val.impressum === "nein") {
            score += 40;
            warnings.push("Kein oder unvollständiges Impressum identifiziert. Dies stellt ein signifikantes Warnsignal dar – Anbieterangaben sollten kritisch geprüft werden.");
        } else if (val.impressum === "ausland") {
            score += 20;
            warnings.push("Impressum/Adresse befindet sich außerhalb der EU: Im Problemfall kann die Rechtsdurchsetzung erheblich erschwert sein.");
        } else {
            positives.push("Impressum scheint vorhanden zu sein (Angaben sollten bei Unsicherheit dennoch unabhängig verifiziert werden).");
        }

        // 2. Domain
        if (val.domain === "komisch") {
            score += 20;
            warnings.push("Die Internetadresse (URL) wirkt ungewöhnlich oder stark keyword-lastig. Dies kann auf eine nicht-seriöse Domain hindeuten.");
        }

        // 3. Preis
        if (val.preis === "billig") {
            score += 15;
            warnings.push("Der Preis liegt deutlich unter dem vergleichbarer Anbieter. Eine besonders sorgfältige Prüfung wird empfohlen.");
        } else if (val.preis === "unrealistisch") {
            score += 35;
            warnings.push("Der Preis wirkt unrealistisch niedrig. Extrem günstige Angebote stellen ein häufiges Lockmittel bei betrügerischen Shops dar.");
        }

        // 4. Zahlung
        if (val.zahlung === "vorkasse") {
            score += 50;
            fatalFlags.push("Nur Vorkasse möglich");
            warnings.push("<strong>Kritisches Warnsignal:</strong> An der Kasse ist ausschließlich Vorkasse/Überweisung möglich (häufig trotz abweichender Logos im Vorfeld). Dies entspricht einem typischen Muster bei betrügerischen Shops und birgt ein hohes Verlustrisiko.");
        } else {
            positives.push("Sichere Zahlungsarten scheinen verfügbar zu sein (z.B. Rechnung/Lastschrift/PayPal mit Käuferschutz – abhängig vom jeweiligen Anbieter).");
        }

        // 5. Verfügbarkeit
        if (val.verfuegbar === "alles") {
            score += 10;
            warnings.push("Die Verfügbarkeit aller Varianten bei begehrter Ware kann unplausibel sein und stellt je nach Produkt ein Warnsignal dar.");
        }

        // 6. Siegel
        if (val.siegel === "bild") {
            score += 30;
            warnings.push("Das Gütesiegel ist lediglich als Bild eingebunden und nicht verifizierbar (nicht klickbar). Dies ist ein häufiges Fälschungsmerkmal.");
        } else if (val.siegel === "klickbar") {
            score -= 10;
            positives.push("Gütesiegel erscheint verifizierbar (verlinkt zum Zertifikat). Es sollte dort geprüft werden, ob Shop und Domain übereinstimmen.");
        }

        // --- Auswertung ---
        let headline = "";
        let riskLevel = "green";
        let summaryText = "";
        
        if (score >= 50) {
            riskLevel = "red";
            headline = "Hohes Betrugsrisiko";
            summaryText = "Es wurden mehrere signifikante Warnsignale identifiziert. Ein Kauf ist mit erheblichem Risiko verbunden – von einer Bestellung wird dringend abgeraten, bis der Shop eindeutig verifiziert werden kann.";
        } else if (score >= 25) {
            riskLevel = "orange";
            headline = "Erhöhtes Risiko: Gründliche Prüfung erforderlich";
            summaryText = "Es bestehen auffällige Merkmale. Der Shop sollte eingehend geprüft und ausschließlich mit sicheren Zahlungsmethoden genutzt werden (keine Vorkasse).";
        } else if (score > 10) {
            riskLevel = "yellow";
            headline = "Geringe Auffälligkeiten";
            summaryText = "Der Shop wirkt überwiegend unauffällig, jedoch sind kleinere Warnzeichen vorhanden. Käufe sollten nur mit Käuferschutz oder zahlungssicheren Methoden getätigt werden.";
        } else {
            riskLevel = "green";
            headline = "Derzeit unauffällig";
            summaryText = "Basierend auf Ihren Angaben wurden keine typischen Muster betrügerischer Shops identifiziert. Eine absolute Sicherheit kann dennoch nicht gewährleistet werden.";
        }

        let bgCol = "#f8f9fa"; 
        let borderCol = "#dee2e6";
        let textCol = "#495057";
        let indicatorStyle = "background: #198754;";

        if (riskLevel === "yellow") { 
            bgCol = "#fff9e6"; borderCol = "#ffd966"; textCol = "#664d03"; indicatorStyle = "background: #ffc107;";
        }
        if (riskLevel === "orange") { 
            bgCol = "#fff5f0"; borderCol = "#ff9800"; textCol = "#bf360c"; indicatorStyle = "background: #ff9800;";
        }
        if (riskLevel === "red") { 
            bgCol = "#fff0f0"; borderCol = "#dc3545"; textCol = "#721c24"; indicatorStyle = "background: #dc3545;";
        }

        // --- HTML Output aufbauen (Array-Methode für maximale Linter-Kompatibilität) ---
        const html = [];
        
        html.push('<div id="fs_result_card" style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, \'Helvetica Neue\', Arial, sans-serif; max-width: 900px; margin: 0 auto; padding: 40px; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">');
        
        // Header
        html.push('  <div style="border-bottom: 2px solid #003366; padding-bottom: 20px; margin-bottom: 30px;">');
        html.push('    <h2 style="margin: 0 0 8px 0; font-size: 1.75rem; font-weight: 600; color: #1f2937; letter-spacing: -0.025em;">Ergebnis der Risikoanalyse</h2>');
        html.push('    <p style="margin: 0; font-size: 0.875rem; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Automatisierte Heuristik-basierte Einschätzung</p>');
        html.push('  </div>');

        // Risk Card
        html.push('  <div style="background: ' + bgCol + '; border: 1px solid ' + borderCol + '; border-radius: 10px; padding: 30px; margin-bottom: 35px; text-align: center;">');
        html.push('    <div style="width: 12px; height: 12px; border-radius: 50%; ' + indicatorStyle + ' margin: 0 auto 16px auto;"></div>');
        html.push('    <h3 style="margin: 0 0 12px 0; font-size: 1.5rem; font-weight: 600; color: ' + textCol + ';">' + headline + '</h3>');
        html.push('    <p style="margin: 0 0 16px 0; font-size: 1.0625rem; font-weight: 500; color: ' + textCol + '; line-height: 1.6;">' + summaryText + '</p>');
        html.push('    <p style="margin: 16px 0 0 0; font-size: 0.8125rem; color: ' + textCol + '; opacity: 0.75; font-style: italic;">Hinweis: Dies ist eine automatisierte Risiko-Einschätzung anhand typischer Merkmale. Eine Garantie kann nicht gegeben werden.</p>');
        html.push('  </div>');

        // Warnings
        if (warnings.length > 0) {
            html.push('  <div style="margin-bottom: 35px;">');
            html.push('    <h4 style="margin: 0 0 20px 0; font-size: 1.125rem; font-weight: 600; color: #1f2937; display: flex; align-items: center; gap: 8px;">');
            html.push('      <span style="display: inline-block; width: 24px; height: 24px; background: #dc3545; border-radius: 4px;"></span>');
            html.push('      Identifizierte Risikofaktoren');
            html.push('    </h4>');
            html.push('    <ul style="margin: 0; padding: 0; list-style: none;">');
            warnings.forEach(function(w) {
                html.push('      <li style="background: #fef2f2; border-left: 4px solid #dc3545; padding: 16px 20px; margin-bottom: 12px; border-radius: 6px; color: #7f1d1d; line-height: 1.6; font-size: 0.9375rem;">' + w + '</li>');
            });
            html.push('    </ul>');
            html.push('  </div>');
        }

        // Positives
        if (positives.length > 0) {
            html.push('  <div style="margin-bottom: 35px;">');
            html.push('    <h4 style="margin: 0 0 20px 0; font-size: 1.125rem; font-weight: 600; color: #1f2937; display: flex; align-items: center; gap: 8px;">');
            html.push('      <span style="display: inline-block; width: 24px; height: 24px; background: #003366; border-radius: 4px;"></span>');
            html.push('      Positive Indikatoren');
            html.push('    </h4>');
            html.push('    <ul style="margin: 0; padding: 0; list-style: none;">');
            positives.forEach(function(p) {
                html.push('      <li style="background: #eff6ff; border-left: 4px solid #003366; padding: 16px 20px; margin-bottom: 12px; border-radius: 6px; color: #1e40af; line-height: 1.6; font-size: 0.9375rem;">' + p + '</li>');
            });
            html.push('    </ul>');
            html.push('  </div>');
        }

        // Recommendation
        html.push('  <div style="background: #f8f9fa; border: 1px solid #e5e7eb; border-radius: 10px; padding: 24px; margin-top: 30px;">');
        html.push('    <h4 style="margin: 0 0 12px 0; font-size: 1rem; font-weight: 600; color: #003366; text-transform: uppercase; letter-spacing: 0.05em;">Handlungsempfehlung</h4>');
        
        let recommendation = (riskLevel === "red" || riskLevel === "orange") 
            ? "Suchen Sie den Shop-Namen zusammen mit der Domain bei Google in Kombination mit Begriffen wie 'Erfahrungen', 'Warnung' oder 'Fake'. Nutzen Sie nach Möglichkeit einen etablierten Anbieter oder bezahlen Sie ausschließlich mit Käuferschutz (keine Vorkasse). Falls bereits eine Zahlung getätigt wurde: Sichern Sie umgehend alle Belege und kontaktieren Sie sofort Ihre Bank oder den Zahlungsdienstleister, um eine Rückbuchung (Chargeback) zu prüfen." 
            : "Bleiben Sie auch bei unauffälligen Shops vorsichtig: Bevorzugen Sie Zahlungsarten mit Käuferschutz (z.B. Rechnung, Lastschrift oder Kreditkarte – je nach Anbieter) und vermeiden Sie Überweisungen oder Vorkasse, sofern Sie den Shop nicht sicher verifizieren können.";
        
        html.push('    <p style="margin: 0; color: #4b5563; line-height: 1.6; font-size: 0.9375rem;">' + recommendation + '</p>');
        html.push('  </div>');

        html.push('</div>');

        out.innerHTML = html.join('\n');
        out.scrollIntoView({ behavior: "smooth" });
    });

    if (reset) {
        reset.addEventListener("click", function() {
            setTimeout(function() { out.innerHTML = ""; }, 50);
        });
    }
});