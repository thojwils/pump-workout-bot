const { SlashCommandBuilder } = require('discord.js');
const GameState = require('../../commands/rally/lib/GameState');
const DatabaseService = require('../../commands/rally/lib/DatabaseService');
const rallyCommand = require('../../commands/rally');

// Correctly mock the database service
jest.mock('../../commands/rally/lib/DatabaseService');

describe('Reaction Rally Game State (Unit)', () => {
  test('should initialize correctly', () => {
    const game = new GameState('test-id', 'channel-123');
    game.setPlayer('user-1', 'TestUser');

    expect(game.active).toBe(false);
    expect(game.level).toBe(0);
    expect(game.score).toBe(0);
    expect(game.player.name).toBe('TestUser');
  });
});

describe('Reaction Rally Command (Unit)', () => {
  test('should have correct data structure', () => {
    expect(rallyCommand.data).toBeInstanceOf(SlashCommandBuilder);
    expect(rallyCommand.data.name).toBe('rally');
  });

  test('should execute leaderboard subcommand', async () => {
    const mockInteraction = { 
      isChatInputCommand: () => true, 
      options: { getSubcommand: () => 'leaderboard' }, 
      deferReply: jest.fn(), 
      editReply: jest.fn() 
    };
    // Mock the service to return an empty array for the leaderboard
    DatabaseService.getLeaderboard.mockResolvedValue([]);
    
    await rallyCommand.execute(mockInteraction);
    
    expect(mockInteraction.editReply).toHaveBeenCalled();
  });
});