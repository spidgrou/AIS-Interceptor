#!/bin/bash

# Naviga alla directory dello script, non importa da dove viene lanciato
cd "$(dirname "$0")"

# Esegui il server node. Il percorso di node è assoluto per sicurezza.
/usr/bin/node server.js
