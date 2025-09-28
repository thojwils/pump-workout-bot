const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const GameState = require('./rally/lib/GameState');
const DatabaseService = require('./rally/lib/DatabaseService');

const activeGames = new Map();

function generateGameId() {
  return Math.random().toString(36).substring(2, 9);
}

function createGameEmbed(game, showSequence = false) {
  const embed = new EmbedBuilder().setTitle('⚡ Reaction Rally').setColor('#3498db');
  if (!game.active && game.startTime === 0) {
    embed.setDescription('Test your memory and reflexes! Remember the sequence of symbols and react as quickly as possible.\n\nHow to play:\n• Watch the sequence of symbols\n• When the sequence ends, click the buttons in the correct order\n• Each round adds one more symbol\n• React as quickly as possible for higher scores!');
  } else if (!game.active && game.startTime > 0) {
    const stats = game.stats || {};
    embed.setDescription(`Game Over!\n\nFinal Score: **${stats.score || 0}**\n\nStats:\n• Highest Level: ${stats.level || 0}\n• Perfect Rounds: ${stats.perfectRounds || 0}\n• Average Reaction Time: ${Math.round(stats.avgReactionTime || 0)}ms`);
  } else if (game.phase === 'display') {
    embed.setDescription(`Round ${game.level}\n\nWatch carefully! Memorize the sequence...\nPattern length: **${game.currentSequence.length}**`);
    if (showSequence && game.currentSequence.length > 0) {
      const currentItem = game.currentSequence[game.displayIndex];
      embed.addFields({ name: 'Current Symbol', value: currentItem.emoji });
    }
  } else if (game.phase === 'input') {
    embed.setDescription(`Round ${game.level}\n\nNow repeat the sequence by clicking the buttons in order!\nEntered: ${game.inputSequence.length}/${game.currentSequence.length}\nYour Input: ${game.currentUserInput.join(' ') || 'None'}`);
  } else if (game.phase === 'result') {
    if (game.lastRoundSuccess) {
      embed.setDescription(`Round ${game.level - 1} Completed! ✅\n\nPerfect timing: ${game.lastRoundPerfect ? 'Yes! +50 bonus points' : 'Not quite'}\nAverage reaction time: ${Math.round(game.lastRoundAvgTime)}ms\nCurrent Score: ${game.score}`);
    } else {
      embed.setDescription(`Round ${game.level} Failed! ❌\n\nCorrect sequence was:\n${game.currentSequence.map(s => s.emoji).join(' ')}\n\nFinal Score: ${game.score}`);
    }
  }
  return embed;
}

function createButtons(game, phase) {
  const rows = [];
  if (!game.active && game.startTime === 0) {
    const startButton = new ButtonBuilder().setCustomId(`rally_start_${game.id}`).setLabel('Start Game').setStyle(ButtonStyle.Success);
    rows.push(new ActionRowBuilder().addComponents(startButton));
  } else if (!game.active && game.startTime > 0) {
    const playAgainButton = new ButtonBuilder().setCustomId(`rally_playagain_${game.id}`).setLabel('Play Again').setStyle(ButtonStyle.Primary);
    rows.push(new ActionRowBuilder().addComponents(playAgainButton));
  } else if (phase === 'display') {
    const symbols = [{ emoji: '🔴', color: ButtonStyle.Danger }, { emoji: '🔵', color: ButtonStyle.Primary }, { emoji: '🟢', color: ButtonStyle.Success }, { emoji: '🟡', color: ButtonStyle.Secondary }];
    const buttonRow = new ActionRowBuilder();
    symbols.forEach((symbol, index) => {
      const button = new ButtonBuilder().setCustomId(`rally_placeholder_${index}_${game.id}`).setEmoji(symbol.emoji).setStyle(symbol.color).setDisabled(true);
      buttonRow.addComponents(button);
    });
    rows.push(buttonRow);
  } else if (phase === 'input') {
    const symbols = [{ emoji: '🔴', color: ButtonStyle.Danger }, { emoji: '🔵', color: ButtonStyle.Primary }, { emoji: '🟢', color: ButtonStyle.Success }, { emoji: '🟡', color: ButtonStyle.Secondary }];
    const buttonRow = new ActionRowBuilder();
    symbols.forEach((symbol, index) => {
      const button = new ButtonBuilder().setCustomId(`rally_symbol_${index}_${game.id}`).setEmoji(symbol.emoji).setStyle(symbol.color);
      buttonRow.addComponents(button);
    });
    rows.push(buttonRow);
  } else if (phase === 'result') {
    const continueButton = new ButtonBuilder().setCustomId(`rally_continue_${game.id}`).setLabel('Continue').setStyle(ButtonStyle.Primary);
    rows.push(new ActionRowBuilder().addComponents(continueButton));
  }
  return rows;
}

async function startGameLoop(game, interaction) {
  game.startNextRound();
  await displaySequence(game, interaction);
}

async function displaySequence(game, interaction) {
  const channel = interaction.channel || interaction;
  game.phase = 'display';
  game.displayIndex = 0;
  const embed = createGameEmbed(game);
  let message;
  if (game.messageId) {
    try { message = await channel.messages.fetch(game.messageId); } catch (error) { console.error('Error fetching game message:', error); }
  }
  if (!message) {
    message = await channel.send({ embeds: [embed], components: createButtons(game, 'display') });
    game.messageId = message.id;
  } else {
    await message.edit({ embeds: [embed], components: createButtons(game, 'display') });
  }
  const displaySymbol = async (index) => {
    if (index >= game.currentSequence.length) {
      game.phase = 'input';
      game.inputSequence = [];
      game.inputStartTime = Date.now();
      const inputEmbed = createGameEmbed(game);
      await message.edit({ embeds: [inputEmbed], components: createButtons(game, 'input') });
      return;
    }
    game.displayIndex = index;
    const sequenceEmbed = createGameEmbed(game, true);
    await message.edit({ embeds: [sequenceEmbed], components: createButtons(game, 'display') });
    setTimeout(() => { displaySymbol(index + 1); }, 1000);
  };
  displaySymbol(0);
}

const command = {
  data: new SlashCommandBuilder().setName('rally').setDescription('Play Reaction Rally - a memory and reflex game')
    .addSubcommand(subcommand => subcommand.setName('play').setDescription('Start a new game of Reaction Rally'))
    .addSubcommand(subcommand => subcommand.setName('leaderboard').setDescription('View the Reaction Rally leaderboard')),
  async execute(interaction) {
    try {
      await interaction.deferReply();
      const subcommand = interaction.options.getSubcommand();
      if (subcommand === 'play') {
        const existingGame = Array.from(activeGames.values()).find(game => game.channelId === interaction.channelId && game.active);
        if (existingGame) { await interaction.editReply('There is already an active Reaction Rally game in this channel.'); return; }
        const gameId = generateGameId();
        const game = new GameState(gameId, interaction.channelId);
        game.setPlayer(interaction.user.id, interaction.user.username);
        activeGames.set(gameId, game);
        const embed = createGameEmbed(game);
        const components = createButtons(game, 'initial');
        const message = await interaction.editReply({ embeds: [embed], components: components });
        game.messageId = message.id;
      } else if (subcommand === 'leaderboard') {
        try {
          const leaderboard = await DatabaseService.getLeaderboard();
          if (leaderboard.length === 0) { await interaction.editReply('No Reaction Rally games have been played yet.'); return; }
          const embed = new EmbedBuilder().setTitle('⚡ Reaction Rally - Leaderboard').setColor('#3498db');
          let description = '';
          leaderboard.forEach((entry, index) => {
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
            description += `${medal} **${entry.username}** - ${entry.highest_score} points (Level ${entry.highest_level})\n`;
          });
          embed.setDescription(description);
          await interaction.editReply({ embeds: [embed] });
        } catch (error) {
          console.error('Error fetching leaderboard:', error);
          await interaction.editReply('There was an error fetching the leaderboard.');
        }
      }
    } catch (error) {
      console.error('Error executing rally command:', error);
      if (!interaction.replied) { await interaction.editReply('There was an error starting the game. Please try again later.'); }
    }
  },
  async handleButton(interaction) {
    try {
      const customId = interaction.customId;
      if (customId.startsWith('rally_start_')) { await this._handleStartButton(interaction); }
      else if (customId.startsWith('rally_playagain_')) { await this._handlePlayAgainButton(interaction); }
      else if (customId.startsWith('rally_symbol_')) { await this._handleSymbolButton(interaction); }
      else if (customId.startsWith('rally_continue_')) { await this._handleContinueButton(interaction); }
    } catch (error) {
      console.error('Error in rally button handler:', error);
      try {
        if (!interaction.replied && !interaction.deferred) { await interaction.reply({ content: 'There was an error processing your input. Please try again.', ephemeral: true }); }
      } catch (replyError) { console.error('Error sending error message:', replyError); }
    }
  },
  async _handleStartButton(interaction) {
    const gameId = interaction.customId.split('_')[2];
    const game = activeGames.get(gameId);
    if (!game) { await interaction.reply({ content: 'This game no longer exists.', ephemeral: true }); return; }
    game.start();
    await interaction.update({ content: 'Game started! Watch the sequence carefully and repeat it.', components: [] });
    startGameLoop(game, interaction.channel);
  },
  async _handlePlayAgainButton(interaction) {
    const gameId = generateGameId();
    const game = new GameState(gameId, interaction.channelId);
    game.setPlayer(interaction.user.id, interaction.user.username);
    activeGames.set(gameId, game);
    const embed = createGameEmbed(game);
    const components = createButtons(game, 'initial');
    await interaction.update({ embeds: [embed], components: components });
    game.messageId = interaction.message.id;
  },
  async _handleSymbolButton(interaction) {
    const parts = interaction.customId.split('_');
    const symbolIndex = parseInt(parts[2]);
    const gameId = parts[3];
    const game = activeGames.get(gameId);
    if (!game || !game.active || game.phase !== 'input') { await interaction.reply({ content: 'No active game found or game is not in input phase.', ephemeral: true }); return; }
    const result = game.processInput(symbolIndex, interaction.user.id);
    if (result.completed || result.mistake) {
      game.phase = 'result';
      const embed = createGameEmbed(game);
      await interaction.update({ embeds: [embed], components: createButtons(game, 'result') });
      if (result.mistake) {
        game.end();
        try { await DatabaseService.saveScore(game.player.id, game.player.name, game.score, game.level, game.stats.perfectRounds); }
        catch (error) { console.error('Error saving score to database:', error); }
      }
    } else {
      await interaction.deferUpdate();
    }
  },
  async _handleContinueButton(interaction) {
    const gameId = interaction.customId.split('_')[2];
    const game = activeGames.get(gameId);
    if (!game || !game.active) { await interaction.reply({ content: 'No active game found.', ephemeral: true }); return; }
    game.startNextRound();
    await interaction.deferUpdate();
    await displaySequence(game, interaction.channel);
  },
};

command.activeGames = activeGames;
module.exports = command;