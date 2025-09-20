import { SlashCommandBuilder } from 'discord.js';

import type { Command } from '../types.js';

const truncate = (value: string | null, length = 24) => {
  if (!value) {
    return 'n/a';
  }
  return value.length > length ? `${value.slice(0, length - 3)}...` : value;
};

export const listCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('list')
    .setDescription('List recently issued licenses')
    .addIntegerOption((option) =>
      option
        .setName('count')
        .setDescription('Number of rows to return (default 10)')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(50),
    ),
  execute: async (interaction, { issuerClient }) => {
    await interaction.deferReply({ ephemeral: true });

    const count = interaction.options.getInteger('count') ?? 10;

    try {
      const licenses = await issuerClient.listLicenses(count);
      if (!licenses.length) {
        await interaction.editReply('No licenses found.');
        return;
      }

      const lines = licenses.map((license) => {
        const status = license.revoked ? '[REVOKED]' : '[ACTIVE]';
        const expiresAt = new Date(license.exp * 1000).toISOString();
        return `${status} ${license.jti} | HWID: ${truncate(license.hwid)} | Plan: ${
          license.plan ?? 'n/a'
        } | Expires: ${expiresAt}`;
      });

      await interaction.editReply(lines.join('\n'));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to list licenses';
      await interaction.editReply(`Error: ${message}`);
    }
  },
};
