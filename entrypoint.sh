#!/bin/sh
set -e

# Start the application with pm2-runtime
pm2-runtime start ecosystem.config.js --env "${NODE_ENV:?Error: NODE_ENV is required}" &

# Wait a bit to ensure PM2 has started properly
sleep 10

# Check if processes are running before saving
if [ $(pm2 list | grep -c online) -gt 0 ]; then
  # Save the process list with environments
  pm2 save

  # Setup PM2 startup script (using the correct path and systemd)
  pm2 startup
else
  echo "No PM2 processes running. Skipping save and startup."
fi

# Keep the container running by waiting for the PM2 process
wait

