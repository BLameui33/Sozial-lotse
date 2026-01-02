// finanz-schutz-rechner.js
// Logik für Geld-Zurück, Kredit-Check und Rendite-Warnung

// 1. TABS UMSCHALTEN
function switchCalc(id) {
    // Buttons reset
    document.querySelectorAll('.calc-btn').forEach(b => b.classList.remove('active'));
    // Content hide
    document.querySelectorAll('.calc-container').forEach(c => c.classList.remove('active'));
    
    // Activate selected
    document.querySelector(`.calc-btn[onclick="switchCalc('${id}')"]`).classList.add('active');
    document.getElementById(`calc-${id}`).classList.add('active');
    
    // Clear Result
    document.getElementById('universal_result').innerHTML = "";
}

// Event Listener für Vorkosten-Feld Einblendung
document.addEventListener("DOMContentLoaded", () => {
    const feeSelect = document.getElementById("cred_upfront");
    if(feeSelect) {
        feeSelect.addEventListener("change", () => {
            const val = feeSelect.value;
            document.getElementById("cred_fee_input").style.display = (val === 'yes_fee' || val === 'yes_cod') ? "block" : "none";
        });
    }
    
    // Datum Default heute
    const dateInput = document.getElementById("rec_date");
    if(dateInput) dateInput.valueAsDate = new Date();
});


// 2. RECHNER: GELD ZURÜCK
function calcRecovery() {
    const method = document.getElementById("rec_method").value;
    const dateVal = document.getElementById("rec_date").value;
    const amount = document.getElementById("rec_amount").value;
    const resDiv = document.getElementById("universal_result");

    if (!dateVal) { alert("Bitte Datum wählen"); return; }

    const datePaid = new Date(dateVal);
    const today = new Date();
    const diffTime = Math.abs(today - datePaid);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

    let title = "";
    let color = "";
    let text = "";
    let bg = "";

    // Logik
    if (method === "sepa") {
        if (diffDays <= 56) { // 8 Wochen
            title = "Sehr gute Chancen (8 Wochen Frist)";
            color = "#27ae60"; bg = "#d5f5e3";
            text = "Sie sind noch innerhalb der 8-Wochen-Frist für eine bedingungslose Lastschrift-Rückgabe. Loggen Sie sich ins Online-Banking ein und klicken Sie auf 'Lastschrift zurückgeben'.";
        } else if (diffDays <= 395) { // 13 Monate
            title = "Chance bei fehlendem Mandat (13 Monate)";
            color = "#f39c12"; bg = "#fdebd0";
            text = "Die 8-Wochen-Frist ist um. ABER: Wenn Sie dem Abbucher nie ein Mandat erteilt haben (z.B. bei Betrug/Identitätsdiebstahl), beträgt die Frist 13 Monate. Kontaktieren Sie Ihre Bank.";
        } else {
            title = "Frist abgelaufen";
            color = "#c0392b"; bg = "#fadbd8";
            text = "Leider sind 13 Monate vergangen. Eine Rückbuchung ist via Bank nicht mehr möglich.";
        }
    } else if (method === "transfer") {
        title = "Geringe Chancen (Überweisung)";
        color = "#c0392b"; bg = "#fadbd8";
        text = "Bei einer selbst getätigten Überweisung ist das Geld meist weg, sobald es beim Empfänger ist. Versuchen Sie sofort einen 'Überweisungsrückruf' bei Ihrer Bank (kostet Gebühren, Erfolg unsicher).";
    } else if (method === "creditcard") {
        title = "Chargeback möglich (Kreditkarte)";
        color = "#f39c12"; bg = "#fdebd0";
        text = "Kontaktieren Sie den Kartenausgeber und fragen Sie nach einem 'Chargeback' wegen Warenerhalt-Betrug. Fristen sind oft 120 Tage ab Transaktion.";
    } else if (method === "paypal_buyer") {
        title = "Gute Chancen (Käuferschutz)";
        color = "#27ae60"; bg = "#d5f5e3";
        text = "Melden Sie einen Konflikt bei PayPal ('Ware nicht erhalten'). Sie haben 180 Tage Zeit.";
    } else if (method === "paypal_friends") {
        title = "Keine Chance (Freunde & Familie)";
        color = "#c0392b"; bg = "#fadbd8";
        text = "Sie haben den Käuferschutz aktiv deaktiviert. Das Geld ist weg. PayPal erstattet hier nicht.";
    } else if (method === "klarna") {
        title = "Sehr gute Chancen (Pausieren)";
        color = "#27ae60"; bg = "#d5f5e3";
        text = "Melden Sie in der Klarna-App ein Problem. Die Zahlung wird pausiert, bis der Fall geklärt ist. Zahlen Sie nicht!";
    } else {
        title = "Geld ist weg";
        color = "#c0392b"; bg = "#fadbd8";
        text = "Bei Barzahlung, Western Union oder Gutscheinkarten gibt es keine technische Möglichkeit der Rückholung.";
    }

    renderResult(title, text, color, bg, resDiv);
}

// 3. RECHNER: KREDIT-CHECK
function calcCredit() {
    const upfront = document.getElementById("cred_upfront").value;
    const resDiv = document.getElementById("universal_result");
    
    let title = "";
    let color = "";
    let text = "";
    let bg = "";

    if (upfront === "no") {
        title = "Klingt zunächst normal";
        color = "#27ae60"; bg = "#d5f5e3";
        text = "Dass keine Vorkosten verlangt werden, ist ein gutes Zeichen. Prüfen Sie trotzdem den effektiven Jahreszins im Vertrag.";
    } else {
        title = "ACHTUNG: Unseriöses Angebot!";
        color = "#c0392b"; bg = "#fadbd8";
        text = "<strong>Keine seriöse Bank verlangt Gebühren VOR der Auszahlung!</strong><br>Ob Nachnahme, 'Auslagenpauschale' oder 'Versicherung': Das ist die klassische Abzocke bei 'Krediten ohne Schufa'. Sie zahlen die Gebühr, erhalten aber nie einen Kredit. <br><strong>Unterschreiben Sie nicht und zahlen Sie nichts!</strong>";
    }

    renderResult(title, text, color, bg, resDiv);
}

// 4. RECHNER: RENDITE-CHECK
function calcInvest() {
    const returns = parseFloat(document.getElementById("inv_return").value);
    const period = document.getElementById("inv_period").value;
    const risk = document.getElementById("inv_risk").value;
    const kw1 = document.getElementById("inv_kw1").checked;
    const kw2 = document.getElementById("inv_kw2").checked;
    
    const resDiv = document.getElementById("universal_result");

    if (!returns) { alert("Bitte Rendite eingeben"); return; }

    // Score berechnen
    let score = 0;

    // Rendite Gewichtung
    if (period === "year") {
        if (returns > 8) score += 2;
        if (returns > 15) score += 5;
    } else if (period === "month") {
        if (returns > 2) score += 10; // >2% im Monat ist schon extrem verdächtig
    } else if (period === "day") {
        score += 20; // Täglicher Gewinn ist immer Scam
    }

    // Risiko Gewichtung
    if (risk === "none" && score > 0) score += 10; // Hohe Rendite ohne Risiko = Lüge

    // Keywords
    if (kw1 || kw2) score += 5;

    let title, text, color, bg;

    if (score >= 10) {
        title = "WARNUNG: Hohe Betrugsgefahr!";
        color = "#c0392b"; bg = "#fadbd8";
        text = "Diese Kombination aus hoher Rendite und niedrigem Risiko existiert in der realen Finanzwelt nicht. Es handelt sich höchstwahrscheinlich um ein Schneeballsystem oder eine gefälschte Trading-Plattform. Zahlen Sie kein Geld ein!";
    } else if (score >= 4) {
        title = "Vorsicht geboten";
        color = "#f39c12"; bg = "#fdebd0";
        text = "Das Angebot ist sehr optimistisch. Prüfen Sie, ob der Anbieter von der BaFin lizenziert ist. Investieren Sie nur Geld, dessen Verlust Sie verschmerzen können.";
    } else {
        title = "Plausibles Angebot (Marktüblich)";
        color = "#27ae60"; bg = "#d5f5e3";
        text = "Die Rendite liegt im marktüblichen Bereich. Das schließt Betrug nicht aus, ist aber kein sofortiges Alarmzeichen.";
    }

    renderResult(title, text, color, bg, resDiv);
}

// HILFSFUNKTION: ERGEBNIS RENDERN
function renderResult(title, text, color, bg, element) {
    element.innerHTML = `
        <div class="result-card" style="margin-top:30px; border: 2px solid ${color}; border-radius: 8px; overflow: hidden; background: #fff; animation: fadeIn 0.5s;">
            <div style="background:${bg}; color:${color}; padding:20px; text-align:center;">
                <h2 style="margin:0; color:${color};">${title}</h2>
            </div>
            <div style="padding:20px;">
                <p style="font-size:1.1rem; line-height:1.6;">${text}</p>
            </div>
        </div>
    `;
    element.scrollIntoView({ behavior: "smooth" });
}