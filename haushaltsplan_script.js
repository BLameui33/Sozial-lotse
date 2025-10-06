document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('haushaltsplanForm');
    const storageKey = 'haushaltsplanFormData_v1';

    // --- Elemente für die Berechnung ---
    const allInputs = document.querySelectorAll('input[type="number"]');
    const summeEinnahmenEl = document.getElementById('summeEinnahmen');
    const summeAusgabenEl = document.getElementById('summeAusgaben');
    const ergebnisEl = document.getElementById('ergebnis');

    // --- Datumsfelder befüllen ---
    const monatSelect = document.getElementById('zeitraumMonat');
    const jahrInput = document.getElementById('zeitraumJahr');
    const monate = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
    const heute = new Date();
    monate.forEach((monat, index) => {
        const option = document.createElement('option');
        option.value = monat;
        option.textContent = monat;
        if (index === heute.getMonth()) {
            option.selected = true;
        }
        monatSelect.appendChild(option);
    });
    jahrInput.value = heute.getFullYear();

    // --- Haupt-Berechnungsfunktion ---
    function calculateBudget() {
        let einnahmenTotal = 0;
        document.querySelectorAll('.einnahme').forEach(input => {
            einnahmenTotal += parseFloat(input.value) || 0;
        });

        let ausgabenTotal = 0;
        document.querySelectorAll('.ausgabe').forEach(input => {
            ausgabenTotal += parseFloat(input.value) || 0;
        });

        const ergebnis = einnahmenTotal - ausgabenTotal;

        summeEinnahmenEl.textContent = einnahmenTotal.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
        summeAusgabenEl.textContent = ausgabenTotal.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
        ergebnisEl.textContent = ergebnis.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });

        ergebnisEl.classList.remove('surplus', 'deficit');
        ergebnisEl.classList.add(ergebnis >= 0 ? 'surplus' : 'deficit');
    }

    // Event-Listener für Live-Aktualisierung
    allInputs.forEach(input => input.addEventListener('input', calculateBudget));
    calculateBudget(); // Initialberechnung

    // --- Speichern & Laden ---
    function getFormData() {
        const data = {};
        const allFormElements = form.querySelectorAll('input, select');
        allFormElements.forEach(el => {
            data[el.id] = el.value;
        });
        return data;
    }

    function populateForm(data) {
        const allFormElements = form.querySelectorAll('input, select');
        allFormElements.forEach(el => {
            if (data[el.id] !== undefined) {
                el.value = data[el.id];
            }
        });
        calculateBudget(); // Nach dem Laden neu berechnen
    }
    
    document.getElementById('saveBtnHaushaltsplan').addEventListener('click', () => {
        localStorage.setItem(storageKey, JSON.stringify(getFormData()));
        alert('Ihr Haushaltsplan wurde im Browser gespeichert!');
    });

    document.getElementById('loadBtnHaushaltsplan').addEventListener('click', () => {
        const savedData = localStorage.getItem(storageKey);
        if (savedData) {
            populateForm(JSON.parse(savedData));
            alert('Gespeicherte Daten wurden geladen!');
        } else {
            alert('Keine gespeicherten Daten gefunden.');
        }
    });

    // --- PDF-Erstellung ---
    form.addEventListener('submit', function(event) {
    event.preventDefault();
    const formData = getFormData();
    
    // --- KORREKTUR START ---
    // Wir berechnen die Summen hier als reine Zahlen neu und fügen sie den Daten hinzu.
    let einnahmenTotal = 0;
    document.querySelectorAll('.einnahme').forEach(input => {
        einnahmenTotal += parseFloat(input.value) || 0;
    });

    let ausgabenTotal = 0;
    document.querySelectorAll('.ausgabe').forEach(input => {
        ausgabenTotal += parseFloat(input.value) || 0;
    });

    formData.summeEinnahmen = einnahmenTotal;
    formData.summeAusgaben = ausgabenTotal;
    formData.ergebnis = einnahmenTotal - ausgabenTotal;
    // --- KORREKTUR ENDE ---

    localStorage.setItem('pendingPaymentData-haushaltsplan', JSON.stringify(formData));
    window.location.href = "danke.html?typ=haushaltsplan";
});
});