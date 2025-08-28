# AIS Interceptor Dashboard

A web-based dashboard for real-time calculation of the course, time, and distance to intercept AIS targets. The application connects to a Signal K server to receive data from your own vessel and surrounding targets.

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
    # Replace {your-username} and {repository-name} with your details
    git clone https://github.com/{your-username}/{repository-name}.git
    cd {repository-name}
    ```

2.  **Install dependencies:**
    Ensure you have Node.js and npm installed.
    ```bash
    npm install
    ```

## Configuration

All configuration is located at the top of the `server.js` file. Modify the following constants if needed:
- `HTTP_PORT`: The port on which the web server will listen (default: `3333`).
- `SIGNALK_URL`: The WebSocket address of your Signal K server (default: `ws://127.0.0.1:3000/signalk/v1/stream`).
- `SIGNALK_API_URL`: The REST API address for your Signal K server (default: `http://127.0.0.1:3000/signalk/v1/api`).

## Usage

### Manual Start (for testing)
```bash
node server.js

Then, open your web browser to http://YOUR_SERVER_IP:3333.
Install as a Systemd Service (Recommended for Raspberry Pi)

1) Create a startup script named start.sh in the project directory with the following content:
#!/bin/bash
# Navigate to the script's directory, regardless of where it's called from
cd "$(dirname "$0")"
# Execute the server with the absolute path to node for reliability
/usr/bin/node server.js

2) Make the script executable: chmod +x start.sh.
Create a service file at /etc/systemd/system/ais-interceptor.service with the following content:
[Unit]
Description=AIS Interceptor Node.js Server
After=network.target

[Service]
Type=simple
# Replace {ABSOLUTE_PATH_TO_PROJECT} with the full path from 'pwd'
WorkingDirectory={ABSOLUTE_PATH_TO_PROJECT}
ExecStart={ABSOLUTE_PATH_TO_PROJECT}/start.sh
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target

3) Remember to customize WorkingDirectory and ExecStart with your absolute paths.
Enable and start the service:
sudo systemctl daemon-reload
sudo systemctl enable ais-interceptor.service
sudo systemctl start ais-interceptor.service

You can check its status anytime with
  sudo systemctl status ais-interceptor.service



