// inkasso-sofortcheck.js
// Logik zur Prüfung von Inkassoforderungen (Seriosität, Vollmacht, Bestreiten)

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

    // --- LOGIK ---
    btn.addEventListener("click", () => {
        out.innerHTML = ""; 

        // 1. Eingaben
        const isRegistered = inputs.register.value; // ja, nein, unsicher
        const hasVollmacht = inputs.vollmacht.value; // ja, nein, kopie
        const amount = n(inputs.betrag);
        const debtStatus = inputs.schuld.value; // ja, nein, verjaehrt
        const isDisputed = inputs.bestritten.value === "ja";

        if (amount <= 0) {
            out.innerHTML = `<div class="warning-box" style="background:#fff3cd; color:#856404;">Bitte gib den geforderten Betrag an.</div>`;
            return;
        }

        let headline = "Sofortiger Handlungsbedarf: Klare Strategie nötig";
        let riskLevel = "orange";
        let assessment = [];
        let todos = [];
        let musterBriefText = "";


        // --- A. Seriositäts-Check ---
        if (isRegistered === "nein") {
            riskLevel = "red";
            assessment.push("🔴 **ACHTUNG: Nicht im Register!** Die Forderung ist wahrscheinlich nicht seriös. Keinen Cent zahlen. Droht Ignoranz.");
        } else if (isRegistered === "unsicher") {
            assessment.push("🟡 **Seriosität prüfen:** Suche die Firma sofort im Rechtsdienstleistungsregister. Seriöse Büros sind dort registriert.");
        } else {
            assessment.push("🟢 **Registrierung bestätigt:** Das Inkassobüro scheint seriös zu sein (kein Fake-Inkasso).");
        }
        
        // --- B. Vollmacht prüfen (häufigster Angriffspunkt) ---
        if (hasVollmacht === "nein" || hasVollmacht === "kopie") {
            riskLevel = (riskLevel === "red") ? "red" : "orange"; // Wenn schon rot, bleibt es rot
            assessment.push("🟠 **Fehlende Vollmacht:** Fordere die Original-Vollmacht des Gläubigers an. Ohne Vollmacht kann das Inkasso nicht handeln!");
            todos.push("Sende einen Brief, in dem du die Forderung gemäß § 174 BGB zurückweist, solange die Original-Vollmacht fehlt.");
        }

        // --- C. Schuld prüfen ---
        if (debtStatus === "nein" || debtStatus === "verjaehrt") {
            riskLevel = "red";
            headline = "AKUT: Forderung ist unberechtigt oder verjährt!";
            
            if (debtStatus === "nein") {
                assessment.push("🔴 **Forderung unberechtigt:** Bestreite die Hauptforderung sofort (Widerspruch). Der Gläubiger kann Inkassokosten nicht auf dich abwälzen, wenn die Forderung bestritten ist.");
                musterBriefText = "Widerspruch gegen die Hauptforderung und Ablehnung der Inkassokosten.";
                todos.push("Sende einen Brief mit 'Hiermit widerspreche ich der Forderung vollumfänglich.' (Einschreiben!)");
            } else {
                assessment.push("🔴 **Verjährung:** Wenn die Verjährungsfrist (meist 3 Jahre) abgelaufen ist, kann die Forderung nicht mehr durchgesetzt werden.");
                musterBriefText = "Erhebung der Verjährungseinrede.";
                todos.push("Sende einen Brief mit der **Einrede der Verjährung** an das Inkassobüro.");
            }
        } else if (isDisputed) {
             riskLevel = (riskLevel === "red") ? "red" : "yellow";
             assessment.push("🟡 **Bereits bestritten:** Da die Forderung bereits bestritten wurde, hat der Gläubiger Inkassokosten nicht zu tragen. Du musst nur die ursprüngliche Hauptforderung + Zinsen zahlen.");
             todos.push("Zahle die unbestrittenen Hauptforderungen und Zinsen, aber weise die Inkassogebühren als unberechtigt zurück.");
        } else {
            // Schuld ist berechtigt, aber nicht bestritten
            riskLevel = (riskLevel === "red") ? "red" : "yellow";
            assessment.push("🟡 **Schuld ist berechtigt:** Zahle die Hauptforderung + Zinsen schnellstmöglich. Die Inkassokosten bleiben streitbar.");
            musterBriefText = "Zahlung der Hauptforderung und Zurückweisung der Inkassogebühren.";
            todos.push("Prüfe die Höhe der Inkassogebühren. Diese sind oft zu hoch! Zahle nur die Hauptforderung und Zinsen.");
        }
        
        // Allgemeine To-Dos
        todos.push("Sende alle Briefe **per Einschreiben mit Rückschein** (als Beweis).");
        todos.push("Sollte ein gerichtlicher **Mahnbescheid** kommen, **widersprichst du diesem SOFORT**, um einen Vollstreckungstitel zu verhindern.");
        
        // Risikostufe anpassen
        if (riskLevel === "red") {
            headline = "AKUTE GEFAHR: Sofort widersprechen / Nicht zahlen";
        } else if (riskLevel === "yellow") {
            headline = "Berechtigte Schuld: Kosten minimieren";
        }


        // Styling Variablen
        let bgCol = "#d4edda"; 
        let textCol = "#155724";
        let icon = "🟢";

        if (riskLevel === "yellow") { bgCol = "#fff3cd"; textCol = "#856404"; icon = "🟡"; }
        if (riskLevel === "orange") { bgCol = "#ffe5d0"; textCol = "#e67e22"; icon = "🟠"; }
        if (riskLevel === "red") { bgCol = "#f8d7da"; textCol = "#721c24"; icon = "🔴"; }


        // HTML Output
        const resultHtml = `
            <h2>Deine Sofort-Analyse</h2>
            <div id="ik_result_card" class="pflegegrad-result-card">
                
                <div style="background:${bgCol}; color:${textCol}; padding:20px; border-radius:8px; text-align:center; margin-bottom:20px; border:1px solid rgba(0,0,0,0.1);">
                    <div style="font-size:3rem; line-height:1; margin-bottom:10px;">${icon}</div>
                    <h3 style="margin:0; font-size:1.4rem;">${headline}</h3>
                    <p style="margin:5px 0 0 0;">Gesamtforderung: <strong>${euro(amount)}</strong></p>
                </div>

                <h3>Wesentliche Schwachstellen</h3>
                <ul style="list-style-type: none; padding:0; margin-top:10px;">
                    ${assessment.map(a => `<li style="margin-bottom:8px; padding-left:20px; position:relative;">${a}</li>`).join('')}
                </ul>
                
                <h3>Deine To-Do-Liste (Priorität)</h3>
                <div class="highlight-box" style="background-color:#fff; border:1px solid #ddd; border-left:4px solid #c0392b;">
                    <ul style="margin:0; padding-left:20px;">
                        ${todos.map(t => `<li style="margin-bottom:8px;">${t}</li>`).join('')}
                        <li>Solltest du nicht in der Lage sein, die Hauptforderung zu zahlen, kontaktiere sofort eine **Schuldnerberatung**.</li>
                    </ul>
                </div>

                <div class="warning-box" style="margin-top:20px;">
                    <strong>Musterbrief-Vorbereitung:</strong> Dein Schreiben sollte den Inhalt: <strong>"${musterBriefText}"</strong> enthalten.
                </div>

                <div class="button-container" style="display:flex; gap:10px; margin-top:20px; flex-wrap:wrap;">
                    <button id="ik_pdf_btn" class="button">📄 Checkliste als PDF</button>
                </div>
            </div>
        `;

        out.innerHTML = resultHtml;
        out.scrollIntoView({ behavior: "smooth" });

        // --- PDF EXPORT (STABILE KLON-METHODE) ---
        setTimeout(() => {
            const pdfBtn = document.getElementById("ik_pdf_btn");
            const elementToPrint = document.getElementById("ik_result_card");

            if(pdfBtn && elementToPrint) {
                pdfBtn.addEventListener("click", () => {
                    const originalText = pdfBtn.innerText;
                    pdfBtn.innerText = "⏳ Wird erstellt...";
                    
                    // Klonen & Isolieren
                    const clonedElement = elementToPrint.cloneNode(true);
                    const btnContainer = clonedElement.querySelector('.button-container');
                    if(btnContainer) btnContainer.style.display = 'none';

                    clonedElement.style.position = 'fixed';
                    clonedElement.style.top = '0';
                    clonedElement.style.left = '-9999px';
                    clonedElement.style.width = '800px'; 
                    clonedElement.style.backgroundColor = '#ffffff';
                    document.body.appendChild(clonedElement);

                    const opt = {
                        margin:       [0.5, 0.5],
                        filename:     'inkasso-sofortcheck.pdf',
                        image:        { type: 'jpeg', quality: 0.98 },
                        html2canvas:  { scale: 2, useCORS: true, logging: false },
                        jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
                    };

                    html2pdf().from(clonedElement).set(opt).save().then(() => {
                        document.body.removeChild(clonedElement);
                        pdfBtn.innerText = originalText;
                    }).catch(err => {
                        console.error(err);
                        document.body.removeChild(clonedElement);
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