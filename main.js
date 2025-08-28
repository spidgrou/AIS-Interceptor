document.addEventListener('DOMContentLoaded', function() {
    let isSimulationActive = false;
    let myShip = { lat: null, lon: null, sog: null, cog: null };
    let realMyShip = { lat: null, lon: null, sog: null, cog: null };
    let aisTargets = {}, selectedTargetMmsi = null, ws;
    let currentSort = { column: 'distance', direction: 'asc' }; // Ordina per distanza di default
    const allDomElements = {
        status: document.getElementById('status'),
        myLat: document.getElementById('my-lat'), myLon: document.getElementById('my-lon'),
        mySog: document.getElementById('my-sog'), myCog: document.getElementById('my-cog'),
        mySogBox: document.getElementById('my-sog-box'), myCogBox: document.getElementById('my-cog-box'),
        course: document.getElementById('interception-course'),
        time: document.getElementById('interception-time'),
        distance: document.getElementById('interception-distance'),
        selectTargetBtn: document.getElementById('select-target-btn'),
        targetName: document.getElementById('selected-target-name'),
        modal: document.getElementById('target-modal'), closeModalBtn: document.getElementById('close-modal-btn'),
        tableBody: document.getElementById('target-table-body'),
        simCheckbox: document.getElementById('simulation-checkbox'),
        simInputs: document.getElementById('simulation-inputs'),
        simSogInput: document.getElementById('sim-sog-input'),
    };

    function getShipTypeDescription(typeId) {
        if (!typeId) return 'N/D';
        const types = {
            20: "WIG", 30: "Pesca", 31: "Traino", 32: "Traino >200m", 33: "Dragaggio", 34: "Immersione", 35: "Oper. Militari", 36: "Vela", 37: "Divertirsi",
            40: "Alta Velocità", 50: "Pilota", 51: "Ricerca/Soccorso", 52: "Rimorchiatore", 53: "Tender", 54: "Anti-inquinamento", 55: "Forze dell'ordine", 58: "Medico",
            60: "Passeggeri", 70: "Cargo", 80: "Petroliera", 90: "Altro"
        };
        return types[typeId] || types[Math.floor(typeId / 10) * 10] || 'N/D';
    }
    
    function formatCoordinate(decimal, type) {
        if (decimal === null || decimal === undefined) return '--';
        const absDecimal = Math.abs(decimal);
        const degrees = Math.floor(absDecimal);
        const minutes = (absDecimal - degrees) * 60;
        let direction = type === 'lat' ? (decimal >= 0 ? 'N' : 'S') : (decimal >= 0 ? 'E' : 'W');
        return `${String(degrees)}° ${minutes.toFixed(3)}' ${direction}`;
    }

    function calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 3440.065;
        const dLat = (lat2 - lat1) * Math.PI / 180, dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    function calculateInterceptCourse() {
        allDomElements.course.textContent = '--'; allDomElements.course.title = '';
        allDomElements.time.textContent = '--'; allDomElements.distance.textContent = '--';
        if (!selectedTargetMmsi || !aisTargets[selectedTargetMmsi] || myShip.lat === null) return;
        const target = aisTargets[selectedTargetMmsi];
        if ([myShip.sog, target.lat, target.lon, target.sog, target.cog].some(v => v === null || v === undefined)) {
            allDomElements.course.textContent = 'Dati insuff.';
            allDomElements.course.title = 'L\'applicazione non ha ancora tutte le informazioni necessarie per poter eseguire il calcolo.';
            return;
        }
        if (myShip.sog < 0.2) {
            allDomElements.course.textContent = 'Fermo';
            allDomElements.course.title = 'La tua barca è ferma o si muove troppo lentamente per poter intercettare.';
            return;
        }
        const toRad = deg => deg * Math.PI / 180, toDeg = rad => (rad * 180 / Math.PI + 360) % 360;
        const bearingToTarget = toDeg(Math.atan2(Math.sin(toRad(target.lon - myShip.lon)) * Math.cos(toRad(target.lat)), Math.cos(toRad(myShip.lat)) * Math.sin(toRad(target.lat)) - Math.sin(toRad(myShip.lat)) * Math.cos(toRad(target.lat)) * Math.cos(toRad(target.lon - myShip.lon))));
        const angleA_rad = toRad(target.cog - bearingToTarget);
        if (myShip.sog < (target.sog * Math.abs(Math.sin(angleA_rad))) && myShip.sog < target.sog) {
            allDomElements.course.textContent = 'Lento';
            allDomElements.course.title = 'La tua velocità attuale non è sufficiente per intercettare il target. Devi aumentare la velocità.';
            return;
        }
        const angleB_rad = Math.asin((target.sog * Math.sin(angleA_rad)) / myShip.sog);
        const interceptionCourse = (bearingToTarget + toDeg(angleB_rad)) % 360;
        allDomElements.course.textContent = String(Math.round(interceptionCourse)).padStart(3, '0') + '°';
        allDomElements.course.title = 'Rotta calcolata da seguire per l\'intercettazione.';
        const distance = calculateDistance(myShip.lat, myShip.lon, target.lat, target.lon);
        const a = myShip.sog ** 2 - target.sog ** 2, b = 2 * distance * target.sog * Math.cos(angleA_rad), c = -(distance ** 2);
        let timeHours = -1;
        if (Math.abs(a) < 0.01) { if (b !== 0) timeHours = -c / b; } 
        else { const disc = b ** 2 - 4 * a * c; if (disc >= 0) { const t1 = (-b + Math.sqrt(disc)) / (2 * a), t2 = (-b - Math.sqrt(disc)) / (2 * a); timeHours = (t1 > 0 && t2 > 0) ? Math.min(t1, t2) : Math.max(t1, t2); } }
        if (timeHours > 0 && timeHours < 24) {
            allDomElements.time.textContent = Math.round(timeHours * 60) + ' min';
            allDomElements.distance.textContent = (myShip.sog * timeHours).toFixed(1) + ' NM';
        }
    }

    function updateUI() {
        allDomElements.myLat.textContent = formatCoordinate(myShip.lat, 'lat');
        allDomElements.myLon.textContent = formatCoordinate(myShip.lon, 'lon');
        allDomElements.mySog.textContent = (myShip.sog !== null) ? myShip.sog.toFixed(1) : '--';
        allDomElements.myCog.textContent = (myShip.cog !== null) ? String(Math.round(myShip.cog)).padStart(3, '0') : '--';
        allDomElements.mySogBox.classList.toggle('simulated-value', isSimulationActive);
        allDomElements.myCogBox.classList.remove('simulated-value');
        calculateInterceptCourse();
    }
    
    function applySimulationState() {
        myShip = { ...realMyShip };
        if (isSimulationActive) { myShip.sog = parseFloat(allDomElements.simSogInput.value) || 0; }
        updateUI();
    }

    function populateTargetTable(targets) {
        allDomElements.tableBody.innerHTML = '';
        
        // CALCOLA LA DISTANZA PER OGNI NAVE
        targets.forEach(vessel => {
            if (myShip.lat !== null && vessel.lat !== null) {
                vessel.distance = calculateDistance(myShip.lat, myShip.lon, vessel.lat, vessel.lon);
            } else {
                vessel.distance = null;
            }
        });

        const compare = (a, b) => {
            const valA = a[currentSort.column] ?? (currentSort.column === 'name' ? 'zzz' : 9999);
            const valB = b[currentSort.column] ?? (currentSort.column === 'name' ? 'zzz' : 9999);
            let comparison = 0; if (valA > valB) comparison = 1; else if (valA < valB) comparison = -1;
            return currentSort.direction === 'desc' ? comparison * -1 : comparison;
        };
        targets.sort(compare);

        targets.forEach(vessel => {
            const row = document.createElement('tr');
            row.dataset.mmsi = vessel.mmsi;
            row.innerHTML = `
                <td>${vessel.name || 'N/D'}</td>
                <td>${getShipTypeDescription(vessel.shipType)}</td>
                <td>${vessel.mmsi}</td>
                <td>${vessel.callsign || '--'}</td>
                <td>${vessel.distance !== null ? vessel.distance.toFixed(1) + ' NM' : '--'}</td>
                <td>${vessel.sog !== null ? vessel.sog.toFixed(1) : '--'}</td>
                <td>${vessel.cog !== null ? String(Math.round(vessel.cog)).padStart(3, '0') : '--'}</td>
            `;
            row.addEventListener('click', () => selectTarget(vessel.mmsi));
            allDomElements.tableBody.appendChild(row);
        });
    }

    function selectTarget(mmsi) {
        selectedTargetMmsi = mmsi;
        const target = aisTargets[mmsi];
        if (target) { allDomElements.targetName.textContent = `${target.name || 'N/D'} (${mmsi})`; }
        if (ws && ws.readyState === WebSocket.OPEN) { ws.send(JSON.stringify({ type: 'SUBSCRIBE_TARGET', mmsi: mmsi })); }
        allDomElements.modal.style.display = 'none'; updateUI();
    }

    function connect() {
        ws = new WebSocket(`ws://${window.location.host}`);
        ws.onopen = () => { allDomElements.status.textContent = 'Connesso'; allDomElements.status.style.backgroundColor = '#28a745'; };
        ws.onclose = () => { allDomElements.status.textContent = 'Disconnesso...'; allDomElements.status.style.backgroundColor = '#dc3545'; selectedTargetMmsi = null; setTimeout(connect, 3000); };
        ws.onerror = () => { allDomElements.status.textContent = 'Errore'; allDomElements.status.style.backgroundColor = '#ffc107'; ws.close(); };
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'SELF_UPDATE') { realMyShip = data.payload; applySimulationState(); }
                else if (data.type === 'AIS_UPDATE') {
                    // Aggiorna la cache locale dei target
                    const mmsi = data.payload.mmsi;
                    if (!aisTargets[mmsi]) aisTargets[mmsi] = {};
                    Object.assign(aisTargets[mmsi], data.payload);

                    // Se il client è iscritto a questo target, aggiorna la UI principale
                    if (selectedTargetMmsi === mmsi) {
                       updateUI();
                    }
                }
                else if (data.type === 'VESSEL_LIST') {
                    data.payload.forEach(v => { if (!aisTargets[v.mmsi]) aisTargets[v.mmsi] = {}; Object.assign(aisTargets[v.mmsi], v); });
                    populateTargetTable(data.payload);
                }
            } catch(e) { console.error("Errore nel messaggio:", e); }
        };
    }

    allDomElements.simCheckbox.addEventListener('change', e => { isSimulationActive = e.target.checked; allDomElements.simInputs.classList.toggle('disabled', !isSimulationActive); applySimulationState(); });
    allDomElements.simSogInput.addEventListener('input', () => { if (isSimulationActive) applySimulationState(); });
    allDomElements.selectTargetBtn.addEventListener('click', () => { if (ws && ws.readyState === WebSocket.OPEN) { ws.send(JSON.stringify({ type: 'REQUEST_VESSEL_LIST' })); allDomElements.modal.style.display = 'block'; } else { alert("Connessione al server non attiva."); } });
    allDomElements.closeModalBtn.addEventListener('click', () => { allDomElements.modal.style.display = 'none'; });
    window.addEventListener('click', e => { if (e.target == allDomElements.modal) { allDomElements.modal.style.display = 'none'; } });
    document.querySelectorAll('#target-table th').forEach(header => {
        header.addEventListener('click', () => {
            const column = header.dataset.sort;
            if (currentSort.column === column) { currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc'; } else { currentSort.column = column; currentSort.direction = 'asc'; }
            populateTargetTable(Object.values(aisTargets));
        });
    });
    
    allDomElements.simInputs.classList.add('disabled');
    connect();
});