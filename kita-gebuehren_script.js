document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('kitaGebuehrenForm');
    const storageKey = 'kitaGebuehrenFormData_v1';

    function getFormData() {
        const data = {};
        const ids = [
            "personName", "personAdresse", "personPlzOrt", "kind1Name", 
            "kind1Geburtsdatum", "kind2Name", "kind2Geburtsdatum", "kitaName", 
            "kitaAdresse", "behoerdeName", "behoerdeAdresse"
        ];
        ids.forEach(id => data[id] = document.getElementById(id).value);
        data.antragArt = document.querySelector('input[name="antragArt"]:checked')?.value;
        return data;
    }

    function populateForm(data) {
        const ids = [
            "personName", "personAdresse", "personPlzOrt", "kind1Name", 
            "kind1Geburtsdatum", "kind2Name", "kind2Geburtsdatum", "kitaName", 
            "kitaAdresse", "behoerdeName", "behoerdeAdresse"
        ];
        ids.forEach(id => {
            if(document.getElementById(id) && data[id]) document.getElementById(id).value = data[id];
        });
        if (data.antragArt) {
            document.querySelector(`input[name="antragArt"][value="${data.antragArt}"]`).checked = true;
        }
    }

    document.getElementById('saveBtnKita').addEventListener('click', () => {
        localStorage.setItem(storageKey, JSON.stringify(getFormData()));
        alert('Ihre Eingaben wurden gespeichert!');
    });

    document.getElementById('loadBtnKita').addEventListener('click', () => {
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
        localStorage.setItem('pendingPaymentData-kita-gebuehren', JSON.stringify(getFormData()));
        window.location.href = "danke.html?typ=kita-gebuehren";
    });
});