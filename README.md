# AIS Interceptor Dashboard

A web-based dashboard for real-time calculation of the course, time, and distance to intercept AIS targets. The application connects to a Signal K server to receive data from your own vessel and surrounding targets.

<img width="958" height="771" alt="image" src="https://github.com/user-attachments/assets/9c318ece-f79c-41dc-8cd8-4526ad367483" />


## Features

- **Real-time Dashboard:** Displays your vessel's essential data (Position, SOG, COG).
- **Target Selection:** A modal window shows all available AIS targets, sortable by name, distance, etc.
- **Intercept Calculation:** Calculates and displays the optimal intercept course, estimated Time To Intercept (TTI), and distance to the intercept point.
- **Simulation Mode:** Allows you to input a custom speed (SOG) to test calculations even when stationary.
- **Lightweight Backend:** A Node.js server acts as a bridge between the Signal K server and the web browser.
- **Headless Service:** Can be configured as a `systemd` service for automatic startup on Linux systems (e.g., Raspberry Pi).

## Installation

1.  **Clone the repository:**
    ```bash
    cd /opt
    sudo git clone https://github.com/spidgrou/AIS-Interceptor.git ais-interceptor
    ```

2.  **Navigate to the new directory:**
    ```bash
    cd ais-interceptor
    ```

3.  **Install dependencies:**
    Ensure you have Node.js and npm installed.
    ```bash
    sudo npm install
    ```
    *(Using `sudo` is necessary as we are in the `/opt` directory).*

## Configuration

All configuration is located at the top of the `server.js` file. Modify the following constants if needed:
- `HTTP_PORT`: The port on which the web server will listen (default: `3333`).
- `SIGNALK_URL`: The WebSocket address of your Signal K server (default: `ws://127.0.0.1:3000/signalk/v1/stream`).
- `SIGNALK_API_URL`: The REST API address for your Signal K server (default: `http://127.0.0.1:3000/signalk/v1/api`).

## Usage

### Manual Start (for testing)
```bash
node server.js
```

Then, open your web browser to http://YOUR_SERVER_IP:3333



## Install as a Systemd Service (Recommended for Raspberry Pi)

1) **Create a startup script named start.sh in the project directory with the following content:**
```bash
#!/bin/bash
# Navigate to the script's directory, regardless of where it's called from
cd "$(dirname "$0")"
# Execute the server with the absolute path to node for reliability
/usr/bin/node server.js
```
Make the script executable
```bash
chmod +x start.sh
```

2) **Create a service file at /etc/systemd/system/ais-interceptor.service with the following content**
```bash
[Unit]
Description=AIS Interceptor Node.js Server
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/ais-interceptor
ExecStart=/opt/ais-interceptor/start.sh
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

3) **Remember to customize WorkingDirectory and ExecStart with your absolute paths**
Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable ais-interceptor.service
sudo systemctl start ais-interceptor.service
```

4) **You can check its status anytime with**
```bash
sudo systemctl status ais-interceptor.service
```


