#!/bin/bash
# Déploie le backend local vers CT 111 (192.168.1.111)
# Usage : ./deploy-backend.sh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RESET='\033[0m'

SERVER="ct111"
REMOTE_DIR="/opt/MonPetitRoadtrip/backend"
LOCAL_DIR="$(cd "$(dirname "$0")/backend" && pwd)"

echo -e "\n${YELLOW}════════════════════════════════════════${RESET}"
echo -e "${YELLOW}  Mon Petit Roadtrip — Deploy Backend   ${RESET}"
echo -e "${YELLOW}════════════════════════════════════════${RESET}\n"

# ─── Sync src/ ───────────────────────────────────────────────────────────────
echo -e "${YELLOW}[1/3]${RESET} Sync src/..."
rsync -av --checksum \
  --exclude='node_modules' \
  --exclude='.env' \
  --exclude='*.log' \
  "$LOCAL_DIR/src/" "$SERVER:$REMOTE_DIR/src/"
echo -e "${GREEN}✓ src/ synchronisé${RESET}"

# ─── Sync package.json + prisma schema ───────────────────────────────────────
echo -e "${YELLOW}[2/3]${RESET} Sync package.json & prisma..."
rsync -av --checksum \
  "$LOCAL_DIR/package.json" \
  "$LOCAL_DIR/package-lock.json" \
  "$SERVER:$REMOTE_DIR/"

rsync -av --checksum \
  "$LOCAL_DIR/prisma/" "$SERVER:$REMOTE_DIR/prisma/"
echo -e "${GREEN}✓ package.json & prisma synchronisés${RESET}"

# ─── Redémarre PM2 ───────────────────────────────────────────────────────────
echo -e "${YELLOW}[3/3]${RESET} Redémarrage PM2..."
ssh "$SERVER" "cd $REMOTE_DIR && pm2 restart monpetitroadtrip-api --update-env"
echo -e "${GREEN}✓ Backend redémarré${RESET}"

# ─── Vérification health ─────────────────────────────────────────────────────
sleep 1
STATUS=$(ssh "$SERVER" "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/health")
if [ "$STATUS" = "200" ]; then
  echo -e "\n${GREEN}✓ Backend opérationnel${RESET} (health: 200)"
else
  echo -e "\n${RED}✗ Health check échoué (status: $STATUS)${RESET}"
  exit 1
fi

echo -e "\n${YELLOW}Logs en live :${RESET} ssh ct111 \"tail -f ~/.pm2/logs/monpetitroadtrip-api-out.log\"\n"
