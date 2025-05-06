-- Database schema for Expense Tracker application

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the expense_sheets table first (referenced by expenses)
CREATE TABLE IF NOT EXISTS public.expense_sheets (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  name text NOT NULL,
  pin text NULL,
  has_pin boolean NOT NULL DEFAULT false,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT expense_sheets_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- Create index on user_id for expense_sheets
CREATE INDEX IF NOT EXISTS expense_sheets_user_id_idx ON public.expense_sheets USING btree (user_id) TABLESPACE pg_default;

-- Create expenses table with foreign key reference
CREATE TABLE IF NOT EXISTS public.expenses (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  date date NOT NULL,
  amount numeric NOT NULL,
  category text NOT NULL,
  description text NULL,
  user_id uuid NOT NULL,
  sheet_id uuid NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT expenses_pkey PRIMARY KEY (id),
  CONSTRAINT expenses_sheet_id_fkey FOREIGN KEY (sheet_id) REFERENCES public.expense_sheets (id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- Create indexes for expenses table
CREATE INDEX IF NOT EXISTS expenses_user_id_idx ON public.expenses USING btree (user_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS expenses_sheet_id_idx ON public.expenses USING btree (sheet_id) TABLESPACE pg_default;

-- Create sheet_categories table for categories specific to a sheet
CREATE TABLE IF NOT EXISTS public.sheet_categories (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  sheet_id uuid NOT NULL,
  category text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT sheet_categories_pkey PRIMARY KEY (id),
  CONSTRAINT sheet_categories_sheet_id_fkey FOREIGN KEY (sheet_id) REFERENCES public.expense_sheets (id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- Create index on sheet_id for sheet_categories
CREATE INDEX IF NOT EXISTS sheet_categories_sheet_id_idx ON public.sheet_categories USING btree (sheet_id) TABLESPACE pg_default;

-- Create column_descriptions table for storing descriptions for expense values
CREATE TABLE IF NOT EXISTS public.column_descriptions (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  expense_id uuid NOT NULL,
  column_name text NOT NULL, -- Added column_name field to identify which column the description belongs to
  description text NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT column_descriptions_pkey PRIMARY KEY (id),
  CONSTRAINT column_descriptions_expense_id_fkey FOREIGN KEY (expense_id) REFERENCES public.expenses (id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- Create indexes for column_descriptions
CREATE INDEX IF NOT EXISTS column_descriptions_expense_id_idx ON public.column_descriptions USING btree (expense_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS column_descriptions_user_id_idx ON public.column_descriptions USING btree (user_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS column_descriptions_column_name_idx ON public.column_descriptions USING btree (column_name) TABLESPACE pg_default;

-- Enable RLS (Row Level Security)
alter table public.expense_sheets enable row level security;
alter table public.expenses enable row level security;
alter table public.sheet_categories enable row level security;
alter table public.column_descriptions enable row level security;

-- Create policies for expense_sheets table
create policy "Users can view their own expense sheets"
  on public.expense_sheets
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their own expense sheets"
  on public.expense_sheets
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own expense sheets"
  on public.expense_sheets
  for update
  using (auth.uid() = user_id);

create policy "Users can delete their own expense sheets"
  on public.expense_sheets
  for delete
  using (auth.uid() = user_id);

-- Create policies for expenses table
create policy "Users can view expenses from their sheets"
  on public.expenses
  for select
  using (
    sheet_id in (
      select id from public.expense_sheets
      where user_id = auth.uid()
    )
  );

create policy "Users can insert expenses into their sheets"
  on public.expenses
  for insert
  with check (
    sheet_id in (
      select id from public.expense_sheets
      where user_id = auth.uid()
    )
  );

create policy "Users can update expenses in their sheets"
  on public.expenses
  for update
  using (
    sheet_id in (
      select id from public.expense_sheets
      where user_id = auth.uid()
    )
  );

create policy "Users can delete expenses in their sheets"
  on public.expenses
  for delete
  using (
    sheet_id in (
      select id from public.expense_sheets
      where user_id = auth.uid()
    )
  );

-- Create policies for sheet_categories table
create policy "Users can view categories for their sheets"
  on public.sheet_categories
  for select
  using (
    sheet_id in (
      select id from public.expense_sheets
      where user_id = auth.uid()
    )
  );

create policy "Users can insert categories for their sheets"
  on public.sheet_categories
  for insert
  with check (
    sheet_id in (
      select id from public.expense_sheets
      where user_id = auth.uid()
    )
  );

create policy "Users can update categories for their sheets"
  on public.sheet_categories
  for update
  using (
    sheet_id in (
      select id from public.expense_sheets
      where user_id = auth.uid()
    )
  );

create policy "Users can delete categories for their sheets"
  on public.sheet_categories
  for delete
  using (
    sheet_id in (
      select id from public.expense_sheets
      where user_id = auth.uid()
    )
  );

-- Create policies for column_descriptions table
create policy "Users can view their own column descriptions"
  on public.column_descriptions
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their own column descriptions"
  on public.column_descriptions
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own column descriptions"
  on public.column_descriptions
  for update
  using (auth.uid() = user_id);

create policy "Users can delete their own column descriptions"
  on public.column_descriptions
  for delete
  using (auth.uid() = user_id);