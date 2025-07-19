document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('formDeckblatt');
    if (form) {
        form.addEventListener('submit', function(event) {
            event.preventDefault();
            
            const getFormData = () => {
                const data = {
                    personName: document.getElementById('personName').value,
                    personAdresse: document.getElementById('personAdresse').value,
                    aktenzeichen: document.getElementById('aktenzeichen').value,
                    antragArt: document.getElementById('antragArt').value,
                    anlagenSonstige: document.getElementById('anlagenSonstige').value,
                    behoerdeName: document.getElementById('behoerdeName').value,
                    behoerdeAdresse: document.getElementById('behoerdeAdresse').value,
                    anlagen: []
                };
                document.querySelectorAll('input[name="anlage"]:checked').forEach(checkbox => {
                    data.anlagen.push(checkbox.value);
                });
                return data;
            };

            const formData = getFormData();

            if (!formData.personName.trim() || !formData.antragArt.trim() || !formData.behoerdeName.trim()) {
                alert('Bitte füllen Sie die Felder für Name, Art des Antrags und den Namen der Behörde aus.');
                return;
            }
            if (formData.anlagen.length === 0 && !formData.anlagenSonstige.trim()) {
                alert('Bitte wählen Sie mindestens eine Anlage aus oder tragen Sie weitere Unterlagen in das Textfeld ein.');
                return;
            }

            localStorage.setItem('pendingPaymentData-deckblatt-aufenthalt', JSON.stringify(formData));
            window.location.href = "danke.html?typ=deckblatt-aufenthalt";
        });
    }
});