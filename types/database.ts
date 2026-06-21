// Hand-written types mirroring supabase/migrations/0001_init.sql.
// Regenerate with `supabase gen types typescript` once the CLI is wired up.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// NOTE: these are `type` aliases (not `interface`) on purpose — supabase-js's
// `Schema extends GenericSchema` check requires rows to satisfy
// `Record<string, unknown>`, which interfaces do not (no implicit index sig).

export type Workspace = {
  id: string;
  name: string;
  icon: string | null;
  owner_id: string;
  created_at: string;
};

export type Page = {
  id: string;
  workspace_id: string;
  parent_id: string | null;
  title: string;
  icon: string | null;
  cover_url: string | null;
  content: Json | null;
  is_database: boolean;
  position: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
};

export type WorkspaceMember = {
  workspace_id: string;
  user_id: string;
  role: string;
  created_at: string;
};

export type Favorite = {
  user_id: string;
  page_id: string;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string };
        Update: Partial<Profile>;
        Relationships: [];
      };
      workspaces: {
        Row: Workspace;
        Insert: Partial<Workspace> & { owner_id: string };
        Update: Partial<Workspace>;
        Relationships: [];
      };
      workspace_members: {
        Row: WorkspaceMember;
        Insert: Partial<WorkspaceMember> & {
          workspace_id: string;
          user_id: string;
        };
        Update: Partial<WorkspaceMember>;
        Relationships: [];
      };
      pages: {
        Row: Page;
        Insert: Partial<Page> & { workspace_id: string };
        Update: Partial<Page>;
        Relationships: [];
      };
      favorites: {
        Row: Favorite;
        Insert: Partial<Favorite> & { user_id: string; page_id: string };
        Update: Partial<Favorite>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_workspace_member: {
        Args: { ws: string };
        Returns: boolean;
      };
      soft_delete_page: {
        Args: { p_id: string };
        Returns: undefined;
      };
      restore_page: {
        Args: { p_id: string };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
