export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          role: string
          phone: string | null
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          full_name: string
          role?: string
          phone?: string | null
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          role?: string
          phone?: string | null
          avatar_url?: string | null
          created_at?: string
        }
      }
      clients: {
        Row: {
          id: string
          full_name: string
          phone: string
          email: string | null
          traffic_source: string
          loyalty_level: string
          total_orders: number
          total_spent: number
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          full_name: string
          phone: string
          email?: string | null
          traffic_source?: string
          loyalty_level?: string
          total_orders?: number
          total_spent?: number
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          phone?: string
          email?: string | null
          traffic_source?: string
          loyalty_level?: string
          total_orders?: number
          total_spent?: number
          notes?: string | null
          created_at?: string
        }
      }
      order_stages: {
        Row: {
          id: string
          name: string
          position: number
          color: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          position: number
          color?: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          position?: number
          color?: string
          created_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          client_id: string | null
          assigned_to: string | null
          stage_id: string | null
          repair_type_id: string | null
          device_type: string
          device_model: string | null
          device_color: string | null
          imei: string | null
          serial_number: string | null
          issue_description: string
          priority: string
          estimated_cost: number
          final_cost: number
          total_cost: number
          total_profit: number
          is_paid: boolean
          payment_method: string | null
          is_overdue: boolean
          due_date: string | null
          completed_at: string | null
          accepted_at: string
          technician_notes: string | null
          client_recommendations: string | null
          subtotal: number
          total_discount: number
          estimated_profit: number
          created_at: string
        }
        Insert: {
          id?: string
          client_id?: string | null
          assigned_to?: string | null
          stage_id?: string | null
          repair_type_id?: string | null
          device_type: string
          device_model?: string | null
          device_color?: string | null
          imei?: string | null
          serial_number?: string | null
          issue_description: string
          priority?: string
          estimated_cost?: number
          final_cost?: number
          total_cost?: number
          total_profit?: number
          is_paid?: boolean
          payment_method?: string | null
          is_overdue?: boolean
          due_date?: string | null
          completed_at?: string | null
          accepted_at?: string
          technician_notes?: string | null
          client_recommendations?: string | null
          subtotal?: number
          total_discount?: number
          estimated_profit?: number
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string | null
          assigned_to?: string | null
          stage_id?: string | null
          repair_type_id?: string | null
          device_type?: string
          device_model?: string | null
          device_color?: string | null
          imei?: string | null
          serial_number?: string | null
          issue_description?: string
          priority?: string
          estimated_cost?: number
          final_cost?: number
          total_cost?: number
          total_profit?: number
          is_paid?: boolean
          payment_method?: string | null
          is_overdue?: boolean
          due_date?: string | null
          completed_at?: string | null
          accepted_at?: string
          technician_notes?: string | null
          client_recommendations?: string | null
          subtotal?: number
          total_discount?: number
          estimated_profit?: number
          created_at?: string
        }
      }
      order_history: {
        Row: {
          id: string
          order_id: string | null
          user_id: string | null
          event_type: string
          description: string
          media_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          order_id?: string | null
          user_id?: string | null
          event_type: string
          description: string
          media_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string | null
          user_id?: string | null
          event_type?: string
          description?: string
          media_url?: string | null
          created_at?: string
        }
      }
      inventory: {
        Row: {
          id: string
          part_name: string
          sku: string | null
          barcode: string | null
          quantity: number
          unit_cost: number
          location: string
          min_quantity: number
          created_at: string
        }
        Insert: {
          id?: string
          part_name: string
          sku?: string | null
          barcode?: string | null
          quantity?: number
          unit_cost?: number
          location?: string
          min_quantity?: number
          created_at?: string
        }
        Update: {
          id?: string
          part_name?: string
          sku?: string | null
          barcode?: string | null
          quantity?: number
          unit_cost?: number
          location?: string
          min_quantity?: number
          created_at?: string
        }
      }
      inventory_movements: {
        Row: {
          id: string
          inventory_id: string | null
          order_id: string | null
          user_id: string | null
          movement_type: string
          quantity: number
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          inventory_id?: string | null
          order_id?: string | null
          user_id?: string | null
          movement_type: string
          quantity: number
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          inventory_id?: string | null
          order_id?: string | null
          user_id?: string | null
          movement_type?: string
          quantity?: number
          notes?: string | null
          created_at?: string
        }
      }
      order_items: {
        Row: {
          id: string
          order_id: string | null
          inventory_id: string | null
          item_type: string
          name: string
          quantity: number
          unit_price: number
          total_price: number
          cost_price: number
          selling_price: number
          profit: number
          warranty_days: number
          warranty_months: number
          discount_type: string
          discount_value: number
          assigned_technician_id: string | null
          item_comment: string | null
          unit_cost: number
          created_at: string
        }
        Insert: {
          id?: string
          order_id?: string | null
          inventory_id?: string | null
          item_type?: string
          name: string
          quantity?: number
          unit_price?: number
          total_price?: number
          cost_price?: number
          selling_price?: number
          profit?: number
          warranty_days?: number
          warranty_months?: number
          discount_type?: string
          discount_value?: number
          assigned_technician_id?: string | null
          item_comment?: string | null
          unit_cost?: number
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string | null
          inventory_id?: string | null
          item_type?: string
          name?: string
          quantity?: number
          unit_price?: number
          total_price?: number
          cost_price?: number
          selling_price?: number
          profit?: number
          warranty_days?: number
          warranty_months?: number
          discount_type?: string
          discount_value?: number
          assigned_technician_id?: string | null
          item_comment?: string | null
          unit_cost?: number
          created_at?: string
        }
      }
      communications: {
        Row: {
          id: string
          client_id: string | null
          order_id: string | null
          channel: string
          direction: string
          message: string
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          client_id?: string | null
          order_id?: string | null
          channel?: string
          direction?: string
          message: string
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string | null
          order_id?: string | null
          channel?: string
          direction?: string
          message?: string
          status?: string
          created_at?: string
        }
      }
      traffic_sources: {
        Row: {
          id: string
          name: string
          total_clients: number
          total_revenue: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          total_clients?: number
          total_revenue?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          total_clients?: number
          total_revenue?: number
          created_at?: string
        }
      }
      tasks: {
        Row: {
          id: string
          user_id: string | null
          order_id: string | null
          title: string
          description: string | null
          due_date: string
          due_time: string | null
          is_completed: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          order_id?: string | null
          title: string
          description?: string | null
          due_date: string
          due_time?: string | null
          is_completed?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          order_id?: string | null
          title?: string
          description?: string | null
          due_date?: string
          due_time?: string | null
          is_completed?: boolean
          created_at?: string
        }
      }
      repair_types: {
        Row: {
          id: string
          name: string
          price: number
          duration_minutes: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          price?: number
          duration_minutes?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          price?: number
          duration_minutes?: number
          is_active?: boolean
          created_at?: string
        }
      }
      suppliers: {
        Row: {
          id: string
          name: string
          contact_person: string | null
          phone: string | null
          email: string | null
          notes: string | null
          created_at: string
          user_id: string
        }
        Insert: {
          id?: string
          name: string
          contact_person?: string | null
          phone?: string | null
          email?: string | null
          notes?: string | null
          created_at?: string
          user_id: string
        }
        Update: {
          id?: string
          name?: string
          contact_person?: string | null
          phone?: string | null
          email?: string | null
          notes?: string | null
          created_at?: string
          user_id?: string
        }
      }
      deliveries: {
        Row: {
          id: string
          supplier_id: string
          expected_date: string
          actual_date: string | null
          status: string
          tracking_number: string | null
          total_cost: number
          notes: string | null
          created_at: string
          user_id: string
        }
        Insert: {
          id?: string
          supplier_id: string
          expected_date: string
          actual_date?: string | null
          status?: string
          tracking_number?: string | null
          total_cost?: number
          notes?: string | null
          created_at?: string
          user_id: string
        }
        Update: {
          id?: string
          supplier_id?: string
          expected_date?: string
          actual_date?: string | null
          status?: string
          tracking_number?: string | null
          total_cost?: number
          notes?: string | null
          created_at?: string
          user_id?: string
        }
      }
      delivery_items: {
        Row: {
          id: string
          delivery_id: string
          item_name: string
          quantity: number
          cost_per_unit: number
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          delivery_id: string
          item_name: string
          quantity?: number
          cost_per_unit?: number
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          delivery_id?: string
          item_name?: string
          quantity?: number
          cost_per_unit?: number
          notes?: string | null
          created_at?: string
        }
      }
      purchase_orders: {
        Row: {
          id: string
          supplier_id: string | null
          order_number: string
          tracking_number: string | null
          carrier: string | null
          status: string
          expected_arrival_date: string | null
          actual_arrival_date: string | null
          total_cost: number
          notes: string | null
          created_by: string | null
          received_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          supplier_id?: string | null
          order_number?: string
          tracking_number?: string | null
          carrier?: string | null
          status?: string
          expected_arrival_date?: string | null
          actual_arrival_date?: string | null
          total_cost?: number
          notes?: string | null
          created_by?: string | null
          received_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          supplier_id?: string | null
          order_number?: string
          tracking_number?: string | null
          carrier?: string | null
          status?: string
          expected_arrival_date?: string | null
          actual_arrival_date?: string | null
          total_cost?: number
          notes?: string | null
          created_by?: string | null
          received_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      purchase_order_items: {
        Row: {
          id: string
          purchase_order_id: string
          inventory_id: string
          quantity_ordered: number
          quantity_received: number
          unit_cost: number
          total_cost: number
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          purchase_order_id: string
          inventory_id: string
          quantity_ordered: number
          quantity_received?: number
          unit_cost: number
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          purchase_order_id?: string
          inventory_id?: string
          quantity_ordered?: number
          quantity_received?: number
          unit_cost?: number
          notes?: string | null
          created_at?: string
        }
      }
    }
  }
}
