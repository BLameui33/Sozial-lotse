document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('widerspruchMahnbescheidForm');
    const saveBtn = document.getElementById('saveBtnMahnbescheid');
    const loadBtn = document.getElementById('loadBtnMahnbescheid');
    const storageKey = 'widerspruchMahnbescheidFormData_v1'; // Eindeutiger Schlüssel

    // Funktion zum Sammeln der Formulardaten
    function getFormData() {
        const data = {};
        const formElementIds = [
            "personName", "personAdresse", "personPlz", "personOrt",
            "mahngerichtName", "mahngerichtAdresse",
            "bescheidAktenzeichen", "bescheidDatum",
            "glaeubigerName"
        ];
        formElementIds.forEach(id => {
            const element = document.getElementById(id);
            if(element) data[id] = element.value;
        });
        // Da wir nur den Gesamtwiderspruch haben, ist dies statisch.
        data.widerspruchGesamt = document.getElementById('widerspruchGesamt').checked;
        return data;
    }

    // Funktion zum Befüllen des Formulars
    function populateForm(data) {
        const formElementIds = [
            "personName", "personAdresse", "personPlz", "personOrt",
            "mahngerichtName", "mahngerichtAdresse",
            "bescheidAktenzeichen", "bescheidDatum",
            "glaeubigerName"
        ];
        formElementIds.forEach(id => {
            const element = document.getElementById(id);
            if (element && data[id] !== undefined) {
                element.value = data[id];
            }
        });
    }

    // Event-Listener für Speichern & Laden
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

    // Event-Listener für das Absenden des Formulars
    if (form) {
        form.addEventListener('submit', function(event) {
            event.preventDefault(); // Verhindert das Neuladen der Seite

            // Einfache Validierung
            if (!form.checkValidity()) {
                alert("Bitte füllen Sie alle erforderlichen Felder aus, bevor Sie die Erstellung abschließen.");
                form.reportValidity(); // Zeigt die Standard-HTML5-Validierungs-Popups
                return;
            }

            const formData = getFormData();
            
            // Daten im localStorage für die "Danke"-Seite speichern
            localStorage.setItem('pendingPaymentData-mahnbescheid', JSON.stringify(formData));

            // Zur "Danke"-Seite weiterleiten, wo der PDF-Download ausgelöst wird
            window.location.href = "danke.html?typ=mahnbescheid";
        });
    }

}); // Ende DOMContentLoaded