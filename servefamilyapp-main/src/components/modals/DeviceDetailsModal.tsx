import { TrackerService } from "@/src/Services/TrackerService";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import ModalSafeArea from "@/src/components/ModalSafeArea";

interface TrackerDataPoint {
  id: string;
  deviceId: string;
  msgType?: string;
  gpsStatus?: string;
  latitude: number;
  longitude: number;
  speed: number;
  course?: number;
  statusHex?: string;
  rawData?: string;
  metadata?: any;
  createdAt: string;
}

interface DeviceDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  deviceId: string;
  deviceName: string;
}

const DeviceDetailsModal: React.FC<DeviceDetailsModalProps> = ({
  visible,
  onClose,
  deviceId,
  deviceName,
}) => {
  const [trackerData, setTrackerData] = useState<TrackerDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDeviceData = useCallback(
    async (pageToFetch: number, reset = false) => {
      if (!deviceId) return;
      if (pageToFetch === 1) setLoading(true);

      try {
        const queryParams = {
          page: pageToFetch,
          limit: 50,
        };

        const response = await TrackerService.getTrackerByDeviceId(
          deviceId,
          queryParams,
        );

        if (response.success) {
          const newData = response.data.trackerData || [];
          const pagination = response.data.pagination;

          if (reset) {
            setTrackerData(newData);
          } else {
            setTrackerData((prev) => [...prev, ...newData]);
          }
          if (pagination && pagination.page < pagination.totalPages) {
            setHasMore(true);
          } else {
            setHasMore(false);
          }
        }
      } catch (error: any) {
        console.error(error);
        Alert.alert("Error", error.message || "Failed to fetch device data");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [deviceId],
  );

  useEffect(() => {
    if (visible && deviceId) {
      setTrackerData([]);
      setPage(1);
      setHasMore(true);
      fetchDeviceData(1, true);
    }
  }, [visible, deviceId, fetchDeviceData]);

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchDeviceData(nextPage);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setPage(1);
    fetchDeviceData(1, true);
  };

  const renderItem = ({ item }: { item: TrackerDataPoint }) => (
    <View style={styles.dataCard}>
      <View style={styles.dataHeader}>
        <View style={styles.timeWrap}>
          <Ionicons name="time-outline" size={14} color="#64748B" />
          <Text style={styles.timestamp}>
            {new Date(item.createdAt).toLocaleString()}
          </Text>
        </View>
        <View style={styles.speedBadge}>
          <Ionicons name="speedometer-outline" size={13} color="#16A34A" />
          <Text style={styles.speedText}>{item.speed} km/h</Text>
        </View>
      </View>

      <View style={styles.coordsRow}>
        <View style={styles.coordPill}>
          <Ionicons name="location-outline" size={12} color="#2563EB" />
          <Text style={styles.coordText}>Lat: {item.latitude.toFixed(6)}</Text>
        </View>
        <View style={styles.coordPill}>
          <Ionicons name="navigate-outline" size={12} color="#2563EB" />
          <Text style={styles.coordText}>Lng: {item.longitude.toFixed(6)}</Text>
        </View>
      </View>

      {item.gpsStatus && (
        <View style={styles.statusRow}>
          <MaterialCommunityIcons name="satellite-variant" size={12} color="#94A3B8" />
          <Text style={styles.metaText}>GPS Status: {item.gpsStatus}</Text>
        </View>
      )}
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ModalSafeArea style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerBackBtn}>
            <Ionicons name="arrow-back" size={22} color="#0F172A" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {deviceName || "Device Details"}
            </Text>
            <View style={styles.idChip}>
              <Text style={styles.headerSubtitle}>ID: {deviceId}</Text>
            </View>
          </View>
          <View style={{ width: 38 }} />
        </View>

        <View style={styles.content}>
          {loading && page === 1 ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color="#16A34A" />
              <Text style={styles.loadingText}>Fetching telemetry data...</Text>
            </View>
          ) : (
            <FlatList
              data={trackerData}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.5}
              refreshing={refreshing}
              onRefresh={handleRefresh}
              contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="pulse-outline" size={48} color="#CBD5E1" />
                  <Text style={styles.emptyTitle}>No Telemetry Logs</Text>
                  <Text style={styles.emptyText}>
                    No location data points recorded for this device yet.
                  </Text>
                </View>
              }
              ListFooterComponent={
                hasMore && trackerData.length > 0 ? (
                  <ActivityIndicator
                    size="small"
                    color="#16A34A"
                    style={{ marginVertical: 14 }}
                  />
                ) : null
              }
            />
          )}
        </View>
      </ModalSafeArea>
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
  headerCenter: {
    alignItems: "center",
    flex: 1,
    paddingHorizontal: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
  },
  idChip: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 2,
  },
  headerSubtitle: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
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
  dataCard: {
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderRadius: 18,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    ...Platform.select({
      ios: {
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  dataHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  timeWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  timestamp: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
  },
  speedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  speedText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#15803D",
  },
  coordsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 6,
  },
  coordPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  coordText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#1E40AF",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  metaText: {
    fontSize: 11,
    color: "#94A3B8",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 12,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
  },
});

export default DeviceDetailsModal;
