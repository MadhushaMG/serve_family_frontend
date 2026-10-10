import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
import DeviceDetailsModal from "./DeviceDetailsModal";
import { TrackerService } from "@/src/Services/TrackerService";

interface Device {
  id: string;
  deviceId: string;
  name: string;
  simNumber: string;
  deviceType: string;
}

interface DevicesModalProps {
  visible: boolean;
  onClose: () => void;
}

const DevicesModal: React.FC<DevicesModalProps> = ({ visible, onClose }) => {
  const [view, setView] = useState<"list" | "add">("list");
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Add Device Form State
  const [deviceId, setDeviceId] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Details Modal State
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [selectedDeviceName, setSelectedDeviceName] = useState<string>("");
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (visible && view === "list") {
      fetchDevices();
    }
  }, [visible, view]);

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const response = await TrackerService.getAllTrackingDevices();
      setDevices(response.data?.devices || []);
    } catch (error: any) {
      console.error(error);
      Alert.alert("Error", error.message || "Failed to fetch devices");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleAddDevice = async () => {
    if (!deviceId || !name) {
      Alert.alert("Required", "Device ID and Name are required.");
      return;
    }

    setSubmitting(true);
    try {
      await TrackerService.addTrackingDevice(deviceId, name);
      Alert.alert("Success", "Device added successfully");
      setDeviceId("");
      setName("");
      setView("list");
    } catch (error: any) {
      console.error(error);
      Alert.alert("Error", error.message || "Failed to add device");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDevice = async (id: string, deviceName: string) => {
    Alert.alert(
      "Remove Device",
      `Are you sure you want to remove "${deviceName}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await TrackerService.deleteTrackingDevice(id);
              Alert.alert("Deleted", "Device removed successfully");
              fetchDevices();
            } catch (error: any) {
              console.error(error);
              Alert.alert("Error", error.message || "Failed to delete device");
            }
          },
        },
      ],
    );
  };

  const handleOpenDetails = (device: Device) => {
    setSelectedDeviceId(device.deviceId);
    setSelectedDeviceName(device.name);
    setShowDetails(true);
  };

  const renderItem = ({ item }: { item: Device }) => (
    <TouchableOpacity
      style={styles.deviceCard}
      onPress={() => handleOpenDetails(item)}
      activeOpacity={0.8}
    >
      <View style={styles.deviceIconBox}>
        <MaterialCommunityIcons name="chip" size={24} color="#16A34A" />
      </View>

      <View style={styles.deviceMainInfo}>
        <View style={styles.deviceNameRow}>
          <Text style={styles.deviceName} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.statusPill}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Active</Text>
          </View>
        </View>

        <View style={styles.badgesRow}>
          <View style={styles.infoBadge}>
            <Ionicons name="barcode-outline" size={12} color="#64748B" />
            <Text style={styles.infoBadgeText}>ID: {item.deviceId}</Text>
          </View>
          {item.simNumber ? (
            <View style={styles.infoBadge}>
              <Ionicons name="call-outline" size={12} color="#64748B" />
              <Text style={styles.infoBadgeText}>{item.simNumber}</Text>
            </View>
          ) : null}
        </View>

        {item.deviceType ? (
          <Text style={styles.deviceTypeLabel}>Type: {item.deviceType}</Text>
        ) : null}
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity
          onPress={() => handleDeleteDevice(item.deviceId, item.name)}
          style={styles.deleteCircleBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="trash-outline" size={18} color="#EF4444" />
        </TouchableOpacity>
        <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ModalSafeArea style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={view === "add" ? () => setView("list") : onClose}
            style={styles.headerBackBtn}
          >
            <Ionicons
              name={view === "add" ? "arrow-back" : "close"}
              size={22}
              color="#0F172A"
            />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>
              {view === "list" ? "My Devices" : "Add Device"}
            </Text>
            <Text style={styles.headerSubtitle}>
              {view === "list"
                ? "Manage linked GPS tracking devices"
                : "Register a new hardware tracker"}
            </Text>
          </View>

          {view === "list" ? (
            <TouchableOpacity
              onPress={() => setView("add")}
              style={styles.addPillBtn}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <Text style={styles.addPillBtnText}>Add</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 44 }} />
          )}
        </View>

        {view === "list" ? (
          <View style={styles.content}>
            {loading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="large" color="#16A34A" />
                <Text style={styles.loadingText}>Fetching devices...</Text>
              </View>
            ) : (
              <FlatList
                data={devices}
                keyExtractor={(item) => item.id || item.deviceId}
                renderItem={renderItem}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <View style={styles.emptyIconBox}>
                      <MaterialCommunityIcons
                        name="chip"
                        size={48}
                        color="#16A34A"
                      />
                    </View>
                    <Text style={styles.emptyTitle}>No Devices Found</Text>
                    <Text style={styles.emptySubtext}>
                      You haven't linked any tracking devices yet. Tap the Add button below to connect a device.
                    </Text>
                    <TouchableOpacity
                      style={styles.emptyAddBtn}
                      onPress={() => setView("add")}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="add-circle-outline" size={20} color="#FFF" />
                      <Text style={styles.emptyAddBtnText}>Add Your First Device</Text>
                    </TouchableOpacity>
                  </View>
                }
                refreshing={refreshing}
                onRefresh={fetchDevices}
                contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
              />
            )}
          </View>
        ) : (
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.content}
          >
            <View style={styles.formCard}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Device ID *</Text>
                <View style={styles.inputWrap}>
                  <Ionicons
                    name="barcode-outline"
                    size={20}
                    color="#64748B"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter Device ID or IMEI"
                    placeholderTextColor="#94A3B8"
                    value={deviceId}
                    onChangeText={setDeviceId}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Device Name *</Text>
                <View style={styles.inputWrap}>
                  <Ionicons
                    name="pricetag-outline"
                    size={20}
                    color="#64748B"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Family Car Tracker"
                    placeholderTextColor="#94A3B8"
                    value={name}
                    onChangeText={setName}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, submitting && styles.disabledBtn]}
                onPress={handleAddDevice}
                disabled={submitting}
                activeOpacity={0.85}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                    <Text style={styles.submitBtnText}>Add Device</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        )}
      </ModalSafeArea>

      <DeviceDetailsModal
        visible={showDetails}
        onClose={() => setShowDetails(false)}
        deviceId={selectedDeviceId || ""}
        deviceName={selectedDeviceName}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    ...Platform.select({
      ios: {
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  headerBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleWrap: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
  },
  headerSubtitle: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  addPillBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#16A34A",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    gap: 4,
  },
  addPillBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
  },
  deviceCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    ...Platform.select({
      ios: {
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  deviceIconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#F0FDF4",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  deviceMainInfo: {
    flex: 1,
  },
  deviceNameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginRight: 8,
    marginBottom: 6,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    flex: 1,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#16A34A",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#15803D",
  },
  badgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 4,
  },
  infoBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  infoBadgeText: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "500",
  },
  deviceTypeLabel: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 2,
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  deleteCircleBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 60,
  },
  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "#F0FDF4",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#16A34A",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    gap: 8,
  },
  emptyAddBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  formCard: {
    margin: 16,
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    ...Platform.select({
      ios: {
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 8,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: "#0F172A",
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#16A34A",
    borderRadius: 16,
    paddingVertical: 14,
    marginTop: 10,
    gap: 8,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default DevicesModal;
