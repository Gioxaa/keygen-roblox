import { SlashCommandBuilder } from 'discord.js';

import type { Command } from '../types.js';

export const statusCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('Check license revocation status')
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
      const result = await issuerClient.getStatus(jti);
      const status = result.revoked ? 'REVOKED' : 'ACTIVE';
      await interaction.editReply(`Status for ${jti}: **${status}**`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch license status';
      await interaction.editReply(`Error: ${message}`);
    }
  },
};
