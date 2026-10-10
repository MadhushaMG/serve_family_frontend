// src/test-sms.ts
import { sendOTPSMS } from "./services/smsService";

async function test() {
    console.log("Testing SMS...");
    
    await sendOTPSMS("0702379561", "123456"); 
}

test();
