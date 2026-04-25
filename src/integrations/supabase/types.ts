export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_notes: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          organization_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          organization_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_notes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          bg_color: string
          created_at: string
          ends_at: string | null
          id: string
          is_active: boolean
          link_label: string | null
          link_url: string | null
          message: string
          starts_at: string | null
          text_color: string
          updated_at: string
        }
        Insert: {
          bg_color?: string
          created_at?: string
          ends_at?: string | null
          id?: string
          is_active?: boolean
          link_label?: string | null
          link_url?: string | null
          message: string
          starts_at?: string | null
          text_color?: string
          updated_at?: string
        }
        Update: {
          bg_color?: string
          created_at?: string
          ends_at?: string | null
          id?: string
          is_active?: boolean
          link_label?: string | null
          link_url?: string | null
          message?: string
          starts_at?: string | null
          text_color?: string
          updated_at?: string
        }
        Relationships: []
      }
      asset_holders: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          notes: string | null
          organization_id: string
          phone: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          organization_id: string
          phone?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          organization_id?: string
          phone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_holders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      bail_terminations: {
        Row: {
          balance: number
          closed_at: string | null
          created_at: string
          deposit_amount: number
          deposit_retained: number
          effective_date: string
          id: string
          inspection_notes: string | null
          inspection_status: string | null
          notice_duration: number
          notification_date: string
          penalties: number
          pending_charges: number
          prorata_adjustment: number
          reason: string
          remaining_rent_due: number
          status: string
          tenant_id: string
          total_due: number
          updated_at: string
        }
        Insert: {
          balance?: number
          closed_at?: string | null
          created_at?: string
          deposit_amount?: number
          deposit_retained?: number
          effective_date: string
          id?: string
          inspection_notes?: string | null
          inspection_status?: string | null
          notice_duration?: number
          notification_date: string
          penalties?: number
          pending_charges?: number
          prorata_adjustment?: number
          reason: string
          remaining_rent_due?: number
          status?: string
          tenant_id: string
          total_due?: number
          updated_at?: string
        }
        Update: {
          balance?: number
          closed_at?: string | null
          created_at?: string
          deposit_amount?: number
          deposit_retained?: number
          effective_date?: string
          id?: string
          inspection_notes?: string | null
          inspection_status?: string | null
          notice_duration?: number
          notification_date?: string
          penalties?: number
          pending_charges?: number
          prorata_adjustment?: number
          reason?: string
          remaining_rent_due?: number
          status?: string
          tenant_id?: string
          total_due?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bail_terminations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_events: {
        Row: {
          campaign_id: string
          created_at: string
          event_type: string
          id: string
          ip_address: string | null
          recipient_id: string
          url: string | null
          user_agent: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string
          event_type: string
          id?: string
          ip_address?: string | null
          recipient_id: string
          url?: string | null
          user_agent?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string
          event_type?: string
          id?: string
          ip_address?: string | null
          recipient_id?: string
          url?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_events_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "campaign_recipients"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_recipients: {
        Row: {
          campaign_id: string
          click_count: number
          contact_id: string
          created_at: string
          email: string
          error_message: string | null
          first_clicked_at: string | null
          first_opened_at: string | null
          id: string
          open_count: number
          sent_at: string | null
          status: string
        }
        Insert: {
          campaign_id: string
          click_count?: number
          contact_id: string
          created_at?: string
          email: string
          error_message?: string | null
          first_clicked_at?: string | null
          first_opened_at?: string | null
          id?: string
          open_count?: number
          sent_at?: string | null
          status?: string
        }
        Update: {
          campaign_id?: string
          click_count?: number
          contact_id?: string
          created_at?: string
          email?: string
          error_message?: string | null
          first_clicked_at?: string | null
          first_opened_at?: string | null
          id?: string
          open_count?: number
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_recipients_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "marketing_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      cities: {
        Row: {
          country_id: string | null
          created_at: string
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          country_id?: string | null
          created_at?: string
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          country_id?: string | null
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cities_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_reminders: {
        Row: {
          contract_id: string
          created_at: string
          id: string
          reminder_type: string
        }
        Insert: {
          contract_id: string
          created_at?: string
          id?: string
          reminder_type: string
        }
        Update: {
          contract_id?: string
          created_at?: string
          id?: string
          reminder_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_reminders_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_templates: {
        Row: {
          content: string
          created_at: string
          id: string
          is_default: boolean
          name: string
          organization_id: string
          template_type: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          organization_id: string
          template_type?: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          organization_id?: string
          template_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          content: string
          created_at: string
          expires_at: string | null
          generated_at: string | null
          id: string
          status: string
          template_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          expires_at?: string | null
          generated_at?: string | null
          id?: string
          status?: string
          template_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          expires_at?: string | null
          generated_at?: string | null
          id?: string
          status?: string
          template_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      countries: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          code?: string
          created_at?: string
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "countries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_roles: {
        Row: {
          base_role: Database["public"]["Enums"]["app_role"]
          city_ids: string[]
          created_at: string
          id: string
          is_system: boolean
          name: string
          organization_id: string
          permissions: string[]
          updated_at: string
        }
        Insert: {
          base_role?: Database["public"]["Enums"]["app_role"]
          city_ids?: string[]
          created_at?: string
          id?: string
          is_system?: boolean
          name: string
          organization_id: string
          permissions?: string[]
          updated_at?: string
        }
        Update: {
          base_role?: Database["public"]["Enums"]["app_role"]
          city_ids?: string[]
          created_at?: string
          id?: string
          is_system?: boolean
          name?: string
          organization_id?: string
          permissions?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      email_reminder_logs: {
        Row: {
          audit_context: Json | null
          error_message: string | null
          id: string
          organization_id: string
          recipient_email: string
          rent_payment_id: string
          sent_at: string
          status: string
          template_key: string
        }
        Insert: {
          audit_context?: Json | null
          error_message?: string | null
          id?: string
          organization_id: string
          recipient_email: string
          rent_payment_id: string
          sent_at?: string
          status?: string
          template_key: string
        }
        Update: {
          audit_context?: Json | null
          error_message?: string | null
          id?: string
          organization_id?: string
          recipient_email?: string
          rent_payment_id?: string
          sent_at?: string
          status?: string
          template_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_reminder_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_reminder_logs_rent_payment_id_fkey"
            columns: ["rent_payment_id"]
            isOneToOne: false
            referencedRelation: "rent_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          created_at: string
          html_content: string
          id: string
          is_system: boolean
          label: string
          organization_id: string
          subject: string
          template_key: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          html_content?: string
          id?: string
          is_system?: boolean
          label: string
          organization_id: string
          subject?: string
          template_key: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          html_content?: string
          id?: string
          is_system?: boolean
          label?: string
          organization_id?: string
          subject?: string
          template_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          city_id: string | null
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          monthly_salary: number
          organization_id: string
          position: string
          property_id: string | null
          updated_at: string
        }
        Insert: {
          city_id?: string | null
          created_at?: string
          full_name: string
          id?: string
          is_active?: boolean
          monthly_salary?: number
          organization_id: string
          position?: string
          property_id?: string | null
          updated_at?: string
        }
        Update: {
          city_id?: string | null
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          monthly_salary?: number
          organization_id?: string
          position?: string
          property_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      escalation_tasks: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          escalation_level: number
          id: string
          rent_payment_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          escalation_level?: number
          id?: string
          rent_payment_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          escalation_level?: number
          id?: string
          rent_payment_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "escalation_tasks_rent_payment_id_fkey"
            columns: ["rent_payment_id"]
            isOneToOne: false
            referencedRelation: "rent_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          name: string
          organization_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          organization_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category_id: string
          city_id: string | null
          country_id: string | null
          created_at: string
          description: string | null
          employee_id: string | null
          expense_date: string
          expense_type: string
          frequency: string
          id: string
          organization_id: string
          property_id: string | null
          receipt_url: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          category_id: string
          city_id?: string | null
          country_id?: string | null
          created_at?: string
          description?: string | null
          employee_id?: string | null
          expense_date?: string
          expense_type?: string
          frequency?: string
          id?: string
          organization_id: string
          property_id?: string | null
          receipt_url?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category_id?: string
          city_id?: string | null
          country_id?: string | null
          created_at?: string
          description?: string | null
          employee_id?: string | null
          expense_date?: string
          expense_type?: string
          frequency?: string
          id?: string
          organization_id?: string
          property_id?: string | null
          receipt_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      features: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          label: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          label: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      lease_documents: {
        Row: {
          created_at: string
          document_type: string
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          notes: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          document_type?: string
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          notes?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          document_type?: string
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          notes?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lease_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_campaigns: {
        Row: {
          created_at: string
          created_by: string | null
          html_content: string
          id: string
          name: string
          segment_filter: Json
          sent_at: string | null
          status: string
          subject: string
          total_clicked: number
          total_failed: number
          total_opened: number
          total_recipients: number
          total_sent: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          html_content?: string
          id?: string
          name: string
          segment_filter?: Json
          sent_at?: string | null
          status?: string
          subject?: string
          total_clicked?: number
          total_failed?: number
          total_opened?: number
          total_recipients?: number
          total_sent?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          html_content?: string
          id?: string
          name?: string
          segment_filter?: Json
          sent_at?: string | null
          status?: string
          subject?: string
          total_clicked?: number
          total_failed?: number
          total_opened?: number
          total_recipients?: number
          total_sent?: number
          updated_at?: string
        }
        Relationships: []
      }
      marketing_contacts: {
        Row: {
          company: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          last_activity_at: string | null
          notes: string | null
          organization_id: string | null
          phone: string | null
          score: number
          source: string
          status: string
          subscribed: boolean
          tags: string[]
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          last_activity_at?: string | null
          notes?: string | null
          organization_id?: string | null
          phone?: string | null
          score?: number
          source?: string
          status?: string
          subscribed?: boolean
          tags?: string[]
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          last_activity_at?: string | null
          notes?: string | null
          organization_id?: string | null
          phone?: string | null
          score?: number
          source?: string
          status?: string
          subscribed?: boolean
          tags?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_contacts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_workflow_enrollments: {
        Row: {
          completed_at: string | null
          contact_id: string
          current_step_order: number
          enrolled_at: string
          id: string
          status: string
          workflow_id: string
        }
        Insert: {
          completed_at?: string | null
          contact_id: string
          current_step_order?: number
          enrolled_at?: string
          id?: string
          status?: string
          workflow_id: string
        }
        Update: {
          completed_at?: string | null
          contact_id?: string
          current_step_order?: number
          enrolled_at?: string
          id?: string
          status?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_workflow_enrollments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "marketing_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_workflow_enrollments_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "marketing_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_workflow_step_runs: {
        Row: {
          created_at: string
          enrollment_id: string
          error_message: string | null
          executed_at: string | null
          id: string
          recipient_id: string | null
          scheduled_for: string
          status: string
          step_id: string
        }
        Insert: {
          created_at?: string
          enrollment_id: string
          error_message?: string | null
          executed_at?: string | null
          id?: string
          recipient_id?: string | null
          scheduled_for?: string
          status?: string
          step_id: string
        }
        Update: {
          created_at?: string
          enrollment_id?: string
          error_message?: string | null
          executed_at?: string | null
          id?: string
          recipient_id?: string | null
          scheduled_for?: string
          status?: string
          step_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_workflow_step_runs_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "marketing_workflow_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_workflow_step_runs_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "marketing_workflow_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_workflow_steps: {
        Row: {
          condition_type: string
          created_at: string
          delay_days: number
          html_content: string
          id: string
          is_active: boolean
          step_order: number
          subject: string
          updated_at: string
          workflow_id: string
        }
        Insert: {
          condition_type?: string
          created_at?: string
          delay_days?: number
          html_content?: string
          id?: string
          is_active?: boolean
          step_order?: number
          subject?: string
          updated_at?: string
          workflow_id: string
        }
        Update: {
          condition_type?: string
          created_at?: string
          delay_days?: number
          html_content?: string
          id?: string
          is_active?: boolean
          step_order?: number
          subject?: string
          updated_at?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_workflow_steps_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "marketing_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_workflows: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          trigger_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          trigger_type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          trigger_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          description: string
          id: string
          is_read: boolean
          organization_id: string
          reference_id: string | null
          reference_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          is_read?: boolean
          organization_id: string
          reference_id?: string | null
          reference_type?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          is_read?: boolean
          organization_id?: string
          reference_id?: string | null
          reference_type?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          accepted_payment_methods: string[]
          address: string | null
          created_at: string
          currency: string
          date_format: string
          deposit_months: number
          email: string | null
          fiscal_year_start: number
          id: string
          invite_token: string
          is_active: boolean
          late_fee_enabled: boolean
          late_fee_grace_days: number
          late_fee_type: string
          late_fee_value: number
          legal_address: string | null
          legal_id: string | null
          legal_name: string | null
          logo_url: string | null
          name: string
          onboarding_completed: boolean
          phone: string | null
          rent_due_day: number
          salaries_enabled: boolean
          sms_sender_name: string | null
          sms_sender_number: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          accepted_payment_methods?: string[]
          address?: string | null
          created_at?: string
          currency?: string
          date_format?: string
          deposit_months?: number
          email?: string | null
          fiscal_year_start?: number
          id?: string
          invite_token?: string
          is_active?: boolean
          late_fee_enabled?: boolean
          late_fee_grace_days?: number
          late_fee_type?: string
          late_fee_value?: number
          legal_address?: string | null
          legal_id?: string | null
          legal_name?: string | null
          logo_url?: string | null
          name: string
          onboarding_completed?: boolean
          phone?: string | null
          rent_due_day?: number
          salaries_enabled?: boolean
          sms_sender_name?: string | null
          sms_sender_number?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          accepted_payment_methods?: string[]
          address?: string | null
          created_at?: string
          currency?: string
          date_format?: string
          deposit_months?: number
          email?: string | null
          fiscal_year_start?: number
          id?: string
          invite_token?: string
          is_active?: boolean
          late_fee_enabled?: boolean
          late_fee_grace_days?: number
          late_fee_type?: string
          late_fee_value?: number
          legal_address?: string | null
          legal_id?: string | null
          legal_name?: string | null
          logo_url?: string | null
          name?: string
          onboarding_completed?: boolean
          phone?: string | null
          rent_due_day?: number
          salaries_enabled?: boolean
          sms_sender_name?: string | null
          sms_sender_number?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      patrimony_assets: {
        Row: {
          asset_type: string
          created_at: string
          description: string | null
          handling_firm: string | null
          holder_id: string | null
          id: string
          land_title: string
          latitude: number | null
          locality: string
          longitude: number | null
          map_link: string | null
          organization_id: string
          receipt_order_number: string | null
          status: string
          subdivision_name: string
          title: string
          title_creation_date: string | null
          updated_at: string
        }
        Insert: {
          asset_type?: string
          created_at?: string
          description?: string | null
          handling_firm?: string | null
          holder_id?: string | null
          id?: string
          land_title?: string
          latitude?: number | null
          locality?: string
          longitude?: number | null
          map_link?: string | null
          organization_id: string
          receipt_order_number?: string | null
          status?: string
          subdivision_name?: string
          title: string
          title_creation_date?: string | null
          updated_at?: string
        }
        Update: {
          asset_type?: string
          created_at?: string
          description?: string | null
          handling_firm?: string | null
          holder_id?: string | null
          id?: string
          land_title?: string
          latitude?: number | null
          locality?: string
          longitude?: number | null
          map_link?: string | null
          organization_id?: string
          receipt_order_number?: string | null
          status?: string
          subdivision_name?: string
          title?: string
          title_creation_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patrimony_assets_holder_id_fkey"
            columns: ["holder_id"]
            isOneToOne: false
            referencedRelation: "asset_holders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patrimony_assets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      patrimony_contacts: {
        Row: {
          asset_id: string
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone: string
          role: string | null
        }
        Insert: {
          asset_id: string
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          phone?: string
          role?: string | null
        }
        Update: {
          asset_id?: string
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patrimony_contacts_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "patrimony_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      patrimony_documents: {
        Row: {
          asset_id: string
          document_type: string
          file_size: number | null
          file_url: string
          id: string
          name: string
          uploaded_at: string
        }
        Insert: {
          asset_id: string
          document_type?: string
          file_size?: number | null
          file_url: string
          id?: string
          name: string
          uploaded_at?: string
        }
        Update: {
          asset_id?: string
          document_type?: string
          file_size?: number | null
          file_url?: string
          id?: string
          name?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patrimony_documents_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "patrimony_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_records: {
        Row: {
          amount: number
          comment: string | null
          created_at: string
          id: string
          method: string
          payment_date: string
          rent_payment_id: string
        }
        Insert: {
          amount: number
          comment?: string | null
          created_at?: string
          id?: string
          method?: string
          payment_date?: string
          rent_payment_id: string
        }
        Update: {
          amount?: number
          comment?: string | null
          created_at?: string
          id?: string
          method?: string
          payment_date?: string
          rent_payment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_records_rent_payment_id_fkey"
            columns: ["rent_payment_id"]
            isOneToOne: false
            referencedRelation: "rent_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          created_at: string
          cta_label: string
          description: string | null
          display_features: string[]
          feature_flags: string[]
          id: string
          is_visible: boolean
          max_properties: number | null
          max_users: number | null
          name: string
          price_monthly: number
          slug: string
          sort_order: number
          status: string
          trial_eligible: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          cta_label?: string
          description?: string | null
          display_features?: string[]
          feature_flags?: string[]
          id?: string
          is_visible?: boolean
          max_properties?: number | null
          max_users?: number | null
          name: string
          price_monthly?: number
          slug: string
          sort_order?: number
          status?: string
          trial_eligible?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          cta_label?: string
          description?: string | null
          display_features?: string[]
          feature_flags?: string[]
          id?: string
          is_visible?: boolean
          max_properties?: number | null
          max_users?: number | null
          name?: string
          price_monthly?: number
          slug?: string
          sort_order?: number
          status?: string
          trial_eligible?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      platform_email_logs: {
        Row: {
          context: Json
          created_at: string
          error_message: string | null
          id: string
          organization_id: string | null
          recipient_email: string
          retry_count: number
          status: string
          subject: string
          template_key: string
          user_id: string | null
        }
        Insert: {
          context?: Json
          created_at?: string
          error_message?: string | null
          id?: string
          organization_id?: string | null
          recipient_email: string
          retry_count?: number
          status?: string
          subject?: string
          template_key: string
          user_id?: string | null
        }
        Update: {
          context?: Json
          created_at?: string
          error_message?: string | null
          id?: string
          organization_id?: string | null
          recipient_email?: string
          retry_count?: number
          status?: string
          subject?: string
          template_key?: string
          user_id?: string | null
        }
        Relationships: []
      }
      platform_email_templates: {
        Row: {
          available_variables: string[]
          category: string
          created_at: string
          description: string | null
          html_content: string
          id: string
          is_active: boolean
          is_admin_alert: boolean
          label: string
          subject: string
          template_key: string
          updated_at: string
        }
        Insert: {
          available_variables?: string[]
          category?: string
          created_at?: string
          description?: string | null
          html_content?: string
          id?: string
          is_active?: boolean
          is_admin_alert?: boolean
          label: string
          subject?: string
          template_key: string
          updated_at?: string
        }
        Update: {
          available_variables?: string[]
          category?: string
          created_at?: string
          description?: string | null
          html_content?: string
          id?: string
          is_active?: boolean
          is_admin_alert?: boolean
          label?: string
          subject?: string
          template_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_approved: boolean
          organization_id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_approved?: boolean
          organization_id: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_approved?: boolean
          organization_id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_code_usages: {
        Row: {
          created_at: string
          discount_applied: number
          id: string
          organization_id: string
          plan_slug: string
          promo_code_id: string
        }
        Insert: {
          created_at?: string
          discount_applied?: number
          id?: string
          organization_id: string
          plan_slug: string
          promo_code_id: string
        }
        Update: {
          created_at?: string
          discount_applied?: number
          id?: string
          organization_id?: string
          plan_slug?: string
          promo_code_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_code_usages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_code_usages_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string
          current_uses: number
          description: string | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          current_uses?: number
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          current_uses?: number
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string
          city_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          organization_id: string
          type: string
          updated_at: string
        }
        Insert: {
          address?: string
          city_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          organization_id: string
          type?: string
          updated_at?: string
        }
        Update: {
          address?: string
          city_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "properties_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      rent_payments: {
        Row: {
          amount: number
          created_at: string
          due_date: string
          id: string
          month: string
          paid_amount: number
          status: Database["public"]["Enums"]["payment_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          due_date: string
          id?: string
          month: string
          paid_amount?: number
          status?: Database["public"]["Enums"]["payment_status"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string
          id?: string
          month?: string
          paid_amount?: number
          status?: Database["public"]["Enums"]["payment_status"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rent_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_logs: {
        Row: {
          created_at: string
          details: Json | null
          event_type: string
          id: string
          sms_message_id: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          event_type: string
          id?: string
          sms_message_id: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          event_type?: string
          id?: string
          sms_message_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_logs_sms_message_id_fkey"
            columns: ["sms_message_id"]
            isOneToOne: false
            referencedRelation: "sms_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_messages: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          error_message: string | null
          id: string
          organization_id: string
          provider_message_id: string | null
          recipient_name: string | null
          recipient_phone: string
          rent_payment_id: string | null
          retry_count: number
          schedule_id: string | null
          scheduled_for: string
          sent_at: string | null
          status: string
          template_id: string | null
          tenant_id: string | null
          trigger_type: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          organization_id: string
          provider_message_id?: string | null
          recipient_name?: string | null
          recipient_phone: string
          rent_payment_id?: string | null
          retry_count?: number
          schedule_id?: string | null
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          template_id?: string | null
          tenant_id?: string | null
          trigger_type?: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          organization_id?: string
          provider_message_id?: string | null
          recipient_name?: string | null
          recipient_phone?: string
          rent_payment_id?: string | null
          retry_count?: number
          schedule_id?: string | null
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          template_id?: string | null
          tenant_id?: string | null
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_messages_rent_payment_id_fkey"
            columns: ["rent_payment_id"]
            isOneToOne: false
            referencedRelation: "rent_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_messages_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "sms_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_messages_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "sms_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_schedules: {
        Row: {
          created_at: string
          day_of_month: number
          email_template_id: string | null
          id: string
          is_active: boolean
          label: string
          offset_days: number
          organization_id: string
          send_email: boolean
          send_hour: number
          send_minute: number
          slot_index: number
          sort_order: number
          template_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_month?: number
          email_template_id?: string | null
          id?: string
          is_active?: boolean
          label: string
          offset_days: number
          organization_id: string
          send_email?: boolean
          send_hour?: number
          send_minute?: number
          slot_index?: number
          sort_order?: number
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_month?: number
          email_template_id?: string | null
          id?: string
          is_active?: boolean
          label?: string
          offset_days?: number
          organization_id?: string
          send_email?: boolean
          send_hour?: number
          send_minute?: number
          slot_index?: number
          sort_order?: number
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_schedules_email_template_id_fkey"
            columns: ["email_template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_schedules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_schedules_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "sms_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_templates: {
        Row: {
          content: string
          created_at: string
          id: string
          is_system: boolean
          label: string
          organization_id: string
          template_key: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          is_system?: boolean
          label: string
          organization_id: string
          template_key: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_system?: boolean
          label?: string
          organization_id?: string
          template_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_history: {
        Row: {
          amount: number | null
          created_at: string
          event_type: string
          id: string
          new_plan: string | null
          notes: string | null
          organization_id: string
          previous_plan: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string
          event_type?: string
          id?: string
          new_plan?: string | null
          notes?: string | null
          organization_id: string
          previous_plan?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string
          event_type?: string
          id?: string
          new_plan?: string | null
          notes?: string | null
          organization_id?: string
          previous_plan?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          organization_id: string
          plan: string
          status: string
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          organization_id: string
          plan?: string
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          organization_id?: string
          plan?: string
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      super_admins: {
        Row: {
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      tenants: {
        Row: {
          advance_months: number
          company_name: string | null
          contact_person: string | null
          created_at: string
          deposit: number
          email: string | null
          full_name: string
          id: string
          id_number: string | null
          is_active: boolean
          lease_duration: number
          lease_start: string
          phone: string
          rccm: string | null
          rent: number
          tenant_type: string
          unit_id: string
          updated_at: string
        }
        Insert: {
          advance_months?: number
          company_name?: string | null
          contact_person?: string | null
          created_at?: string
          deposit?: number
          email?: string | null
          full_name: string
          id?: string
          id_number?: string | null
          is_active?: boolean
          lease_duration?: number
          lease_start?: string
          phone?: string
          rccm?: string | null
          rent?: number
          tenant_type?: string
          unit_id: string
          updated_at?: string
        }
        Update: {
          advance_months?: number
          company_name?: string | null
          contact_person?: string | null
          created_at?: string
          deposit?: number
          email?: string | null
          full_name?: string
          id?: string
          id_number?: string | null
          is_active?: boolean
          lease_duration?: number
          lease_start?: string
          phone?: string
          rccm?: string | null
          rent?: number
          tenant_type?: string
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenants_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          charges: number
          created_at: string
          floor: number | null
          id: string
          name: string
          property_id: string
          rent: number
          rooms: number
          status: Database["public"]["Enums"]["unit_status"]
          updated_at: string
        }
        Insert: {
          charges?: number
          created_at?: string
          floor?: number | null
          id?: string
          name: string
          property_id: string
          rent?: number
          rooms?: number
          status?: Database["public"]["Enums"]["unit_status"]
          updated_at?: string
        }
        Update: {
          charges?: number
          created_at?: string
          floor?: number | null
          id?: string
          name?: string
          property_id?: string
          rent?: number
          rooms?: number
          status?: Database["public"]["Enums"]["unit_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "units_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          city_ids: string[]
          created_at: string
          custom_role_id: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          city_ids?: string[]
          created_at?: string
          custom_role_id?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          city_ids?: string[]
          created_at?: string
          custom_role_id?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_custom_role_id_fkey"
            columns: ["custom_role_id"]
            isOneToOne: false
            referencedRelation: "custom_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist: {
        Row: {
          created_at: string
          email: string
          id: string
          plan_slug: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          plan_slug: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          plan_slug?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_promo_code: {
        Args: {
          _code: string
          _organization_id: string
          _plan_price: number
          _plan_slug: string
        }
        Returns: Json
      }
      can_manage_payments: { Args: { _user_id: string }; Returns: boolean }
      ensure_user_profile: { Args: never; Returns: Json }
      get_user_org_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_gestionnaire_or_admin: { Args: { _user_id: string }; Returns: boolean }
      is_org_admin: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "gestionnaire" | "comptable"
      payment_status: "pending" | "paid" | "partial" | "late"
      unit_status: "occupied" | "vacant"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "gestionnaire", "comptable"],
      payment_status: ["pending", "paid", "partial", "late"],
      unit_status: ["occupied", "vacant"],
    },
  },
} as const
