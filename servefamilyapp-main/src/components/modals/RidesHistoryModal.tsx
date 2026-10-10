import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
  Dimensions,
} from "react-native";
import { X, Car, Calendar, MapPin, Navigation, Clock, ShieldCheck, ChevronRight, FileText } from "lucide-react-native";
import apiClient from "@/src/api/apiClient";
import { RideReceiptModal } from "./RideReceiptModal";

const { width } = Dimensions.get("window");

export interface DriverInfo {
  id?: string;
  name?: string;
  email?: string;
  avatar?: string;
  phoneNumber?: string;
}

export interface VehicleTypeInfo {
  id?: string;
  type?: string;
  category?: string;
}

export interface HistoryVehicleInfo {
  id?: string;
  vehicleRegNum?: string;
  driver?: DriverInfo;
  vehicleType?: VehicleTypeInfo;
}

export interface PassengerBookingHistoryItem {
  id: string;
  pickupLat?: number;
  pickupLng?: number;
  dropoffLat?: number;
  dropoffLng?: number;
  pickupAddress?: string;
  dropoffAddress?: string;
  fare?: number;
  distance?: number;
  status?: string;
  createdAt?: string;
  vehicle?: HistoryVehicleInfo;
}

interface RidesHistoryModalProps {
  visible: boolean;
  onClose: () => void;
}

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "completed", label: "Completed" },
  { key: "in_transit", label: "In Transit" },
  { key: "accepted", label: "Accepted" },
  { key: "pending", label: "Pending" },
  { key: "cancelled", label: "Cancelled" },
];

export const RidesHistoryModal: React.FC<RidesHistoryModalProps> = ({ visible, onClose }) => {
  const [bookings, setBookings] = useState<PassengerBookingHistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedBookingForReceipt, setSelectedBookingForReceipt] = useState<PassengerBookingHistoryItem | null>(null);

  const fetchHistory = async (statusFilter?: string) => {
    try {
      setLoading(true);
      const queryStatus = statusFilter ?? selectedStatus;
      const url =
        queryStatus && queryStatus !== "all"
          ? `/taxi/my-bookings?status=${queryStatus}`
          : `/taxi/my-bookings`;

      const res = await apiClient.get(url);
      const dataList: PassengerBookingHistoryItem[] = res?.data?.data || res?.data || res || [];
      setBookings(Array.isArray(dataList) ? dataList : []);
    } catch (error) {
      console.warn("⚠️ Error loading passenger ride history:", error);
      setBookings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchHistory();
    }
  }, [visible, selectedStatus]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  const getStatusBadge = (status?: string) => {
    const s = (status || "").toLowerCase();
    switch (s) {
      case "completed":
        return { bg: "#DCFCE7", text: "#15803D", label: "Completed" };
      case "in_transit":
        return { bg: "#E0E7FF", text: "#4338CA", label: "In Transit" };
      case "accepted":
        return { bg: "#DBEAFE", text: "#1D4ED8", label: "Accepted" };
      case "arrived":
        return { bg: "#CCFBF1", text: "#0F766E", label: "Driver Arrived" };
      case "pending":
        return { bg: "#FEF3C7", text: "#B45309", label: "Pending" };
      case "cancelled":
        return { bg: "#FEE2E2", text: "#B91C1C", label: "Cancelled" };
      default:
        return { bg: "#F3F4F6", text: "#374151", label: status || "Unknown" };
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  const renderBookingCard = ({ item }: { item: PassengerBookingHistoryItem }) => {
    const badge = getStatusBadge(item.status);
    const driver = item.vehicle?.driver;
    const vehicleType = item.vehicle?.vehicleType?.type || "Taxi";
    const isCompleted = (item.status || "").toLowerCase() === "completed";

    return (
      <TouchableOpacity
        style={styles.bookingCard}
        activeOpacity={0.85}
        onPress={() => setSelectedBookingForReceipt(item)}
      >
        {/* Top Header Row */}
        <View style={styles.cardHeader}>
          <View style={styles.vehicleCategoryBadge}>
            <Car size={16} color="#2563EB" />
            <Text style={styles.vehicleCategoryText}>{vehicleType}</Text>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.statusBadgeText, { color: badge.text }]}>
              {badge.label}
            </Text>
          </View>
        </View>

        {/* Date Row */}
        {Boolean(item.createdAt) && (
          <View style={styles.dateRow}>
            <Calendar size={13} color="#6B7280" />
            <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
          </View>
        )}

        {/* Locations */}
        <View style={styles.locationsContainer}>
          <View style={styles.locationRow}>
            <View style={[styles.dot, { backgroundColor: "#10B981" }]} />
            <Text style={styles.locationText} numberOfLines={1}>
              {item.pickupAddress || "Pickup Point"}
            </Text>
          </View>

          <View style={styles.connectorLine} />

          <View style={styles.locationRow}>
            <View style={[styles.dot, { backgroundColor: "#EF4444" }]} />
            <Text style={styles.locationText} numberOfLines={1}>
              {item.dropoffAddress || "Drop-off Destination"}
            </Text>
          </View>
        </View>

        {/* Footer Details (Driver, Fare, Distance) */}
        <View style={styles.cardFooter}>
          <View style={{ flex: 1 }}>
            {driver?.name ? (
              <Text style={styles.driverText}>
                Driver: <Text style={{ fontWeight: "700" }}>{driver.name}</Text>
                {item.vehicle?.vehicleRegNum ? ` (${item.vehicle.vehicleRegNum})` : ""}
              </Text>
            ) : (
              <Text style={styles.driverText}>Vehicle Details Attached</Text>
            )}
            {Boolean(item.distance) && (
              <Text style={styles.distanceText}>{item.distance} km</Text>
            )}
          </View>

          <View style={styles.fareContainer}>
            <Text style={styles.fareLabel}>Fare</Text>
            <Text style={styles.fareAmount}>
              Rs. {item.fare !== undefined ? item.fare : 0}
            </Text>
          </View>
        </View>

        {/* View Receipt / Invoice link for completed rides */}
        {isCompleted && (
          <View style={styles.viewReceiptRow}>
            <View style={styles.viewReceiptBtn}>
              <FileText size={14} color="#16A34A" />
              <Text style={styles.viewReceiptBtnText}>View Official Invoice & Bill</Text>
            </View>
            <ChevronRight size={16} color="#64748B" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Top Navigation Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Ride History</Text>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <X size={22} color="#1F2937" />
          </TouchableOpacity>
        </View>

        {/* Filter Tabs Bar */}
        <View style={styles.tabsContainer}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={STATUS_TABS}
            keyExtractor={(tab) => tab.key}
            contentContainerStyle={styles.tabsContent}
            renderItem={({ item }) => {
              const isSelected = selectedStatus === item.key;
              return (
                <TouchableOpacity
                  style={[styles.tabItem, isSelected && styles.tabItemActive]}
                  onPress={() => setSelectedStatus(item.key)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.tabText, isSelected && styles.tabTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>

        {/* Main Bookings List */}
        {loading && !refreshing ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.loadingText}>Loading history...</Text>
          </View>
        ) : (
          <FlatList
            data={bookings}
            keyExtractor={(item) => item.id || Math.random().toString()}
            renderItem={renderBookingCard}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#2563EB"]} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Car size={48} color="#9CA3AF" />
                <Text style={styles.emptyTitle}>No Rides Found</Text>
                <Text style={styles.emptySub}>
                  You haven't made any ride bookings under this filter yet.
                </Text>
              </View>
            }
          />
        )}

        {/* Official Ride Receipt Modal */}
        <RideReceiptModal
          visible={Boolean(selectedBookingForReceipt)}
          bookingId={selectedBookingForReceipt?.id || null}
          onClose={() => setSelectedBookingForReceipt(null)}
          fallbackData={
            selectedBookingForReceipt
              ? {
                  pickupAddress: selectedBookingForReceipt.pickupAddress,
                  dropAddress: selectedBookingForReceipt.dropoffAddress,
                  distanceKm: selectedBookingForReceipt.distance,
                  totalFare: selectedBookingForReceipt.fare,
                  paymentStatus: "paid",
                  paymentMethod: "cash",
                  driver: {
                    name: selectedBookingForReceipt.vehicle?.driver?.name,
                    vehicleRegNum: selectedBookingForReceipt.vehicle?.vehicleRegNum,
                    vehicleType: selectedBookingForReceipt.vehicle?.vehicleType?.type,
                  },
                }
              : undefined
          }
        />
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  tabsContainer: {
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  tabsContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  tabItem: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    marginRight: 6,
  },
  tabItemActive: {
    backgroundColor: "#2563EB",
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4B5563",
  },
  tabTextActive: {
    color: "#FFF",
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  bookingCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  vehicleCategoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  vehicleCategoryText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1D4ED8",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  dateText: {
    fontSize: 12,
    color: "#6B7280",
  },
  locationsContainer: {
    marginVertical: 4,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  connectorLine: {
    width: 2,
    height: 14,
    backgroundColor: "#D1D5DB",
    marginLeft: 4,
    marginVertical: 2,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  locationText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#374151",
    flex: 1,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  driverText: {
    fontSize: 12,
    color: "#4B5563",
  },
  distanceText: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 2,
  },
  fareContainer: {
    alignItems: "flex-end",
  },
  fareLabel: {
    fontSize: 10,
    color: "#6B7280",
    fontWeight: "600",
  },
  fareAmount: {
    fontSize: 15,
    fontWeight: "800",
    color: "#16A34A",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: "#6B7280",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#374151",
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 4,
    paddingHorizontal: 40,
  },
  viewReceiptRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  viewReceiptBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  viewReceiptBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#16A34A",
  },
});
