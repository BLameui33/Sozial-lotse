// inkasso-sofortcheck.js
// Logik zur Prüfung von Inkassoforderungen (Seriosität, Vollmacht, Bestreiten)
// YMYL-Optimiert: Objektive Handlungsempfehlungen statt pauschaler Rechtsberatung.

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
        register: document.getElementById("ik_register"),   // ja, nein, unsicher
        vollmacht: document.getElementById("ik_vollmacht"), // ja, nein, kopie
        betrag: document.getElementById("ik_betrag"),       // Zahl
        schuld: document.getElementById("ik_schuld"),       // ja, nein, verjaehrt
        bestritten: document.getElementById("ik_bestritten") // ja, nein
    };

    const btn = document.getElementById("ik_berechnen");
    const reset = document.getElementById("ik_reset");
    const out = document.getElementById("ik_ergebnis");

    // --- LOGIK ---
    btn.addEventListener("click", () => {
        out.innerHTML = ""; 

        // 1. Eingaben auslesen
        const isRegistered = inputs.register.value; 
        const hasVollmacht = inputs.vollmacht.value; 
        const amount = n(inputs.betrag);
        const debtStatus = inputs.schuld.value; 
        const isDisputed = inputs.bestritten.value === "ja";

        // Validierung
        if (amount <= 0) {
            out.innerHTML = `<div class="warning-box" style="background:#fff3cd; color:#856404; padding:10px; border-radius:4px;">Bitte geben Sie den geforderten Betrag an.</div>`;
            return;
        }

        // Variablen für Ergebnisse
        let headline = "Ergebnis Ihrer Ersteinschätzung";
        let riskLevel = "orange"; // Standard: Vorsicht
        let assessment = [];
        let todos = [];
        let strategyNote = "";

        // --- A. Seriositäts-Check (Rechtsdienstleistungsgesetz - RDG) ---
        if (isRegistered === "nein") {
            riskLevel = "red";
            assessment.push("🔴 **Warnsignal Register:** Das Unternehmen ist laut Ihrer Angabe nicht im Rechtsdienstleistungsregister eingetragen. Inkassotätigkeit ohne Registrierung ist in Deutschland unzulässig.");
            todos.push("Zahlen Sie vorerst nicht. Prüfen Sie den Absender genau (Google-Suche nach 'Fake Inkasso' + Firmenname).");
        } else if (isRegistered === "unsicher") {
            assessment.push("🟡 **Prüfung notwendig:** Seriöse Inkassobüros müssen registriert sein. Prüfen Sie dies kostenlos auf rechtsdienstleistungsregister.de.");
        } else {
            assessment.push("🟢 **Formal korrekt:** Das Unternehmen ist registriert und darf grundsätzlich Inkasso betreiben.");
        }
        
        // --- B. Vollmacht (§ 174 BGB) ---
        if (hasVollmacht === "nein" || hasVollmacht === "kopie") {
            // Vollmachtsrüge ist ein taktisches Mittel, aber kein Allheilmittel
            assessment.push("🟠 **Vollmacht fehlt im Original:** Sie haben das Recht, die Originalvollmacht des Gläubigers zu sehen (§ 174 BGB). Fehlt diese, können Sie die Forderung aus diesem Grund unverzüglich zurückweisen.");
            todos.push("Senden Sie ein Schreiben ('Vollmachtsrüge'), in dem Sie die Forderung zurückweisen, bis das Original vorliegt.");
        }

        // --- C. Schuld & Verjährung (Kernprüfung) ---
        if (debtStatus === "verjaehrt") {
            riskLevel = "red"; // Rot für den Gläubiger (er bekommt nichts)
            headline = "Einrede der Verjährung möglich";
            assessment.push("🔴 **Verjährung:** Wenn die Forderung verjährt ist (regelmäßig nach 3 Jahren zum Jahresende), ist sie nicht mehr durchsetzbar, wenn Sie sich darauf berufen.");
            strategyNote = "Erhebung der Einrede der Verjährung.";
            todos.push("Schreiben Sie dem Inkasso: 'Ich erhebe die Einrede der Verjährung.' Zahlen Sie nichts, sonst erkennen Sie die Schuld u.U. neu an.");
        
        } else if (debtStatus === "nein") {
            // Forderung besteht gar nicht (z.B. nie bestellt)
            riskLevel = "red";
            headline = "Forderung unberechtigt: Widerspruch nötig";
            assessment.push("🔴 **Keine Forderung:** Da Sie angeben, dass die Forderung nicht besteht (z.B. Identitätsdiebstahl, Retoure, nie bestellt), müssen Sie dies dem Inkasso mitteilen.");
            
            if (isDisputed) {
                assessment.push("🟢 **Bereits bestritten:** Gut! Eine bestrittene Forderung darf nicht an die SCHUFA gemeldet werden (§ 31 BDSG).");
            } else {
                assessment.push("⚠️ **Noch nicht bestritten:** Sie müssen aktiv werden. Schweigen kann als Zustimmung gewertet werden.");
            }
            
            strategyNote = "Vollumfänglicher Widerspruch gegen Haupt- und Nebenforderungen.";
            todos.push("Legen Sie schriftlich Widerspruch ein. Begründen Sie kurz (z.B. 'Ware wurde retourniert am...').");

        } else {
            // Schuld ist berechtigt (debtStatus === "ja")
            // Hier differenzieren: Hauptforderung vs. Inkassokosten
            riskLevel = "yellow";
            headline = "Berechtigte Forderung: Kosten minimieren";
            
            assessment.push("🟡 **Hauptforderung ist berechtigt:** Da die Ursprungsforderung (z.B. die Bestellung) berechtigt ist, sollten Sie diese **sofort** bezahlen. Sonst drohen weitere Kosten und ein Mahnbescheid.");
            
            if (isDisputed) {
                 assessment.push("🟠 **Widerspruch prüfenswert:** Da Sie bereits bestritten haben, muss das Inkasso Beweise liefern. Zahlen Sie die unstrittige Hauptforderung dennoch direkt an den Ursprungsgläubiger.");
            } else {
                 assessment.push("ℹ️ **Inkassokosten prüfen:** Oft sind die Gebühren zu hoch. Sie müssen Schadenersatz leisten, aber nur in angemessener Höhe.");
            }

            strategyNote = "Zahlung der Hauptforderung (zweckgebunden) + ggf. Prüfung der Nebenkosten.";
            todos.push("Überweisen Sie die **Hauptforderung + Mahngebühren des Ursprungsgläubigers** direkt an diesen (nicht ans Inkasso, wenn möglich).");
            todos.push("Geben Sie im Verwendungszweck an: 'Nur Hauptforderung + Zinsen'.");
            todos.push("Widersprechen Sie danach den überhöhten Inkassogebühren, falls diese unangemessen sind.");
        }
        
        // Allgemeine Sicherheitshinweise (YMYL Trust)
        todos.push("Kommunizieren Sie schriftlich (Einschreiben oder Fax mit Sendebericht).");
        todos.push("Sollte ein **gelber Brief vom Gericht (Mahnbescheid)** kommen: Reagieren Sie sofort (Widerspruch innerhalb von 2 Wochen), sonst wird die Forderung vollstreckbar!");

        // Styling Logik
        let bgCol = "#e2e3e5"; 
        let textCol = "#383d41";
        let icon = "ℹ️";

        if (riskLevel === "yellow") { bgCol = "#fff3cd"; textCol = "#856404"; icon = "🟡"; }
        if (riskLevel === "orange") { bgCol = "#ffe5d0"; textCol = "#e67e22"; icon = "🟠"; }
        if (riskLevel === "red") { bgCol = "#f8d7da"; textCol = "#721c24"; icon = "❗"; } // Rotes Ausrufezeichen als Warnung

        // HTML Output
        const resultHtml = `
            <h2>Ersteinschätzung</h2>
            <div id="ik_result_card" class="result-card" style="border: 1px solid #ddd; padding: 20px; border-radius: 8px; background: #fff;">
                
                <div style="background:${bgCol}; color:${textCol}; padding:20px; border-radius:8px; text-align:center; margin-bottom:20px; border:1px solid rgba(0,0,0,0.1);">
                    <div style="font-size:3rem; line-height:1; margin-bottom:10px;">${icon}</div>
                    <h3 style="margin:0; font-size:1.4rem;">${headline}</h3>
                    <p style="margin:5px 0 0 0;">Forderungshöhe: <strong>${euro(amount)}</strong></p>
                </div>

                <h3>Analyse der Situation</h3>
                <ul style="list-style-type: none; padding:0; margin-top:10px;">
                    ${assessment.map(a => `<li style="margin-bottom:10px; padding-left:24px; position:relative; text-indent: -24px;">${a}</li>`).join('')}
                </ul>
                
                <h3>Empfohlene nächste Schritte</h3>
                <div class="highlight-box" style="background-color:#f9f9f9; border:1px solid #ddd; border-left:4px solid #2980b9; padding:15px;">
                    <ul style="margin:0; padding-left:20px;">
                        ${todos.map(t => `<li style="margin-bottom:8px;">${t}</li>`).join('')}
                    </ul>
                </div>

                ${strategyNote ? `
                <div class="info-box" style="margin-top:20px; background-color: #e8f4f8; padding: 10px; border-radius: 4px;">
                    <strong>Empfohlene Strategie:</strong> ${strategyNote}
                </div>` : ''}

                <div class="button-container" style="display:flex; gap:10px; margin-top:20px; flex-wrap:wrap;">
                    <button id="ik_pdf_btn" class="button-secondary">📄 Ergebnis als PDF speichern</button>
                </div>
                
                <p style="font-size: 0.8rem; color: #777; margin-top: 20px; text-align: center;">
                    Hinweis: Dies ist eine automatische Ersteinschätzung basierend auf Ihren Angaben. Sie ersetzt keine Rechtsberatung. Wenden Sie sich bei Unsicherheiten an eine Schuldnerberatung oder die Verbraucherzentrale.
                </p>
            </div>
        `;

        out.innerHTML = resultHtml;
        out.scrollIntoView({ behavior: "smooth" });

        // --- PDF EXPORT (Robust mit html2pdf.js) ---
        setTimeout(() => {
            const pdfBtn = document.getElementById("ik_pdf_btn");
            const elementToPrint = document.getElementById("ik_result_card");

            if(pdfBtn && elementToPrint) {
                pdfBtn.addEventListener("click", () => {
                    const originalText = pdfBtn.innerText;
                    pdfBtn.innerText = "⏳ PDF wird erstellt...";
                    
                    // Klonen, um das Layout für den Druck zu optimieren
                    const clonedElement = elementToPrint.cloneNode(true);
                    
                    // Buttons im PDF ausblenden
                    const btnContainer = clonedElement.querySelector('.button-container');
                    if(btnContainer) btnContainer.style.display = 'none';

                    // Temporär einfügen (außerhalb des Sichtbereichs)
                    clonedElement.style.position = 'absolute';
                    clonedElement.style.left = '-9999px';
                    clonedElement.style.width = '700px'; // Feste Breite für A4 Konsistenz
                    clonedElement.style.backgroundColor = '#ffffff';
                    document.body.appendChild(clonedElement);

                    const opt = {
                        margin:       [10, 10, 10, 10], // mm
                        filename:     'Inkasso-Check-Ergebnis.pdf',
                        image:        { type: 'jpeg', quality: 0.98 },
                        html2canvas:  { scale: 2, useCORS: true, logging: false },
                        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
                    };

                    html2pdf().from(clonedElement).set(opt).save().then(() => {
                        document.body.removeChild(clonedElement);
                        pdfBtn.innerText = originalText;
                    }).catch(err => {
                        console.error("PDF Fehler:", err);
                        pdfBtn.innerText = "Fehler beim Erstellen";
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
