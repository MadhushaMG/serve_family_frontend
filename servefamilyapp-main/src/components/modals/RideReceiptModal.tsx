import React, { useState, useEffect } from "react";
import {
  Modal,
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
  Share,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import apiClient from "@/src/api/apiClient";
import { useAuthStore } from "@/src/store/authStore";

const { width } = Dimensions.get("window");

export interface RideReceiptData {
  invoiceNo?: string;
  bookingId?: string;
  status?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  pickupAddress?: string;
  dropAddress?: string;
  distanceKm?: number;
  baseFare?: number;
  ratePerKm?: number;
  distanceFare?: number;
  pickupFare?: number;
  waitingMinutes?: number;
  waitingRatePerMin?: number;
  waitingFare?: number;
  discountAmount?: number;
  totalFare?: number;
  driver?: {
    id?: string;
    name?: string;
    phoneNumber?: string;
    vehicleRegNum?: string;
    vehicleType?: string;
  };
  passenger?: {
    id?: string;
    name?: string;
    phoneNumber?: string;
    email?: string;
  };
}

interface RideReceiptModalProps {
  visible: boolean;
  bookingId: string | null;
  onClose: () => void;
  fallbackData?: Partial<RideReceiptData>;
}

export const RideReceiptModal: React.FC<RideReceiptModalProps> = ({
  visible,
  bookingId,
  onClose,
  fallbackData,
}) => {
  const [receipt, setReceipt] = useState<RideReceiptData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSendingEmail, setIsSendingEmail] = useState<boolean>(false);
  const currentUser = useAuthStore((state) => state.user);

  useEffect(() => {
    if (!visible || !bookingId) return;

    let isMounted = true;
    const fetchReceipt = async () => {
      setIsLoading(true);
      try {
        const res = await apiClient.get(`/taxi/booking/${bookingId}/receipt`);
        const data = res?.data?.data || res?.data || res?.bill || res;
        if (isMounted && data) {
          setReceipt(data);
        }
      } catch (err: any) {
        console.warn("Could not load receipt from API, using fallback:", err?.message);
        if (isMounted && fallbackData) {
          setReceipt(fallbackData as RideReceiptData);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchReceipt();
    return () => {
      isMounted = false;
    };
  }, [visible, bookingId]);

  const handleSendEmailReceipt = async () => {
    if (!bookingId) return;
    setIsSendingEmail(true);
    try {
      const email = receipt?.passenger?.email || currentUser?.email;
      const res = await apiClient.post(`/taxi/booking/${bookingId}/send-receipt`, {
        email: email || undefined,
      });

      if (res && (res.success || res.status === 200)) {
        Alert.alert(
          "Receipt Emailed",
          `An official luxury HTML invoice has been sent to ${email || "your registered email"}.`
        );
      } else {
        Alert.alert("Notice", res?.message || "Email receipt queued.");
      }
    } catch (err: any) {
      console.warn("Email receipt error:", err);
      Alert.alert("Notice", "Your ride invoice will be sent to your registered email shortly.");
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleShareSummary = async () => {
    if (!receipt) return;
    try {
      const msg = `Serve Family Ride Invoice ${receipt.invoiceNo || ""}\nTotal Fare: LKR ${Number(receipt.totalFare || 0).toFixed(2)}\nDistance: ${receipt.distanceKm || 0} km\nFrom: ${receipt.pickupAddress || ""}\nTo: ${receipt.dropAddress || ""}\nStatus: ${receipt.paymentStatus || "PAID"}`;
      await Share.share({ message: msg });
    } catch (_) {}
  };

  const activeReceipt = receipt || fallbackData;
  const total = Number(activeReceipt?.totalFare || 0);
  const base = Number(activeReceipt?.baseFare || 0);
  const distFare = Number(activeReceipt?.distanceFare || 0);
  const waitFare = Number(activeReceipt?.waitingFare || 0);
  const waitMins = Number(activeReceipt?.waitingMinutes || 0);
  const pickupFare = Number(activeReceipt?.pickupFare || 0);
  const distance = Number(activeReceipt?.distanceKm || 0);
  const ratePerKm = Number(activeReceipt?.ratePerKm || 0);
  const invNo = activeReceipt?.invoiceNo || (bookingId ? `INV-${bookingId.slice(0, 8).toUpperCase()}` : "INV-RIDE");

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.sheetContainer}>
          {/* Header Bar */}
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>Trip Receipt & Invoice</Text>
              <Text style={styles.invoiceNumber}>{invNo}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={24} color="#374151" />
            </TouchableOpacity>
          </View>

          {isLoading && !activeReceipt ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#16A34A" />
              <Text style={styles.loadingText}>Generating official bill...</Text>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Receipt Ticket Card */}
              <View style={styles.ticketCard}>
                {/* Status & Amount Hero */}
                <View style={styles.heroBox}>
                  <View style={styles.paidBadge}>
                    <Ionicons name="checkmark-circle" size={16} color="#15803D" />
                    <Text style={styles.paidBadgeText}>
                      {activeReceipt?.paymentStatus?.toUpperCase() || "PAID"} ({activeReceipt?.paymentMethod?.toUpperCase() || "CASH"})
                    </Text>
                  </View>
                  <Text style={styles.heroAmount}>LKR {total.toFixed(2)}</Text>
                  <Text style={styles.heroSubText}>Total Ride Bill</Text>
                </View>

                {/* Perforated divider */}
                <View style={styles.dividerRow}>
                  <View style={styles.cutoutLeft} />
                  <View style={styles.dashedLine} />
                  <View style={styles.cutoutRight} />
                </View>

                {/* Route Information */}
                <View style={styles.section}>
                  <Text style={styles.sectionHeader}>ROUTE DETAILS</Text>
                  <View style={styles.routeRow}>
                    <Ionicons name="ellipse" size={12} color="#16A34A" style={{ marginTop: 2 }} />
                    <View style={{ marginLeft: 10, flex: 1 }}>
                      <Text style={styles.routeLabel}>Pickup Point</Text>
                      <Text style={styles.routeAddress} numberOfLines={2}>
                        {activeReceipt?.pickupAddress || "Pickup Location"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.routeConnector} />

                  <View style={styles.routeRow}>
                    <Ionicons name="location" size={14} color="#EF4444" style={{ marginTop: 2 }} />
                    <View style={{ marginLeft: 10, flex: 1 }}>
                      <Text style={styles.routeLabel}>Drop-off Destination</Text>
                      <Text style={styles.routeAddress} numberOfLines={2}>
                        {activeReceipt?.dropAddress || "Destination"}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.hairline} />

                {/* Driver & Vehicle Box */}
                <View style={styles.section}>
                  <Text style={styles.sectionHeader}>VEHICLE & DRIVER</Text>
                  <View style={styles.driverBox}>
                    <View style={styles.driverAvatar}>
                      <Ionicons name="car-sport" size={20} color="#FFF" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.driverName}>
                        {activeReceipt?.driver?.name || "Verified Driver"}
                      </Text>
                      <Text style={styles.vehicleNumber}>
                        {activeReceipt?.driver?.vehicleRegNum || "Vehicle Details Attached"} • {activeReceipt?.driver?.vehicleType || "Taxi"}
                      </Text>
                    </View>
                    {activeReceipt?.driver?.phoneNumber ? (
                      <Text style={styles.phoneBadge}>📞 {activeReceipt.driver.phoneNumber}</Text>
                    ) : null}
                  </View>
                </View>

                <View style={styles.hairline} />

                {/* Itemized Bill Breakdown */}
                <View style={styles.section}>
                  <Text style={styles.sectionHeader}>ITEMIZED BILL BREAKDOWN</Text>

                  <View style={styles.billRow}>
                    <Text style={styles.billLabel}>Base Fare</Text>
                    <Text style={styles.billValue}>LKR {base.toFixed(2)}</Text>
                  </View>

                  <View style={styles.billRow}>
                    <Text style={styles.billLabel}>
                      Distance Fare ({distance.toFixed(1)} km {ratePerKm ? `@ LKR ${ratePerKm}/km` : ""})
                    </Text>
                    <Text style={styles.billValue}>LKR {distFare.toFixed(2)}</Text>
                  </View>

                  {waitFare > 0 || waitMins > 0 ? (
                    <View style={styles.billRow}>
                      <Text style={styles.billLabel}>
                        Waiting Charges ({waitMins} min)
                      </Text>
                      <Text style={styles.billValue}>LKR {waitFare.toFixed(2)}</Text>
                    </View>
                  ) : null}

                  {pickupFare > 0 ? (
                    <View style={styles.billRow}>
                      <Text style={styles.billLabel}>Pickup Surcharge</Text>
                      <Text style={styles.billValue}>LKR {pickupFare.toFixed(2)}</Text>
                    </View>
                  ) : null}

                  {Number(activeReceipt?.discountAmount || 0) > 0 ? (
                    <View style={styles.billRow}>
                      <Text style={[styles.billLabel, { color: "#16A34A" }]}>Promotional Discount</Text>
                      <Text style={[styles.billValue, { color: "#16A34A" }]}>
                        - LKR {Number(activeReceipt?.discountAmount).toFixed(2)}
                      </Text>
                    </View>
                  ) : null}

                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>TOTAL PAID</Text>
                    <Text style={styles.totalValue}>LKR {total.toFixed(2)}</Text>
                  </View>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionsContainer}>
                <TouchableOpacity
                  style={styles.emailBtn}
                  onPress={handleSendEmailReceipt}
                  disabled={isSendingEmail}
                  activeOpacity={0.8}
                >
                  {isSendingEmail ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <Ionicons name="mail" size={18} color="#FFF" />
                      <Text style={styles.emailBtnText}>Email Official Receipt</Text>
                    </>
                  )}
                </TouchableOpacity>

                <View style={styles.secondaryRow}>
                  <TouchableOpacity
                    style={styles.shareBtn}
                    onPress={handleShareSummary}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="share-social-outline" size={18} color="#374151" />
                    <Text style={styles.shareBtnText}>Share</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.doneBtn}
                    onPress={onClose}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.doneBtnText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: "#F8FAFC",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "92%",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    backgroundColor: "#FFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  invoiceNumber: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingBox: {
    padding: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748B",
    fontWeight: "600",
  },
  ticketCard: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    overflow: "hidden",
  },
  heroBox: {
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 16,
    backgroundColor: "#F0FDF4",
  },
  paidBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  paidBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#15803D",
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  heroAmount: {
    fontSize: 32,
    fontWeight: "900",
    color: "#0F172A",
  },
  heroSubText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 2,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    height: 20,
    marginVertical: -10,
  },
  cutoutLeft: {
    width: 14,
    height: 20,
    backgroundColor: "#F8FAFC",
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    borderWidth: 1,
    borderLeftWidth: 0,
    borderColor: "#E2E8F0",
  },
  dashedLine: {
    flex: 1,
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    marginHorizontal: 8,
  },
  cutoutRight: {
    width: 14,
    height: 20,
    backgroundColor: "#F8FAFC",
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
    borderWidth: 1,
    borderRightWidth: 0,
    borderColor: "#E2E8F0",
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: "800",
    color: "#94A3B8",
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  routeConnector: {
    width: 2,
    height: 14,
    backgroundColor: "#CBD5E1",
    marginLeft: 5,
    marginVertical: 2,
  },
  routeLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  routeAddress: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 1,
  },
  hairline: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginHorizontal: 16,
  },
  driverBox: {
    flexDirection: "row",
    alignItems: "center",
  },
  driverAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#16A34A",
    alignItems: "center",
    justifyContent: "center",
  },
  driverName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  vehicleNumber: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 1,
  },
  phoneBadge: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2563EB",
  },
  billRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  billLabel: {
    fontSize: 13,
    color: "#475569",
    fontWeight: "500",
  },
  billValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "900",
    color: "#16A34A",
  },
  actionsContainer: {
    marginTop: 16,
    gap: 10,
  },
  emailBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#16A34A",
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  emailBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFF",
  },
  secondaryRow: {
    flexDirection: "row",
    gap: 10,
  },
  shareBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingVertical: 12,
    borderRadius: 14,
    gap: 6,
  },
  shareBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
  },
  doneBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    paddingVertical: 12,
    borderRadius: 14,
  },
  doneBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
  },
});

export default RideReceiptModal;
