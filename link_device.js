// link_device.js
const { Sequelize } = require('sequelize');
const path = require('path');

// 1. .env ෆයිල් එක හරි තැනින් ලෝඩ් කරමු (Root folder එකෙන්)
require('dotenv').config({ path: path.join(__dirname, '.env') }); 

// Check කරමු DATABASE_URL එක ආවද කියලා
if (!process.env.DATABASE_URL) {
  console.error("❌ Error: DATABASE_URL is missing! Please check if .env file exists in the root folder.");
  process.exit(1);
}

// DB Connection
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
});

async function linkDevice() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to DB.');

    // ==========================================
    // 2. මෙන්න මෙතන ඔයාගේ විස්තර දාන්න
    // ==========================================
    const userEmail = "scaflanka2@gmail.com"; // <--- User ගේ Email එක
    const deviceId = "0357445101303879";   // <--- Device IMEI එක (Log එකේ තිබ්බ එක)

    // User ව හොයාගන්නවා
    const [users] = await sequelize.query("SELECT id FROM users WHERE email = :email", {
      replacements: { email: userEmail }
    });
    
    if (users.length === 0) {
      console.log(`❌ User not found for email: ${userEmail}`);
      return;
    }
    const userId = users[0].id;

    console.log(`🔗 Linking Device ${deviceId} to User ${userId}...`);

    // Device එක Link කරනවා (user_devices table එකට)
    await sequelize.query(`
      INSERT INTO user_devices (id, user_id, device_id, name, created_at, updated_at)
      VALUES (gen_random_uuid(), :userId, :deviceId, 'My Tracker', NOW(), NOW())
      ON CONFLICT (user_id, device_id) DO NOTHING;
    `, {
      replacements: { userId, deviceId }
    });

    console.log("✅ Device Linked Successfully!");

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sequelize.close();
  }
}

linkDevice();
