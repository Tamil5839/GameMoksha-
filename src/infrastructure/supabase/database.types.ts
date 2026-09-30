// Types for the schema in supabase/migrations, in the shape produced by
// `supabase gen types typescript`. Regenerate with:
//   npx supabase gen types typescript --local > src/infrastructure/supabase/database.types.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      seasons: {
        Row: {
          id: string;
          user_id: string;
          number: number;
          status: string;
          start_date: string;
          time_zone: string;
          length_days: number;
          current_square: number;
          won_on_day: number | null;
          ended_at: string | null;
          rules: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          number: number;
          status?: string;
          start_date: string;
          time_zone: string;
          length_days: number;
          current_square?: number;
          won_on_day?: number | null;
          ended_at?: string | null;
          rules: Json;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["seasons"]["Insert"]>;
        Relationships: [];
      };
      habits: {
        Row: {
          id: string;
          season_id: string;
          user_id: string;
          kind: string;
          label: string;
          slot: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          season_id: string;
          user_id: string;
          kind: string;
          label: string;
          slot: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["habits"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "habits_season_id_fkey";
            columns: ["season_id"];
            isOneToOne: false;
            referencedRelation: "seasons";
            referencedColumns: ["id"];
          },
        ];
      };
      check_ins: {
        Row: {
          id: string;
          season_id: string;
          user_id: string;
          local_date: string;
          day_number: number;
          roll: number;
          start_square: number;
          end_square: number;
          reached_moksha: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          season_id: string;
          user_id: string;
          local_date: string;
          day_number: number;
          roll: number;
          start_square: number;
          end_square: number;
          reached_moksha?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["check_ins"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "check_ins_season_id_fkey";
            columns: ["season_id"];
            isOneToOne: false;
            referencedRelation: "seasons";
            referencedColumns: ["id"];
          },
        ];
      };
      check_in_habits: {
        Row: {
          check_in_id: string;
          habit_id: string;
          user_id: string;
          kind: string;
          label: string;
          done: boolean;
          applied: boolean;
          amount: number;
          from_square: number | null;
          to_square: number | null;
        };
        Insert: {
          check_in_id: string;
          habit_id: string;
          user_id: string;
          kind: string;
          label: string;
          done: boolean;
          applied: boolean;
          amount: number;
          from_square?: number | null;
          to_square?: number | null;
        };
        Update: Partial<Database["public"]["Tables"]["check_in_habits"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "check_in_habits_check_in_id_fkey";
            columns: ["check_in_id"];
            isOneToOne: false;
            referencedRelation: "check_ins";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "check_in_habits_habit_id_fkey";
            columns: ["habit_id"];
            isOneToOne: false;
            referencedRelation: "habits";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      start_season: {
        Args: {
          p_user_id: string;
          p_start_date: string;
          p_time_zone: string;
          p_length_days: number;
          p_rules: Json;
          p_habits: Json;
        };
        Returns: string;
      };
      record_check_in: {
        Args: {
          p_user_id: string;
          p_season_id: string;
          p_local_date: string;
          p_day_number: number;
          p_roll: number;
          p_start_square: number;
          p_end_square: number;
          p_reached_moksha: boolean;
          p_habits: Json;
        };
        Returns: string;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
