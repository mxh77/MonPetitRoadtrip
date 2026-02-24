#!/bin/bash

# Build release Android (APK signé)
# Prérequis :
#   - frontend/keystore.properties rempli avec le mot de passe keystore
#   - monpetitroadtrip.keystore présent à la racine du projet

set -e

# ─── Java Home ────────────────────────────────────────────────────────────────
if [ -z "$JAVA_HOME" ]; then
  export JAVA_HOME="C:\\PROGRA~1\\Java\\jdk-20"
  export PATH="$JAVA_HOME/bin:$PATH"
fi

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
RESET='\033[0m'

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"

echo -e "\n${YELLOW}════════════════════════════════════════${RESET}"
echo -e "${YELLOW}  Mon Petit Roadtrip — Android Release  ${RESET}"
echo -e "${YELLOW}════════════════════════════════════════${RESET}\n"

# ─── Android SDK ─────────────────────────────────────────────────────────────
if [ -z "$ANDROID_HOME" ]; then
  DETECTED="$LOCALAPPDATA/Android/Sdk"
  if [ -d "$DETECTED" ]; then
    export ANDROID_HOME="$DETECTED"
    export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"
  else
    echo -e "${RED}✗ ANDROID_HOME non défini.${RESET}"
    exit 1
  fi
fi

# ─── Vérification keystore.properties ────────────────────────────────────────
KEYSTORE_PROPS="$FRONTEND_DIR/keystore.properties"
if [ ! -f "$KEYSTORE_PROPS" ]; then
  echo -e "${RED}✗ frontend/keystore.properties introuvable.${RESET}"
  exit 1
fi

STORE_PASSWORD=$(grep "storePassword" "$KEYSTORE_PROPS" | cut -d'=' -f2)
KEY_ALIAS=$(grep "keyAlias" "$KEYSTORE_PROPS" | cut -d'=' -f2)
KEY_PASSWORD=$(grep "keyPassword" "$KEYSTORE_PROPS" | cut -d'=' -f2)

# ─── Prebuild propre (production = pas d'APP_VARIANT) ───────────────────────
echo -e "${YELLOW}[1/4]${RESET} Prebuild Expo (production)..."
unset APP_VARIANT
cd "$FRONTEND_DIR"

[ -d "android" ] && (cd android && ./gradlew --stop 2>/dev/null || true) && rm -rf android

npx expo prebuild --platform android --no-install
echo -e "${GREEN}✓ Prebuild terminé${RESET}"

# ─── Copie keystore + config Gradle ──────────────────────────────────────────
echo -e "\n${YELLOW}[2/4]${RESET} Configuration signing..."
cp "$ROOT_DIR/monpetitroadtrip.keystore" "$FRONTEND_DIR/android/app/"

# gradle.properties — JDK + signing
GRADLE_PROPS="$FRONTEND_DIR/android/gradle.properties"
cat >> "$GRADLE_PROPS" << EOF

org.gradle.java.home=C:\\\\PROGRA~1\\\\Java\\\\jdk-20
MYAPP_STORE_FILE=monpetitroadtrip.keystore
MYAPP_STORE_PASSWORD=$STORE_PASSWORD
MYAPP_KEY_ALIAS=$KEY_ALIAS
MYAPP_KEY_PASSWORD=$KEY_PASSWORD
EOF

# Patch build.gradle — injecte signingConfigs + signingConfig release
BUILD_GRADLE="$FRONTEND_DIR/android/app/build.gradle"

# Écrit le bloc signingConfigs dans un fichier temporaire
SIGNING_BLOCK="    signingConfigs {\n        release {\n            storeFile file(MYAPP_STORE_FILE)\n            storePassword MYAPP_STORE_PASSWORD\n            keyAlias MYAPP_KEY_ALIAS\n            keyPassword MYAPP_KEY_PASSWORD\n        }\n    }\n"

# Insère signingConfigs avant buildTypes
sed -i "s/    buildTypes {/$SIGNING_BLOCK    buildTypes {/" "$BUILD_GRADLE"

# Ajoute signingConfig dans release (après minifyEnabled, unique au bloc buildTypes > release)
sed -i "/minifyEnabled/a\\            signingConfig signingConfigs.release" "$BUILD_GRADLE"

echo -e "${GREEN}✓ Signing configuré${RESET}"
echo -e "${GREEN}✓ Signing configuré${RESET}"

# ─── Build release ───────────────────────────────────────────────────────────
echo -e "\n${YELLOW}[3/4]${RESET} Build APK release...\n"
cd "$FRONTEND_DIR/android"
./gradlew assembleRelease

# ─── Install ─────────────────────────────────────────────────────────────────
APK_RAW="$FRONTEND_DIR/android/app/build/outputs/apk/release/app-release.apk"
APK_PATH="$ROOT_DIR/monpetitroadtrip.apk"

if [ -f "$APK_RAW" ]; then
  cp "$APK_RAW" "$APK_PATH"
  echo -e "\n${GREEN}✓ APK : monpetitroadtrip.apk${RESET}"
  echo -e "\n${YELLOW}[4/4]${RESET} Installation sur le téléphone..."
  DEVICES=$(adb devices 2>/dev/null | grep -v "List of devices" | grep "device$" | wc -l)
  if [ "$DEVICES" -gt 0 ]; then
    adb install -r "$APK_PATH" && echo -e "${GREEN}✓ Installé !${RESET}"
  else
    echo -e "${YELLOW}⚠ Pas de téléphone connecté — installe manuellement l'APK.${RESET}"
  fi
else
  echo -e "${RED}✗ APK introuvable.${RESET}"
  exit 1
fi

echo -e "\n${GREEN}══ Release terminée ══${RESET}\n"
