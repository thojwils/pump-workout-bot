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
  
  test('should start the game correctly', () => {
    const game = new GameState('test-id', 'channel-123');
    game.setPlayer('user-1', 'TestUser');
    
    const result = game.start();
    
    expect(result).toBe(true);
    expect(game.active).toBe(true);
    expect(game.level).toBe(0);
    expect(game.score).toBe(0);
    expect(game.startTime).toBeGreaterThan(0);
  });
  
  test('should generate sequence correctly for next round', () => {
    const game = new GameState('test-id', 'channel-123');
    game.setPlayer('user-1', 'TestUser');
    game.start();
    
    game.startNextRound();
    
    expect(game.level).toBe(1);
    expect(game.currentSequence.length).toBe(1);
    expect(game.phase).toBe('display');
  });
  
  test('should process correct input', () => {
    const game = new GameState('test-id', 'channel-123');
    game.setPlayer('user-1', 'TestUser');
    game.start();
    game.startNextRound();
    
    // Set up for input phase
    game.phase = 'input';
    game.currentSequence = [{ emoji: '🔴', index: 0 }];
    game.inputSequence = [];
    game.inputStartTime = Date.now();
    
    // Process input
    const result = game.processInput(0, 'user-1');
    
    expect(result.valid).toBe(true);
    expect(result.correct).toBe(true);
    expect(result.completed).toBe(true);
    expect(game.lastRoundSuccess).toBe(true);
  });
  
  test('should handle incorrect input', () => {
    const game = new GameState('test-id', 'channel-123');
    game.setPlayer('user-1', 'TestUser');
    game.start();
    game.startNextRound();
    
    // Set up for input phase
    game.phase = 'input';
    game.currentSequence = [{ emoji: '🔴', index: 0 }];
    game.inputSequence = [];
    game.inputStartTime = Date.now();
    
    // Process wrong input
    const result = game.processInput(1, 'user-1');
    
    expect(result.valid).toBe(true);
    expect(result.correct).toBe(false);
    expect(result.mistake).toBe(true);
    expect(game.lastRoundSuccess).toBe(false);
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
  
  test('should execute play subcommand', async () => {
    const mockInteraction = {
      channelId: 'test-channel',
      user: { id: 'user-1', username: 'TestUser' },
      options: { getSubcommand: () => 'play' },
      deferReply: jest.fn(),
      editReply: jest.fn().mockResolvedValue({ id: 'message-1' })
    };
    
    await rallyCommand.execute(mockInteraction);
    
    expect(mockInteraction.deferReply).toHaveBeenCalled();
    expect(mockInteraction.editReply).toHaveBeenCalled();
    
    // Verify a game was created and stored
    const games = Array.from(rallyCommand.activeGames.values());
    expect(games.length).toBeGreaterThan(0);
    const game = games.find(g => g.channelId === 'test-channel');
    expect(game).toBeDefined();
    expect(game.player.id).toBe('user-1');
  });
  
  test('should handle start button correctly', async () => {
    // Setup a test game
    const gameId = 'test-game-id';
    const game = new GameState(gameId, 'test-channel');
    game.setPlayer('user-1', 'TestUser');
    game.messageId = 'test-message-id';
    rallyCommand.activeGames.set(gameId, game);
    
    const mockInteraction = {
      customId: `rally_start_${gameId}`,
      update: jest.fn().mockResolvedValue({}),
      channel: {
        messages: {
          fetch: jest.fn().mockResolvedValue({
            id: 'test-message-id',
            edit: jest.fn().mockResolvedValue({})
          })
        },
        send: jest.fn().mockResolvedValue({
          id: 'new-message-id'
        })
      }
    };
    
    await rallyCommand._handleStartButton(mockInteraction);
    
    expect(mockInteraction.update).toHaveBeenCalled();
    expect(game.active).toBe(true);
  });
  
  test('should handle submit button correctly', async () => {
    // Setup a test game
    const gameId = 'test-game-id';
    const game = new GameState(gameId, 'test-channel');
    game.setPlayer('user-1', 'TestUser');
    game.messageId = 'test-message-id';
    game.active = true;
    game.phase = 'input';
    game.inputSequence = [0, 1];
    game.inputStartTime = Date.now();
    rallyCommand.activeGames.set(gameId, game);
    
    const mockInteraction = {
      customId: `rally_submit_${gameId}`,
      update: jest.fn().mockResolvedValue({}),
      channel: {
        messages: {
          fetch: jest.fn().mockResolvedValue({
            id: 'test-message-id',
            edit: jest.fn().mockResolvedValue({})
          })
        },
        send: jest.fn().mockResolvedValue({
          id: 'new-message-id'
        })
      }
    };
    
    await rallyCommand._handleSubmitButton(mockInteraction);
    
    expect(mockInteraction.update).toHaveBeenCalled();
    expect(game.phase).toBe('display');
    expect(game.inputSequence).toEqual([]);
    expect(game.inputStartTime).toBe(0);
    expect(game.lastRoundSuccess).toBe(true);
  });
});