#!/bin/bash

USER="lewis_automate"
IP="lewis-automate.com"
REMOTE_DIR="/var/www/html/"

echo "🏗️  Building your Next.js app..."
npm run build

echo "🚚 Shipping 'out' folder to $IP..."
scp -r ./out/* $USER@$IP:$REMOTE_DIR

echo "🚀 Vibe check complete. Your Next.js app is live!"