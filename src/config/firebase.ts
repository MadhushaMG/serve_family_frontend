import * as admin from "firebase-admin";
import path from "path";

const serviceAccountPath = path.join(process.cwd(), "serviceAccountKey.json");

if (admin.apps.length === 0) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(require(serviceAccountPath)),
    });
    console.log("✅ Firebase Admin Initialized");
  } catch (error) {
    console.error("❌ Firebase Init Error:", error);
  }
}

export const messaging = admin.messaging();
export default admin;
