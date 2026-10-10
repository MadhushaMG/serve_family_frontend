"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDefinition = await queryInterface.describeTable("circles");
    if (!tableDefinition.notification_settings) {
      await queryInterface.addColumn("circles", "notification_settings", {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: null,
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const tableDefinition = await queryInterface.describeTable("circles");
    if (tableDefinition.notification_settings) {
      await queryInterface.removeColumn("circles", "notification_settings");
    }
  },
};
