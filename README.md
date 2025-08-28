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
