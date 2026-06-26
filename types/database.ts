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

export type DbPropertyType =
  | "text"
  | "number"
  | "select"
  | "multi_select"
  | "person"
  | "files"
  | "checkbox"
  | "date"
  | "url"
  | "relation"
  | "created_time"
  | "edited_time";

export type WorkspaceMemberInfo = {
  user_id: string;
  email: string | null;
  role: string;
};

export type DbFile = { name: string; url: string };

export type DbProperty = {
  id: string;
  page_id: string;
  name: string;
  type: DbPropertyType;
  config: { options?: string[]; relationDbId?: string } & Record<string, Json>;
  position: number;
  created_at: string;
};

export type DbValue = {
  page_id: string;
  property_id: string;
  value: Json | null;
};

export type DbView = {
  id: string;
  page_id: string;
  type: "table" | "board" | "gallery" | "list" | "calendar";
  name: string;
  config: Record<string, Json>;
  position: number;
  created_at: string;
};

export type YjsDocument = {
  page_id: string;
  state: string | null;
  updated_at: string;
};

export type PublicLink = {
  page_id: string;
  slug: string;
  enabled: boolean;
  created_at: string;
};

export type Comment = {
  id: string;
  page_id: string;
  author_id: string;
  author_email: string | null;
  body: string;
  resolved: boolean;
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
      db_properties: {
        Row: DbProperty;
        Insert: Partial<DbProperty> & { page_id: string };
        Update: Partial<DbProperty>;
        Relationships: [];
      };
      db_values: {
        Row: DbValue;
        Insert: Partial<DbValue> & { page_id: string; property_id: string };
        Update: Partial<DbValue>;
        Relationships: [];
      };
      db_views: {
        Row: DbView;
        Insert: Partial<DbView> & { page_id: string };
        Update: Partial<DbView>;
        Relationships: [];
      };
      yjs_documents: {
        Row: YjsDocument;
        Insert: Partial<YjsDocument> & { page_id: string };
        Update: Partial<YjsDocument>;
        Relationships: [];
      };
      public_links: {
        Row: PublicLink;
        Insert: Partial<PublicLink> & { page_id: string; slug: string };
        Update: Partial<PublicLink>;
        Relationships: [];
      };
      comments: {
        Row: Comment;
        Insert: Partial<Comment> & {
          page_id: string;
          author_id: string;
          body: string;
        };
        Update: Partial<Comment>;
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
      get_public_page: {
        Args: { p_slug: string };
        Returns: Page[];
      };
      find_user_id_by_email: {
        Args: { p_email: string };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
