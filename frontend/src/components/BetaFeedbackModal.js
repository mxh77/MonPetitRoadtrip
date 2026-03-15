import React, { useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING } from '../theme';
import client from '../api/client';

export default function BetaFeedbackModal({ visible, onClose }) {
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSend = useCallback(async () => {
    if (!text.trim()) {
      Alert.alert('Feedback vide', 'Veuillez saisir votre suggestion avant d\'envoyer.');
      return;
    }

    setIsSending(true);
    try {
      await client.post('/api/beta/feedback', { text: text.trim() });
      Alert.alert('Merci ! 🙏', 'Votre feedback a bien été envoyé.');
      setText('');
      onClose();
    } catch (e) {
      Alert.alert('Erreur', 'Impossible d\'envoyer le feedback. Veuillez réessayer.');
    } finally {
      setIsSending(false);
    }
  }, [text, onClose]);

  const handleClose = useCallback(() => {
    setText('');
    onClose();
  }, [onClose]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <Text style={styles.title}>Feedback Beta 🛠️</Text>
          <Text style={styles.subtitle}>
            Une idée, un bug, une suggestion ? Dites-nous tout !
          </Text>

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Votre suggestion..."
              placeholderTextColor={COLORS.textMuted}
              multiline
              numberOfLines={4}
              value={text}
              onChangeText={setText}
              editable={!isSending}
            />
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.clearBtn, !text.trim() && styles.clearBtnDisabled]}
              onPress={() => setText('')}
              disabled={!text.trim() || isSending}
            >
              <Text style={styles.clearIcon}>🗑️</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sendBtn, (!text.trim() || isSending) && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!text.trim() || isSending}
            >
              {isSending ? (
                <ActivityIndicator color={COLORS.bg} size="small" />
              ) : (
                <Text style={styles.sendBtnText}>Envoyer</Text>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.cancelBtn} onPress={handleClose} disabled={isSending}>
            <Text style={styles.cancelBtnText}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xl,
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    fontFamily: FONTS.title,
    fontSize: 24,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: SPACING.md,
  },
  inputRow: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceElevated,
    marginBottom: SPACING.md,
  },
  input: {
    color: COLORS.text,
    fontSize: 15,
    padding: SPACING.md,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  clearBtn: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtnDisabled: {
    opacity: 0.3,
  },
  clearIcon: { fontSize: 20 },
  sendBtn: {
    flex: 1,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: COLORS.accentDim,
  },
  sendBtnText: {
    color: COLORS.bg,
    fontWeight: '700',
    fontSize: 15,
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  cancelBtnText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
});
