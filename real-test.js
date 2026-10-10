require('dotenv').config();
// සර්වර් එකේ දැනටමත් Initialize වෙලා තියෙන Firebase එක ගමු
const { firebaseAdmin } = require('./dist/config/firebase'); 
const { db } = require('./dist/db');
const { triggerSmartNotification } = require('./dist/services/notificationLogic');

async function test() {
    console.log("🚀 Starting Real-Time Push Simulation...");
    
    const circleId = "130d1480-1f35-408a-9130-88fed62835f4"; 
    const userId = "c696e838-5182-421b-857c-29b13768b488"; 

    try {
        await triggerSmartNotification(
            circleId,
            'sos',
            userId,
            "🚨 CRITICAL SOS ALERT",
            "Real system test: SOS Banner should appear on top of your screen now!"
        );
        console.log("✅ Simulation Command Processed!");
        console.log("👉 Now check your phone and 'pm2 logs'");
    } catch (e) {
        console.error("❌ Test Execution Error:", e);
    }
}

test();
