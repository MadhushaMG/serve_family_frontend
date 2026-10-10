// seed-relations.js
const { db } = require('./dist/db');
const crypto = require('crypto'); // Node.js built-in module එක

async function seed() {
    try {
        const roles = ["Father", "Mother", "Son", "Daughter", "Husband", "Wife", "Brother", "Sister", "Friend", "Other"];
        
        for (let r of roles) {
            // DB එකට ඩේටා ටික දානවා (crypto.randomUUID() පාවිච්චි කරලා)
            await db.Relationship.findOrCreate({ 
                where: { name: r },
                defaults: { id: crypto.randomUUID(), name: r, createdAt: new Date(), updatedAt: new Date() }
            });
        }
        console.log("✅ Relationships Added Successfully!");
        
        // ID ටික බලාගන්න ප්‍රින්ට් කරනවා
        const all = await db.Relationship.findAll();
        console.table(all.map(a => ({ ID: a.id, Name: a.name })));
        
        process.exit(0);
    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
}

seed();
