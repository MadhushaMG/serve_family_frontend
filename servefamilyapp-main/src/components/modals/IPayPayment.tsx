import { SubscriptionService } from "../../Services/SubscriptionService";
import React, { useState, useRef } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { WebView, WebViewNavigation } from "react-native-webview";




const BASE_URL = "https://servefamily.com";
const API_KEY  =  "pH#*$;P3wAy:VG_Si]pI(HX:l^e1RmqY";

const IPAY_CHECKOUT  = "https://ipay.lk/ipg/checkout";
const DUMMY_DOMAIN   = "https://app.servefamily.local";
const RETURN_KEYWORD = "/payment/ipay-return";
const CANCEL_KEYWORD = "/payment/failed";

const POLL_INTERVAL_MS = 2000;
const POLL_MAX_ATTEMPTS = 8;

interface PaymentStatusResponse {
  status: "A" | "D" | "P" | string;
  planName?: string;
  orderId?: string;
  amount?: number;
  message?: string;
  displayOrderId?: string;
}

interface IPayProps {
  paymentData: {
    merchantWebToken: string;
    orderId: string;
    amount: string;
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    planName: string;
  };
  onFailure: (message: string) => void;
  onSuccess: (orderId: string) => void;
}


const escapeHtml = (str: string): string =>
  str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const IPayPayment: React.FC<IPayProps> = ({ paymentData, onFailure, onSuccess }) => {
  const [verifying, setVerifying] = useState(false);
  

  const handledRef = useRef(false);

  const encodedOrderId = encodeURIComponent(paymentData.orderId);
  const returnUrl = `${DUMMY_DOMAIN}${RETURN_KEYWORD}?orderId=${encodedOrderId}`;
  const cancelUrl = `${DUMMY_DOMAIN}${CANCEL_KEYWORD}?orderId=${encodedOrderId}&reason=Payment+was+cancelled.`;


  const formHtml = `
    <html>
      <body onload="document.forms[0].submit()">
        <form method="POST" action="${IPAY_CHECKOUT}">
          <input type="hidden" name="merchantWebToken" value="${escapeHtml(paymentData.merchantWebToken)}" />
          <input type="hidden" name="orderId"          value="${escapeHtml(paymentData.orderId)}" />
          <input type="hidden" name="totalAmount"      value="${escapeHtml(paymentData.amount)}" />
          <input type="hidden" name="orderDescription" value="${escapeHtml(paymentData.planName)} Plan - ServeFamily" />
          <input type="hidden" name="returnUrl"        value="${escapeHtml(returnUrl)}" />
          <input type="hidden" name="cancelUrl"        value="${escapeHtml(cancelUrl)}" />
          <input type="hidden" name="customerName"     value="${escapeHtml(paymentData.customerName)}" />
          <input type="hidden" name="customerPhone"    value="${escapeHtml(paymentData.customerPhone)}" />
          <input type="hidden" name="customerEmail"    value="${escapeHtml(paymentData.customerEmail)}" />
          <input type="hidden" name="merchantParam1"   value="${escapeHtml(paymentData.planName)}" />
          <input type="hidden" name="merchantParam2"   value="${escapeHtml(paymentData.orderId)}" />
        </form>
      </body>
    </html>
  `;

  const onNavigationChange = (navState: WebViewNavigation) => {
    const url = navState.url;

    if (url.includes(RETURN_KEYWORD)) {
      if (handledRef.current) return;
      handledRef.current = true;
      setVerifying(true); // ← blank page cover කරන්න immediately show කරනවා

      let resolvedOrderId = paymentData.orderId;
      try {
        const parsed = new URL(url);
        const fromUrl = parsed.searchParams.get("orderId");
        if (fromUrl) resolvedOrderId = decodeURIComponent(fromUrl);
      } catch { /* use prop orderId */ }

      verifyPayment(resolvedOrderId);
      return;
    }

    if (url.includes(CANCEL_KEYWORD)) {
      if (handledRef.current) return;
      handledRef.current = true;
      onFailure("Payment cancelled.");
    }
  };

  const pollStatus = async (orderId: string): Promise<PaymentStatusResponse> => {
    for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt++) {
      const response = await fetch(
        `${BASE_URL}/payment/status/${orderId}`,
        {
          headers: {
            "x-api-key": API_KEY,
          },
        }
      );

      const data: PaymentStatusResponse = await response.json();

      if (!response.ok) throw new Error("Status check failed.");

      if (data.status === "P") {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        continue;
      }

      return data;
    }

    return { status: "P", message: "Payment still processing." };
  };

  const verifyPayment = async (orderId: string) => {
    // setVerifying(true) is already called in onNavigationChange above
    try {
      const data = await pollStatus(orderId);

      if (data.status === "A") {
        const parts = orderId.split("|");
        if (parts.length === 2) {
          try {
            await SubscriptionService.subscribeToPlan(parts[1]);
          } catch (upgradeErr: any) {
            onFailure(upgradeErr?.message ?? "Plan upgrade failed. Contact support.");
            return;
          }
        }
        onSuccess(orderId);
        return;
      }

      if (data.status === "D") {
        onFailure(data.message ?? "Payment declined. Please try again.");
        return;
      }

      if (data.status === "P") {
        onFailure("Payment still processing. Please check back shortly.");
        return;
      }

      onFailure("Unexpected payment status. Please contact support.");
    } catch (err: any) {
      onFailure(err.message ?? "Something went wrong. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <WebView
        source={{ html: formHtml }}
        onNavigationStateChange={onNavigationChange}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        renderLoading={() => (
          <View style={styles.overlay}>
            <ActivityIndicator size="large" color="#1E6FD9" />
          </View>
        )}
      />
      {verifying && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#1E6FD9" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.85)",
    justifyContent: "center",
    alignItems: "center",
  },
});

export default IPayPayment;
