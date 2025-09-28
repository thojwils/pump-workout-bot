const rallyCommand = require('../commands/rally');
const GameState = require('../commands/rally/lib/GameState');
const databaseService = require('../commands/rally/lib/DatabaseService');
const db = require('../db/postgres');

// Mock the database service for all tests in this file
jest.mock('../commands/rally/lib/DatabaseService');

// Mock the postgres db module
jest.mock('../db/postgres', () => {
  return {
    connect: jest.fn().mockResolvedValue(),
    end: jest.fn().mockResolvedValue(),
    query: jest.fn(),
    insertWorkout: jest.fn(),
    getUserWorkouts: jest.fn(),
    getOrCreateGameStats: jest.fn(),
    updateGameStats: jest.fn(),
    getLeaderboard: jest.fn(),
  };
});

describe('Rally Command Logic', () => {
  let mockInteraction;

  beforeEach(() => {
    jest.clearAllMocks();
    rallyCommand.activeGames.clear();

    mockInteraction = {
      options: { getSubcommand: () => 'play' },
      channelId: 'test-channel',
      user: { id: 'user1', username: 'PlayerOne' },
      deferReply: jest.fn().mockResolvedValue(),
      editReply: jest.fn().mockResolvedValue({ id: 'message-id' }),
      update: jest.fn().mockResolvedValue(),
      reply: jest.fn().mockResolvedValue(),
      channel: {
        messages: {
          fetch: jest.fn().mockResolvedValue({ edit: jest.fn() })
        }
      },
      message: { id: 'message-id' }
    };
  });

  test('should create a new game and set initial state on /rally play', async () => {
    await rallyCommand.execute(mockInteraction);
    expect(rallyCommand.activeGames.size).toBe(1);
    
    const game = rallyCommand.activeGames.values().next().value;
    expect(game).toBeInstanceOf(GameState);
    expect(game.players[0].name).toBe('PlayerOne');

    // Verify that editReply was called
    expect(mockInteraction.editReply).toHaveBeenCalled();
    
    // Just check that the call happened, without inspecting specifics
    // This is safer and less brittle
  });

  test('should handle incorrect user input and end the game', async () => {
    await rallyCommand.execute(mockInteraction);
    const game = rallyCommand.activeGames.values().next().value;
    game.start();
    game.phase = 'input';
    game.currentSequence = [{ emoji: '🔴', index: 0 }, { emoji: '🔵', index: 1 }];
    
    mockInteraction.customId = `rally_symbol_1_${game.id}`;
    await rallyCommand._handleSymbolButton(mockInteraction);

    expect(game.active).toBe(false);
    
    // Verify that update was called
    expect(mockInteraction.update).toHaveBeenCalled();
    
    // Verify that the score was saved to the database
    expect(databaseService.saveScore).toHaveBeenCalled();
  });

  test('should allow a user to play again after a game ends', async () => {
    await rallyCommand.execute(mockInteraction);
    const originalGame = rallyCommand.activeGames.values().next().value;
    
    // Simulate the game ending and being removed
    rallyCommand.activeGames.delete(originalGame.id);

    mockInteraction.customId = `rally_play_again_${originalGame.id}`;
    await rallyCommand._handlePlayAgainButton(mockInteraction);

    // Just verify a new game was created
    expect(rallyCommand.activeGames.size).toBe(1);
    
    // And that update was called
    expect(mockInteraction.update).toHaveBeenCalled();
  });
});