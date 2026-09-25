// Supabaseのテーブル定義の型。
// 2026-09-25に、SupabaseダッシュボードのSQL Editorで実行した以下のSQLの結果を基に
// 手で書き起こした（`supabase gen types typescript` はCLIから往還録のプロジェクトへ
// アクセスできなかったため使えなかった）。
//
//   select table_name, column_name, data_type, is_nullable, column_default
//   from information_schema.columns
//   where table_schema = 'public'
//     and table_name in ('figures', 'locations', 'records', 'record_photos')
//   order by table_name, ordinal_position;
//
// スキーマを変えたら、上のSQLを再実行してこのファイルも直すこと。
// figure_entitlements（Phase2・未適用）はここに含めていない。

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      figures: {
        Row: {
          id: string
          slug: string
          name: string
          theme: string | null
          created_at: string
        }
        Insert: {
          id?: string
          slug: string
          name: string
          theme?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          theme?: string | null
          created_at?: string
        }
        Relationships: []
      }
      locations: {
        Row: {
          id: string
          figure_id: string
          number: number
          title_jp: string
          title_en: string | null
          series: string | null
          prefecture: string | null
          modern_location: string | null
          latitude: number | null
          longitude: number | null
          location_source: string | null
          cluster: string | null
          route_order: number | null
          created_at: string
          accessibility_class: string | null
          accessibility_confidence: string | null
          accessibility_reason: string | null
          inaccessible_reason: string | null
          location_confidence: string | null
          image_url: string | null
          image_source: string | null
          image_license: string | null
        }
        Insert: {
          id?: string
          figure_id: string
          number: number
          title_jp: string
          title_en?: string | null
          series?: string | null
          prefecture?: string | null
          modern_location?: string | null
          latitude?: number | null
          longitude?: number | null
          location_source?: string | null
          cluster?: string | null
          route_order?: number | null
          created_at?: string
          accessibility_class?: string | null
          accessibility_confidence?: string | null
          accessibility_reason?: string | null
          inaccessible_reason?: string | null
          location_confidence?: string | null
          image_url?: string | null
          image_source?: string | null
          image_license?: string | null
        }
        Update: {
          id?: string
          figure_id?: string
          number?: number
          title_jp?: string
          title_en?: string | null
          series?: string | null
          prefecture?: string | null
          modern_location?: string | null
          latitude?: number | null
          longitude?: number | null
          location_source?: string | null
          cluster?: string | null
          route_order?: number | null
          created_at?: string
          accessibility_class?: string | null
          accessibility_confidence?: string | null
          accessibility_reason?: string | null
          inaccessible_reason?: string | null
          location_confidence?: string | null
          image_url?: string | null
          image_source?: string | null
          image_license?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'locations_figure_id_fkey'
            columns: ['figure_id']
            referencedRelation: 'figures'
            referencedColumns: ['id']
          },
        ]
      }
      records: {
        Row: {
          id: string
          user_id: string
          figure_id: string
          location_name: string
          work_label: string | null
          photographed_at: string | null
          access_note: string | null
          voice_transcript: string | null
          edit_intent: string | null
          created_at: string
          updated_at: string
          is_public: boolean
          location_id: string | null
          weather: Json | null
        }
        Insert: {
          id?: string
          user_id?: string
          figure_id: string
          location_name: string
          work_label?: string | null
          photographed_at?: string | null
          access_note?: string | null
          voice_transcript?: string | null
          edit_intent?: string | null
          created_at?: string
          updated_at?: string
          is_public?: boolean
          location_id?: string | null
          weather?: Json | null
        }
        Update: {
          id?: string
          user_id?: string
          figure_id?: string
          location_name?: string
          work_label?: string | null
          photographed_at?: string | null
          access_note?: string | null
          voice_transcript?: string | null
          edit_intent?: string | null
          created_at?: string
          updated_at?: string
          is_public?: boolean
          location_id?: string | null
          weather?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: 'records_figure_id_fkey'
            columns: ['figure_id']
            referencedRelation: 'figures'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'records_location_id_fkey'
            columns: ['location_id']
            referencedRelation: 'locations'
            referencedColumns: ['id']
          },
        ]
      }
      record_photos: {
        Row: {
          id: string
          record_id: string
          storage_path: string
          latitude: number | null
          longitude: number | null
          taken_at: string | null
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          record_id: string
          storage_path: string
          latitude?: number | null
          longitude?: number | null
          taken_at?: string | null
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          record_id?: string
          storage_path?: string
          latitude?: number | null
          longitude?: number | null
          taken_at?: string | null
          sort_order?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'record_photos_record_id_fkey'
            columns: ['record_id']
            referencedRelation: 'records'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
