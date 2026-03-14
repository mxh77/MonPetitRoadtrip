#!/bin/bash

# Usage: ./deploy.sh "message de commit"

set -e

# ─── Couleurs ────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
RESET='\033[0m'

# ─── Message de commit ───────────────────────────────────────────────────────
if [ -z "$1" ]; then
  echo -e "${RED}✗ Message de commit manquant.${RESET}"
  echo -e "  Usage : ${YELLOW}./deploy.sh \"message\"${RESET}"
  exit 1
fi

MSG="$1"
BRANCH=$(git rev-parse --abbrev-ref HEAD)

echo -e "\n${YELLOW}→ Branche :${RESET} $BRANCH"
echo -e "${YELLOW}→ Message :${RESET}\n"
echo "$MSG"
echo

# ─── Ajout de tous les fichiers ──────────────────────────────────────────────
echo -e "${YELLOW}[1/3]${RESET} Staging des fichiers..."
git add .

# Vérifier s'il y a des changements à committer
if git diff --cached --quiet; then
  echo -e "${YELLOW}⚠ Aucun changement à committer.${RESET}"
  exit 0
fi

# ─── Commit ──────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[2/3]${RESET} Commit..."
git commit -m "$MSG"

# ─── Push ────────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[3/4]${RESET} Push vers origin/$BRANCH..."
git push origin "$BRANCH"

# ─── Deploy backend + web sur CT 111 ─────────────────────────────────────────
SERVER="ct111"

# Vérifie que le serveur est joignable
if ! ssh -o ConnectTimeout=5 "$SERVER" "echo ok" &>/dev/null; then
  echo -e "${YELLOW}⚠ CT 111 inaccessible — déploiement ignoré.${RESET}"
else
  # Backend
  echo -e "${YELLOW}[4/5]${RESET} Déploiement backend sur CT 111..."
  REMOTE_DIR="/opt/MonPetitRoadtrip/backend"
  LOCAL_DIR="$(cd "$(dirname "$0")/backend" && pwd)"

  scp -r "$LOCAL_DIR/src" "$SERVER:$REMOTE_DIR/"
  scp "$LOCAL_DIR/package.json" \
    "$LOCAL_DIR/package-lock.json" \
    "$LOCAL_DIR/.env" \
    "$SERVER:$REMOTE_DIR/"
  scp -r "$LOCAL_DIR/prisma" "$SERVER:$REMOTE_DIR/"
  ssh "$SERVER" "cd $REMOTE_DIR && npm install --omit=dev && npx prisma generate && pm2 restart monpetitroadtrip-api --update-env" &>/dev/null

  sleep 1
  STATUS=$(ssh "$SERVER" "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/health")
  if [ "$STATUS" = "200" ]; then
    echo -e "${GREEN}✓ Backend déployé et opérationnel${RESET}"
  else
    echo -e "${RED}✗ Backend déployé mais health check échoué (status: $STATUS)${RESET}"
  fi

  # Web
  echo -e "${YELLOW}[5/5]${RESET} Build + déploiement frontend web..."
  LOCAL_WEB="$(cd "$(dirname "$0")/frontend/web" && pwd)"
  REMOTE_WEB="/opt/MonPetitRoadtrip/frontend/web"

  cd "$LOCAL_WEB" && npm run build && cd - > /dev/null

  ssh "$SERVER" "mkdir -p $REMOTE_WEB/dist && rm -rf $REMOTE_WEB/dist/*"
  scp -r "$LOCAL_WEB/dist/." "$SERVER:$REMOTE_WEB/dist/"

  NGINX_CONF='server {
    listen 80;
    server_name _;

    root /opt/MonPetitRoadtrip/frontend/web/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection '\''upgrade'\'';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}'

  echo "$NGINX_CONF" | ssh "$SERVER" "cat > /tmp/nginx-mpr.conf && \
    cp /tmp/nginx-mpr.conf /etc/nginx/sites-available/default && \
    ln -sf /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default && \
    nginx -t && systemctl reload nginx" &>/dev/null

  echo -e "${GREEN}✓ Frontend web déployé${RESET}"
fi

echo -e "\n${GREEN}✓ Déployé avec succès sur origin/$BRANCH${RESET}\n"
