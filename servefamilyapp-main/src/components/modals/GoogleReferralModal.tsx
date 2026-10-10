import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface GoogleReferralModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (referralCode: string | null) => void;
  isLoading?: boolean;
}

export default function GoogleReferralModal({
  visible,
  onClose,
  onSubmit,
  isLoading = false,
}: GoogleReferralModalProps) {
  const [code, setCode] = useState("");

  const handleContinueWithCode = () => {
    onSubmit(code.trim() ? code.trim().toUpperCase() : null);
  };

  const handleSkip = () => {
    onSubmit(null);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <View style={styles.card}>
            {/* Close Button */}
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} disabled={isLoading}>
              <Ionicons name="close" size={20} color="#6B7280" />
            </TouchableOpacity>

            {/* Gift Icon Header */}
            <View style={styles.iconCircle}>
              <Ionicons name="gift" size={32} color="#16A34A" />
            </View>

            <Text style={styles.title}>Have a Referral Code?</Text>
            <Text style={styles.subtitle}>
              Enter your friend's referral code to receive exclusive sign-up rewards and bonuses! (Optional)
            </Text>

            {/* Referral Code Input */}
            <View style={styles.inputContainer}>
              <Ionicons name="pricetag-outline" size={20} color="#9CA3AF" style={{ marginRight: 10 }} />
              <TextInput
                style={styles.input}
                placeholder="Enter Code (e.g. REF12345)"
                placeholderTextColor="#9CA3AF"
                value={code}
                onChangeText={(text) => setCode(text.toUpperCase())}
                autoCapitalize="characters"
                maxLength={20}
                editable={!isLoading}
              />
            </View>

            {/* Actions */}
            <TouchableOpacity
              style={[styles.primaryBtn, isLoading && styles.btnDisabled]}
              onPress={handleContinueWithCode}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="logo-google" size={18} color="#FFF" style={{ marginRight: 8 }} />
                  <Text style={styles.primaryBtnText}>
                    {code.trim() ? "Submit & Continue with Google" : "Continue with Google"}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.skipBtn}
              onPress={handleSkip}
              disabled={isLoading}
            >
              <Text style={styles.skipBtnText}>Skip for now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  closeBtn: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    marginTop: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    width: "100%",
    marginBottom: 16,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: 1,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#16A34A",
    width: "100%",
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: "#16A34A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  skipBtn: {
    marginTop: 12,
    paddingVertical: 8,
  },
  skipBtnText: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "600",
  },
});
