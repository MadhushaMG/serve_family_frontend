import { env } from "../config/env";

export async function sendOTPSMS(phoneNumber: string, otp: string): Promise<boolean> {
  const message = `Your Life360 verification code is: ${otp}`;
  return sendSMS(phoneNumber, message);
}

export async function sendPasswordResetOTP(phoneNumber: string, otp: string): Promise<boolean> {
  const message = `Your Life360 password reset code is: ${otp}`;
  return sendSMS(phoneNumber, message);
}

async function sendSMS(to: string, message: string): Promise<boolean> {
  // 1. Check Config
  if (!env.SMSLENZ_API_KEY || !env.SMSLENZ_USER_ID) {
    if (env.NODE_ENV !== "production") {
      console.log(`[DEV SMS] To: ${to} | Message: ${message}`);
      return true;
    }
    return false;
  }

  // 2. Format Phone Number
  let formattedNumber = to.replace(/\s+/g, "");
  if (formattedNumber.startsWith("0")) {
    formattedNumber = "94" + formattedNumber.substring(1);
  } else if (formattedNumber.startsWith("+")) {
    formattedNumber = formattedNumber.substring(1);
  }

  const senderId = env.SMSLENZ_SENDER_ID || "SMSlenzDEMO";

  try {
    const url = "https://smslenz.lk/api/send-sms"; 
    
    const params = new URLSearchParams();
    params.append("user_id", env.SMSLENZ_USER_ID);
    params.append("api_key", env.SMSLENZ_API_KEY);
    params.append("sender_id", senderId);
    params.append("contact", formattedNumber);
    params.append("message", message);

    console.log(`📨 Sending SMS via SMSLenz (Sender: ${senderId})...`);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const responseText = await response.text();

    try {
      const data = JSON.parse(responseText);
      
      const isSuccess = 
        (data.status === "success" || data.status === "200") || 
        (data.data && data.data.status === "success") ||
        (data.message && data.message.toLowerCase().includes("successfully"));

      if (response.ok && isSuccess) {
        console.log(`✅ SMS Sent Successfully to ${formattedNumber}`);
        return true;
      } else {
        console.error("❌ SMS Failed (API Error):", data);
        return false;
      }
    } catch (e) {
      console.error("❌ SMS Failed (Invalid Response):", responseText);
      return false;
    }

  } catch (error) {
    console.error("❌ SMS Network Error:", error);
    return false;
  }
}
