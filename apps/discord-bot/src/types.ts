import type { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';

import type { IssuerClient } from './issuerClient.js';

export interface CommandDeps {
  issuerClient: IssuerClient;
}

export interface Command {
  data: SlashCommandBuilder;
  execute: (interaction: ChatInputCommandInteraction, deps: CommandDeps) => Promise<void>;
}
