document.addEventListener("DOMContentLoaded", function() {

    // Automatischer Button für Textbeispiele unter allen Textareas
    document.querySelectorAll("textarea[placeholder]").forEach(textarea => {
        // Doppelte Verarbeitung verhindern
        if (textarea.dataset.autofillAdded) return;

        const placeholderText = textarea.getAttribute("placeholder").trim();
        
        // Ignoriert sehr kurze Platzhalter (z. B. unter 15 Zeichen)
        if (!placeholderText || placeholderText.length < 15) return;

        // Zeilen-Container unter der Textarea
        const wrapper = document.createElement("div");
        wrapper.style.cssText = "display: flex; align-items: center; gap: 8px; margin-top: 4px; margin-bottom: 12px; flex-wrap: wrap;";

        // Kleiner, edler Button (11px, dezent)
        const btnCopy = document.createElement("button");
        btnCopy.type = "button";
        btnCopy.textContent = "Textbeispiel übernehmen";
        btnCopy.style.cssText = "font-size: 11px; padding: 3px 8px; background-color: #f8f9fa; border: 1px solid #cccccc; border-radius: 3px; color: #2c3e50; cursor: pointer; font-family: inherit; transition: background-color 0.2s, border-color 0.2s;";

        // Hover-Effekt
        btnCopy.addEventListener("mouseover", () => {
            btnCopy.style.backgroundColor = "#e9ecef";
            btnCopy.style.borderColor = "#b0b0b0";
        });
        btnCopy.addEventListener("mouseout", () => {
            btnCopy.style.backgroundColor = "#f8f9fa";
            btnCopy.style.borderColor = "#cccccc";
        });

        // Kurzer Erklärtext daneben
        const hintText = document.createElement("span");
        hintText.textContent = "Fügt den Formulierungsvorschlag direkt als bearbeitbaren Text ein.";
        hintText.style.cssText = "font-size: 11px; color: #6c757d;";

        // Klick-Logik: Text aus Placeholder in das Feld kopieren
        btnCopy.addEventListener("click", () => {
            textarea.value = placeholderText;
            textarea.focus();
            textarea.dispatchEvent(new Event("input", { bubbles: true }));
        });

        // Zusammenbauen und direkt nach dem Textfeld einfügen
        wrapper.appendChild(btnCopy);
        wrapper.appendChild(hintText);

        textarea.parentNode.insertBefore(wrapper, textarea.nextSibling);
        textarea.dataset.autofillAdded = "true";
    });

});