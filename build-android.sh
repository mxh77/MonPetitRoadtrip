#!/bin/bash

# Build debug Android local et déploiement sur téléphone connecté
# Prérequis :
#   - Android Studio installé
#   - Téléphone connecté en USB avec débogage USB activé
#   - Variable ANDROID_HOME configurée (définie automatiquement si Android Studio est installé)

set -e

# ─── Java Home (chemin court Windows sans espaces) ────────────────────────────
# "C:\Program Files" → "C:\PROGRA~1" (équivalent 8.3, pas d'espaces)
# Nécessaire car gradlew.bat échoue si JAVA_HOME contient des espaces.
if [ -z "$JAVA_HOME" ]; then
  export JAVA_HOME="C:\\PROGRA~1\\Java\\jdk-20"
  export PATH="$JAVA_HOME/bin:$PATH"
  echo "JAVA_HOME forcé : $JAVA_HOME"
fi

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
RESET='\033[0m'

FRONTEND_DIR="$(cd "$(dirname "$0")/frontend" && pwd)"

echo -e "\n${YELLOW}══════════════════════════════════════${RESET}"
echo -e "${YELLOW}  Mon Petit Roadtrip — Android Debug  ${RESET}"
echo -e "${YELLOW}══════════════════════════════════════${RESET}\n"

# ─── Vérification ANDROID_HOME ───────────────────────────────────────────────
if [ -z "$ANDROID_HOME" ]; then
  # Tentative de détection automatique (Windows via Android Studio)
  DETECTED="$LOCALAPPDATA/Android/Sdk"
  if [ -d "$DETECTED" ]; then
    export ANDROID_HOME="$DETECTED"
    export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"
    echo -e "${YELLOW}⚙ ANDROID_HOME détecté :${RESET} $ANDROID_HOME"
  else
    echo -e "${RED}✗ ANDROID_HOME non défini et Android SDK introuvable.${RESET}"
    echo -e "  Configure ANDROID_HOME dans tes variables d'environnement."
    echo -e "  Chemin par défaut Android Studio : %LOCALAPPDATA%\\Android\\Sdk"
    exit 1
  fi
else
  export PATH="$ANDROID_HOME/platform-tools:$PATH"
  echo -e "${GREEN}✓ ANDROID_HOME :${RESET} $ANDROID_HOME"
fi

# ─── Vérification appareil connecté ─────────────────────────────────────────
echo -e "\n${YELLOW}[1/3]${RESET} Vérification du téléphone connecté..."

DEVICES=$(adb devices 2>/dev/null | grep -v "List of devices" | grep "device$" | wc -l)

if [ "$DEVICES" -eq 0 ]; then
  echo -e "${RED}✗ Aucun appareil Android détecté.${RESET}"
  echo -e "  Vérifie que :"
  echo -e "  1. Le téléphone est branché en USB"
  echo -e "  2. Le débogage USB est activé (Paramètres → Options développeur → Débogage USB)"
  echo -e "  3. Tu as accepté la demande d'autorisation sur le téléphone"
  echo ""
  adb devices
  exit 1
fi

echo -e "${GREEN}✓ $DEVICES appareil(s) détecté(s) :${RESET}"
adb devices | grep "device$" | awk '{print "  → " $1}'

# ─── Build & Deploy ──────────────────────────────────────────────────────────
echo -e "\n${YELLOW}[2/3]${RESET} Build debug & déploiement vers le téléphone..."
echo -e "${YELLOW}      (première fois : ~5-10 min — les suivantes : ~1-2 min)${RESET}\n"

cd "$FRONTEND_DIR"

# Prebuild si le dossier android n'existe pas encore
if [ ! -d "android" ]; then
  echo -e "${YELLOW}⚙ Génération du projet natif Android (prebuild)...${RESET}"
  npx expo prebuild --platform android --no-install
fi

# Injection du chemin JDK dans gradle.properties
# (évite l'erreur "-classpath requires class path specification" avec espaces dans JAVA_HOME)
GRADLE_PROPS="android/gradle.properties"

if ! grep -q "org.gradle.java.home" "$GRADLE_PROPS"; then
  echo "" >> "$GRADLE_PROPS"
  echo "# JDK path — évite les problèmes de JAVA_HOME avec espaces sous Windows/Git Bash" >> "$GRADLE_PROPS"
  echo "org.gradle.java.home=C:\\\\PROGRA~1\\\\Java\\\\jdk-20" >> "$GRADLE_PROPS"
  echo -e "${GREEN}✓ JDK configuré dans gradle.properties${RESET}"
fi

# ─── Patch debug : applicationId distinct + nom différent ────────────────────
BUILD_GRADLE="android/app/build.gradle"
STRINGS_XML="android/app/src/main/res/values/strings.xml"

# applicationIdSuffix ".debug" → com.mxh7777.frontend.debug (coexiste avec la release)
if ! grep -q 'applicationIdSuffix' "$BUILD_GRADLE"; then
  # Remplace uniquement la PREMIÈRE occurrence (celle dans buildTypes { debug { } })
  sed -i '0,/signingConfig signingConfigs\.debug/s/signingConfig signingConfigs\.debug/applicationIdSuffix ".debug"\n            signingConfig signingConfigs.debug/' "$BUILD_GRADLE"
  echo -e "${GREEN}✓ Debug : applicationIdSuffix '.debug' configuré${RESET}"
fi

# Nom affiché différent pour identifier l'app debug sur le téléphone
if grep -q 'app_name' "$STRINGS_XML" && ! grep -q 'MPR Debug' "$STRINGS_XML"; then
  sed -i 's|<string name="app_name">.*</string>|<string name="app_name">MPR Debug</string>|' "$STRINGS_XML"
  echo -e "${GREEN}✓ Debug : nom app → 'MPR Debug'${RESET}"
fi

npx expo run:android

# ─── Fin ─────────────────────────────────────────────────────────────────────
echo -e "\n${GREEN}✓ Build déployé sur le téléphone !${RESET}"
echo -e "  L'app \"Mon Petit Roadtrip\" est maintenant installée.\n"
