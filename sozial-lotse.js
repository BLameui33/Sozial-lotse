/**
 * Sozial-lotse.js
 * Zentrale Logik für:
 * - Autor / Letzte Aktualisierung (füllt #kl-page-author / #kl-page-lastupdated wenn vorhanden)
 * - Interaktive Checkliste (IDs erwartet: #kl-checklist, #kl-clear, #kl-download)
 * - Optionale lokale Speicherung (persist)
 *
 * Usage:
 * 1) Datei speichern unter /js/Sozial-lotse.js
 * 2) <script src="/js/Sozial-lotse.js" defer></script> vor </body> einfügen
 *
 * Elemente (falls vorhanden) werden automatisch befüllt:
 *  - #kl-page-author oder #kl-page-author-inline
 *  - #kl-page-lastupdated oder #kl-page-lastupdated-inline
 *  - Checkliste: <ul id="kl-checklist"> ... <li><label><input type="checkbox"> Text</label></li> ...</ul>
 *  - Buttons: #kl-clear, #kl-download
 *
 * Autor: Sozial-Lotse Team
 * Stand: 2025
 */

(function () {
  'use strict';

  // -----------------------------
  // Konfiguration
  // -----------------------------
  const CONFIG = {
    persist: false, // true = speichert Checkbox-Status lokal pro URL (localStorage)
    authorDefault: 'Sozial-Lotse Team',
    pdfFilename: 'Sozial-Lotse_Checkliste.pdf',
    printDelayMs: 200 // Wartezeit bevor window.print() aufgerufen wird
  };

  // -----------------------------
  // Hilfsfunktionen
  // -----------------------------
  function formatDateDE(d) {
    try {
      return d.toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) {
      // fallback
      return d.toISOString().slice(0, 10);
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  // -----------------------------
  // Autor / Letzte Aktualisierung initialisieren
  // -----------------------------
  (function initAuthorAndDate() {
    try {
      const authorSelectors = ['#kl-page-author', '#kl-page-author-inline'];
      const dateSelectors = ['#kl-page-lastupdated', '#kl-page-lastupdated-inline'];

      authorSelectors.forEach(sel => {
        const el = document.querySelector(sel);
        if (el && !el.textContent.trim()) el.textContent = CONFIG.authorDefault;
      });

      dateSelectors.forEach(sel => {
        const el = document.querySelector(sel);
        if (el && !el.textContent.trim()) el.textContent = formatDateDE(new Date());
      });
    } catch (e) {
      // fail silently
      // console.error('Author init error', e);
    }
  })();

  // -----------------------------
  // Checkliste: Referenzen
  // -----------------------------
  const checklist = document.getElementById('kl-checklist');
  if (!checklist) {
    // Keine Checkliste auf der Seite — nichts weiter nötig
    return;
  }
  const clearBtn = document.getElementById('kl-clear');
  const downloadBtn = document.getElementById('kl-download');

  // -----------------------------
  // Persistenz (optional)
  // -----------------------------
  const storageKey = function () { return 'kl_checklist_' + location.pathname; };

  function saveState() {
    if (!CONFIG.persist) return;
    try {
      const states = Array.from(checklist.querySelectorAll('input[type=checkbox]')).map(cb => !!cb.checked);
      localStorage.setItem(storageKey(), JSON.stringify(states));
    } catch (e) {
      // ignore storage errors (Quota/CSP)
    }
  }

  function loadState() {
    if (!CONFIG.persist) return;
    try {
      const raw = localStorage.getItem(storageKey());
      if (!raw) return;
      const arr = JSON.parse(raw);
      const inputs = checklist.querySelectorAll('input[type=checkbox]');
      inputs.forEach((cb, i) => { cb.checked = !!arr[i]; });
    } catch (e) {
      // ignore
    }
  }

  if (CONFIG.persist) {
    checklist.querySelectorAll('input[type=checkbox]').forEach(cb => cb.addEventListener('change', saveState));
    loadState();
  }

  // -----------------------------
  // Clear-Button
  // -----------------------------
  if (clearBtn) {
    clearBtn.addEventListener('click', function () {
      checklist.querySelectorAll('input[type=checkbox]').forEach(cb => cb.checked = false);
      saveState();
    });
  }

  // -----------------------------
  // PDF / Druck-Export (print-based)
  // Erzeugt ein sauberes HTML-Dokument (utf-8) und ruft window.print()
  // -----------------------------
  function getChecklistItems() {
    return Array.from(checklist.querySelectorAll('li')).map(li => {
      // Text ohne Checkbox
      // Falls Inhalt in <label> ... <input> ... TEXT </label>, wir holen label.textContent
      const label = li.querySelector('label');
      const text = label ? label.textContent.trim() : li.textContent.trim();
      const cb = li.querySelector('input[type=checkbox]');
      return { text: text.replace(/\s+/g, ' '), checked: !!(cb && cb.checked) };
    });
  }

  function buildPrintableHtml(items, authorText, updatedText) {
    const year = new Date().getFullYear();
    const listHtml = items.map(it => {
      const symbol = it.checked ? '☑' : '☐';
      return `<li class="wrap"><span class="checked-symbol">${symbol}</span> ${escapeHtml(it.text)}</li>`;
    }).join('\n');

    return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<title>Checkliste – Sozial-Lotse</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
/* A4 layout for print */
@page { size: A4; margin: 28mm 20mm; }
html,body{height:100%; margin:0; padding:0; -webkit-print-color-adjust: exact;}
body{ font-family: Arial, Helvetica, sans-serif; color:#111; padding:12px; box-sizing:border-box; }
header{ display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; }
.title { font-size:18px; font-weight:600; }
.meta { font-size:12px; color:#444; }
.intro { margin:10px 0 14px; color:#333; font-size:13px; }
ul.check { padding-left:18px; margin:0 0 12px 0; font-size:13.5px; line-height:1.45; }
ul.check li{ margin:8px 0; }
.checked-symbol { display:inline-block; width:22px; text-align:center; margin-right:6px; font-size:14px; vertical-align:middle; }
.wrap { word-break: break-word; }
.avoid-break { page-break-inside: avoid; }
footer { margin-top:18px; font-size:11px; color:#555; border-top:1px solid #eee; padding-top:8px; }
</style>
</head>
<body>
<header class="avoid-break">
  <div class="title">Checkliste</div>
  <div class="meta">${escapeHtml(authorText)}${updatedText ? ' • ' + escapeHtml(updatedText) : ''}</div>
</header>

<div class="intro">Diese Checkliste stammt von Sozial-Lotse. Speichern Sie die Seite als PDF oder drucken Sie sie.</div>

<section>
  <ul class="check">
    ${listHtml}
  </ul>
</section>

<footer class="avoid-break">
  <div>© ${year} Sozial-Lotse</div>
</footer>

<script>
  window.onload = function(){
    setTimeout(function(){
      window.print();
      // optional: window.close(); // nicht in allen Browsern erlaubt
    }, ${CONFIG.printDelayMs});
  };
</script>
</body>
</html>`;
  }

  async function triggerPrintExport() {
    try {
      const items = getChecklistItems();
      const authorEl = document.querySelector('#kl-page-author, #kl-page-author-inline');
      const updatedEl = document.querySelector('#kl-page-lastupdated, #kl-page-lastupdated-inline');
      const authorText = authorEl ? authorEl.textContent.trim() : CONFIG.authorDefault;
      const updatedText = updatedEl ? updatedEl.textContent.trim() : '';

      const html = buildPrintableHtml(items, authorText, updatedText);

      const w = window.open('', '_blank');
      if (!w) {
        alert('Popup wurde blockiert. Bitte erlauben Sie Popups, damit Sie die Checkliste als PDF speichern können.');
        return;
      }
      w.document.open();
      w.document.write(html);
      w.document.close();
    } catch (e) {
      // fallback: simple alert
      alert('Fehler beim Erzeugen der PDF-/Druckansicht. Bitte versuchen Sie, die Seite zu drucken.');
    }
  }

  if (downloadBtn) {
    downloadBtn.addEventListener('click', triggerPrintExport);
  } else {
    // Kein Download-Button - nichts zu tun
  }

  // -----------------------------
  // Ende
  // -----------------------------
})();
