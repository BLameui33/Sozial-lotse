// ====================================================================================
// HINWEIS: Die globalen Hilfsfunktionen und die generateUeberpruefungPDF()-
// Funktion wurden entfernt und gehören jetzt in Ihre zentrale "pdf-generators.js"-Datei.
// ====================================================================================


// ====================================================================================
// START: DOMContentLoaded-Listener (für die Interaktivität der Seite)
// ====================================================================================

document.addEventListener('DOMContentLoaded', function() {
    // --- Alle Ihre bestehenden Elemente und Logik bleiben erhalten ---
    const form = document.getElementById('ueberpruefungsantragForm');
    const saveBtn = document.getElementById('saveBtnUeberpruefung');
    const loadBtn = document.getElementById('loadBtnUeberpruefung');
    const storageKey = 'ueberpruefungsantragFormData_v1';

    // --- WICHTIG: Ihre getFormData() Funktion für diesen Generator bleibt exakt so wie sie ist! ---
    function getFormData() {
      const data = {};
      const formElementIds = [
          "antragstellerName", "bgNummer", "anzahlPersonenUeberpruefung",
          "antragstellerAdresse", "antragstellerPlz", "antragstellerOrt",
          "behoerdeName", "behoerdeAdresse",
          "bescheidDatum", "bescheidAktenzeichen", "bescheidBetreff", "weitereBescheide",
          "fehlerBeschreibung", "fehlerBegruendung", "forderungUeberpruefung"
      ];
      formElementIds.forEach(id => {
        const element = document.getElementById(id);
        if(element) data[id] = element.value;
      });
      return data;
    }

    // --- Ihre Speichern & Laden Logik bleibt unverändert ---
    function populateForm(data) {
        const formElementIds = ["antragstellerName", "bgNummer", "anzahlPersonenUeberpruefung", "antragstellerAdresse", "antragstellerPlz", "antragstellerOrt", "behoerdeName", "behoerdeAdresse", "bescheidDatum", "bescheidAktenzeichen", "bescheidBetreff", "weitereBescheide", "fehlerBeschreibung", "fehlerBegruendung", "forderungUeberpruefung"];
        formElementIds.forEach(id => { const element = document.getElementById(id); if (element && data[id] !== undefined) { element.value = data[id]; } });
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
                    description: 'PDF-Dokument: Überprüfungsantrag nach § 44 SGB X', // Angepasste Beschreibung
                    amount: {
                        value: '0.99',
                        currency_code: 'EUR'
                    }
                }]
            });
        },

        onApprove: function(data, actions) {
            console.log("Zahlung erfolgreich! Bereite Überprüfungsantrag vor...");

            // Wir führen die Validierung für dieses Formular durch
            const formData = getFormData();
            if (document.getElementById("fehlerBeschreibung").value.trim() === "" || document.getElementById("forderungUeberpruefung").value.trim() === "") {
                alert("Bitte beschreiben Sie den Fehler im Bescheid und formulieren Sie Ihren Antrag, bevor Sie die Erstellung abschließen.");
                return;
            }

            // Daten für die Danke-Seite speichern (mit neuem Schlüssel!)
            localStorage.setItem('pendingPaymentData-ueberpruefung', JSON.stringify(formData));

            // Zur Danke-Seite weiterleiten (mit neuem Typ!)
            window.location.href = "danke.html?typ=ueberpruefung";
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