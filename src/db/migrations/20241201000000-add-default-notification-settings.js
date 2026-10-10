"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Get default notification settings
    const defaultSettings = {
      location_reached: "creator_and_admins",
      location_left: "creator_and_admins",
      invite: "creator_and_admins",
      membership_accepted: "creator_and_admins",
      membership_rejected: "creator_and_admins",
      member_removed: "creator_and_admins",
      role_updated: "creator_and_admins",
      nickname_updated: "creator_and_admins",
      location_added: "creator_and_admins",
      location_removed: "creator_and_admins",
      location_assigned: "creator_and_admins",
      location_unassigned: "creator_and_admins",
      crash_detected: "creator_and_admins",
      sos_alert: "creator_and_admins",
      low_battery: "creator_and_admins",
    };

    // Update all circles that don't have notification settings
    const [results] = await queryInterface.sequelize.query(
      `
      UPDATE circles
      SET notification_settings = :defaultSettings::jsonb
      WHERE notification_settings IS NULL
         OR notification_settings = 'null'::jsonb
         OR notification_settings = '{}'::jsonb;
    `,
      {
        replacements: { defaultSettings: JSON.stringify(defaultSettings) },
      }
    );
  },

  async down(queryInterface, Sequelize) {
    // Revert: set notification_settings to NULL for circles that have default settings
    // This is a best-effort revert - we can't perfectly distinguish default vs custom settings
    await queryInterface.sequelize.query(`
      UPDATE circles
      SET notification_settings = NULL
      WHERE notification_settings IS NOT NULL;
    `);
  },
};
