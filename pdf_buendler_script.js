/**
 * PDF-Bündler & Bild-Komprimierer (100% Offline / Client-Side)
 * Autor: Sozial-Lotse Redaktion / Entwickler-Team
 * Benötigt: jsPDF, browser-image-compression
 */

document.addEventListener("DOMContentLoaded", () => {
    // DOM Elemente referenzieren
    const dropZone = document.getElementById("dropZone");
    const fileInput = document.getElementById("fileInput");
    const previewContainer = document.getElementById("imagePreviewContainer");
    const generatePdfBtn = document.getElementById("generatePdfBtn");
    const compressionLevel = document.getElementById("compressionLevel");
    const pdfFileName = document.getElementById("pdfFileName");
    const progressBarContainer = document.getElementById("progressBarContainer");
    const progressBarFill = document.getElementById("progressBarFill");
    const statusText = document.getElementById("statusText");

    // Array für die ausgewählten Bilddateien
    let selectedFiles = [];

    // ==========================================
    // 1. DRAG & DROP UND DATEIAUSWAHL FUNKTIONEN
    // ==========================================

    // Klick auf die Drop-Zone öffnet den Datei-Dialog
    dropZone.addEventListener("click", () => fileInput.click());

    // Datei(en) über den Datei-Dialog ausgewählt
    fileInput.addEventListener("change", (e) => {
        handleFiles(e.target.files);
        fileInput.value = ""; // Reset, damit die gleiche Datei erneut ausgewählt werden kann
    });

    // Drag-Events für visuelles Feedback
    dropZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropZone.classList.add("drop-zone--over");
    });

    dropZone.addEventListener("dragleave", () => {
        dropZone.classList.remove("drop-zone--over");
    });

    // Bilder per Drag & Drop loslassen
    dropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropZone.classList.remove("drop-zone--over");
        if (e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files);
        }
    });

    // Neue Dateien prüfen und ins Array aufnehmen
    function handleFiles(files) {
        const newFiles = Array.from(files).filter(file => file.type.startsWith("image/"));
        
        if (newFiles.length === 0) {
            alert("Bitte nur Bilddateien (JPG, PNG) auswählen.");
            return;
        }

        selectedFiles = selectedFiles.concat(newFiles);
        renderPreview();
    }

    // Vorschau der Bilder rendern (mit Löschen-Button)
    function renderPreview() {
        previewContainer.innerHTML = ""; // Container leeren
        
        selectedFiles.forEach((file, index) => {
            const wrapper = document.createElement("div");
            wrapper.className = "preview-wrapper";
            
            // Bild-Vorschau generieren
            const img = document.createElement("img");
            img.src = URL.createObjectURL(file);
            img.className = "image-preview";
            
            // Löschen-Button (Das "X")
            const removeBtn = document.createElement("button");
            removeBtn.className = "remove-btn";
            removeBtn.innerHTML = "×";
            removeBtn.title = "Bild entfernen";
            removeBtn.onclick = () => {
                selectedFiles.splice(index, 1); // Datei aus Array entfernen
                renderPreview(); // Vorschau neu laden
            };
            
            wrapper.appendChild(img);
            wrapper.appendChild(removeBtn);
            previewContainer.appendChild(wrapper);
        });
    }


    // ==========================================
    // 2. PDF GENERIERUNG & KOMPRIMIERUNG
    // ==========================================

    generatePdfBtn.addEventListener("click", async () => {
        if (selectedFiles.length === 0) {
            alert("Bitte fügen Sie mindestens ein Bild hinzu, bevor Sie das PDF generieren.");
            return;
        }

        // UI für Ladevorgang anpassen
        generatePdfBtn.disabled = true;
        generatePdfBtn.style.backgroundColor = "#95a5a6";
        progressBarContainer.style.display = "block";
        progressBarFill.style.width = "0%";
        
        // Dateiname auslesen
        const customName = pdfFileName.value.trim();
        const finalFileName = customName !== "" ? customName : "Behoerden_Upload_Dokument";

        // Komprimierungs-Einstellungen
        // Max. 5 MB Limit für Behörden -> Bild stark auf max 0.4 MB pro Bild verkleinern
        const isMaxCompression = compressionLevel.value === "max_compress";
        const compressionOptions = {
            maxSizeMB: isMaxCompression ? 0.4 : 1.2, 
            maxWidthOrHeight: isMaxCompression ? 1200 : 1920, 
            useWebWorker: true,
            fileType: "image/jpeg" // Einheitlich JPEG um Platz zu sparen
        };

        try {
            // jsPDF instanzieren (Hochformat, Millimeter, DIN A4)
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF("p", "mm", "a4");
            
            // Maße einer A4-Seite in mm
            const pdfWidth = doc.internal.pageSize.getWidth();
            const pdfHeight = doc.internal.pageSize.getHeight();

            // Alle ausgewählten Bilder durchlaufen
            for (let i = 0; i < selectedFiles.length; i++) {
                statusText.innerText = `Komprimiere Bild ${i + 1} von ${selectedFiles.length}...`;
                
                // 1. Bild komprimieren (mithilfe der browser-image-compression Bibliothek)
                const compressedFile = await imageCompression(selectedFiles[i], compressionOptions);
                
                // 2. Datei in Base64 umwandeln (wird von jsPDF benötigt)
                const base64Image = await fileToBase64(compressedFile);
                
                // 3. Bildmaße ermitteln
                const imgProps = doc.getImageProperties(base64Image);
                
                // 4. Skalierung berechnen, damit das Bild auf DIN A4 passt (mit 5mm Rand)
                const margin = 5;
                const maxImgWidth = pdfWidth - (margin * 2);
                const maxImgHeight = pdfHeight - (margin * 2);
                
                const ratio = Math.min(maxImgWidth / imgProps.width, maxImgHeight / imgProps.height);
                const finalImgWidth = imgProps.width * ratio;
                const finalImgHeight = imgProps.height * ratio;
                
                // 5. Zentriert auf dem Blatt platzieren
                const x = (pdfWidth - finalImgWidth) / 2;
                const y = (pdfHeight - finalImgHeight) / 2;

                // Bei jedem weiteren Bild eine neue Seite hinzufügen
                if (i > 0) {
                    doc.addPage();
                }

                // Bild ins PDF einfügen
                doc.addImage(base64Image, 'JPEG', x, y, finalImgWidth, finalImgHeight, undefined, 'FAST');

                // Fortschrittsbalken updaten
                const progress = ((i + 1) / selectedFiles.length) * 100;
                progressBarFill.style.width = `${progress}%`;
            }

            // PDF fertigstellen und speichern
            statusText.innerText = "PDF wird zusammengefügt und heruntergeladen...";
            
            // Kurze Verzögerung für sauberes UI-Update
            await new Promise(resolve => setTimeout(resolve, 500)); 
            
            doc.save(`${finalFileName}.pdf`);
            statusText.innerText = "✅ Fertig! Das PDF wurde heruntergeladen.";
            statusText.style.color = "#2e7d32";

        } catch (error) {
            console.error("Fehler bei der PDF Generierung:", error);
            alert("Es gab einen Fehler beim Komprimieren der Bilder. Bitte versuchen Sie es erneut.");
            statusText.innerText = "❌ Fehler aufgetreten.";
            statusText.style.color = "#e53935";
        } finally {
            // Button wieder aktivieren
            generatePdfBtn.disabled = false;
            generatePdfBtn.style.backgroundColor = "#d35400";
            
            // Fortschrittsbalken nach 4 Sekunden ausblenden
            setTimeout(() => {
                progressBarContainer.style.display = "none";
                progressBarFill.style.width = "0%";
                statusText.innerText = "";
                statusText.style.color = "#555";
            }, 4000);
        }
    });

    // Hilfsfunktion: Konvertiert ein File-Objekt in einen Base64-String
    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = (error) => reject(error);
        });
    }
});