// ====================================================================================
// HINWEIS: Die globalen Hilfsfunktionen (getElementValue, etc.) und die
// generateBafogWiderspruchPDF()-Funktion gehören in Ihre zentrale "pdf-generators.js"-Datei.
// ====================================================================================


// ====================================================================================
// START: DOMContentLoaded-Listener (für die Interaktivität der Seite)
// ====================================================================================

document.addEventListener('DOMContentLoaded', function() {
    // --- Alle Ihre bestehenden Elemente und Logik ---
    const form = document.getElementById('widerspruchBafogForm');
    const saveBtn = document.getElementById('saveBtnBafog');
    const loadBtn = document.getElementById('loadBtnBafog');
    const storageKey = 'widerspruchBafogFormData_v1';

    // --- Steuerung der dynamischen Detail-Felder ---
    const widerspruchsgrundCheckboxes = document.querySelectorAll('input[name="widerspruchsgrundBafog"]');
    function toggleDetailDiv(checkbox) {
        // Baut die ID des Detail-Divs aus dem 'value' der Checkbox zusammen
        // z.B. value="einkommenEltern" -> ID="detailsEinkommenEltern"
        const detailDivId = `details${checkbox.value.charAt(0).toUpperCase() + checkbox.value.slice(1)}`;
        const detailsDiv = document.getElementById(detailDivId);
        if (detailsDiv) {
            detailsDiv.style.display = checkbox.checked ? 'block' : 'none';
        }
    }
    widerspruchsgrundCheckboxes.forEach(cb => {
        cb.addEventListener('change', () => toggleDetailDiv(cb));
        // Initial einmal ausführen, um den Zustand nach dem Laden herzustellen
        toggleDetailDiv(cb);
    });

    // --- getFormData() speziell für dieses Formular ---
    function getFormData() {
        const data = {};
        const formElementIds = [
            "personName", "foerderungsnummer", "bafogArt",
            "personAdresse", "personPlz", "personOrt",
            "amtName", "amtAdresse",
            "bescheidDatum", "bescheidAktenzeichen",
            "textAblehnung", "textEinkommenEltern", "textEigenesEinkommen", "textVermoegen", "textFreibetraege",
            "ergaenzendeArgumenteBafog", "forderungBafog"
        ];
        formElementIds.forEach(id => {
            const element = document.getElementById(id);
            if(element) data[id] = element.value;
        });
        
        data.widerspruchsgruende = [];
        document.querySelectorAll('input[name="widerspruchsgrundBafog"]:checked').forEach(cb => data.widerspruchsgruende.push(cb.value));
        
        return data;
    }

    // --- Speichern & Laden Logik ---
    function populateForm(data) {
        const formElementIds = ["personName", "foerderungsnummer", "bafogArt", "personAdresse", "personPlz", "personOrt", "amtName", "amtAdresse", "bescheidDatum", "bescheidAktenzeichen", "textAblehnung", "textEinkommenEltern", "textEigenesEinkommen", "textVermoegen", "textFreibetraege", "ergaenzendeArgumenteBafog", "forderungBafog"];
        formElementIds.forEach(id => {
            const element = document.getElementById(id);
            if (element && data[id] !== undefined) {
                element.value = data[id];
            }
        });
        document.querySelectorAll('input[name="widerspruchsgrundBafog"]').forEach(cb => {
            if (cb) {
                cb.checked = !!(data.widerspruchsgruende && data.widerspruchsgruende.includes(cb.value));
                toggleDetailDiv(cb);
            }
        });
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
    // START: NEUE PAYPAL-LOGIK
    // ===========================================================================

    paypal.Buttons({
        createOrder: function(data, actions) {
            return actions.order.create({
                purchase_units: [{
                    description: 'PDF-Dokument: Widerspruch BAföG-Bescheid',
                    amount: {
                        value: '0.99',
                        currency_code: 'EUR'
                    }
                }]
            });
        },

        onApprove: function(data, actions) {
            console.log("Zahlung erfolgreich! Bereite BAföG-Widerspruch vor...");

            // Validierung für dieses Formular
            const formData = getFormData();
            if (formData.widerspruchsgruende.length === 0 && document.getElementById("ergaenzendeArgumenteBafog").value.trim() === "" ) {
                alert("Bitte wählen Sie mindestens einen Widerspruchsgrund aus oder geben Sie eine ergänzende Begründung an.");
                return;
            }
             if (document.getElementById("forderungBafog").value.trim() === "") {
                alert("Bitte formulieren Sie Ihre Forderung an das BAföG-Amt.");
                return;
            }

            // Daten für die Danke-Seite speichern (mit neuem Schlüssel!)
            localStorage.setItem('pendingPaymentData-bafog', JSON.stringify(formData));

            // Zur Danke-Seite weiterleiten (mit neuem Typ!)
            window.location.href = "danke.html?typ=bafog";
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