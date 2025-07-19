document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('formErstausstattung');
    if (form) {
        form.addEventListener('submit', function(event) {
            event.preventDefault();
            
            const getFormData = () => {
                const data = {
                    personName: document.getElementById('personName').value,
                    personAdresse: document.getElementById('personAdresse').value,
                    kundennummer: document.getElementById('kundennummer').value,
                    adresseNeueWohnung: document.getElementById('adresseNeueWohnung').value,
                    mietbeginn: document.getElementById('mietbeginn').value,
                    begruendung: document.getElementById('begruendung').value,
                    bedarfSonstiges: document.getElementById('bedarfSonstiges').value,
                    behoerdeName: document.getElementById('behoerdeName').value,
                    behoerdeAdresse: document.getElementById('behoerdeAdresse').value,
                    bedarf: []
                };
                document.querySelectorAll('input[name="bedarf"]:checked').forEach(checkbox => {
                    data.bedarf.push(checkbox.value);
                });
                return data;
            };

            const formData = getFormData();

            if (!formData.personName.trim() || !formData.begruendung.trim() || !formData.behoerdeName.trim()) {
                alert('Bitte füllen Sie mindestens die Felder für Name, Begründung und den Namen der Behörde aus.');
                return;
            }
            if (formData.bedarf.length === 0 && !formData.bedarfSonstiges.trim()) {
                alert('Bitte wählen Sie mindestens einen benötigten Gegenstand aus der Liste aus oder tragen Sie ihn in das Feld "Weitere" ein.');
                return;
            }

            localStorage.setItem('pendingPaymentData-erstausstattung', JSON.stringify(formData));
            window.location.href = "danke.html?typ=erstausstattung";
        });
    }
});