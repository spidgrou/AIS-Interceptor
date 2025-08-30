document.addEventListener('DOMContentLoaded', function() {
    // =================================================================
    // --- STATE VARIABLES AND DOM ELEMENTS ---
    // =================================================================
    let isSimulationActive = false;
    let myShip = { lat: null, lon: null, sog: null, cog: null };
    let realMyShip = { lat: null, lon: null, sog: null, cog: null };
    let aisTargets = {};
    let selectedTargetMmsi = null;
    let currentSort = { column: 'distance', direction: 'asc' };
    let pluginConfig = { cruiseSpeed: 5, maxSpeed: 25 }; // Default values

    const allDomElements = {
        status: document.getElementById('status'),
        myLat: document.getElementById('my-lat'),
        myLon: document.getElementById('my-lon'),
        mySog: document.getElementById('my-sog'),
        myCog: document.getElementById('my-cog'),
        mySogBox: document.getElementById('my-sog-box'),
        myCogBox: document.getElementById('my-cog-box'),
        course: document.getElementById('interception-course'),
        time: document.getElementById('interception-time'),
        distance: document.getElementById('interception-distance'),
        selectTargetBtn: document.getElementById('select-target-btn'),
        targetName: document.getElementById('selected-target-name'),
        slowApproachInfo: document.getElementById('slow-approach-info'),
        cruiseApproachInfo: document.getElementById('cruise-approach-info'),
        maxApproachInfo: document.getElementById('max-approach-info'),
        modal: document.getElementById('target-modal'),
        closeModalBtn: document.getElementById('close-modal-btn'),
        tableBody: document.getElementById('target-table-body'),
        simCheckbox: document.getElementById('simulation-checkbox'),
        simInputs: document.getElementById('simulation-inputs'),
        simSogInput: document.getElementById('sim-sog-input'),
        displayCruiseSpeed: document.getElementById('display-cruise-speed'),
        displayMaxSpeed: document.getElementById('display-max-speed')
    };

    // =================================================================
    // --- UTILITY FUNCTIONS (Unchanged) ---
    // =================================================================
    function getShipTypeDescription(typeId) 
      { if (!typeId) return 'N/A'; 
        const types = { 20: "WIG", 21: "WIG", 22: "WIG", 30: "Fishing", 31: "Towing", 32: "Towing (>200m)", 33: "Dredging", 34: "Diving", 35: "Military", 
                        36: "Sailing", 37: "Pleasure Craft", 40: "High Speed Craft", 41: "High Speed Craft", 42: "High Speed Craft", 50: "Pilot Vessel", 
                        51: "Search & Rescue", 52: "Tug", 53: "Port Tender", 54: "Anti-pollution", 55: "Law Enforce", 58: "Medical", 60: "Passenger", 
                        61: "Passenger", 62: "Passenger", 70: "Cargo", 71: "Cargo (Haz-A)", 72: "Cargo (Haz-B)", 80: "Tanker", 81: "Tanker (Haz-A)", 
                        82: "Tanker (Haz-B)", 90: "Other" }; 
    return types[typeId] || types[Math.floor(typeId / 10) * 10] || 'N/A'; }
    
    function formatCoordinate(decimal, type) 
      { if (decimal === null || decimal === undefined) return '--'; 
        const absDecimal = Math.abs(decimal); 
        const degrees = Math.floor(absDecimal); 
        const minutes = (absDecimal - degrees) * 60; let direction = type === 'lat' ? (decimal >= 0 ? 'N' : 'S') : (decimal >= 0 ? 'E' : 'W'); 
    return `${String(degrees)}° ${minutes.toFixed(3)}' ${direction}`; }
    
    function calculateDistance(lat1, lon1, lat2, lon2) 
      { const R = 3440.065; 
        const dLat = (lat2 - lat1) * Math.PI / 180, dLon = (lon2 - lon1) * Math.PI / 180; 
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2; 
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); }

    // =================================================================
    // --- UI UPDATE FUNCTIONS (Unchanged) ---
    // =================================================================
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
        if (isSimulationActive) {
            myShip.sog = parseFloat(allDomElements.simSogInput.value) || 0;
        }
        updateUI();
    }

    function populateTargetTable(targets) {
        allDomElements.tableBody.innerHTML = '';
        targets.forEach(vessel => 
          { if (myShip.lat !== null && vessel.navigation?.position?.value) 
            { vessel.distance = calculateDistance(myShip.lat, myShip.lon, vessel.navigation.position.value.latitude, vessel.navigation.position.value.longitude); 
          } else { vessel.distance = null; } });
        targets.sort((a, b) => {
            let valA, valB;
            switch (currentSort.column) {
                case 'name': valA = a.name || 'zzz'; valB = b.name || 'zzz'; return currentSort.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
                case 'distance': valA = a.distance ?? Infinity; valB = b.distance ?? Infinity; break;
                case 'sog': valA = a.navigation?.speedOverGround?.value ?? -1; valB = b.navigation?.speedOverGround?.value ?? -1; break;
                default: valA = a[currentSort.column] || ''; valB = b[currentSort.column] || ''; 
      return currentSort.direction === 'asc' ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
            }
      return currentSort.direction === 'asc' ? valA - valB : valB - valA;
        });
        targets.forEach(vessel => {
            const row = document.createElement('tr');
            row.dataset.mmsi = vessel.mmsi;
            let callsign = '--'; const vhf = vessel.communication?.callsignVhf; 
            if (vhf) { callsign = (typeof vhf === 'string') ? vhf : vhf.value; }
            const shipType = getShipTypeDescription(vessel.design?.aisShipType?.value?.id);
            const sogValue = vessel.navigation?.speedOverGround?.value;
            const sog = sogValue == null ? '--' : (sogValue * 1.94384).toFixed(1);
            const cog = vessel.navigation?.courseOverGroundTrue?.value ? String(Math.round(vessel.navigation.courseOverGroundTrue.value * 180 / Math.PI)).padStart(3, '0') : '--';
            const distance = vessel.distance !== null ? vessel.distance.toFixed(1) + ' NM' : '--';
            row.innerHTML = `<td>${vessel.name || 'N/A'}</td><td>${shipType}</td><td>${vessel.mmsi}</td><td>${callsign}</td><td>${distance}</td><td>${sog}</td><td>${cog}</td>`;
            row.addEventListener('click', () => selectTarget(vessel.mmsi));
            allDomElements.tableBody.appendChild(row);
        });
    }

    // =================================================================
    // --- INTERCEPTION LOGIC (Unchanged) ---
    // =================================================================
    function getInterceptSolution(mySog, targetSog, targetCog, bearingToTarget, distanceNM) {
        const toRad = deg => deg * Math.PI / 180;
        const toDeg = rad => (rad * 180 / Math.PI + 360) % 360;
        const angleA_rad = toRad(targetCog - bearingToTarget);
        if (mySog <= (targetSog * Math.abs(Math.sin(angleA_rad)))) { return null; }
        const angleB_rad = Math.asin((targetSog * Math.sin(angleA_rad)) / mySog);
        const course = (bearingToTarget + toDeg(angleB_rad)) % 360;
        const a = mySog ** 2 - targetSog ** 2;
        const b = 2 * distanceNM * targetSog * Math.cos(angleA_rad);
        const c = -(distanceNM ** 2);
        let timeHours = -1;
        if (Math.abs(a) < 0.01) {
            if (b !== 0) timeHours = -c / b;
        } else {
            const disc = b ** 2 - 4 * a * c;
            if (disc >= 0) {
                const t1 = (-b + Math.sqrt(disc)) / (2 * a);
                const t2 = (-b - Math.sqrt(disc)) / (2 * a);
                timeHours = (t1 > 0 && t2 > 0) ? Math.min(t1, t2) : Math.max(t1, t2);
            }
        }
        if (timeHours > 0) {
            return { course: course, time: timeHours * 60, distance: mySog * timeHours };
        }
        return null;
    }

    function calculateInterceptCourse() {
        allDomElements.course.textContent = '--'; 
        allDomElements.time.textContent = '--'; 
        allDomElements.distance.textContent = '--'; 
        allDomElements.slowApproachInfo.textContent = ''; 
        allDomElements.cruiseApproachInfo.textContent = ''; 
        allDomElements.maxApproachInfo.textContent = '';
        if (!selectedTargetMmsi || !aisTargets[selectedTargetMmsi] || myShip.lat === null) return;
        const target = aisTargets[selectedTargetMmsi];
        const targetLat = target.navigation?.position?.value?.latitude;
        const targetLon = target.navigation?.position?.value?.longitude;
        if (targetLat == null || targetLon == null) { allDomElements.course.textContent = 'No Position'; return; }
        const distanceNM = calculateDistance(myShip.lat, myShip.lon, targetLat, targetLon);
        const toRad = deg => deg * Math.PI / 180;
        const toDeg = rad => (rad * 180 / Math.PI + 360) % 360;
        const bearingToTarget = toDeg(Math.atan2(Math.sin(toRad(targetLon - myShip.lon)) * Math.cos(toRad(targetLat)), 
          Math.cos(toRad(myShip.lat)) * Math.sin(toRad(targetLat)) - Math.sin(toRad(myShip.lat)) * Math.cos(toRad(targetLat)) * Math.cos(toRad(targetLon - myShip.lon))));

        if (myShip.sog < 0.2) { allDomElements.course.textContent = 'Stationary'; }
        else if (distanceNM < 1.0) { allDomElements.course.textContent = String(Math.round(bearingToTarget)).padStart(3, '0') + '°'; 
          allDomElements.time.textContent = 'Close Quarters'; allDomElements.distance.textContent = 'N/A'; }
        else {
            const targetSog = target.navigation?.speedOverGround?.value ? target.navigation.speedOverGround.value * 1.94384 : null;
            const targetCog = target.navigation?.courseOverGroundTrue?.value ? target.navigation.courseOverGroundTrue.value * 180 / Math.PI : null;
            if (targetSog === null || targetCog === null) { allDomElements.course.textContent = 'Insuff. Data'; }
            else { 
              const solution = getInterceptSolution(myShip.sog, targetSog, targetCog, bearingToTarget, distanceNM); 
                if (solution) { allDomElements.course.textContent = String(Math.round(solution.course)).padStart(3, '0') + '°'; 
                  allDomElements.time.textContent = Math.round(solution.time) + ' min'; allDomElements.distance.textContent = solution.distance.toFixed(1) + ' NM'; 
                } else { 
                allDomElements.course.textContent = 'Too Slow'; } }
        }
        
        const targetSog = target.navigation?.speedOverGround?.value ? target.navigation.speedOverGround.value * 1.94384 : null;
        const targetCog = target.navigation?.courseOverGroundTrue?.value ? target.navigation.courseOverGroundTrue.value * 180 / Math.PI : null;
        if (distanceNM > 1.0 && targetSog !== null && targetCog !== null) {
            const angleA_rad = toRad(targetCog - bearingToTarget);
            const minSpeed = targetSog * Math.abs(Math.sin(angleA_rad)) + 0.1;
            const slowSolution = getInterceptSolution(minSpeed, targetSog, targetCog, bearingToTarget, distanceNM);
            if (slowSolution) 
              { allDomElements.slowApproachInfo.textContent = `Slow approach: ${minSpeed.toFixed(1)} kt / 
                ${Math.round(slowSolution.course)}° / ${Math.round(slowSolution.time)} min / ${slowSolution.distance.toFixed(1)} NM`; }
            if (pluginConfig.cruiseSpeed > minSpeed) {
                const cruiseSolution = getInterceptSolution(pluginConfig.cruiseSpeed, targetSog, targetCog, bearingToTarget, distanceNM);
                if (cruiseSolution) 
                  { allDomElements.cruiseApproachInfo.textContent = `Cruise approach (@${Number(pluginConfig.cruiseSpeed).toFixed(1)} kt): ${Math.round(cruiseSolution.course)}° / ${Math.round(cruiseSolution.time)} min / ${cruiseSolution.distance.toFixed(1)} NM`; }
            }
            if (pluginConfig.maxSpeed > minSpeed && pluginConfig.maxSpeed > pluginConfig.cruiseSpeed) {
                const maxSolution = getInterceptSolution(pluginConfig.maxSpeed, targetSog, targetCog, bearingToTarget, distanceNM);
                if (maxSolution) 
                  { allDomElements.maxApproachInfo.textContent = `Max approach (@${Number(pluginConfig.maxSpeed).toFixed(1)} kt): ${Math.round(maxSolution.course)}° / ${Math.round(maxSolution.time)} min / ${maxSolution.distance.toFixed(1)} NM`; }
            }
        }
    }
    
    // =================================================================
    // --- SIGNAL K INTEGRATION (Final Version) ---
    // =================================================================
    async function fetchPluginConfig() { 
        try {
            // Fetch the local config.json file directly.
            const response = await fetch('config.json'); 
            if (response.ok) {
                pluginConfig = await response.json();
                console.log('Configuration loaded from public/config.json:', pluginConfig);
                
                // Update the display with the loaded values
                allDomElements.displayCruiseSpeed.textContent = Number(pluginConfig.cruiseSpeed || 0).toFixed(1);
                allDomElements.displayMaxSpeed.textContent = Number(pluginConfig.maxSpeed || 0).toFixed(1);
            } else {
                 console.error('Failed to fetch local config.json, status:', response.status);
            }
        } catch (e) { 
            console.error("Could not fetch or parse local config.json", e); 
        } 
    }
    
    function selectTarget(mmsi) { 
        selectedTargetMmsi = mmsi; 
        const target = aisTargets[mmsi]; 
        if (target) { allDomElements.targetName.textContent = `${target.name || 'N/A'} (${mmsi})`; } 
        allDomElements.modal.style.display = 'none'; 
        updateUI(); 
    }
    
    async function fetchInitialSelfData() { 
        try { 
            const response = await fetch('/signalk/v1/api/vessels/self'); 
            if (!response.ok) { throw new Error(`HTTP error! status: ${response.status}`); } 
            const selfData = await response.json(); 
            realMyShip.lat = selfData.navigation?.position?.value?.latitude; 
            realMyShip.lon = selfData.navigation?.position?.value?.longitude; 
            realMyShip.sog = (selfData.navigation?.speedOverGround?.value * 1.94384) || 0.0; 
            realMyShip.cog = selfData.navigation?.courseOverGroundTrue?.value ? selfData.navigation.courseOverGroundTrue.value * 180 / Math.PI : null; 
            realMyShip.mmsi = selfData.mmsi; 
            applySimulationState(); 
        } catch (error) { 
            console.error("Could not fetch 'self' data:", error); 
        } 
    }
    
    function connect() {
        const host = window.location.host;
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const skUrl = `${protocol}//${host}/signalk/v1/stream?subscribe=all`;
        const ws = new WebSocket(skUrl);
        ws.onopen = async () => { 
            allDomElements.status.textContent = 'Connected'; 
            allDomElements.status.style.backgroundColor = '#28a745'; 
            await fetchPluginConfig();
            await fetchInitialSelfData();
        };
        ws.onclose = () => { 
            allDomElements.status.textContent = 'Disconnected...'; 
            allDomElements.status.style.backgroundColor = '#dc3545'; 
            setTimeout(connect, 3000); 
        };
        ws.onmessage = (event) => { 
            const delta = JSON.parse(event.data); 
            if (!delta.updates || !delta.context) { return; } 
            if (delta.context === 'vessels.self') { 
                delta.updates.forEach(update => { 
                    update.values.forEach(item => { 
                        if (item.path === 'navigation.position') { 
                            realMyShip.lat = item.value.latitude; 
                            realMyShip.lon = item.value.longitude; 
                        } else if (item.path === 'navigation.speedOverGround') { 
                            realMyShip.sog = item.value * 1.94384 || 0.0; 
                        } else if (item.path === 'navigation.courseOverGroundTrue') { 
                            realMyShip.cog = item.value * 180 / Math.PI; 
                        } 
                    }); 
                }); 
                applySimulationState(); 
            } 
        };
    }

    async function requestVesselList() {
        try {
            const response = await fetch('/signalk/v1/api/vessels?query={"lastSeen":{"$gt":"-5m"}}');
            if (!response.ok) { throw new Error(`HTTP error! status: ${response.status}`); }
            const vesselsData = await response.json();
            aisTargets = {}; 
            Object.values(vesselsData).forEach(vessel => { 
                if (vessel.mmsi && vessel.mmsi !== realMyShip.mmsi) { 
                    aisTargets[vessel.mmsi] = vessel; 
                } 
            });
            populateTargetTable(Object.values(aisTargets));
            allDomElements.modal.style.display = 'block';
        } catch (error) { 
            console.error('Failed to fetch vessel list:', error); 
            alert(`Could not fetch vessel list. Check browser console for error details.`); 
        }
    }
    
    // =================================================================
    // --- EVENT LISTENERS ---
    // =================================================================
    allDomElements.selectTargetBtn.addEventListener('click', requestVesselList);
    allDomElements.simCheckbox.addEventListener('change', e => { 
        isSimulationActive = e.target.checked; 
        allDomElements.simInputs.classList.toggle('disabled', !isSimulationActive); 
        applySimulationState(); 
    });
    allDomElements.simSogInput.addEventListener('input', () => { 
        if (isSimulationActive) applySimulationState(); 
    });
    
    allDomElements.closeModalBtn.addEventListener('click', () => { allDomElements.modal.style.display = 'none'; });
    window.addEventListener('click', e => { if (e.target == allDomElements.modal) { allDomElements.modal.style.display = 'none'; } });
    document.querySelectorAll('#target-table th').forEach(header => {
        header.addEventListener('click', () => {
            const column = header.dataset.sort;
            if (!column) return;
            if (currentSort.column === column) {
                currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
            } else {
                currentSort.column = column;
                currentSort.direction = 'asc';
            }
            populateTargetTable(Object.values(aisTargets));
        });
    });

    allDomElements.simInputs.classList.add('disabled');
    connect();
});