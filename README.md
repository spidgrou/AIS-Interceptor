# Signal K AIS Interceptor Plugin

This is a plugin for the Signal K server that provides a webapp to calculate and display vessel interception solutions.

## Features

*   Displays your vessel's primary navigation data (Position, SOG, COG).
*   Allows you to select an AIS target from a list of vessels seen in the last 5 minutes.
*   Calculates the interception course, time, and distance based on your current speed.
*   Provides strategic "Slow Approach" and "Fast Approach" calculations based on configurable speeds.

## Configuration

In the Signal K admin interface, under **Server -> Plugin Config**, you can configure:

*   **Cruising Speed:** Your vessel's typical cruising speed, used for "Cruise Approach" calculations.
*   **Max Speed:** Your vessel's maximum speed, used for "Max Approach" calculations.

---
Developed by spidgrou.
