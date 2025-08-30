# AIS Interceptor Signal K Plugin

A Signal K webapp plugin to calculate and display real-time interception solutions for AIS targets.

<img width="640" height="480" alt="image" src="https://github.com/user-attachments/assets/9e30b08a-1104-4b37-b34c-9f6f6f48257e" />


## Features

*   **Real-time Calculations**: Displays the required course, time, and distance to intercept a moving AIS target based on your vessel's current speed (SOG).
*   **Multiple Scenarios**: Calculates three different approach scenarios:
    1.  **Slow Approach**: The absolute minimum speed required for an intercept.
    2.  **Cruise Approach**: The solution based on your configured cruising speed.
    3.  **Max Approach**: The solution based on your configured maximum speed.
*   **Target Selector**: Provides a sortable list of all nearby AIS targets to easily select and switch between them.
*   **Clear Dashboard**: Shows your vessel's key data (Position, SOG, COG) and the primary interception solution in a clean, easy-to-read format.
*   **Movement Simulation**: Includes a simple simulation mode to test the plugin's functionality without being underway.

## Installation

1.  Navigate to the **Appstore** in your Signal K admin interface.
2.  Search for `signalk-ais-interceptor`.
3.  Click **Install**.
4.  Activate the plugin and restart the Signal K server when prompted.

## Configuration

After installation, you need to configure the plugin with your vessel's performance data.

1.  In the Signal K admin interface, go to **Server -> Plugin Config**.
2.  Find **AIS Interceptor** in the list and expand it.
3.  Enter your vessel's cruising and maximum speeds.

<img width="450" height="300" alt="image" src="https://github.com/user-attachments/assets/20f7a5ce-b174-41a9-9d05-5cf78f63939b" />


#### What are the speed settings for?

*   **Cruising Speed**: Set this to your vessel's typical, comfortable, or most fuel-efficient cruising speed (in knots). This value is used to calculate the **"Cruise approach"** scenario, showing you the interception solution if you travel at your normal speed.
*   **Max Speed**: Set this to the maximum sustainable speed of your vessel (in knots). This value is used to calculate the **"Max approach"** scenario, showing you the fastest possible interception solution.

4.  Click **Submit** and restart the server when prompted to apply the changes.

## How It Works

Once installed and configured, you can access the dashboard from the **Webapps** section of your Signal K server.

1.  **Select a Target**: Click the "Select an AIS Target" button. A modal window will appear with a list of all AIS targets currently visible to your Signal K server. You can sort the table by clicking on the column headers. Click on a vessel to select it as your target.
2.  **Analyze the Data**:
    *   The main display boxes (**Intercept Course**, **Time to Intercept**, etc.) show the primary solution based on your vessel's **current Speed Over Ground (SOG)**.
    *   The colored text below provides the three pre-calculated scenarios, which are extremely useful for planning:
        *   **Slow approach**: Shows the minimum SOG you must maintain to eventually intercept the target.
        *   **Cruise approach**: Shows the course and time to intercept if you travel at your configured **Cruising Speed**.
        *   **Max approach**: Shows the course and time to intercept if you travel at your configured **Max Speed**.

## License

ISC
