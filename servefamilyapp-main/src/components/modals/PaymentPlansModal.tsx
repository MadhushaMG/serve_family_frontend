import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as IAP from "react-native-iap";
import IPayPayment from "./IPayPayment";
import { UserServices } from "../../Services/UserServices";
import { SubscriptionService } from "../../Services/SubscriptionService";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface PaymentModalProps {
  visible: boolean;
  onClose: () => void;
  currentPlanName?: string;
}

interface PlanFeature {
  label: string;
  value: string;
  included: boolean;
  note: "limited" | "prediction" | null;
}

interface Plan {
  name: string;
  price: number;
  accent: string;
  accentLight: string;
  accentBorder: string;
  badge: string | null;
  chips: string[];
  features: PlanFeature[];
  // IAP SKU for Apple/Google
  iapSku: string | null;
}

interface BillingState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
}

// ─────────────────────────────────────────────
// Plan data
// ─────────────────────────────────────────────
const PLANS: Plan[] = [
  {
    name: "Free",
    price: 0,
    accent: "#6b7280",
    accentLight: "#f3f4f6",
    accentBorder: "#d1d5db",
    badge: null,
    iapSku: null,
    chips: ["1 group", "1 admin", "Basic tracking", "Limited notifications"],
    features: [
      { label: "Groups", value: "1", included: true, note: null },
      { label: "Admins", value: "1", included: true, note: null },
      { label: "Location Tracking", value: "1", included: true, note: null },
      { label: "Tracking Devices", value: "1", included: true, note: null },
      { label: "Mobile Web Support", value: "Yes", included: true, note: null },
      { label: "Health Support", value: "No", included: false, note: null },
      {
        label: "Notifications",
        value: "Limited",
        included: true,
        note: "limited",
      },
      {
        label: "Phone Ringing Alert",
        value: "No",
        included: false,
        note: null,
      },
      { label: "SMS Notification", value: "No", included: false, note: null },
    ],
  },
  {
    name: "Silver",
    price: 150,
    accent: "#0ea5e9",
    accentLight: "#e0f2fe",
    accentBorder: "#7dd3fc",
    badge: null,
    iapSku: "com.servefamily.silver_monthly",
    chips: [
      "3 groups",
      "3 admins",
      "Health limited",
      "Unlimited notifications",
      "Limited SMS",
    ],
    features: [
      { label: "Groups", value: "3", included: true, note: null },
      { label: "Admins", value: "3", included: true, note: null },
      { label: "Location Tracking", value: "3", included: true, note: null },
      { label: "Tracking Devices", value: "3", included: true, note: null },
      { label: "Mobile Web Support", value: "Yes", included: true, note: null },
      {
        label: "Health Support",
        value: "Limited",
        included: true,
        note: "limited",
      },
      {
        label: "Notifications",
        value: "Unlimited",
        included: true,
        note: null,
      },
      {
        label: "Phone Ringing Alert",
        value: "Yes",
        included: true,
        note: null,
      },
      {
        label: "SMS Notification",
        value: "Limited",
        included: true,
        note: "limited",
      },
    ],
  },
  {
    name: "Gold",
    price: 400,
    accent: "#f59e0b",
    accentLight: "#fef3c7",
    accentBorder: "#fcd34d",
    badge: "Most Popular",
    iapSku: "com.servefamily.gold_monthly",
    chips: [
      "6 groups",
      "6 admins",
      "Unlimited health",
      "Unlimited SMS",
      "Phone alerts",
    ],
    features: [
      { label: "Groups", value: "6", included: true, note: null },
      { label: "Admins", value: "6", included: true, note: null },
      { label: "Location Tracking", value: "6", included: true, note: null },
      { label: "Tracking Devices", value: "6", included: true, note: null },
      { label: "Mobile Web Support", value: "Yes", included: true, note: null },
      {
        label: "Health Support",
        value: "Unlimited",
        included: true,
        note: null,
      },
      {
        label: "Notifications",
        value: "Unlimited",
        included: true,
        note: null,
      },
      {
        label: "Phone Ringing Alert",
        value: "Yes",
        included: true,
        note: null,
      },
      { label: "SMS Notification", value: "Yes", included: true, note: null },
    ],
  },
  {
    name: "Platinum",
    price: 750,
    accent: "#8b5cf6",
    accentLight: "#ede9fe",
    accentBorder: "#c4b5fd",
    badge: "Enterprise",
    iapSku: "com.servefamily.platinum_monthly",
    chips: [
      "12 groups",
      "12 admins",
      "Health + prediction",
      "Unlimited SMS",
      "Phone alerts",
    ],
    features: [
      { label: "Groups", value: "12", included: true, note: null },
      { label: "Admins", value: "12", included: true, note: null },
      { label: "Location Tracking", value: "12", included: true, note: null },
      { label: "Tracking Devices", value: "12", included: true, note: null },
      { label: "Mobile Web Support", value: "Yes", included: true, note: null },
      {
        label: "Health Support",
        value: "Unlimited + Prediction",
        included: true,
        note: "prediction",
      },
      {
        label: "Notifications",
        value: "Unlimited",
        included: true,
        note: null,
      },
      {
        label: "Phone Ringing Alert",
        value: "Yes",
        included: true,
        note: null,
      },
      {
        label: "SMS Notification",
        value: "Unlimited",
        included: true,
        note: null,
      },
    ],
  },
];

// ─────────────────────────────────────────────
// IAP SKU Lists
// Android uses "silver_monthly" etc. (Play Console)
// iOS uses "silver_monthly" etc. (App Store Connect — same Product IDs)
// ─────────────────────────────────────────────
const IAP_SKUS = [
  "com.servefamily.silver_monthly",
  "com.servefamily.gold_monthly",
  "com.servefamily.platinum_monthly",
];
// ─────────────────────────────────────────────
// Step bar
// ─────────────────────────────────────────────
function StepBar({ step, accent }: { step: number; accent: string }) {
  return (
    <View style={s.stepRow}>
      {[1, 2].map((n) => (
        <View
          key={n}
          style={[s.stepDot, n <= step && { backgroundColor: accent }]}
        />
      ))}
    </View>
  );
}

// ─────────────────────────────────────────────
// Plan Card
// ─────────────────────────────────────────────
function PlanCard({
  plan,
  isSelected,
  isCurrent,
  onSelect,
}: {
  plan: Plan;
  isSelected: boolean;
  isCurrent: boolean;
  onSelect: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={isCurrent ? 1 : 0.75}
      onPress={() => !isCurrent && onSelect()}
      style={[
        s.planCard,
        isSelected && {
          borderWidth: 2,
          borderColor: plan.accent,
          backgroundColor: plan.accentLight,
        },
        isCurrent && s.planCardCurrent,
      ]}
    >
      <View style={s.planCardRow}>
        <View
          style={[
            s.radio,
            isSelected
              ? { backgroundColor: plan.accent, borderWidth: 0 }
              : { borderColor: "#d1d5db" },
          ]}
        >
          {isSelected && <View style={s.radioDot} />}
        </View>

        <View style={s.planCardMeta}>
          <Text style={[s.planCardName, isSelected && { color: plan.accent }]}>
            {plan.name}
          </Text>
          {isCurrent && (
            <View style={s.currentBadge}>
              <Text style={s.currentBadgeText}>Current plan</Text>
            </View>
          )}
          {plan.badge && !isCurrent && (
            <View
              style={[
                s.planBadge,
                {
                  backgroundColor: plan.accent + "22",
                  borderColor: plan.accentBorder,
                },
              ]}
            >
              <Text style={[s.planBadgeText, { color: plan.accent }]}>
                {plan.badge}
              </Text>
            </View>
          )}
        </View>

        <View style={s.planCardPriceWrap}>
          <Text style={[s.planCardPrice, isSelected && { color: plan.accent }]}>
            {plan.price === 0 ? "Free" : `Rs ${plan.price}`}
          </Text>
          {plan.price > 0 && <Text style={s.planCardPriceSub}>/ month</Text>}
        </View>
      </View>

      {isSelected && (
        <View style={[s.planCardChips, { borderTopColor: plan.accentBorder }]}>
          {plan.chips.map((chip, i) => (
            <View
              key={i}
              style={[
                s.chip,
                { borderColor: plan.accentBorder, backgroundColor: "#fff" },
              ]}
            >
              <Text style={[s.chipText, { color: plan.accent }]}>{chip}</Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────
// Step 1 — Plan + Payment Method
// ─────────────────────────────────────────────
function PlanStep({
  selectedPlan,
  currentPlanName,
  paymentMethod,
  onSelectPlan,
  onSelectMethod,
}: {
  selectedPlan: Plan;
  currentPlanName: string;
  paymentMethod: "ipay" | "apple_pay" | "google_pay";
  onSelectPlan: (p: Plan) => void;
  onSelectMethod: (m: "ipay" | "apple_pay" | "google_pay") => void;
}) {
  return (
    <ScrollView
      style={s.body}
      contentContainerStyle={{ paddingBottom: 110 }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={s.secLabel}>Select plan</Text>

      <View style={s.planList}>
        {PLANS.map((plan) => (
          <PlanCard
            key={plan.name}
            plan={plan}
            isSelected={plan.name === selectedPlan.name}
            isCurrent={plan.name === currentPlanName}
            onSelect={() => onSelectPlan(plan)}
          />
        ))}
      </View>

      {selectedPlan.price > 0 && (
        <>
          <Text style={s.secLabel}>Payment method</Text>
          <View style={s.methodRow}>
            {/* ── Apple Pay — iOS only ── */}
            {Platform.OS === "ios" && (
              <TouchableOpacity
                activeOpacity={0.75}
                style={[
                  s.methodCard,
                  paymentMethod === "apple_pay" && {
                    backgroundColor: selectedPlan.accentLight,
                    borderColor: selectedPlan.accent,
                    borderWidth: 1.5,
                  },
                ]}
                onPress={() => onSelectMethod("apple_pay")}
              >
                <View style={s.methodIconWrap}>
                  <Ionicons
                    name="logo-apple"
                    size={20}
                    color={
                      paymentMethod === "apple_pay"
                        ? selectedPlan.accent
                        : "#9ca3af"
                    }
                  />
                </View>
                <Text
                  style={[
                    s.methodLabel,
                    paymentMethod === "apple_pay" && {
                      color: selectedPlan.accent,
                    },
                  ]}
                >
                  Apple Pay
                </Text>
              </TouchableOpacity>
            )}

            {/* ── Google Pay — Android only ── */}
            {Platform.OS === "android" && (
              <TouchableOpacity
                activeOpacity={0.75}
                style={[
                  s.methodCard,
                  paymentMethod === "google_pay" && {
                    backgroundColor: selectedPlan.accentLight,
                    borderColor: selectedPlan.accent,
                    borderWidth: 1.5,
                  },
                ]}
                onPress={() => onSelectMethod("google_pay")}
              >
                <View style={s.methodIconWrap}>
                  <Ionicons
                    name="logo-google"
                    size={20}
                    color={
                      paymentMethod === "google_pay"
                        ? selectedPlan.accent
                        : "#9ca3af"
                    }
                  />
                </View>
                <Text
                  style={[
                    s.methodLabel,
                    paymentMethod === "google_pay" && {
                      color: selectedPlan.accent,
                    },
                  ]}
                >
                  Google Pay
                </Text>
              </TouchableOpacity>
            )}

            {/* ── iPay — both platforms ── */}
            <TouchableOpacity
              activeOpacity={0.75}
              style={[
                s.methodCard,
                paymentMethod === "ipay" && {
                  backgroundColor: selectedPlan.accentLight,
                  borderColor: selectedPlan.accent,
                  borderWidth: 1.5,
                },
              ]}
              onPress={() => onSelectMethod("ipay")}
            >
              <View style={s.methodIconWrap}>
                <MaterialCommunityIcons
                  name="credit-card-outline"
                  size={20}
                  color={
                    paymentMethod === "ipay" ? selectedPlan.accent : "#9ca3af"
                  }
                />
              </View>
              <Text
                style={[
                  s.methodLabel,
                  paymentMethod === "ipay" && { color: selectedPlan.accent },
                ]}
              >
                iPay
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      <View style={s.summaryBox}>
        <Text style={s.summaryLabel}>Monthly total</Text>
        <Text style={[s.summaryValue, { color: selectedPlan.accent }]}>
          {selectedPlan.price === 0 ? "Free" : `Rs ${selectedPlan.price} / mo`}
        </Text>
      </View>

      <View style={s.trustRow}>
        <View style={s.trustItem}>
          <Ionicons name="shield-checkmark-outline" size={13} color="#9ca3af" />
          <Text style={s.trustText}>14-day guarantee</Text>
        </View>
        <View style={s.trustItem}>
          <Ionicons name="close-circle-outline" size={13} color="#9ca3af" />
          <Text style={s.trustText}>Cancel anytime</Text>
        </View>
      </View>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────
// Step 2 — Billing Details
// ─────────────────────────────────────────────
function BillingStep({
  plan,
  paymentMethod,
  billing,
  onChange,
  onPay,
  processing,
  isFreePlan,
}: {
  plan: Plan;
  paymentMethod: "ipay" | "apple_pay" | "google_pay";
  billing: BillingState;
  onChange: (key: keyof BillingState, val: string) => void;
  onPay: () => void;
  processing: boolean;
  isFreePlan: boolean;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => setKeyboardHeight(e.endCoordinates.height),
    );
    const hide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardHeight(0),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const scrollTo = (y: number) =>
    scrollRef.current?.scrollTo({ y: Math.max(0, y - 80), animated: true });

  const allFilled =
    billing.firstName &&
    billing.lastName &&
    billing.email &&
    billing.phone &&
    billing.address &&
    billing.city;

  // Apple IAP / Google IAP flows skip billing — payment handled by OS
  const isNativePay =
    paymentMethod === "apple_pay" || paymentMethod === "google_pay";

  const ctaLabel = () => {
    if (isFreePlan) return "Activate Free Plan";
    if (paymentMethod === "apple_pay") return "Pay with Apple Pay";
    if (paymentMethod === "google_pay") return "Pay with Google Pay";
    return "Pay with iPay";
  };

  return (
    <>
      <ScrollView
        ref={scrollRef}
        style={s.body}
        contentContainerStyle={{ paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Recap */}
        <View style={[s.recapCard, { borderLeftColor: plan.accent }]}>
          <Text style={[s.recapPlan, { color: plan.accent }]}>
            {plan.name} plan
          </Text>
          <Text style={s.recapPrice}>
            {plan.price === 0 ? "Free" : `Rs ${plan.price} / month`}
          </Text>
        </View>

        {/* Apple/Google Pay: no billing form needed — handled natively */}
        {isNativePay && !isFreePlan ? (
          <View style={s.nativePayNote}>
            <Ionicons
              name={
                paymentMethod === "apple_pay" ? "logo-apple" : "logo-google"
              }
              size={32}
              color={plan.accent}
            />
            <Text style={s.nativePayTitle}>
              {paymentMethod === "apple_pay" ? "Apple Pay" : "Google Pay"}
            </Text>
            <Text style={s.nativePayDesc}>
              {paymentMethod === "apple_pay"
                ? "Your Apple ID and Touch ID / Face ID will be used to authenticate and complete the subscription."
                : "Your Google account will be used to authenticate and complete the subscription."}
            </Text>
            <Text style={[s.nativePaySub, { color: plan.accent }]}>
              Rs {plan.price} / month • Auto-renews monthly • Cancel anytime
            </Text>
          </View>
        ) : (
          <>
            <Text style={s.secLabel}>Billing details</Text>

            <View style={s.row}>
              <View style={s.half}>
                <Text style={s.label}>First name</Text>
                <TextInput
                  style={s.input}
                  value={billing.firstName}
                  onChangeText={(v) => onChange("firstName", v)}
                  placeholder="John"
                  placeholderTextColor="#9ca3af"
                  returnKeyType="next"
                  onFocus={() => scrollTo(0)}
                />
              </View>
              <View style={s.half}>
                <Text style={s.label}>Last name</Text>
                <TextInput
                  style={s.input}
                  value={billing.lastName}
                  onChangeText={(v) => onChange("lastName", v)}
                  placeholder="Doe"
                  placeholderTextColor="#9ca3af"
                  returnKeyType="next"
                  onFocus={() => scrollTo(0)}
                />
              </View>
            </View>

            <Text style={s.label}>Email</Text>
            <TextInput
              style={s.input}
              value={billing.email}
              onChangeText={(v) => onChange("email", v)}
              placeholder="john@example.com"
              placeholderTextColor="#9ca3af"
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="next"
              onFocus={() => scrollTo(80)}
            />

            <Text style={s.label}>Phone</Text>
            <TextInput
              style={s.input}
              value={billing.phone}
              onChangeText={(v) => onChange("phone", v)}
              placeholder="0771234567"
              placeholderTextColor="#9ca3af"
              keyboardType="phone-pad"
              returnKeyType="next"
              onFocus={() => scrollTo(160)}
            />

            <Text style={s.label}>Address</Text>
            <TextInput
              style={s.input}
              value={billing.address}
              onChangeText={(v) => onChange("address", v)}
              placeholder="No. 123, Street Name"
              placeholderTextColor="#9ca3af"
              returnKeyType="next"
              onFocus={() => scrollTo(240)}
            />

            <View style={s.row}>
              <View style={s.half}>
                <Text style={s.label}>City</Text>
                <TextInput
                  style={s.input}
                  value={billing.city}
                  onChangeText={(v) => onChange("city", v)}
                  placeholder="Colombo"
                  placeholderTextColor="#9ca3af"
                  returnKeyType="next"
                  onFocus={() => scrollTo(320)}
                />
              </View>
              <View style={s.half}>
                <Text style={s.label}>Country</Text>
                <TextInput
                  style={s.input}
                  value={billing.country}
                  onChangeText={(v) => onChange("country", v)}
                  placeholder="Sri Lanka"
                  placeholderTextColor="#9ca3af"
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                  onFocus={() => scrollTo(320)}
                />
              </View>
            </View>
          </>
        )}

        <View style={s.summaryBox}>
          <Text style={s.summaryLabel}>Monthly total</Text>
          <Text style={[s.summaryValue, { color: plan.accent }]}>
            {plan.price === 0 ? "Free" : `Rs ${plan.price} / mo`}
          </Text>
        </View>
      </ScrollView>

      {/* Pay footer */}
      <View
        style={[
          s.footer,
          {
            marginBottom:
              keyboardHeight > 0 ? keyboardHeight - insets.bottom : 0,
            paddingBottom: Math.max(insets.bottom, 12),
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          style={[
            s.cta,
            { backgroundColor: plan.accent },
            ((!allFilled && !isNativePay && !isFreePlan) || processing) &&
              s.ctaDisabled,
          ]}
          disabled={(!allFilled && !isNativePay && !isFreePlan) || processing}
          onPress={onPay}
        >
          {processing ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Text style={s.ctaText}>{ctaLabel()}</Text>
              <MaterialCommunityIcons
                name="chevron-right"
                size={20}
                color="#fff"
              />
            </>
          )}
        </TouchableOpacity>
      </View>
    </>
  );
}

// ─────────────────────────────────────────────
// Main Modal
// ─────────────────────────────────────────────
export default function PaymentModal({
  visible,
  onClose,
  currentPlanName = "Free",
}: PaymentModalProps) {
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<1 | 2>(1);
  const [selectedPlan, setSelectedPlan] = useState<Plan>(PLANS[2]); // Gold default

  // Default payment method per platform
  const defaultMethod = Platform.OS === "ios" ? "apple_pay" : "google_pay";
  const [paymentMethod, setPaymentMethod] = useState<
    "ipay" | "apple_pay" | "google_pay"
  >(defaultMethod);

  const [processing, setProcessing] = useState(false);
  const [showIPay, setShowIPay] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);

  const fetchPlanId = async (planName: string): Promise<string> => {
    const plansResponse = await SubscriptionService.getAllPlans();
    const plans = plansResponse?.data ?? plansResponse;
    const plan = plans.find((p: any) => p.name === planName);
    if (!plan) throw new Error(`Plan ${planName} not found`);
    return plan.id;
  };

  const [billing, setBilling] = useState<BillingState>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    country: "Sri Lanka",
  });

  const [subscriptions, setSubscriptions] = useState<IAP.ProductSubscription[]>(
    [],
  );

  // ── IAP init (works for both iOS StoreKit & Android Billing) ──
  useEffect(() => {
    let purchaseUpdateSub: any;
    let purchaseErrorSub: any;

    const initIAP = async () => {
      try {
        const connected = await IAP.initConnection();
        if (!connected) {
          console.warn("Play Store / App Store billing service is not connected on this device.");
          return;
        }

        if (Platform.OS === "android") {
          await IAP.flushFailedPurchasesCachedAsPendingAndroid().catch(() => {});
        }

        purchaseUpdateSub = IAP.purchaseUpdatedListener(
          async (purchase: any) => {
            const token =
              Platform.OS === "android"
                ? purchase.purchaseToken
                : purchase.transactionReceipt; // iOS receipt

            if (token) {
              try {
                // Android needs explicit acknowledgement
                if (Platform.OS === "android" && purchase.purchaseToken) {
                  await IAP.acknowledgePurchaseAndroid(purchase.purchaseToken);
                }
                // Finish transaction on both platforms
                await IAP.finishTransaction({ purchase, isConsumable: false });

                // ── Sync with your backend ──
                await syncPurchaseWithBackend(purchase);

                Alert.alert(
                  "Subscription Activated!",
                  `Your ${selectedPlan.name} plan is now active.`,
                  [{ text: "OK", onPress: handleClose }],
                );
              } catch (e) {
                console.error("Finish transaction error", e);
              }
            }
          },
        );

        purchaseErrorSub = IAP.purchaseErrorListener((error) => {
          if (error.code !== IAP.ErrorCode.UserCancelled) {
            Alert.alert(
              "Payment Error",
              error.message || "Transaction failed. Please try again.",
            );
          }
        });

        // Fetch available subscriptions from App Store / Play Store safely
        try {
          const subs = await IAP.fetchProducts({ skus: IAP_SKUS, type: "subs" });
          if (subs) setSubscriptions(subs as IAP.ProductSubscription[]);
        } catch (fetchErr: any) {
          console.warn("IAP fetchProducts warning:", fetchErr?.message || fetchErr);
        }
      } catch (e: any) {
        console.warn("IAP init error:", e?.message || e);
      }
    };

    if (visible) initIAP();

    return () => {
      if (purchaseUpdateSub) purchaseUpdateSub.remove();
      if (purchaseErrorSub) purchaseErrorSub.remove();
      IAP.endConnection();
    };
  }, [visible]);

  // ── Prefill billing from user profile ──
  useEffect(() => {
    if (!visible) return;
    const prefill = async () => {
      try {
        const userResponse = await UserServices.GetProfile();
        const user = userResponse?.data ?? userResponse;
        if (!user) return;
        setBilling((prev) => {
          const parts = (user.name || "").trim().split(/\s+/);
          return {
            ...prev,
            firstName: prev.firstName || parts[0] || "",
            lastName: prev.lastName || parts.slice(1).join(" ") || "",
            email: prev.email || user.email || "",
            phone: prev.phone || user.phone || "",
          };
        });
      } catch (e) {
        console.error("Prefill error", e);
      }
    };
    prefill();
  }, [visible]);

  // ── Sync IAP purchase receipt with your backend ──
  const syncPurchaseWithBackend = async (purchase: IAP.Purchase) => {
    try {
      const planId = await fetchPlanId(selectedPlan.name);
      await SubscriptionService.subscribeToPlan(planId);
      console.log(
        "[IAP] Purchase synced — platform:",
        Platform.OS,
        "| plan:",
        selectedPlan.name,
        "| planId:",
        planId,
      );
    } catch (e) {
      console.error("[IAP] Backend sync error", e);
      throw e;
    }
  };

  const handleClose = () => {
    setStep(1);
    setShowIPay(false);
    onClose();
  };

  const handleBillingChange = (key: keyof BillingState, val: string) =>
    setBilling((prev) => ({ ...prev, [key]: val }));

  // ── Free Plan ──
  const handleActivateFreePlan = async () => {
    setProcessing(true);
    try {
      const planId = await fetchPlanId("Free");
      await SubscriptionService.subscribeToPlan(planId);
      Alert.alert(
        "Plan Activated!",
        "Your Free plan has been activated successfully.",
        [{ text: "OK", onPress: handleClose }],
      );
    } catch (e) {
      Alert.alert("Error", "Failed to activate Free plan. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  // ── Apple IAP (iOS StoreKit) ──
  const handleApplePay = async () => {
    if (Platform.OS !== "ios") {
      Alert.alert("Apple Pay", "Only available on iOS devices.");
      return;
    }
    if (!selectedPlan.iapSku) return;

    setProcessing(true);
    try {
      // requestPurchase triggers Apple's native payment sheet
      await IAP.requestPurchase({
        type: "subs",
        request: {
          apple: { sku: selectedPlan.iapSku },
          google: { skus: [selectedPlan.iapSku] }, // ignored on iOS
        },
      });
      // Result handled in purchaseUpdatedListener above
    } catch (err: any) {
      if (err.code !== "E_USER_CANCELLED") {
        Alert.alert("Error", err.message || "Failed to process subscription.");
      }
    } finally {
      setProcessing(false);
    }
  };

  // ── Google IAP (Android Billing) ──
  const handleGooglePay = async () => {
    if (Platform.OS !== "android") {
      Alert.alert("Google Pay", "Only available on Android devices.");
      return;
    }
    if (!selectedPlan.iapSku) return;

    setProcessing(true);
    try {
      await IAP.requestPurchase({
        type: "subs",
        request: {
          apple: { sku: selectedPlan.iapSku },
          google: { skus: [selectedPlan.iapSku] },
        },
      });
    } catch (err: any) {
      if (err.code !== "E_USER_CANCELLED") {
        Alert.alert("Error", err.message || "Failed to process subscription.");
      }
    } finally {
      setProcessing(false);
    }
  };

  // ── iPay (both platforms) ──
  const handleIPay = async () => {
    setProcessing(true);
    try {
      const userResponse = await UserServices.GetProfile();
      const user = userResponse?.data ?? userResponse;
      const PlanId = await fetchPlanId(selectedPlan.name);

      const normalizedUser = {
        data: {
          id: user?.id ?? user?.data?.id ?? "guest",
          name: user?.name ?? user?.data?.name ?? "",
          phone: user?.phone ?? user?.data?.phone ?? "",
          email: user?.email ?? user?.data?.email ?? "",
        }
      };

      const orderId = `${normalizedUser.data.id}|${PlanId}`;
      setPaymentData({
        merchantWebToken:
          "eyJhbGciOiJIUzUxMiJ9.eyJtaWQiOiIwMDA1NTM1NCJ9.mPtoEJ88LA3JjlkjaCt1dzYVZBuyiqUjF7ef007UHDAoPzejKTYVVkHJXXCTEqK2VzCu3Z2ro2tUslq7Wvvsrg",
        orderId,
        amount: selectedPlan.price.toFixed(2),
        customerName:
          `${billing.firstName} ${billing.lastName}`.trim() ||
          normalizedUser.data.name ||
          "Customer",
        customerPhone: billing.phone || normalizedUser.data.phone || "",
        customerEmail: billing.email || normalizedUser.data.email || "",
        planName: selectedPlan.name,
      });
      setShowIPay(true);
    } catch (e) {
      Alert.alert("Error", "Failed to initialize payment.");
    } finally {
      setProcessing(false);
    }
  };

  const handlePay = () => {
    if (selectedPlan.price === 0) return handleActivateFreePlan();
    if (paymentMethod === "apple_pay") return handleApplePay();
    if (paymentMethod === "google_pay") return handleGooglePay();
    handleIPay();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={s.overlay}>
        <View style={[s.sheet, { paddingBottom: insets.bottom }]}>
          {/* Header */}
          <View style={s.header}>
            <View style={s.headerLeft}>
              {step === 2 && (
                <TouchableOpacity onPress={() => setStep(1)} style={s.backBtn}>
                  <Ionicons name="arrow-back" size={20} color="#374151" />
                </TouchableOpacity>
              )}
              <Text style={s.headerTitle}>
                {step === 1 ? "Choose plan" : "Billing details"}
              </Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={s.closeBtn}>
              <Ionicons name="close" size={18} color="#374151" />
            </TouchableOpacity>
          </View>

          <StepBar step={step} accent={selectedPlan.accent} />

          {step === 1 && (
            <PlanStep
              selectedPlan={selectedPlan}
              currentPlanName={currentPlanName}
              paymentMethod={paymentMethod}
              onSelectPlan={setSelectedPlan}
              onSelectMethod={setPaymentMethod}
            />
          )}

          {step === 2 && (
            <BillingStep
              plan={selectedPlan}
              paymentMethod={paymentMethod}
              billing={billing}
              onChange={handleBillingChange}
              onPay={handlePay}
              processing={processing}
              isFreePlan={selectedPlan.price === 0}
            />
          )}

          {/* Step 1 CTA */}
          {step === 1 && (
            <View
              style={[s.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}
            >
              <TouchableOpacity
                activeOpacity={0.85}
                style={[
                  s.cta,
                  { backgroundColor: selectedPlan.accent },
                  selectedPlan.name === currentPlanName && s.ctaDisabled,
                ]}
                disabled={selectedPlan.name === currentPlanName}
                onPress={() => setStep(2)}
              >
                <Text style={s.ctaText}>Enter billing details</Text>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={20}
                  color="#fff"
                />
              </TouchableOpacity>
            </View>
          )}

          {/* iPay overlay */}
          {showIPay && paymentData && (
            <View style={s.ipayOverlay}>
              <View style={s.ipayHeader}>
                <Text style={s.ipayTitle}>iPay Secure Payment</Text>
                <TouchableOpacity
                  onPress={() => setShowIPay(false)}
                  style={{ padding: 8 }}
                >
                  <Ionicons name="close" size={22} color="#fff" />
                </TouchableOpacity>
              </View>
              <IPayPayment
                paymentData={paymentData}
                onSuccess={(_orderId: string) => {
                  setShowIPay(false);
                  Alert.alert("Success", "Payment verified!", [
                    { text: "OK", onPress: handleClose },
                  ]);
                }}
                onFailure={(msg: string) => {
                  setShowIPay(false);
                  Alert.alert("Payment Failed", msg);
                }}
              />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────
const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: "90%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 18,
    borderBottomWidth: 0.5,
    borderBottomColor: "#f3f4f6",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#1a1a1a" },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  stepRow: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  stepDot: { flex: 1, height: 4, borderRadius: 99, backgroundColor: "#e5e7eb" },
  body: { flex: 1, paddingHorizontal: 18 },
  secLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#9ca3af",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginTop: 14,
    marginBottom: 12,
  },
  planList: { gap: 10, marginBottom: 4 },
  planCard: {
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
    padding: 14,
  },
  planCardCurrent: { opacity: 0.6 },
  planCardRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#d1d5db",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#fff" },
  planCardMeta: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    flexWrap: "wrap",
  },
  planCardName: { fontSize: 15, fontWeight: "600", color: "#1a1a1a" },
  currentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 99,
    backgroundColor: "#d1fae5",
  },
  currentBadgeText: { fontSize: 11, fontWeight: "600", color: "#065f46" },
  planBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 99,
    borderWidth: 0.5,
  },
  planBadgeText: { fontSize: 11, fontWeight: "600" },
  planCardPriceWrap: { alignItems: "flex-end" },
  planCardPrice: { fontSize: 16, fontWeight: "700", color: "#1a1a1a" },
  planCardPriceSub: { fontSize: 11, color: "#9ca3af", marginTop: 1 },
  planCardChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 0.5,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 99,
    borderWidth: 0.5,
  },
  chipText: { fontSize: 12, fontWeight: "500" },
  methodRow: { flexDirection: "row", gap: 10, marginBottom: 4 },
  methodCard: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
    alignItems: "center",
    gap: 8,
  },
  methodIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0.5,
    borderColor: "#e5e7eb",
  },
  methodLabel: { fontSize: 13, fontWeight: "500", color: "#6b7280" },
  summaryBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 0.5,
    borderTopColor: "#f3f4f6",
  },
  summaryLabel: { fontSize: 14, color: "#6b7280" },
  summaryValue: { fontSize: 22, fontWeight: "700" },
  trustRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 22,
    marginTop: 14,
    marginBottom: 4,
  },
  trustItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  trustText: { fontSize: 12, color: "#9ca3af" },
  recapCard: {
    borderLeftWidth: 3,
    backgroundColor: "#f9fafb",
    padding: 13,
    marginTop: 12,
    marginBottom: 4,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
  },
  recapPlan: { fontSize: 14, fontWeight: "600", marginBottom: 3 },
  recapPrice: { fontSize: 13, color: "#6b7280" },

  // Native pay info panel
  nativePayNote: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    paddingHorizontal: 20,
    gap: 12,
    backgroundColor: "#f9fafb",
    borderRadius: 14,
    marginTop: 16,
    borderWidth: 0.5,
    borderColor: "#e5e7eb",
  },
  nativePayTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  nativePayDesc: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 20,
  },
  nativePaySub: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 4,
  },

  label: { fontSize: 13, fontWeight: "500", color: "#374151", marginBottom: 6 },
  input: {
    backgroundColor: "#f9fafb",
    borderWidth: 0.5,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#1a1a1a",
    marginBottom: 12,
  },
  row: { flexDirection: "row", justifyContent: "space-between" },
  half: { width: "48%" },
  footer: {
    paddingHorizontal: 18,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: "#f3f4f6",
  },
  cta: {
    borderRadius: 12,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  ctaText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  ctaDisabled: { opacity: 0.45 },
  ipayOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#fff",
    zIndex: 100,
    paddingTop: Platform.OS === "ios" ? 50 : 0,
  },
  ipayHeader: {
    height: 56,
    backgroundColor: "#1E6FD9",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
  },
  ipayTitle: { color: "#fff", fontSize: 17, fontWeight: "700" },
});
