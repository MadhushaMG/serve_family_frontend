import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
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
import { removeDevice, updateDevice } from "../../Services/DeviceService";
import { CircleEntity } from "@/src/types/models";

interface EntitySettingsModalProps {
    visible: boolean;
    onClose: () => void;
    circleId: string | null;
    entity: CircleEntity | null;
    onUpdate: () => void;
}

const EntitySettingsModal: React.FC<EntitySettingsModalProps> = ({
    visible,
    onClose,
    circleId,
    entity,
    onUpdate,
}) => {
    const [name, setName] = useState("");
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        if (visible && entity) {
            setName(entity.name || "");
        }
    }, [visible, entity]);

    const handleUpdate = async () => {
        if (!circleId || !entity?.deviceId) return;
        if (!name.trim()) {
            Alert.alert("Required", "Name cannot be empty");
            return;
        }

        setSaving(true);
        try {
            await updateDevice(circleId, entity.deviceId, { name: name.trim() });
            Alert.alert("Success", "Device updated successfully");
            onUpdate();
            onClose();
        } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to update device");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        const targetCircleId = circleId;
        const targetDeviceId = entity?.deviceId;

        if (!targetCircleId || !targetDeviceId) return;

        Alert.alert(
            "Remove Device",
            "Are you sure you want to remove this device from the circle? This cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Remove",
                    style: "destructive",
                    onPress: async () => {
                        setDeleting(true);
                        try {
                            await removeDevice(targetCircleId, targetDeviceId);
                            Alert.alert("Success", "Device removed successfully");
                            onUpdate();
                            onClose();
                        } catch (error: any) {
                            Alert.alert("Error", error.message || "Failed to remove device");
                        } finally {
                            setDeleting(false);
                        }
                    },
                },
            ]
        );
    };

    if (!entity) return null;

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
            <View style={styles.overlay}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.keyboardView}
                >
                    <View style={styles.modalCard}>
                        <View style={styles.header}>
                            <Text style={styles.title}>Manage {entity.type === "pet" ? "Pet" : "Item"}</Text>
                            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                                <Ionicons name="close" size={24} color="#1A1A1A" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.label}>Name</Text>
                        <TextInput
                            style={styles.input}
                            value={name}
                            onChangeText={setName}
                            placeholder="Enter name"
                        />

                        <TouchableOpacity
                            style={[styles.saveBtn, saving && styles.disabledBtn]}
                            onPress={handleUpdate}
                            disabled={saving || deleting}
                        >
                            {saving ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <Text style={styles.saveBtnText}>Save Changes</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.deleteBtn, deleting && styles.disabledBtn]}
                            onPress={handleDelete}
                            disabled={saving || deleting}
                        >
                            {deleting ? (
                                <ActivityIndicator color="#EF4444" />
                            ) : (
                                <Text style={styles.deleteBtnText}>Remove Device</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "flex-end",
    },
    keyboardView: {
        width: "100%",
    },
    modalCard: {
        backgroundColor: "#FFF",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        width: "100%",
        paddingBottom: Platform.OS === "ios" ? 40 : 20,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: "700",
        color: "#1A1A1A",
    },
    closeBtn: {
        padding: 5,
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
        color: "#374151",
        marginBottom: 8,
    },
    input: {
        backgroundColor: "#F9FAFB",
        borderWidth: 1,
        borderColor: "#D1D5DB",
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        fontSize: 16,
        color: "#1A1A1A",
        marginBottom: 20,
    },
    saveBtn: {
        backgroundColor: "#4F359B",
        borderRadius: 8,
        paddingVertical: 14,
        alignItems: "center",
        marginBottom: 12,
    },
    saveBtnText: {
        color: "#FFF",
        fontSize: 16,
        fontWeight: "600",
    },
    deleteBtn: {
        backgroundColor: "#FEF2F2",
        borderRadius: 8,
        paddingVertical: 14,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#FECACA",
    },
    deleteBtnText: {
        color: "#EF4444",
        fontSize: 16,
        fontWeight: "600",
    },
    disabledBtn: {
        opacity: 0.7,
    },
});

export default EntitySettingsModal;
