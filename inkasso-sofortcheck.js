// inkasso-sofortcheck.js
// Tool zur strukturierten Ersteinschätzung von Inkassoforderungen.
// Hinweis: Keine Rechtsberatung. Ergebnisse basieren ausschließlich auf Nutzereingaben.

/* --- Hilfsfunktionen --- */
function n(el) { 
    if (!el) return 0; 
    const v = Number((el.value || "").toString().replace(",", ".")); 
    return Number.isFinite(v) ? v : 0; 
}

function euro(v) { 
    const x = Number.isFinite(v) ? v : 0; 
    return x.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €"; 
}

document.addEventListener("DOMContentLoaded", () => {
    const inputs = {
        register: document.getElementById("ik_register"),
        vollmacht: document.getElementById("ik_vollmacht"),
        betrag: document.getElementById("ik_betrag"),
        schuld: document.getElementById("ik_schuld"),
        bestritten: document.getElementById("ik_bestritten")
    };

    const btn = document.getElementById("ik_berechnen");
    const reset = document.getElementById("ik_reset");
    const out = document.getElementById("ik_ergebnis");

    btn.addEventListener("click", () => {
        out.innerHTML = ""; 

        const isRegistered = inputs.register.value; 
        const hasVollmacht = inputs.vollmacht.value; 
        const amount = n(inputs.betrag);
        const debtStatus = inputs.schuld.value; 
        const isDisputed = inputs.bestritten.value === "ja";

        if (amount <= 0) {
            out.innerHTML = `<div class="warning-box" style="background:#fff3cd; color:#856404; padding:10px; border-radius:4px;">
            Bitte geben Sie die geforderte Gesamtsumme an, um eine Einschätzung zu erhalten.
            </div>`;
            return;
        }

        let headline = "Ergebnis Ihrer Ersteinschätzung";
        let riskLevel = "orange";
        let assessment = [];
        let todos = [];
        let strategyNote = "";

        // --- A. Registrierung ---
        if (isRegistered === "nein") {
            riskLevel = "red";
            assessment.push("🔴 **Auffälligkeit bei der Registrierung:** Laut Ihrer Angabe ist das Unternehmen nicht im Rechtsdienstleistungsregister eingetragen. Inkassodienstleistungen setzen in Deutschland grundsätzlich eine Registrierung voraus.");
            todos.push("Prüfen Sie den Absender sorgfältig (z.B. Firmenname recherchieren, Impressum kontrollieren). Zahlen Sie erst nach weiterer Klärung.");
        } else if (isRegistered === "unsicher") {
            assessment.push("🟡 **Offene Prüfung:** Seriöse Inkassounternehmen sind im Rechtsdienstleistungsregister eingetragen. Sie können dies selbst kostenlos online überprüfen.");
        } else {
            assessment.push("🟢 **Formale Voraussetzung erfüllt:** Das Unternehmen ist registriert und darf grundsätzlich Inkassodienstleistungen anbieten.");
        }

        // --- B. Vollmacht ---
        if (hasVollmacht === "nein" || hasVollmacht === "kopie") {
            assessment.push("🟠 **Vollmacht nicht im Original vorgelegt:** Nach § 174 BGB kann verlangt werden, dass eine Originalvollmacht vorgelegt wird. Solange diese fehlt, kann eine Zurückweisung erklärt werden.");
            todos.push("Erwägen Sie ein schriftliches Verlangen nach Vorlage der Originalvollmacht, bevor Sie weitere Schritte unternehmen.");
        }

        // --- C. Forderungsstatus ---
        if (debtStatus === "verjaehrt") {
            riskLevel = "red";
            headline = "Mögliche Verjährung der Forderung";
            assessment.push("🔴 **Hinweis auf Verjährung:** Forderungen sind häufig nach Ablauf der gesetzlichen Frist nicht mehr durchsetzbar, sofern Sie sich ausdrücklich darauf berufen.");
            strategyNote = "Prüfung und ggf. Erklärung der Einrede der Verjährung.";
            todos.push("Erklären Sie schriftlich, dass Sie sich auf die Verjährung berufen. Leisten Sie keine Zahlungen ohne vorherige Prüfung.");

        } else if (debtStatus === "nein") {
            riskLevel = "red";
            headline = "Forderung nach Ihrer Angabe unberechtigt";
            assessment.push("🔴 **Bestreitbare Forderung:** Sie geben an, dass kein Vertragsverhältnis oder kein offener Anspruch besteht.");

            if (isDisputed) {
                assessment.push("🟢 **Bereits bestritten:** Eine bestrittene Forderung darf nicht ohne Weiteres an Auskunfteien gemeldet werden.");
            } else {
                assessment.push("🟠 **Noch nicht bestritten:** Ohne Reaktion kann es zu weiteren Maßnahmen kommen. Eine klare schriftliche Stellungnahme ist sinnvoll.");
            }

            strategyNote = "Schriftlicher Widerspruch gegen die geltend gemachte Forderung.";
            todos.push("Teilen Sie dem Inkassounternehmen schriftlich mit, warum die Forderung nicht besteht (kurz und sachlich).");

        } else {
            riskLevel = "yellow";
            headline = "Grundforderung möglicherweise berechtigt";
            assessment.push("🟡 **Hinweis:** Wenn die ursprüngliche Forderung berechtigt ist, können weitere Kosten entstehen, wenn keine Reaktion erfolgt.");

            if (isDisputed) {
                assessment.push("🟠 **Trotz Bestreitens:** Das Inkasso muss die Forderung belegen. Die Hauptforderung kann – nach eigener Prüfung – separat beglichen werden.");
            } else {
                assessment.push("ℹ️ **Nebenkosten prüfen:** Inkassokosten müssen angemessen sein und sind im Zweifel überprüfbar.");
            }

            strategyNote = "Trennung zwischen Hauptforderung und Nebenforderungen prüfen.";
            todos.push("Prüfen Sie, ob eine direkte Zahlung der Hauptforderung an den ursprünglichen Gläubiger möglich ist.");
            todos.push("Kontrollieren Sie die geltend gemachten Zusatzkosten kritisch.");
        }

        // Allgemeine Hinweise
        todos.push("Kommunizieren Sie möglichst schriftlich und bewahren Sie Kopien auf.");
        todos.push("Sollte ein gerichtlicher Mahnbescheid eingehen, reagieren Sie fristgerecht, um rechtliche Nachteile zu vermeiden.");

        let bgCol = "#e2e3e5"; 
        let textCol = "#383d41";
        let icon = "ℹ️";

        if (riskLevel === "yellow") { bgCol = "#fff3cd"; textCol = "#856404"; icon = "🟡"; }
        if (riskLevel === "orange") { bgCol = "#ffe5d0"; textCol = "#e67e22"; icon = "🟠"; }
        if (riskLevel === "red") { bgCol = "#f8d7da"; textCol = "#721c24"; icon = "❗"; }

        const resultHtml = `
            <h2>Ersteinschätzung</h2>
            <div id="ik_result_card" class="result-card" style="border: 1px solid #ddd; padding: 20px; border-radius: 8px; background: #fff;">
                
                <div style="background:${bgCol}; color:${textCol}; padding:20px; border-radius:8px; text-align:center; margin-bottom:20px;">
                    <div style="font-size:3rem; margin-bottom:10px;">${icon}</div>
                    <h3 style="margin:0;">${headline}</h3>
                    <p>Genannte Forderungssumme: <strong>${euro(amount)}</strong></p>
                </div>

                <h3>Einordnung auf Basis Ihrer Angaben</h3>
                <ul style="list-style:none; padding:0;">
                    ${assessment.map(a => `<li style="margin-bottom:10px;">${a}</li>`).join('')}
                </ul>

                <h3>Mögliche nächste Schritte</h3>
                <ul>
                    ${todos.map(t => `<li>${t}</li>`).join('')}
                </ul>

                ${strategyNote ? `<p><strong>Hinweis:</strong> ${strategyNote}</p>` : ""}

                <p style="font-size:0.8rem; color:#777; text-align:center; margin-top:20px;">
                Diese automatische Einschätzung ersetzt keine individuelle Rechtsberatung. 
                Bei Unsicherheiten wenden Sie sich bitte an eine Schuldnerberatung oder die Verbraucherzentrale.
                </p>
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
