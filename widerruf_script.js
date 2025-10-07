document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('widerrufForm');
    const storageKey = 'widerrufFormData_v1';

    function getFormData() {
        const data = {};
        const formElementIds = [
            "personName", "personAdresse", "personPlzOrt",
            "unternehmenName", "unternehmenAdresse", "vertragsbezeichnung",
            "vertragsnummer", "vertragsdatum"
        ];
        formElementIds.forEach(id => data[id] = document.getElementById(id).value);
        
        data.widerrufEinzugsermaechtigung = document.getElementById('widerrufEinzugsermaechtigung').checked;
        return data;
    }

    function populateForm(data) {
        const formElementIds = [
            "personName", "personAdresse", "personPlzOrt",
            "unternehmenName", "unternehmenAdresse", "vertragsbezeichnung",
            "vertragsnummer", "vertragsdatum"
        ];
        formElementIds.forEach(id => {
            if(document.getElementById(id) && data[id]) {
                document.getElementById(id).value = data[id];
            }
        });
        
        if (data.widerrufEinzugsermaechtigung) {
            document.getElementById('widerrufEinzugsermaechtigung').checked = data.widerrufEinzugsermaechtigung;
        }
    }

    document.getElementById('saveBtnWiderruf').addEventListener('click', () => {
        localStorage.setItem(storageKey, JSON.stringify(getFormData()));
        alert('Ihre Eingaben wurden gespeichert!');
    });

    document.getElementById('loadBtnWiderruf').addEventListener('click', () => {
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
        localStorage.setItem('pendingPaymentData-widerruf', JSON.stringify(getFormData()));
        window.location.href = "danke.html?typ=widerruf";
    });
});