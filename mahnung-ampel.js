// mahnung-ampel.js
// Bewertet das Eskalationsrisiko bei Schulden/Mahnungen
// YMYL-Optimiert: Klare Unterscheidung zwischen privatem Inkasso und gerichtlichem Mahnverfahren.

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
        stufe: document.getElementById("mr_stufe"),         // 1, 2, 3, inkasso, mb
        vereinbarung: document.getElementById("mr_vereinbarung") // nein, ja, gebrochen
    };

    const btn = document.getElementById("mr_berechnen");
    const reset = document.getElementById("mr_reset");
    const out = document.getElementById("mr_ergebnis");

    // --- LOGIK ---
    btn.addEventListener("click", () => {
        out.innerHTML = ""; 

        const amount = n(inputs.betrag);
        const level = inputs.stufe.value; 
        const agreement = inputs.vereinbarung.value; 

        if (amount <= 0) {
            out.innerHTML = `<div class="warning-box" style="background:#fff3cd; color:#856404; padding:10px; border-radius:4px;">Bitte geben Sie einen Betrag größer 0 an.</div>`;
            return;
        }

        // Variablen initialisieren
        let colorCode = "green"; // green, yellow, orange, red
        let headline = "";
        let analysis = "";
        let todos = [];
        let urgentNote = "";

        // --- RISIKO-ANALYSE ---

        // Prio 1: Gerichtlicher Mahnbescheid (Der "Gelbe Brief")
        if (level === "mb") {
            colorCode = "red";
            headline = "AKUTE GEFAHR: Gerichtlicher Mahnbescheid";
            analysis = "Sie haben Post vom Amtsgericht erhalten. Dies ist <strong>keine normale Mahnung</strong> mehr! Wenn Sie jetzt nichts tun, wird die Forderung in wenigen Wochen vollstreckbar (Gerichtsvollzieher/Kontopfändung), selbst wenn sie unberechtigt war.";
            
            urgentNote = "Handeln Sie sofort! Die Frist beträgt genau 2 Wochen ab Zustellung.";
            
            todos.push("<strong>Schritt 1:</strong> Prüfen Sie sofort: Ist die Forderung berechtigt?");
            todos.push("<strong>Wenn NEIN:</strong> Senden Sie den beiliegenden Widerspruchsvordruck binnen 14 Tagen an das Gericht zurück (Einschreiben).");
            todos.push("<strong>Wenn JA:</strong> Zahlen Sie sofort die Gesamtsumme, um einen Vollstreckungsbescheid zu verhindern.");

        // Prio 2: Gebrochene Ratenzahlungsvereinbarung
        } else if (agreement === "gebrochen") {
            colorCode = "red";
            headline = "Hohes Risiko: Vereinbarung geplatzt";
            analysis = "Da die vereinbarte Ratenzahlung nicht eingehalten wurde, wird meist die <strong>gesamte Restschuld sofort fällig</strong>. Der Gläubiger wird vermutlich Inkasso oder Anwälte einschalten.";
            
            todos.push("Rufen Sie den Gläubiger **heute** an. Erklären Sie ehrlich, warum die Rate ausgefallen ist.");
            todos.push("Bieten Sie sofort eine Ersatz-Zahlung an, um 'Goodwill' zu zeigen.");
            todos.push("Schlagen Sie schriftlich einen neuen, realistischen Ratenplan vor.");

        // Prio 3: Inkasso oder Letzte Mahnung
        } else if (level === "inkasso" || level === "3") {
            colorCode = "orange";
            headline = "Kritische Phase: Kostenfalle";
            
            if (level === "inkasso") {
                analysis = "Ein Inkassobüro wurde beauftragt. Das verursacht hohe Zusatzkosten. Ein SCHUFA-Eintrag droht, wenn die Forderung unbestritten bleibt.";
                todos.push("Prüfen Sie die Inkasso-Gebühren (oft überhöht!). Zahlen Sie nur berechtigte Kosten.");
            } else {
                analysis = "Dies ist die letzte Warnung vor der Übergabe an ein Inkassobüro oder einen Anwalt. Handeln Sie jetzt, um teure Gebühren zu vermeiden.";
            }
            
            todos.push("Wenn Sie zahlen können: Überweisen Sie sofort (am besten direkt an den Ursprungsgläubiger).");
            todos.push("Wenn Sie NICHT zahlen können: Suchen Sie eine Schuldnerberatung auf. Ignorieren macht es teurer!");

        // Prio 4: Vereinbarung läuft aktiv
        } else if (agreement === "ja") {
            colorCode = "green";
            headline = "Situation unter Kontrolle";
            analysis = "Solange Sie die vereinbarte Ratenzahlung pünktlich leisten, sind keine weiteren rechtlichen Schritte zu befürchten.";
            
            todos.push("Richten Sie einen Dauerauftrag ein, um keine Rate zu vergessen.");
            todos.push("Sollte es finanziell eng werden: Melden Sie sich **vor** der Fälligkeit beim Gläubiger.");

        // Prio 5: Frühe Mahnstufen
        } else {
            // Stufe 1 oder 2
            if (level === "2") {
                colorCode = "yellow";
                headline = "Handlungsbedarf: Erste Gebühren";
                analysis = "Es fallen erste Mahngebühren an. Noch besteht keine akute Gefahr für SCHUFA oder Gericht, aber das Zeitfenster schließt sich.";
                todos.push("Zahlen Sie die Rechnung jetzt, um weitere Kosten zu vermeiden.");
            } else {
                colorCode = "green";
                headline = "Zahlungserinnerung";
                analysis = "Das kann jedem mal passieren. In dieser Stufe fallen oft noch keine oder nur sehr geringe Gebühren an.";
                todos.push("Überweisen Sie den Betrag in den nächsten Tagen.");
                todos.push("Prüfen Sie, ob sich Ihre Zahlung mit dem Brief überschnitten hat.");
            }
        }

        // Styling Logik
        let bgCol = "#d4edda"; 
        let textCol = "#155724";
        let icon = "🟢";

        if (colorCode === "yellow") { bgCol = "#fff3cd"; textCol = "#856404"; icon = "🟡"; }
        if (colorCode === "orange") { bgCol = "#ffe5d0"; textCol = "#e67e22"; icon = "🟠"; }
        if (colorCode === "red") { bgCol = "#f8d7da"; textCol = "#721c24"; icon = "🔴"; }

        // HTML Output
        const resultHtml = `
            <h2>Ergebnis Ihres Risiko-Checks</h2>
            <div id="mr_result_card" class="result-card" style="border: 1px solid #ddd; padding: 20px; border-radius: 8px; background: #fff;">
                
                <div style="background:${bgCol}; color:${textCol}; padding:20px; border-radius:8px; text-align:center; margin-bottom:20px; border:1px solid rgba(0,0,0,0.1);">
                    <div style="font-size:3rem; line-height:1; margin-bottom:10px;">${icon}</div>
                    <h3 style="margin:0; font-size:1.4rem;">${headline}</h3>
                    ${urgentNote ? `<p style="font-weight:bold; margin-top:10px;">${urgentNote}</p>` : ''}
                </div>

                <h3>Analyse der Lage</h3>
                <p>${analysis}</p>
                <p><strong>Offener Betrag:</strong> ${euro(amount)}</p>

                <h3>Empfohlene nächste Schritte</h3>
                <div class="highlight-box" style="background-color:#f9f9f9; border:1px solid #ddd; border-left:4px solid ${colorCode === 'red' ? '#c0392b' : '#2980b9'}; padding:15px;">
                    <ul style="margin:0; padding-left:20px;">
                        ${todos.map(t => `<li style="margin-bottom:8px;">${t}</li>`).join('')}
                    </ul>
                </div>

                ${amount > 1300 && (colorCode === 'red' || colorCode === 'orange') ? 
                `<div class="warning-box" style="margin-top:20px; background-color: #fff8e1; border: 1px solid #ffcc00; padding: 15px; border-radius: 5px;">
                    <strong>Wichtiger Tipp:</strong> Bei Schulden in dieser Höhe (${euro(amount)}) und drohender Zwangsvollstreckung sollten Sie über ein <strong>P-Konto</strong> (Pfändungsschutzkonto) nachdenken, um Ihren monatlichen Grundfreibetrag zu sichern.
                 </div>` : ''}

                <div class="button-container" style="display:flex; gap:10px; margin-top:20px; flex-wrap:wrap;">
                    <button id="mr_pdf_btn" class="button-secondary">📄 Checkliste als PDF speichern</button>
                </div>
                
                <p style="font-size: 0.8rem; color: #777; margin-top: 20px; text-align: center;">
                    Hinweis: Dies ist eine automatische Einschätzung zur Orientierung. Sie ersetzt keine Rechtsberatung.
                </p>
            </div>
        `;

        out.innerHTML = resultHtml;
        out.scrollIntoView({ behavior: "smooth" });

        // --- PDF EXPORT (Robust mit cloneNode) ---
        setTimeout(() => {
            const pdfBtn = document.getElementById("mr_pdf_btn"); // ID korrigiert!
            const elementToPrint = document.getElementById("mr_result_card"); // ID korrigiert!

            if(pdfBtn && elementToPrint) {
                pdfBtn.addEventListener("click", () => {
                    const originalText = pdfBtn.innerText;
                    pdfBtn.innerText = "⏳ PDF wird erstellt...";
                    
                    // Klonen für sauberen Druck
                    const clonedElement = elementToPrint.cloneNode(true);
                    
                    // Buttons ausblenden
                    const btnContainer = clonedElement.querySelector('.button-container');
                    if(btnContainer) btnContainer.style.display = 'none';

                    // Temporär einfügen
                    clonedElement.style.position = 'absolute';
                    clonedElement.style.left = '-9999px';
                    clonedElement.style.width = '700px'; 
                    clonedElement.style.backgroundColor = '#ffffff';
                    document.body.appendChild(clonedElement);

                    const opt = {
                        margin:       [10, 10], 
                        filename:     'Mahnungs-Check-Ergebnis.pdf',
                        image:        { type: 'jpeg', quality: 0.98 },
                        html2canvas:  { scale: 2, useCORS: true, logging: false },
                        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
                    };

                    html2pdf().from(clonedElement).set(opt).save().then(() => {
                        document.body.removeChild(clonedElement);
                        pdfBtn.innerText = originalText;
                    }).catch(err => {
                        console.error("PDF Fehler:", err);
                        pdfBtn.innerText = "Fehler!";
                        document.body.removeChild(clonedElement);
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
