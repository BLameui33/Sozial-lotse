// ====================================================================================
// START: Globale Hilfsfunktionen (für das gesamte Skript verfügbar)
// ====================================================================================

// Diese Funktionen bleiben unverändert, da sie weiterhin benötigt werden.
function getElementValue(id, defaultValue = "") {
    const element = document.getElementById(id);
    if (element && typeof element.value !== 'undefined' && element.value !== null) {
        return String(element.value);
    }
    return defaultValue;
}

// ====================================================================================
// START: DOMContentLoaded-Listener (für die Interaktivität der Seite)
// ====================================================================================

document.addEventListener('DOMContentLoaded', function() {
    // --- Alle Ihre bestehenden Elemente und Logik bleiben erhalten ---
    const form = document.getElementById('widerspruchKizForm');
    const saveBtn = document.getElementById('saveBtnKiz');
    const loadBtn = document.getElementById('loadBtnKiz');
    const storageKey = 'widerspruchKizFormData_v1';

    // --- Steuerung der dynamischen Detail-Felder für Widerspruchsgründe ---
    // Diese Logik bleibt unverändert.
    const widerspruchsgrundCheckboxes = document.querySelectorAll('input[name="widerspruchsgrundKiz"]');
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

    // --- WICHTIG: Ihre getFormData() Funktion bleibt exakt so wie sie ist! ---
    // Sie wird jetzt von der PayPal-Logik wiederverwendet.
    function getFormData() {
        const data = {};
        const formElementIds = [
            "personName", "kindergeldnummer", "anzahlPersonenKiz",
            "personAdresse", "personPlz", "personOrt",
            "familienkasseName", "familienkasseAdresse",
            "bescheidDatum", "bescheidAktenzeichen", "bescheidInhalt",
            "textAblehnung", "textEinkommen", "textVermoegen", "textWohnkosten",
            "ergaenzendeArgumenteKiz", "forderungKiz"
        ];
        formElementIds.forEach(id => {
            data[id] = getElementValue(id);
        });
        data.widerspruchsgruende = [];
        document.querySelectorAll('input[name="widerspruchsgrundKiz"]:checked').forEach(cb => data.widerspruchsgruende.push(cb.value));
        // ... weitere Logik zum Sammeln von Daten ...
        return data;
    }

    // --- Ihre Speichern & Laden Logik bleibt unverändert ---
    function populateForm(data) {
        // Ihr Code zum Befüllen des Formulars... unverändert
        const formElementIds = [ "personName", "kindergeldnummer", "anzahlPersonenKiz", "personAdresse", "personPlz", "personOrt", "familienkasseName", "familienkasseAdresse", "bescheidDatum", "bescheidAktenzeichen", "bescheidInhalt", "textAblehnung", "textEinkommen", "textVermoegen", "textWohnkosten", "ergaenzendeArgumenteKiz", "forderungKiz"];
        formElementIds.forEach(id => { const element = document.getElementById(id); if (element && data[id] !== undefined) { element.value = data[id]; } });
        document.querySelectorAll('input[name="widerspruchsgrundKiz"]').forEach(cb => { if (cb) { cb.checked = !!(data.widerspruchsgruende && data.widerspruchsgruende.includes(cb.value)); toggleDetailDiv(cb); } });
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', function() {
            // ... Ihre Speicher-Logik bleibt unverändert ...
            localStorage.setItem(storageKey, JSON.stringify(getFormData()));
            alert('Ihre Eingaben wurden im Browser gespeichert!');
        });
    }

    if (loadBtn) {
        loadBtn.addEventListener('click', function() {
            // ... Ihre Laden-Logik bleibt unverändert ...
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
        // 1. Definiert, was verkauft wird, wenn der Nutzer klickt.
        createOrder: function(data, actions) {
            return actions.order.create({
                purchase_units: [{
                    description: 'PDF-Dokument: Widerspruch Kinderzuschlag', // Produktbeschreibung
                    amount: {
                        value: '0.99', // Preis
                        currency_code: 'EUR'
                    }
                }]
            });
        },

        // 2. Wird ausgeführt, NACHDEM der Nutzer die Zahlung im PayPal-Fenster bestätigt hat.
        onApprove: function(data, actions) {
            console.log("Zahlung erfolgreich! Bereite Dokument vor...");

            // Wir prüfen zuerst, ob das Formular gültig ist (Ihre alte Validierung)
            const formData = getFormData();
            if (formData.widerspruchsgruende.length === 0 && getElementValue("ergaenzendeArgumenteKiz").trim() === "" ) {
                alert("Bitte wählen Sie mindestens einen Widerspruchsgrund aus, bevor Sie die Erstellung abschließen.");
                return; // Bricht ab, wenn die Validierung fehlschlägt.
            }
            if (getElementValue("forderungKiz").trim() === "") {
                alert("Bitte formulieren Sie Ihre Forderung an die Familienkasse.");
                return; // Bricht ab, wenn die Validierung fehlschlägt.
            }

            // Wenn alles ok ist, speichern wir die Daten für die Danke-Seite
            localStorage.setItem('pendingPaymentData-kiz', JSON.stringify(formData));

            // Und leiten den Nutzer zur Danke-Seite weiter
            window.location.href = "danke.html?typ=kiz";
        },

        // 3. Optional: Was passiert, wenn der Nutzer das PayPal-Fenster schließt.
        onCancel: function(data) {
            alert("Die Zahlung wurde abgebrochen.");
        },

        // 4. Optional: Fängt technische Fehler ab.
        onError: function(err) {
            console.error('PayPal-Fehler:', err);
            alert('Ein technischer Fehler ist bei der Bezahlung aufgetreten.');
        }

    }).render('#paypal-button-container'); // Sagt PayPal, wo die Buttons angezeigt werden sollen

}); // Ende DOMContentLoaded


// ===========================================================================
// HINWEIS: Die Funktion "generateKizWiderspruchPDF(data)" wurde aus dieser 
// Datei entfernt und gehört jetzt in die zentrale "pdf-generators.js"-Datei.
// ===========================================================================

