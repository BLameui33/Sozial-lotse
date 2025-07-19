document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('formFiktion');
    if (form) {
        form.addEventListener('submit', function(event) {
            event.preventDefault();
            
            const getFormData = () => ({
                personName: document.getElementById('personName').value,
                geburtsdatum: document.getElementById('geburtsdatum').value,
                staatsangehoerigkeit: document.getElementById('staatsangehoerigkeit').value,
                personAdresse: document.getElementById('personAdresse').value,
                artTitel: document.getElementById('artTitel').value,
                ablaufDatum: document.getElementById('ablaufDatum').value,
                aktenzeichen: document.getElementById('aktenzeichen').value,
                terminNachweis: document.getElementById('terminNachweis').value,
                behoerdeName: document.getElementById('behoerdeName').value,
                behoerdeAdresse: document.getElementById('behoerdeAdresse').value,
            });

            const formData = getFormData();

            if (!formData.personName.trim() || !formData.ablaufDatum || !formData.terminNachweis.trim() || !formData.behoerdeName.trim()) {
                alert('Bitte füllen Sie mindestens die Felder für Name, Ablaufdatum, Nachweis der Terminsuche und den Namen der Behörde aus.');
                return;
            }

            localStorage.setItem('pendingPaymentData-fiktionsbescheinigung', JSON.stringify(formData));
            window.location.href = "danke.html?typ=fiktionsbescheinigung";
        });
    }
});