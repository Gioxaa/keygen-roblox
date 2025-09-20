import 'dotenv/config';

import { Client, Events, GatewayIntentBits, REST, Routes } from 'discord.js';

import env from './env.js';
import { IssuerClient } from './issuerClient.js';
import type { Command } from './types.js';
import { issueCommand } from './commands/issue.js';
import { revokeCommand } from './commands/revoke.js';
import { statusCommand } from './commands/status.js';
import { listCommand } from './commands/list.js';

const issuerClient = new IssuerClient(
  env.ISSUER_BASE_URL,
  env.ISSUER_ADMIN_USER,
  env.ISSUER_ADMIN_PASS,
);

const commands = new Map<string, Command>([
  [issueCommand.data.name, issueCommand],
  [revokeCommand.data.name, revokeCommand],
  [statusCommand.data.name, statusCommand],
  [listCommand.data.name, listCommand],
]);

const rest = new REST({ version: '10' }).setToken(env.DISCORD_TOKEN);

const registerCommands = async () => {
  const payload = Array.from(commands.values()).map((command) => command.data.toJSON());

  if (env.DISCORD_GUILD_ID && env.DISCORD_GUILD_ID.trim().length > 0) {
    await rest.put(
      Routes.applicationGuildCommands(env.DISCORD_CLIENT_ID, env.DISCORD_GUILD_ID),
      { body: payload },
    );
    console.log(`Registered guild commands for ${env.DISCORD_GUILD_ID}`);
  } else {
    await rest.put(Routes.applicationCommands(env.DISCORD_CLIENT_ID), { body: payload });
    console.log('Registered global commands');
  }
};

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, () => {
  const tag = client.user?.tag ?? 'unknown bot';
  console.log(`Discord bot logged in as ${tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) {
    return;
  }

  const command = commands.get(interaction.commandName);
  if (!command) {
    if (!interaction.replied) {
      await interaction.reply({ content: 'Unknown command', ephemeral: true });
    }
    return;
  }

  try {
    await command.execute(interaction, { issuerClient });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(`Error: ${message}`);
    } else {
      await interaction.reply({ content: `Error: ${message}`, ephemeral: true });
    }
  }
});

const start = async () => {
  await registerCommands();
  await client.login(env.DISCORD_TOKEN);
};

start().catch((error) => {
  console.error('Failed to start Discord bot', error);
  process.exit(1);
});

const shutdown = () => {
  console.log('Shutting down Discord bot');
  client.destroy();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
