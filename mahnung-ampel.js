// mahnung-ampel.js
// Bewertet das Eskalationsrisiko bei Schulden/Mahnungen

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

    // --- LOGIK ---
    btn.addEventListener("click", () => {
        out.innerHTML = ""; 

        const amount = n(inputs.betrag);
        const level = inputs.stufe.value; // 1, 2, 3, inkasso, mb
        const agreement = inputs.vereinbarung.value; // nein, ja, gebrochen

        if (amount <= 0) {
            out.innerHTML = `<div class="warning-box" style="background:#fff3cd; color:#856404;">Bitte gib einen Betrag größer 0 an.</div>`;
            return;
        }

        // Ampel-Logik
        let colorCode = "green"; // green, yellow, orange, red
        let headline = "";
        let analysis = "";
        let todos = [];

        // Priorität 1: Gerichtlicher Mahnbescheid (Gelber Brief)
        if (level === "mb") {
            colorCode = "red";
            headline = "AKUTE GEFAHR: Gerichtlicher Mahnbescheid";
            analysis = "Dies ist kein normales Mahnschreiben mehr. Ein Gericht wurde eingeschaltet. Wenn du nicht reagierst, wird die Forderung vollstreckbar (Titel).";
            todos.push("<strong>Sofort (binnen 2 Wochen):</strong> Prüfen, ob Forderung berechtigt ist.");
            todos.push("Wenn unberechtigt: Dem Gericht den beiliegenden Widerspruch senden.");
            todos.push("Wenn berechtigt: Sofort zahlen oder Gläubiger kontaktieren, um Vollstreckungsbescheid zu verhindern.");
        
        // Priorität 2: Gebrochene Vereinbarung
        } else if (agreement === "gebrochen") {
            colorCode = "red";
            headline = "Hohes Risiko: Vereinbarung geplatzt";
            analysis = "Da die Ratenzahlung nicht eingehalten wurde, kann der Gläubiger sofort die Gesamtsumme fordern und Inkasso/Gericht einschalten.";
            todos.push("Sofort anrufen und Grund für Ausfall erklären.");
            todos.push("Versuchen, die Vereinbarung wiederzubeleben (Goodwill zeigen).");

        // Priorität 3: Inkasso / Letzte Mahnung
        } else if (level === "inkasso" || level === "3") {
            colorCode = "orange";
            headline = "Kritische Phase: Kosten steigen";
            analysis = level === "inkasso" 
                ? "Ein Inkassobüro wurde beauftragt. Das erhöht die Kosten deutlich. Der Schufa-Score ist gefährdet."
                : "Dies ist die letzte Warnung vor der Abgabe an Inkasso oder Anwälte.";
            
            todos.push("Prüfe die Inkasso-Gebühren (oft überhöht!).");
            todos.push("Zahle die Hauptforderung direkt an den Ursprungs-Gläubiger (wenn möglich).");
            todos.push("Suche eine Schuldnerberatung auf, wenn du nicht zahlen kannst.");

        // Priorität 4: Vereinbarung aktiv
        } else if (agreement === "ja") {
            colorCode = "green";
            headline = "Alles unter Kontrolle";
            analysis = "Solange du die vereinbarte Ratenzahlung pünktlich leistest, drohen keine weiteren Schritte.";
            todos.push("Dauerauftrag einrichten, um keine Rate zu vergessen.");
            todos.push("Bei engem Monat: Frühzeitig melden, nicht erst platzen lassen.");

        // Priorität 5: Frühe Mahnstufen
        } else {
            // Stufe 1 oder 2
            if (level === "2") {
                colorCode = "yellow";
                headline = "Handlungsbedarf: Mahngebühren";
                analysis = "Es fallen erste Mahngebühren an. Noch keine Gefahr für Schufa oder Gericht, aber Zeitfenster schließt sich.";
                todos.push("Zahle sofort oder vereinbare einen Termin.");
            } else {
                colorCode = "green";
                headline = "Zahlungserinnerung";
                analysis = "Passiert jedem mal. Oft fallen noch keine Gebühren an.";
                todos.push("Überweisen und gut ist.");
                todos.push("Prüfen, ob Zahlung sich mit Brief überschnitten hat.");
            }
        }

        // Styling Variablen
        let bgCol = "#d4edda"; 
        let textCol = "#155724";
        let icon = "🟢";

        if (colorCode === "yellow") { bgCol = "#fff3cd"; textCol = "#856404"; icon = "🟡"; }
        if (colorCode === "orange") { bgCol = "#ffe5d0"; textCol = "#e67e22"; icon = "🟠"; }
        if (colorCode === "red") { bgCol = "#f8d7da"; textCol = "#721c24"; icon = "🔴"; }


        // HTML Output
        const resultHtml = `
            <h2>Dein Risiko-Check</h2>
            <div id="mr_result_card" class="pflegegrad-result-card">
                
                <div style="background:${bgCol}; color:${textCol}; padding:20px; border-radius:8px; text-align:center; margin-bottom:20px; border:1px solid rgba(0,0,0,0.1);">
                    <div style="font-size:3rem; line-height:1; margin-bottom:10px;">${icon}</div>
                    <h3 style="margin:0; font-size:1.4rem;">${headline}</h3>
                </div>

                <h3>Analyse</h3>
                <p>${analysis}</p>
                <p><strong>Forderungshöhe:</strong> ${euro(amount)}</p>

                <h3>Empfohlene Schritte</h3>
                <div class="highlight-box" style="background-color:#fff; border:1px solid #ddd; border-left:4px solid ${colorCode === 'red' ? '#c0392b' : '#2980b9'};">
                    <ul style="margin:0; padding-left:20px;">
                        ${todos.map(t => `<li style="margin-bottom:8px;">${t}</li>`).join('')}
                    </ul>
                </div>

                ${amount > 1000 && (colorCode === 'red' || colorCode === 'orange') ? 
                `<div class="warning-box" style="margin-top:15px;">
                    <strong>Tipp:</strong> Bei hohen Schulden (${euro(amount)}) und akuter Gefahr (Pfändung) solltest du ein <strong>P-Konto</strong> (Pfändungsschutzkonto) bei deiner Bank einrichten, um den Grundfreibetrag zu sichern.
                 </div>` : ''}

                <div class="button-container" style="display:flex; gap:10px; margin-top:20px; flex-wrap:wrap;">
                    <button id="mr_pdf_btn" class="button">📄 Checkliste als PDF</button>
                </div>
            </div>
        `;

        out.innerHTML = resultHtml;
        out.scrollIntoView({ behavior: "smooth" });

        // --- PDF EXPORT (STABILE KLON-METHODE) ---
        // --- PDF EXPORT (KORRIGIERTE VERSION) ---
        setTimeout(() => {
            const pdfBtn = document.getElementById("rp_pdf_btn");
            const elementToPrint = document.getElementById("rp_result_card");

            if(pdfBtn && elementToPrint) {
                pdfBtn.addEventListener("click", () => {
                    const originalText = pdfBtn.innerText;
                    pdfBtn.innerText = "⏳ Wird erstellt...";
                    
                    // 1. Buttons im Original-Element kurz ausblenden
                    const btnContainer = elementToPrint.querySelector('.button-container');
                    let originalDisplay = '';
                    if(btnContainer) {
                        originalDisplay = btnContainer.style.display; // Alten Zustand merken
                        btnContainer.style.display = 'none'; // Ausblenden
                    }

                    // Sicherstellen, dass der Hintergrund weiß ist (wichtig für JPEGs)
                    const originalBg = elementToPrint.style.backgroundColor;
                    elementToPrint.style.backgroundColor = "#ffffff";

                    const opt = {
                        margin:       [10, 10], // Ränder in mm (besser als Inch)
                        filename:     'mahnung-uebersicht.pdf',
                        image:        { type: 'jpeg', quality: 0.98 },
                        html2canvas:  { scale: 2, useCORS: true, logging: false }, // Scale 2 sorgt für scharfe Schrift
                        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
                    };

                    // PDF vom ORIGINAL Element erstellen
                    html2pdf().from(elementToPrint).set(opt).save()
                    .then(() => {
                        // 2. Alles wieder zurücksetzen (Buttons einblenden)
                        if(btnContainer) btnContainer.style.display = originalDisplay;
                        elementToPrint.style.backgroundColor = originalBg;
                        pdfBtn.innerText = originalText;
                    })
                    .catch(err => {
                        console.error(err);
                        // Auch im Fehlerfall zurücksetzen
                        if(btnContainer) btnContainer.style.display = originalDisplay;
                        elementToPrint.style.backgroundColor = originalBg;
                        pdfBtn.innerText = "Fehler!";
                    });
                });
            }
        }, 500);
    });

    if (reset) {
        reset.addEventListener("click", () => {
            setTimeout(() => { out.innerHTML = ""; }, 50);
        });
    }
});