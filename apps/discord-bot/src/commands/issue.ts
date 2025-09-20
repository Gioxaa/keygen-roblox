import { SlashCommandBuilder } from 'discord.js';

import type { Command } from '../types.js';

export const issueCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('issue')
    .setDescription('Issue a HWID-bound license token')
    .addStringOption((option) =>
      option
        .setName('hwid')
        .setDescription('Unique hardware identifier')
        .setRequired(true)
        .setMaxLength(256),
    )
    .addIntegerOption((option) =>
      option
        .setName('ttl')
        .setDescription('Lifetime in seconds (60 - 5184000)')
        .setRequired(true)
        .setMinValue(60)
        .setMaxValue(5_184_000),
    )
    .addStringOption((option) =>
      option
        .setName('plan')
        .setDescription('Plan tier')
        .setRequired(false)
        .addChoices(
          { name: 'basic', value: 'basic' },
          { name: 'pro', value: 'pro' },
        ),
    )
    .addStringOption((option) =>
      option
        .setName('note')
        .setDescription('Internal note (not embedded in token)')
        .setRequired(false)
        .setMaxLength(512),
    ),
  execute: async (interaction, { issuerClient }) => {
    await interaction.deferReply({ ephemeral: true });

    const hwid = interaction.options.getString('hwid', true);
    const ttlSeconds = interaction.options.getInteger('ttl', true);
    const plan = interaction.options.getString('plan');
    const note = interaction.options.getString('note');

    try {
      const result = await issuerClient.issueLicense({
        hwid,
        ttlSeconds,
        plan,
        note,
      });

      const expiresAt = `<t:${result.exp}:F> (<t:${result.exp}:R>)`;
      const responseLines = [
        'License issued',
        `- HWID: ${hwid}`,
        `- Plan: ${plan ?? 'n/a'}`,
        `- Expires: ${expiresAt}`,
        `- JTI: ${result.jti}`,
        '',
        'Token:',
        '```',
        result.token,
        '```',
      ];

      await interaction.editReply(responseLines.join('\n'));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to issue license';
      await interaction.editReply(`Error: ${message}`);
    }
  },
};
