const { db } = require('./dist/db');

async function fixRelation() {
    try {
        // "Father" කියන එකේ ID එක DB එකෙන් හොයනවා
        const fatherRel = await db.Relationship.findOne({ where: { name: 'Father' } });
        
        if(fatherRel) {
            // පියල්ගේ ID එකට ඒ Relationship එක අප්ඩේට් කරනවා
            await db.Membership.update(
                { relationshipId: fatherRel.id },
                { where: { userId: 'aa54678a-7cba-4428-bb58-0cc2135a5cd9' } } // පියල්ගේ ID එක
            );
            console.log("✅ Piyal's relationship successfully updated to 'Father'!");
        } else {
            console.log("❌ 'Father' relationship not found in DB.");
        }
        process.exit(0);
    } catch(e) {
        console.error("Error:", e);
        process.exit(1);
    }
}

fixRelation();
