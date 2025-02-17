let currentInputIndex = -1;
let inputsArray = [];
let yearData = {};
let lunchStart = "0000";
let lunchEnd = "0000";

function loadLunchBreak(year) {
    const storedLunch = JSON.parse(localStorage.getItem(`lunchBreak_${year}`)) || { start: "0000", end: "0000" };
    lunchStart = storedLunch.start;
    lunchEnd = storedLunch.end;
    document.getElementById('lunch-start').value = lunchStart;
    document.getElementById('lunch-end').value = lunchEnd;
    calculateLunchBreakDuration();
}

function saveLunchBreak(year) {
    if (lunchStart !== "0000" || lunchEnd !== "0000") {
        localStorage.setItem(`lunchBreak_${year}`, JSON.stringify({ start: lunchStart, end: lunchEnd }));
    } else {
        localStorage.removeItem(`lunchBreak_${year}`);
    }
}

function loadYearData(year) {
    // Charger les données pour chaque jour de l'année sélectionnée
    yearData = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const value = localStorage.getItem(key);
        if (value && key.includes(`-${year}`)) {
            try {
                yearData[key] = JSON.parse(value);
            } catch (e) {
                console.error(`Invalid JSON for key ${key}:`, e);
            }
        }
    }
}

function saveYearData(date, data) {
    // Vérifier que les données ne sont pas undefined avant de les sauvegarder
    if (date && Array.isArray(data) && data.length === 3) {
        localStorage.setItem(date, JSON.stringify(data));
    } else {
        console.error(`Invalid data for date ${date}:`, data);
    }
}

function generateYears() {
    const currentYear = new Date().getFullYear();
    const yearSelect = document.getElementById('year');
    yearSelect.innerHTML = ''; // Clear existing options
    for (let i = 0; i < 5; i++) {
        const option = document.createElement('option');
        option.value = currentYear - i;
        option.textContent = currentYear - i;
        yearSelect.appendChild(option);
    }
    const selectedYear = parseInt(yearSelect.value);
    loadYearData(selectedYear); // Charger les données pour l'année courante
    loadLunchBreak(selectedYear);
    generateTable(); // Générer le tableau après avoir chargé les données
}

function generateTable() {
    const yearSelect = document.getElementById('year');
    const selectedYear = parseInt(yearSelect.value);
    loadYearData(selectedYear); // Charger les données pour l'année sélectionnée
    loadLunchBreak(selectedYear);
    const tableBody = document.getElementById('table-body');
    tableBody.innerHTML = '';

    for (let month = 0; month < 12; month++) {
        const date = new Date(selectedYear, month, 1);
        while (date.getMonth() === month) {
            const dateString = date.toLocaleDateString('fr-FR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
            const dayName = date.toLocaleDateString('fr-FR', { weekday: 'long' });

            const row = document.createElement('tr');

            let cell = document.createElement('td');
            cell.textContent = dateString;
            row.appendChild(cell);

            cell = document.createElement('td');
            cell.textContent = dayName.charAt(0).toUpperCase() + dayName.slice(1);
            row.appendChild(cell);

            ['Début', 'Fin'].forEach((field, idx) => {
                const input = document.createElement('input');
                input.type = 'text';
                input.pattern = '\\d{4}';
                input.placeholder = '0000';
                input.size = 5;
                input.onchange = () => calculateTotal({ target: input });
                input.setAttribute('tabindex', '0');
                input.addEventListener('focus', () => {
                    currentInputIndex = inputsArray.indexOf(input);
                });
                input.addEventListener('input', limitInput);
                if (yearData[dateString] && yearData[dateString][idx]) {
                    input.value = yearData[dateString][idx];
                }
                cell = document.createElement('td');
                cell.appendChild(input);
                row.appendChild(cell);
                inputsArray.push(input);
            });

            const jPlusOneCell = document.createElement('td');
            const jPlusOneCheckbox = document.createElement('input');
            jPlusOneCheckbox.type = 'checkbox';
            jPlusOneCheckbox.onchange = function() {
                calculateTotal({ target: row.querySelectorAll('input')[1] });
            };
            if (yearData[dateString] && yearData[dateString][2] === 'checked') {
                jPlusOneCheckbox.checked = true;
            }
            jPlusOneCell.appendChild(jPlusOneCheckbox);
            row.appendChild(jPlusOneCell);

            cell = document.createElement('td');
            cell.id = `total-${dateString}`;
            row.appendChild(cell);
            calculateTotal({ target: row.querySelector('input') });

            tableBody.appendChild(row);
            date.setDate(date.getDate() + 1);
        }
    }
}

function calculateTotal(event) {
    const row = event.target.parentElement.parentElement;
    const inputs = row.querySelectorAll('input[type="text"]');
    const debut = parseTime(inputs[0].value);
    const fin = parseTime(inputs[1].value);
    const totalCell = row.querySelector('td:last-child');
    const jPlusOneCheckbox = row.querySelector('input[type="checkbox"]');
    const dateString = row.cells[0].textContent;

    const dayName = row.cells[1].textContent.toLowerCase();

    if (debut !== null && fin !== null) {
        let diff = (fin - debut) / (60 * 1000); // difference in minutes

        if (jPlusOneCheckbox.checked) {
            diff += 1440; // 24 heures en minutes
        }

        if (dayName !== 'samedi' && dayName !== 'dimanche') {
            const lunchStartTime = parseTime(lunchStart);
            const lunchEndTime = parseTime(lunchEnd);

            if (!jPlusOneCheckbox.checked) {
                if (debut < lunchStartTime && fin > lunchEndTime) {
                    diff -= (lunchEndTime - lunchStartTime) / (60 * 1000);
                }
            } else {
                const extendedFin = fin + 1440 * 60 * 1000; // Adding 24 hours to fin
                if (debut < lunchStartTime && extendedFin > lunchEndTime) {
                    diff -= (lunchEndTime - lunchStartTime) / (60 * 1000);
                }
            }
        }

        const hours = Math.floor(diff / 60);
        const minutes = diff % 60;
        totalCell.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        saveYearData(dateString, [inputs[0].value, inputs[1].value, jPlusOneCheckbox.checked ? 'checked' : '']);
    } else {
        totalCell.textContent = '';
        saveYearData(dateString, [inputs[0].value ? inputs[0].value : '', inputs[1].value ? inputs[1].value : '', jPlusOneCheckbox.checked ? 'checked' : '']);
    }
    checkNegativeTotal(row);
}

function clearData() {
    const yearSelect = document.getElementById('year');
    const selectedYear = parseInt(yearSelect.value);
    const rows = document.querySelectorAll('#table-body tr');
    rows.forEach(row => {
        const dateString = row.cells[0].textContent;
        const inputs = row.querySelectorAll('input[type="text"]');
        inputs[0].value = '';
        inputs[1].value = '';
        inputs[0].dispatchEvent(new Event('change'));
        inputs[1].dispatchEvent(new Event('change'));
        const jPlusOneCheckbox = row.querySelector('input[type="checkbox"]');
        jPlusOneCheckbox.checked = false;
        jPlusOneCheckbox.dispatchEvent(new Event('change'));
        saveYearData(dateString, ["", "", ""]);
    });
}

function exportData() {
    let DEJContent = '<DEJ>\n';
    let HOURSContent = '<HOURS>\n';

    // Collect lunch break data for each year
    for (let year = new Date().getFullYear(); year > new Date().getFullYear() - 5; year--) {
        const storedLunch = localStorage.getItem(`lunchBreak_${year}`);
        if (storedLunch) {
            try {
                const lunchData = JSON.parse(storedLunch);
                if (lunchData && typeof lunchData === 'object' && 'start' in lunchData && 'end' in lunchData) {
                    if (lunchData.start !== "0000" || lunchData.end !== "0000") {
                        DEJContent += `${year};${lunchData.start};${lunchData.end}\n`;
                    }
                }
            } catch (e) {
                console.error(`Invalid JSON for lunchBreak_${year}:`, e);
            }
        }
    }
    DEJContent += '</DEJ>';

    // Collect hours data for each year including J+1 checkbox state
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const value = localStorage.getItem(key);
        if (value) {
            try {
                const data = JSON.parse(value);
                if (Array.isArray(data) && data.length === 3) {
                    const [begin, end, checked] = data;
                    if ((begin && begin !== '0000') || (end && end !== '0000')) {
                        // Convert date format from jj-MM-YYYY to jj/MM/YYYY
                        const formattedDate = key.replace(/-/g, '/');
                        HOURSContent += `${formattedDate};${begin};${end};${checked === 'checked' ? 'OUI' : 'NON'}\n`;
                    }
                }
            } catch (e) {
                console.error(`Invalid JSON for key ${key}:`, e);
            }
        }
    }
    HOURSContent += '</HOURS>';

    // Combine the contents
    const content = DEJContent + '\n' + HOURSContent;

    // Create a Blob with the content
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    // Create an anchor element to download the file
    const a = document.createElement('a');
    a.href = url;
    a.download = `EXPORT_HSUP_${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}



function openModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.style.display = "block";
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = "none";
}

function applyDefaultHours() {
    const begin = document.getElementById('default-begin').value;
    const end = document.getElementById('default-end').value;
    const yearSelect = document.getElementById('year');
    const selectedYear = parseInt(yearSelect.value);

    const rows = document.querySelectorAll('#table-body tr');
    rows.forEach(row => {
        const dayName = row.cells[1].textContent.toLowerCase();
        if (dayName !== 'samedi' && dayName !== 'dimanche') {
            const inputs = row.querySelectorAll('input[type="text"], input[type="checkbox"]');
            const dateString = row.cells[0].textContent;
            if (!inputs[0].value || inputs[0].value === '0000') {
                inputs[0].value = begin;
                inputs[0].dispatchEvent(new Event('change'));
            }
            if (!inputs[1].value || inputs[1].value === '0000') {
                inputs[1].value = end;
                inputs[1].dispatchEvent(new Event('change'));
            }
            // Sauvegarder uniquement si les données sont valides
            const jPlusOneCheckbox = inputs[2];
            saveYearData(dateString, [inputs[0].value, inputs[1].value, jPlusOneCheckbox ? (jPlusOneCheckbox.checked ? 'checked' : '') : '']);
        }
    });
    closeModal('heures-types-modal');
}

function replaceValues() {
    const column = document.querySelector('input[name="replace-column"]:checked').value;
    const oldValue = document.getElementById('old-value').value;
    const newValue = document.getElementById('new-value').value;
    const yearSelect = document.getElementById('year');
    const selectedYear = parseInt(yearSelect.value);

    const rows = document.querySelectorAll('#table-body tr');
    rows.forEach(row => {
        const inputs = row.querySelectorAll('input[type="text"], input[type="checkbox"]');
        const index = column === 'begin' ? 0 : 1;
        const dateString = row.cells[0].textContent;
        if (inputs[index].value === oldValue) {
            inputs[index].value = newValue;
            inputs[index].dispatchEvent(new Event('change'));
            // Sauvegarder uniquement si les données sont valides
            const jPlusOneCheckbox = inputs[2];
            saveYearData(dateString, [inputs[0].value, inputs[1].value, jPlusOneCheckbox ? (jPlusOneCheckbox.checked ? 'checked' : '') : '']);
        }
    });
    closeModal('remplacer-modal');
}


function onYearChange() {
    const yearSelect = document.getElementById('year');
    const selectedYear = parseInt(yearSelect.value);
    loadYearData(selectedYear); // Charger les données pour l'année sélectionnée
    generateTable();
    initializeLunchBreakInputs();
    saveLunchBreak(selectedYear);
}

function calculateLunchBreakDuration() {
    const yearSelect = document.getElementById('year');
    const selectedYear = parseInt(yearSelect.value);
    const start = document.getElementById('lunch-start').value;
    const end = document.getElementById('lunch-end').value;

    const startTime = parseTime(start);
    const endTime = parseTime(end);

    if (startTime !== null && endTime !== null) {
        const diff = (endTime - startTime) / (60 * 1000); // difference in minutes
        const hours = Math.floor(diff / 60);
        const minutes = diff % 60;
        document.getElementById('lunch-duration').textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        lunchStart = start;
        lunchEnd = end;
        saveLunchBreak(selectedYear);
        regenerateTotals();
    } else {
        document.getElementById('lunch-duration').textContent = '';
        lunchStart = "0000";
        lunchEnd = "0000";
        saveLunchBreak(selectedYear);
    }
}

function regenerateTotals() {
    const rows = document.querySelectorAll('#table-body tr');
    rows.forEach(row => {
        const inputs = row.querySelectorAll('input[type="text"]');
        inputs[0].dispatchEvent(new Event('change'));
        inputs[1].dispatchEvent(new Event('change'));
        row.querySelector('input[type="checkbox"]').dispatchEvent(new Event('change')); // Recalculate totals including J+1
    });
}

function initializeLunchBreakInputs() {
    const yearSelect = document.getElementById('year');
    const selectedYear = parseInt(yearSelect.value);
    loadLunchBreak(selectedYear);
    document.getElementById('lunch-start').value = lunchStart;
    document.getElementById('lunch-end').value = lunchEnd;
}

function parseTime(timeStr) {
    if (!timeStr || timeStr.length !== 4 || isNaN(timeStr)) return null;
    const hours = parseInt(timeStr.substring(0, 2));
    const minutes = parseInt(timeStr.substring(2, 4));
    if (hours > 23 || minutes > 59) return null;
    return hours * 60 * 60 * 1000 + minutes * 60 * 1000;
}

function handleKeyPress(event) {
    if (event.key === 't') {
        toggleDarkMode();
    } else if (event.key === 'ArrowRight') {
        if (currentInputIndex < inputsArray.length - 1) {
            inputsArray[currentInputIndex + 1]?.focus();
        }
    } else if (event.key === 'ArrowLeft') {
        if (currentInputIndex > 0) {
            inputsArray[currentInputIndex - 1]?.focus();
        }
    } else if (event.key === 'ArrowDown') {
        const currentRow = Math.floor(currentInputIndex / 2);
        const newRow = currentRow + 1;
        if (newRow * 2 < inputsArray.length) {
            inputsArray[newRow * 2 + (currentInputIndex % 2)]?.focus();
        }
    } else if (event.key === 'ArrowUp') {
        const currentRow = Math.floor(currentInputIndex / 2);
        const newRow = currentRow - 1;
        if (newRow >= 0) {
            inputsArray[newRow * 2 + (currentInputIndex % 2)]?.focus();
        }
    }
}


function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const modals = document.querySelectorAll('.modal-content');
    modals.forEach(modal => {
        modal.classList.toggle('dark-mode', document.body.classList.contains('dark-mode'));
    });
    regenerateTotals();
}

function checkNegativeTotal(row) {
    const totalCell = row.querySelector('td:last-child');
    const totalValue = totalCell.textContent;
    const [hours, minutes] = totalValue.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes;

    if (totalMinutes < 0) {
        row.classList.add('negative-total');
    } else {
        row.classList.remove('negative-total');
    }
}

function limitInput(event) {
    const input = event.target;
    let value = input.value;

    // Remove any non-digit characters
    value = value.replace(/\D/g, '');

    // Limit the value to 4 characters
    if (value.length > 4) {
        value = value.slice(0, 4);
    }

    // Update the input value
    input.value = value;
}

window.onload = function() {
    generateYears();
    document.addEventListener('keydown', handleKeyPress);
    document.getElementById('lunch-start').addEventListener('input', limitInput);
    document.getElementById('lunch-end').addEventListener('input', limitInput);
};
