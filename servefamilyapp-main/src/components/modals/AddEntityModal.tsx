import { CircleService } from "@/src/Services/Circleservice";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import ModalSafeArea from "@/src/components/ModalSafeArea";

interface AddEntityModalProps {
  visible: boolean;
  onClose: () => void;
  circleId: string | number | null;
  entityType: "pet" | "item" | null;
  onEntityAdded?: () => void;
}

const AddEntityModal: React.FC<AddEntityModalProps> = ({
  visible,
  onClose,
  circleId,
  entityType,
  onEntityAdded,
}) => {
  const [deviceId, setDeviceId] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!circleId) {
      Alert.alert("Error", "No circle selected.");
      return;
    }
    if (!deviceId || !name) {
      Alert.alert("Required", "Device ID and Name are required.");
      return;
    }

    setSubmitting(true);
    try {
      const prefix = entityType === "pet" ? "Pet " : "Item ";
      const finalName = name.startsWith(prefix) ? name : `${prefix}${name}`;
      await CircleService.AddTrackingDevice(
        circleId,
        deviceId,
        finalName,
        entityType,
      );

      Alert.alert(
        "Success",
        `${entityType === "pet" ? "Pet" : "Item"} added successfully!`,
      );
      setDeviceId("");
      setName("");
      if (onEntityAdded) onEntityAdded();
      onClose();
    } catch (error: any) {
      console.error(error);
      Alert.alert("Error", error.message || "Failed to add device");
    } finally {
      setSubmitting(false);
    }
  };

  const title = entityType === "pet" ? "Add a Pet" : "Add an Item";
  const placeholderName =
    entityType === "pet" ? "e.g. Fluffy" : "e.g. Car Keys";

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ModalSafeArea style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
            <Ionicons name="close" size={26} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{title}</Text>
          <View style={{ width: 40 }} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.content}
        >
          <View style={styles.form}>
            <Text style={styles.infoText}>
              Connect a GPS tracker to your {entityType}. Enter the device ID
              found on the tracker.
            </Text>

            <Text style={styles.label}>Device ID *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter Device ID"
              value={deviceId}
              onChangeText={setDeviceId}
              autoCapitalize="none"
            />

            <Text style={styles.label}>Name *</Text>
            <TextInput
              style={styles.input}
              placeholder={placeholderName}
              value={name}
              onChangeText={setName}
            />

            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.disabledBtn]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.submitBtnText}>
                  Add {entityType === "pet" ? "Pet" : "Item"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </ModalSafeArea>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  headerBtn: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  form: {
    padding: 20,
    backgroundColor: "#FFF",
    margin: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  infoText: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 20,
    lineHeight: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: "#1A1A1A",
  },
  submitBtn: {
    backgroundColor: "#4F359B",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 24,
    marginBottom: 12,
  },
  disabledBtn: {
    opacity: 0.7,
  },
  submitBtnText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default AddEntityModal;
