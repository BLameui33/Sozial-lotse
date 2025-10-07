document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('reklamationForm');
    const storageKey = 'reklamationFormData_v1';

    function getFormData() {
        const data = {};
        const formElementIds = [
            "personName", "personAdresse", "personPlzOrt",
            "verkaeuferName", "verkaeuferAdresse", "warenbezeichnung",
            "kaufdatum", "rechnungsnummer", "mangelbeschreibung", "fristsetzung"
        ];
        formElementIds.forEach(id => data[id] = document.getElementById(id).value);
        
        data.nacherfuellungWahl = document.querySelector('input[name="nacherfuellungWahl"]:checked')?.value;
        return data;
    }

    function populateForm(data) {
        const formElementIds = [
            "personName", "personAdresse", "personPlzOrt",
            "verkaeuferName", "verkaeuferAdresse", "warenbezeichnung",
            "kaufdatum", "rechnungsnummer", "mangelbeschreibung", "fristsetzung"
        ];
        formElementIds.forEach(id => {
            if(document.getElementById(id) && data[id]) {
                document.getElementById(id).value = data[id];
            }
        });
        
        if (data.nacherfuellungWahl) {
            document.querySelector(`input[name="nacherfuellungWahl"][value="${data.nacherfuellungWahl}"]`).checked = true;
        }
    }

    document.getElementById('saveBtnReklamation').addEventListener('click', () => {
        localStorage.setItem(storageKey, JSON.stringify(getFormData()));
        alert('Ihre Eingaben wurden gespeichert!');
    });

    document.getElementById('loadBtnReklamation').addEventListener('click', () => {
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
        localStorage.setItem('pendingPaymentData-reklamation', JSON.stringify(getFormData()));
        window.location.href = "danke.html?typ=reklamation";
    });
});