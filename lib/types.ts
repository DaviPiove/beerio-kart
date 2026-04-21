import type { TournamentFormat } from "./bracket";

export type Tournament = {
  id: string;
  name: string;
  status: "lobby" | "active" | "finished";
  format: TournamentFormat;
  current_round: number;
  winner_id: string | null;
  created_at: string;
};

export type Player = {
  id: string;
  tournament_id: string;
  name: string;
  eliminated: boolean;
  eliminated_round: number | null;
  lives: number;
  created_at: string;
};

export type Heat = {
  id: string;
  tournament_id: string;
  round: number;
  heat_number: number;
  status: "pending" | "done";
  created_at: string;
};

export type HeatPlayer = {
  heat_id: string;
  player_id: string;
  finish_position: number | null;
  is_bye: boolean;
};
