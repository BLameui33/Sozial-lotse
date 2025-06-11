// ====================================================================================
// HINWEIS: Die globalen Hilfsfunktionen und die generateSozialhilfeWiderspruchPDF()-
// Funktion wurden entfernt und gehören in Ihre zentrale "pdf-generators.js"-Datei.
// ====================================================================================


// ====================================================================================
// START: DOMContentLoaded-Listener (für die Interaktivität der Seite)
// ====================================================================================

document.addEventListener('DOMContentLoaded', function() {
    // --- Alle Ihre bestehenden Elemente und Logik bleiben erhalten ---
    const form = document.getElementById('widerspruchSozialhilfeForm');
    const saveBtn = document.getElementById('saveBtnSozialhilfe');
    const loadBtn = document.getElementById('loadBtnSozialhilfe');
    const storageKey = 'widerspruchSozialhilfeFormData_v1';

    // --- Steuerung der dynamischen Detail-Felder (bleibt unverändert) ---
    const widerspruchsgrundCheckboxes = document.querySelectorAll('input[name="widerspruchsgrundSozialhilfe"]');
    function toggleDetailDiv(checkbox) {
        const detailDivId = `details${checkbox.value.charAt(0).toUpperCase() + checkbox.value.slice(1)}`;
        const detailsDiv = document.getElementById(detailDivId);
        if (detailsDiv) {
            detailsDiv.style.display = checkbox.checked ? 'block' : 'none';
        }
    }
    widerspruchsgrundCheckboxes.forEach(cb => {
        cb.addEventListener('change', () => toggleDetailDiv(cb));
        toggleDetailDiv(cb);
    });

    // --- WICHTIG: Ihre getFormData() Funktion für Sozialhilfe bleibt exakt so wie sie ist! ---
    function getFormData() {
        const data = {};
        const formElementIds = [
            "personName", "aktenzeichenSozialamt", "anzahlPersonenSozialhilfe",
            "personAdresse", "personPlz", "personOrt",
            "behoerdeName", "behoerdeAdresse",
            "bescheidDatum", "bescheidAktenzeichen", "bescheidInhalt",
            "textAblehnung", "textBerechnung", "textEinkommen", "textVermoegen",
            "ergaenzendeArgumenteSozialhilfe", "forderungSozialhilfe"
        ];
        formElementIds.forEach(id => {
            const element = document.getElementById(id);
            if(element) data[id] = element.value;
        });
        data.widerspruchsgruende = [];
        document.querySelectorAll('input[name="widerspruchsgrundSozialhilfe"]:checked').forEach(cb => data.widerspruchsgruende.push(cb.value));
        return data;
    }

    // --- Ihre Speichern & Laden Logik bleibt unverändert ---
    function populateForm(data) {
        const formElementIds = ["personName", "aktenzeichenSozialamt", "anzahlPersonenSozialhilfe", "personAdresse", "personPlz", "personOrt", "behoerdeName", "behoerdeAdresse", "bescheidDatum", "bescheidAktenzeichen", "bescheidInhalt", "textAblehnung", "textBerechnung", "textEinkommen", "textVermoegen", "ergaenzendeArgumenteSozialhilfe", "forderungSozialhilfe"];
        formElementIds.forEach(id => { const element = document.getElementById(id); if (element && data[id] !== undefined) { element.value = data[id]; } });
        document.querySelectorAll('input[name="widerspruchsgrundSozialhilfe"]').forEach(cb => { if (cb) { cb.checked = !!(data.widerspruchsgruende && data.widerspruchsgruende.includes(cb.value)); toggleDetailDiv(cb); } });
    }
    if (saveBtn) {
        saveBtn.addEventListener('click', function() {
            localStorage.setItem(storageKey, JSON.stringify(getFormData()));
            alert('Ihre Eingaben wurden im Browser gespeichert!');
        });
    }
    if (loadBtn) {
        loadBtn.addEventListener('click', function() {
             const savedData = localStorage.getItem(storageKey);
            if (savedData) {
                populateForm(JSON.parse(savedData));
                alert('Gespeicherte Eingaben wurden geladen!');
            } else {
                alert('Keine gespeicherten Daten gefunden.');
            }
        });
    }

    // ===========================================================================
    // START: NEUE PAYPAL-LOGIK (ersetzt den alten form.addEventListener)
    // ===========================================================================

    paypal.Buttons({
        createOrder: function(data, actions) {
            return actions.order.create({
                purchase_units: [{
                    description: 'PDF-Dokument: Widerspruch Sozialhilfe', // Angepasste Beschreibung
                    amount: {
                        value: '0.99',
                        currency_code: 'EUR'
                    }
                }]
            });
        },

        onApprove: function(data, actions) {
            console.log("Zahlung erfolgreich! Bereite Sozialhilfe-Dokument vor...");

            // Wir führen die Validierung für dieses Formular durch
            const formData = getFormData();
            if (formData.widerspruchsgruende.length === 0 && document.getElementById("ergaenzendeArgumenteSozialhilfe").value.trim() === "" ) {
                alert("Bitte wählen Sie mindestens einen Widerspruchsgrund aus, bevor Sie die Erstellung abschließen.");
                return;
            }
             if (document.getElementById("forderungSozialhilfe").value.trim() === "") {
                alert("Bitte formulieren Sie Ihre Forderung an die Behörde.");
                return;
            }

            // Daten für die Danke-Seite speichern (mit neuem Schlüssel!)
            localStorage.setItem('pendingPaymentData-sozialhilfe', JSON.stringify(formData));

            // Zur Danke-Seite weiterleiten (mit neuem Typ!)
            window.location.href = "danke.html?typ=sozialhilfe";
        },

        onCancel: function(data) {
            alert("Die Zahlung wurde abgebrochen.");
        },
        onError: function(err) {
            console.error('PayPal-Fehler:', err);
            alert('Ein technischer Fehler ist bei der Bezahlung aufgetreten.');
        }

    }).render('#paypal-button-container');

}); // Ende DOMContentLoaded

