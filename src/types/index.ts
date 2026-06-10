export type UserRole = 'officer' | 'adviser' | 'admin';

export type ExpenseStatus = 'pending' | 'approved' | 'rejected';

export type ExpenseType = 'transport' | 'food' | 'supplies' | 'labor' | 'other';

export type EventStatus = 'ongoing' | 'done';

export type ReportStatus = 'pending' | 'approved';

export interface Department {
  id: string;
  name: string;
  code: string;
  created_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  department_id: string;
  role: UserRole;
  created_at: string;
  email?: string;
}

export interface Event {
  id: string;
  department_id: string;
  name: string;
  officer_id: string;
  adviser_id: string;
  budget: number;
  status: EventStatus;
  created_at: string;
}

export interface ReceiptItem {
  name: string;
  qty: number;
  unit_price: number;
  total: number;
}

export interface Receipt {
  id: string;
  event_id: string;
  uploaded_by: string;
  vendor: string;
  si_or_number: string;
  date: string;
  time: string;
  items: ReceiptItem[];
  total: number;
  category: string;
  confidence: number;
  image_url: string;
  status: ExpenseStatus;
  transaction_hash?: string;
  block_ref?: string;
  created_at: string;
  profiles?: Profile;
}

export interface NoReceiptItem {
  name: string;
  unit_cost: number;
  qty: number;
  total: number;
}

export interface TransportItem {
  mode: string;
  route: string;
  fare_per_person: number;
  persons: number;
  trips: number;
  total: number;
}

export interface FoodItem {
  meal_type: string;
  vendor: string;
  cost_per_person: number;
  persons: number;
  meals: number;
  total: number;
}

export interface SuppliesItem {
  item_name: string;
  unit_cost: number;
  qty: number;
  total: number;
}

export interface LaborItem {
  service_type: string;
  vendor: string;
  rate: number;
  persons: number;
  duration: number;
  duration_unit: 'days' | 'hours';
  total: number;
}

export interface OtherItem {
  expense_name: string;
  unit_cost: number;
  qty: number;
  total: number;
}

export interface NoReceiptForm {
  id: string;
  event_id: string;
  submitted_by: string;
  expense_type: ExpenseType;
  expense_name: string;
  date_incurred: string;
  description: string;
  amount: number;
  formula_breakdown: string;
  transport_data?: TransportItem;
  food_data?: FoodItem;
  supplies_data?: SuppliesItem[];
  labor_data?: LaborItem;
  other_data?: OtherItem;
  witnesses: { name: string; role?: string }[];
  certification: boolean;
  status: ExpenseStatus;
  rejection_reason?: string;
  resubmitted?: boolean;
  transaction_hash?: string;
  block_ref?: string;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  event_id: string | null;
  events?: { name: string } | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  admin_id: string;
  department_id: string;
  action: string;
  details: any;
  created_at: string;
}

export interface FinancialReport {
  id: string;
  event_id: string;
  generated_by: string;
  pdf_url?: string;
  status: ReportStatus;
  approved_by?: string;
  created_at: string;
}
