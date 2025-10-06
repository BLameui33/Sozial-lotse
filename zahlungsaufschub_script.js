document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('zahlungsaufschubForm');
    const storageKey = 'zahlungsaufschubFormData_v1';

    function getFormData() {
        const data = {};
        const formElementIds = [
            "personName", "personAdresse", "personPlzOrt", "kundennummer",
            "empfaengerName", "empfaengerAdresse", "rechnungsnummer", "rechnungsdatum",
            "forderungshoehe", "faelligkeitsdatum", "begruendungText", "neuesDatumVorschlag"
        ];
        formElementIds.forEach(id => data[id] = document.getElementById(id).value);
        return data;
    }

    function populateForm(data) {
        const formElementIds = [
            "personName", "personAdresse", "personPlzOrt", "kundennummer",
            "empfaengerName", "empfaengerAdresse", "rechnungsnummer", "rechnungsdatum",
            "forderungshoehe", "faelligkeitsdatum", "begruendungText", "neuesDatumVorschlag"
        ];
        formElementIds.forEach(id => {
            if(document.getElementById(id) && data[id]) {
                document.getElementById(id).value = data[id];
            }
        });
    }

    document.getElementById('saveBtnAufschub').addEventListener('click', () => {
        localStorage.setItem(storageKey, JSON.stringify(getFormData()));
        alert('Ihre Eingaben wurden gespeichert!');
    });

    document.getElementById('loadBtnAufschub').addEventListener('click', () => {
        const savedData = localStorage.getItem(storageKey);
        if (savedData) {
            populateForm(JSON.parse(savedData));
            alert('Gespeicherte Daten wurden geladen!');
        } else {
            alert('Keine Daten gefunden.');
        }
    });

    form.addEventListener('submit', function(event) {
        event.preventDefault();
        if (!form.checkValidity()) {
            alert("Bitte füllen Sie alle erforderlichen Felder aus.");
            form.reportValidity();
            return;
        }
        localStorage.setItem('pendingPaymentData-zahlungsaufschub', JSON.stringify(getFormData()));
        window.location.href = "danke.html?typ=zahlungsaufschub";
    });
});