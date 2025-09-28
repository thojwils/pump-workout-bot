const { describe, beforeEach, afterEach, test, expect } = require('@jest/globals');
const pumpCommand = require('../../commands/pump');
const db = require('../../db/postgres');

// Mock the database module
jest.mock('../../db/postgres', () => ({
  connect: jest.fn().mockResolvedValue(),
  end: jest.fn().mockResolvedValue(),
  query: jest.fn(),
  insertWorkout: jest.fn().mockResolvedValue({}),
  getUserWorkouts: jest.fn().mockResolvedValue([]),
  getOrCreateGameStats: jest.fn(),
  updateGameStats: jest.fn(),
  getLeaderboard: jest.fn(),
}));

// Properly mock discord.js
const mockEmbedBuilder = {
  setTitle: jest.fn().mockReturnThis(),
  setColor: jest.fn().mockReturnThis(),
  setDescription: jest.fn().mockReturnThis(),
};
jest.mock('discord.js', () => ({
  SlashCommandBuilder: jest.fn().mockImplementation(() => ({
    setName: jest.fn().mockReturnThis(),
    setDescription: jest.fn().mockReturnThis(),
    addStringOption: jest.fn().mockReturnThis(),
  })),
  EmbedBuilder: jest.fn().mockImplementation(() => mockEmbedBuilder),
}));

describe('Pump Command Tests', () => {
  let interaction;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-15T12:00:00.000Z'));

    interaction = {
      deferReply: jest.fn().mockResolvedValue({}),
      editReply: jest.fn().mockResolvedValue({}),
      options: { getString: jest.fn().mockReturnValue('full_body') },
      user: { id: '123456789', username: 'TestUser' },
    };

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('execute method', () => {
    test('should start a streak of 1 for a new workout', async () => {
      db.getUserWorkouts.mockResolvedValue([]);

      await pumpCommand.execute(interaction);

      expect(db.insertWorkout).toHaveBeenCalled();
      expect(mockEmbedBuilder.setDescription).toHaveBeenCalledWith(expect.stringContaining('Your current workout streak is 1 day. 🔥'));
    });

    test('should continue a streak of 3 days', async () => {
      const mockWorkouts = [
        { date: '2025-01-14T12:00:00.000Z' }, // Yesterday
        { date: '2025-01-13T12:00:00.000Z' }, // 2 days ago
      ];
      db.getUserWorkouts.mockResolvedValue(mockWorkouts);

      await pumpCommand.execute(interaction);

      expect(mockEmbedBuilder.setDescription).toHaveBeenCalledWith(expect.stringContaining('Your current workout streak is 3 days. 🔥🔥🔥'));
    });

    test('should break a streak and start a new one', async () => {
      const mockWorkouts = [
        { date: '2025-01-13T12:00:00.000Z' }, // 2 days ago (gap)
        { date: '2025-01-12T12:00:00.000Z' },
      ];
      db.getUserWorkouts.mockResolvedValue(mockWorkouts);

      await pumpCommand.execute(interaction);

      expect(mockEmbedBuilder.setDescription).toHaveBeenCalledWith(expect.stringContaining('Your current workout streak is 1 day. 🔥'));
    });

    test('should handle a workout on the same day without increasing streak', async () => {
      const mockWorkouts = [
        { date: '2025-01-15T10:00:00.000Z' }, // Earlier today
        { date: '2025-01-14T12:00:00.000Z' }, // Yesterday
      ];
      db.getUserWorkouts.mockResolvedValue(mockWorkouts);

      await pumpCommand.execute(interaction);

      expect(mockEmbedBuilder.setDescription).toHaveBeenCalledWith(expect.stringContaining('Your current workout streak is 2 days. 🔥🔥'));
    });

    test('should handle errors gracefully', async () => {
      db.getUserWorkouts.mockRejectedValue(new Error('Database error'));
      console.error = jest.fn();

      await pumpCommand.execute(interaction);

      expect(console.error).toHaveBeenCalled();
      expect(interaction.editReply).toHaveBeenCalledWith({
        content: 'An error occurred while executing the command.',
        ephemeral: true,
      });
    });
  });
});
