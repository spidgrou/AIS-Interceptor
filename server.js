const WebSocket = require('ws');
const { WebSocketServer } = require('ws');
const http = require('http');
const express = require('express');
const path = require('path');
const axios = require('axios');

const HTTP_PORT = 3333;
const SIGNALK_URL = 'ws://127.0.0.1:3000/signalk/v1/stream';
const SIGNALK_API_URL = 'http://127.0.0.1:3000/signalk/v1/api';
const VESSEL_TIMEOUT_MS = 5 * 60 * 1000;

let selfMmsi = null;
let vessels = {};

const app = express();
app.use(express.static(path.join(__dirname)));
const httpServer = http.createServer(app);
const wss = new WebSocketServer({ server: httpServer });

wss.on('connection', ws => {
    console.log('[WebApp] Browser connesso!');
    ws.subscribedMmsi = null;
    ws.on('message', message => {
        try {
            const data = JSON.parse(message.toString());
            if (data.type === 'SUBSCRIBE_TARGET') {
                ws.subscribedMmsi = data.mmsi;
                console.log(`[WebApp] Client si è iscritto a MMSI: ${data.mmsi}`);
            } else if (data.type === 'REQUEST_VESSEL_LIST') {
                console.log(`[WebApp] Client ha richiesto la lista delle navi.`);
                const aisVessels = Object.values(vessels).filter(v => v.mmsi !== selfMmsi);
                ws.send(JSON.stringify({ type: 'VESSEL_LIST', payload: aisVessels }));
            }
        } catch (e) { console.error("[WebApp] Errore nel messaggio dal client:", e); }
    });
    ws.on('close', () => console.log('[WebApp] Browser disconnesso.'));
});

function broadcastAisUpdate(vesselData) {
    const message = JSON.stringify({ type: 'AIS_UPDATE', payload: vesselData });
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

function broadcastSelfUpdate(vesselData) {
     const message = JSON.stringify({ type: 'SELF_UPDATE', payload: vesselData });
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

function extractValue(data) {
    if (data && typeof data === 'object' && data.value !== undefined) {
        return data.value;
    }
    return data;
}

async function fetchInitialVesselData(mmsi) {
    try {
        const vesselUrn = `urn:mrn:imo:mmsi:${mmsi}`;
        const response = await axios.get(`${SIGNALK_API_URL}/vessels/${vesselUrn}`);
        const data = response.data;
        
        if (vessels[mmsi]) {
            let updated = false;
            const newName = extractValue(data.name);
            const newCallsign = extractValue(data.communication?.callsignVhf) || extractValue(data.callsign);
            const newShipType = extractValue(data.design?.aisShipType)?.id;

            if (newName && vessels[mmsi].name !== newName) { vessels[mmsi].name = newName; updated = true; }
            if (newCallsign && vessels[mmsi].callsign !== newCallsign) { vessels[mmsi].callsign = newCallsign; updated = true; }
            if (newShipType && vessels[mmsi].shipType !== newShipType) { vessels[mmsi].shipType = newShipType; updated = true; }

            if (updated) {
                // RIGA DI DEBUG RIMOSSA
                broadcastAisUpdate(vessels[mmsi]);
            }
        }
    } catch (error) {
        // Ignora l'errore
    }
}

function connectToSignalK() {
    const subscription = { "context": "*", "subscribe": [{ "path": "*" }] };
    console.log(`[SignalK] Connessione a: ${SIGNALK_URL}`);
    const skSocket = new WebSocket(SIGNALK_URL);

    skSocket.on('open', () => { console.log('[SignalK] Connessione riuscita!'); skSocket.send(JSON.stringify(subscription)); });

    skSocket.on('message', (data) => {
        try {
            const msg = JSON.parse(data.toString());
            if (msg.self && !selfMmsi) { selfMmsi = msg.self.split(':').pop(); console.log(`[SignalK] MMSI della nostra barca identificato: ${selfMmsi}`); }
            if (msg.updates) {
                msg.updates.forEach(update => {
                    const context = msg.context;
                    if (!context || !context.startsWith('vessels.urn:')) return;
                    
                    const mmsi = context.split(':').pop();
                    if (!vessels[mmsi]) {
                        vessels[mmsi] = { mmsi, name: null, callsign: null, shipType: null, lat: null, lon: null, sog: null, cog: null, lastSeen: null };
                        fetchInitialVesselData(mmsi);
                    }
                    
                    vessels[mmsi].lastSeen = Date.now();

                    update.values.forEach(item => {
                        const vessel = vessels[mmsi];
                        if (item.path === 'navigation.position') { vessel.lat = item.value.latitude; vessel.lon = item.value.longitude; }
                        else if (item.path === 'navigation.speedOverGround') { vessel.sog = item.value * 1.94384; }
                        else if (item.path === 'navigation.courseOverGroundTrue') { vessel.cog = item.value * 180 / Math.PI; }
                        else if (item.path === 'name') { vessel.name = item.value; }
                        else if (item.path === 'communication.callsignVhf' || item.path === 'callsign') { vessel.callsign = item.value; }
                        else if (item.path === 'design.aisShipType') { vessel.shipType = item.value.id; }
                    });

                    if (mmsi === selfMmsi) { broadcastSelfUpdate(vessels[mmsi]); }
                    else { broadcastAisUpdate(vessels[mmsi]); }
                });
            }
        } catch (e) { /* Ignora errori */ }
    });

    skSocket.on('error', (err) => console.error('[SignalK] Errore:', err.message));
    skSocket.on('close', () => { console.log('[SignalK] Connessione chiusa. Riconnessione tra 5s...'); setTimeout(connectToSignalK, 5000); });
}

setInterval(() => {
    const now = Date.now();
    let removedCount = 0;
    for (const mmsi in vessels) {
        if (mmsi !== selfMmsi && vessels[mmsi].lastSeen && (now - vessels[mmsi].lastSeen) > VESSEL_TIMEOUT_MS) {
            delete vessels[mmsi];
            removedCount++;
        }
    }
    if (removedCount > 0) { console.log(`[System] Rimossi ${removedCount} target non più visibili.`); }
}, 60 * 1000);

httpServer.listen(HTTP_PORT, '0.0.0.0', () => console.log(`[HTTP] Server avviato sulla porta ${HTTP_PORT}`));
connectToSignalK();