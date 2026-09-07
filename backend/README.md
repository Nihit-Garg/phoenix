# Mirage backend domain

This folder contains the offline backend/domain boundary shared by the Android
clients: transport contracts, routing rules, envelope schema, and SOS safety
rules. It intentionally contains no HTTP server, database, cloud integration,
or Socket.IO runtime. Android native Wi-Fi Direct and UDP adapters will sit
behind the transport contract.
