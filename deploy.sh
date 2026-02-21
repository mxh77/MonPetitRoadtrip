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
  echo -e "  Usage : ${YELLOW}./deploy.sh \"message de commit\"${RESET}"
  exit 1
fi

MSG="$1"
BRANCH=$(git rev-parse --abbrev-ref HEAD)

echo -e "\n${YELLOW}→ Branche :${RESET} $BRANCH"
echo -e "${YELLOW}→ Message :${RESET} $MSG\n"

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
echo -e "${YELLOW}[3/3]${RESET} Push vers origin/$BRANCH..."
git push origin "$BRANCH"

echo -e "\n${GREEN}✓ Déployé avec succès sur origin/$BRANCH${RESET}\n"
