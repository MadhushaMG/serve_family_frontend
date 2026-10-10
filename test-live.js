// add-speed.js
const { db } = require('./dist/db'); // Compiled වුණු DB ෆයිල් එක ලෝඩ් කරනවා

async function addTestData() {
    try {
        console.log("⏳ Inserting fake tracking data...");

        await db.TrackerData.create({
            deviceId: "0357445101308761", // 'Student Binuka' ගේ Device ID එක
            latitude: 6.0588,             // පොඩ්ඩක් වෙනස් කරපු ලොකේෂන් එකක්
            longitude: 80.2099,
            speed: 85.5,                  // 👈 මෙන්න අපි දෙන Fake Speed එක
            accStatus: "ON",
            powerStatus: "ON",
            batteryVoltage: "6/6",
            createdAt: new Date(),
            updatedAt: new Date()
        });

        console.log("✅ Fake data inserted successfully! Speed set to 85.5 km/h.");
        process.exit(0);
    } catch (error) {
        console.error("❌ Error inserting data:", error);
        process.exit(1);
    }
}

addTestData();
