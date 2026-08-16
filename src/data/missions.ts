import type { MissionDef } from "../types";

// Mission definitions (data driven). Progress is derived from lifetime
// statistics; claiming grants the reward once.
export const MISSIONS: MissionDef[] = [
  { id: "kill_100", title: "Slayer", description: "Defeat 100 enemies", goal: 100, stat: "totalKills", reward: { coins: 150 } },
  { id: "survive_3", title: "Survivor", description: "Survive 3 minutes in a run", goal: 180, stat: "bestTime", reward: { coins: 100 } },
  { id: "chests_2", title: "Treasure Hunter", description: "Open 2 chests", goal: 2, stat: "totalChests", reward: { gems: 10 } },
  { id: "boss_1", title: "Boss Slayer", description: "Defeat 1 boss", goal: 1, stat: "totalBosses", reward: { gems: 20 } },
  { id: "coins_500", title: "Rich", description: "Collect 500 coins", goal: 500, stat: "totalCoins", reward: { coins: 300 } },
  { id: "play_10", title: "Explorer", description: "Complete 10 runs", goal: 10, stat: "totalRuns", reward: { gems: 15 } },
  { id: "chests_5", title: "Chest Collector", description: "Open 5 chests", goal: 5, stat: "totalChests", reward: { gems: 25 } },
  { id: "boss_3", title: "Golem Hunter", description: "Defeat 3 bosses", goal: 3, stat: "totalBosses", reward: { coins: 500 } },
  { id: "survive_5", title: "Survivor V", description: "Survive a full 5-minute run", goal: 300, stat: "bestTime", reward: { coins: 400 } },
];
