#!/bin/bash

# Navigate to the script's directory, regardless of where it's called from
cd "$(dirname "$0")"

# Execute the node server with the absolute path to node for reliability
/usr/bin/node server.js