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

  if (form) {
        form.addEventListener('submit', function(event) {
            event.preventDefault();

            // 1. Validierung für das Sperrzeit-Formular
            const formData = getFormData();
            // Führe hier deine Validierungs-Checks durch
            // z.B. if (!formData.bescheidDatum) { alert(...); return; }

            // 2. Daten im localStorage speichern
            // WICHTIG: Den Schlüssel an den Generator anpassen!
            localStorage.setItem('pendingPaymentData-ueberpruefung', JSON.stringify(formData));

            // 3. Zur Danke-Seite weiterleiten
            // WICHTIG: Den 'typ' an den Generator anpassen!
            window.location.href = "danke.html?typ=ueberpruefung";
        });
    }

});
