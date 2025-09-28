const DEFAULT_SYMBOLS = [
  { emoji: '🔴', color: 'red' },
  { emoji: '🔵', color: 'blue' },
  { emoji: '🟢', color: 'green' },
  { emoji: '🟡', color: 'yellow' }
];

class GameState {
  constructor(id, channelId) {
    this.id = id;
    this.channelId = channelId;
    this.active = false;
    this.startTime = 0;
    this.endTime = 0;
    this.players = [];
    this.messageId = null;
    this.level = 0;
    this.score = 0;
    this.phase = 'initial';
    this.currentSequence = [];
    this.inputSequence = [];
    this.currentUserInput = [];
    this.displayIndex = 0;
    this.inputStartTime = 0;
    this.lastRoundTimes = [];
    this.lastRoundSuccess = false;
    this.lastRoundPerfect = false;
    this.lastRoundAvgTime = 0;
    this.stats = {};
    this.symbols = [...DEFAULT_SYMBOLS];
    this.perfectRounds = 0;
  }

  setPlayer(userId, username) {
    if (this.players.length > 0) { return false; }
    this.players.push({ id: userId, name: username, score: 0, reactionTimes: [] });
    return true;
  }

  getPlayerById(playerId) {
    return this.players.find(p => p.id === playerId) || null;
  }

  get player() {
    return this.players.length > 0 ? this.players[0] : null;
  }

  start() {
    if (this.players.length === 0) { return false; }
    this.active = true;
    this.startTime = Date.now();
    this.level = 0;
    this.score = 0;
    this.phase = 'initial';
    this.perfectRounds = 0;
    return true;
  }

  _generateSequence() {
    this.currentSequence = [];
    for (let i = 0; i < this.level; i++) {
      const randomIndex = Math.floor(Math.random() * this.symbols.length);
      this.currentSequence.push({ emoji: this.symbols[randomIndex].emoji, index: randomIndex });
    }
  }

  startNextRound() {
    this.level++;
    this._generateSequence();
    this.inputSequence = [];
    this.lastRoundTimes = [];
    this.phase = 'display';
    this.currentUserInput = [];
  }

  processInput(symbolIndex, playerId) {
    const player = this.getPlayerById(playerId);
    if (!player || !this.active || this.phase !== 'input') {
      return { valid: false, message: 'Invalid input or game state' };
    }
    const currentInputIndex = this.inputSequence.length;
    const expectedSymbol = this.currentSequence[currentInputIndex];
    const now = Date.now();
    const reactionTime = now - this.inputStartTime;
    this.lastRoundTimes.push(reactionTime);
    this.currentUserInput.push(this.symbols[symbolIndex].emoji);
    if (symbolIndex === expectedSymbol.index) {
      this.inputSequence.push({ index: symbolIndex, time: reactionTime });
      if (this.inputSequence.length === this.currentSequence.length) {
        return this._completeRound(player);
      }
      return { valid: true, correct: true, completed: false, mistake: false };
    } else {
      return this._handleMistake(player);
    }
  }

  _completeRound(player) {
    const totalTime = this.lastRoundTimes.reduce((sum, time) => sum + time, 0);
    this.lastRoundAvgTime = totalTime / this.lastRoundTimes.length;
    const isPerfect = this.lastRoundTimes.every(time => time < 1200);
    this.lastRoundPerfect = isPerfect;
    if (isPerfect) { this.perfectRounds++; }
    const baseScore = this.currentSequence.length * 50;
    const speedMultiplier = Math.max(0.5, Math.min(2, 2000 / (this.lastRoundAvgTime + 500)));
    const roundScore = Math.round(baseScore * speedMultiplier);
    const perfectBonus = isPerfect ? 50 : 0;
    this.score += (roundScore + perfectBonus);
    player.score = this.score;
    player.reactionTimes.push(...this.lastRoundTimes);
    this.lastRoundSuccess = true;
    this.phase = 'result';
    return { valid: true, correct: true, completed: true, mistake: false, score: roundScore, totalScore: this.score, perfect: isPerfect, perfectBonus: perfectBonus, avgTime: this.lastRoundAvgTime };
  }

  _handleMistake(player) {
    this.lastRoundSuccess = false;
    this.phase = 'result';
    return { valid: true, correct: false, completed: false, mistake: true, score: this.score };
  }

  end() {
    if (!this.active) { return; }
    this.active = false;
    this.endTime = Date.now();
    this._calculateStats();
  }

  _calculateStats() {
    const player = this.player;
    if (!player) { this.stats = {}; return; }
    let avgReactionTime = 0;
    if (player.reactionTimes.length > 0) {
      const totalTime = player.reactionTimes.reduce((sum, time) => sum + time, 0);
      avgReactionTime = totalTime / player.reactionTimes.length;
    }
    this.stats = { score: this.score, level: this.level, perfectRounds: this.perfectRounds, avgReactionTime: avgReactionTime, totalPlayed: 1, playTime: this.endTime - this.startTime };
  }
}

module.exports = GameState;
