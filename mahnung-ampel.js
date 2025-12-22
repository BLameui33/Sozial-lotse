// mahnung-ampel.js
// Tool zur strukturierten Einschätzung des Eskalationsrisikos bei offenen Forderungen.
// Hinweis: Keine Rechtsberatung. Die Ergebnisse dienen ausschließlich der Orientierung.

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
        betrag: document.getElementById("mr_betrag"),
        stufe: document.getElementById("mr_stufe"),
        vereinbarung: document.getElementById("mr_vereinbarung")
    };

    const btn = document.getElementById("mr_berechnen");
    const reset = document.getElementById("mr_reset");
    const out = document.getElementById("mr_ergebnis");

    btn.addEventListener("click", () => {
        out.innerHTML = ""; 

        const amount = n(inputs.betrag);
        const level = inputs.stufe.value; 
        const agreement = inputs.vereinbarung.value; 

        if (amount <= 0) {
            out.innerHTML = `<div class="warning-box" style="background:#fff3cd; color:#856404; padding:10px; border-radius:4px;">
            Bitte geben Sie einen offenen Betrag an, um eine Einschätzung zu erhalten.
            </div>`;
            return;
        }

        let colorCode = "green";
        let headline = "";
        let analysis = "";
        let todos = [];
        let urgentNote = "";

        // --- RISIKO-EINORDNUNG ---

        // Gerichtlicher Mahnbescheid
        if (level === "mb") {
            colorCode = "red";
            headline = "Sehr dringender Handlungsbedarf: Gerichtlicher Mahnbescheid";
            analysis = "Sie geben an, ein Schreiben vom Amtsgericht erhalten zu haben. Dabei handelt es sich nicht mehr um eine einfache Mahnung, sondern um einen formellen gerichtlichen Schritt.";
            
            urgentNote = "Für einen Widerspruch gilt eine gesetzliche Frist von 14 Tagen ab Zustellung.";
            
            todos.push("Prüfen Sie sorgfältig, ob die Forderung Ihrer Ansicht nach berechtigt ist.");
            todos.push("Wenn Sie die Forderung bestreiten möchten, nutzen Sie den offiziellen Widerspruchsvordruck des Gerichts innerhalb der Frist.");
            todos.push("Wenn Sie die Forderung anerkennen, kann eine zeitnahe Zahlung weitere Schritte vermeiden.");

        // Gebrochene Ratenzahlung
        } else if (agreement === "gebrochen") {
            colorCode = "red";
            headline = "Erhöhtes Risiko nach Nichteinhaltung einer Vereinbarung";
            analysis = "Wenn eine vereinbarte Ratenzahlung nicht eingehalten wird, können Gläubiger weitere Maßnahmen prüfen oder zusätzliche Stellen einschalten.";
            
            todos.push("Nehmen Sie zeitnah Kontakt mit dem Gläubiger auf und erläutern Sie Ihre Situation.");
            todos.push("Prüfen Sie, ob eine kurzfristige Teilzahlung möglich ist.");
            todos.push("Erwägen Sie, einen neuen realistischen Zahlungsplan vorzuschlagen.");

        // Inkasso oder letzte Mahnung
        } else if (level === "inkasso" || level === "3") {
            colorCode = "orange";
            headline = "Kritische Phase: Zusätzliche Kosten möglich";
            
            if (level === "inkasso") {
                analysis = "Nach Ihrer Angabe wurde ein Inkassounternehmen eingeschaltet. Dadurch können zusätzliche Gebühren entstehen. Nicht jede Kostenposition ist automatisch berechtigt.";
                todos.push("Überprüfen Sie die geltend gemachten Inkassokosten sorgfältig.");
            } else {
                analysis = "Dies scheint eine fortgeschrittene Mahnstufe zu sein. Häufig folgt danach die Übergabe an Inkasso oder anwaltliche Vertretung.";
            }
            
            todos.push("Wenn möglich, klären Sie die Forderung zeitnah, um weitere Kosten zu vermeiden.");
            todos.push("Falls eine Zahlung aktuell nicht möglich ist, kann eine Schuldnerberatungsstelle unterstützen.");

        // Laufende Vereinbarung
        } else if (agreement === "ja") {
            colorCode = "green";
            headline = "Aktuell stabile Situation";
            analysis = "Solange die vereinbarte Ratenzahlung eingehalten wird, bestehen in der Regel keine unmittelbaren weiteren Schritte.";
            
            todos.push("Achten Sie auf pünktliche Zahlungen, z.B. per Dauerauftrag.");
            todos.push("Sollten sich finanzielle Schwierigkeiten abzeichnen, informieren Sie den Gläubiger frühzeitig.");

        // Frühe Mahnstufen
        } else {
            if (level === "2") {
                colorCode = "yellow";
                headline = "Früher Handlungsbedarf";
                analysis = "Es fallen möglicherweise erste Mahngebühren an. Rechtliche Schritte sind in dieser Phase meist noch nicht eingeleitet.";
                todos.push("Prüfen Sie die Forderung und begleichen Sie sie zeitnah, sofern sie berechtigt ist.");
            } else {
                colorCode = "green";
                headline = "Zahlungserinnerung";
                analysis = "Diese Stufe ist häufig noch mit geringen oder keinen Zusatzkosten verbunden.";
                todos.push("Prüfen Sie, ob die Zahlung bereits erfolgt ist oder zeitnah erfolgen kann.");
            }
        }

        // Styling
        let bgCol = "#d4edda"; 
        let textCol = "#155724";
        let icon = "🟢";

        if (colorCode === "yellow") { bgCol = "#fff3cd"; textCol = "#856404"; icon = "🟡"; }
        if (colorCode === "orange") { bgCol = "#ffe5d0"; textCol = "#e67e22"; icon = "🟠"; }
        if (colorCode === "red") { bgCol = "#f8d7da"; textCol = "#721c24"; icon = "🔴"; }

        const resultHtml = `
            <h2>Ergebnis Ihrer Orientierungshilfe</h2>
            <div id="mr_result_card" class="result-card" style="border: 1px solid #ddd; padding: 20px; border-radius: 8px; background: #fff;">
                
                <div style="background:${bgCol}; color:${textCol}; padding:20px; border-radius:8px; text-align:center; margin-bottom:20px;">
                    <div style="font-size:3rem; margin-bottom:10px;">${icon}</div>
                    <h3 style="margin:0;">${headline}</h3>
                    ${urgentNote ? `<p style="font-weight:bold; margin-top:10px;">${urgentNote}</p>` : ''}
                </div>

                <h3>Einordnung auf Basis Ihrer Angaben</h3>
                <p>${analysis}</p>
                <p><strong>Genannter Betrag:</strong> ${euro(amount)}</p>

                <h3>Mögliche nächste Schritte</h3>
                <ul>
                    ${todos.map(t => `<li>${t}</li>`).join('')}
                </ul>

                ${amount > 1300 && (colorCode === 'red' || colorCode === 'orange') ? 
                `<div class="warning-box" style="margin-top:20px; background-color:#fff8e1; padding:15px;">
                    <strong>Hinweis:</strong> Bei höheren Schulden kann es sinnvoll sein, sich über Schutzmechanismen wie ein Pfändungsschutzkonto (P-Konto) zu informieren.
                 </div>` : ''}

                <p style="font-size:0.8rem; color:#777; margin-top:20px; text-align:center;">
                    Diese Einschätzung dient der allgemeinen Orientierung und ersetzt keine individuelle Rechts- oder Schuldnerberatung.
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
