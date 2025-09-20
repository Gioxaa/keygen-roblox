import { SlashCommandBuilder } from 'discord.js';

import type { Command } from '../types.js';

export const revokeCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('revoke')
    .setDescription('Revoke a license by JTI')
    .addStringOption((option) =>
      option
        .setName('jti')
        .setDescription('License token identifier')
        .setRequired(true)
        .setMaxLength(256),
    ),
  execute: async (interaction, { issuerClient }) => {
    await interaction.deferReply({ ephemeral: true });

    const jti = interaction.options.getString('jti', true);

    try {
      await issuerClient.revokeLicense(jti);
      await interaction.editReply(`Revoked license ${jti}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to revoke license';
      await interaction.editReply(`Error: ${message}`);
    }
  },
};
