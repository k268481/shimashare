-- シマシェア 初期スキーマ
-- SPEC.md・TASKS.md フェーズ1-4 に対応
-- すべてのテーブルで RLS を有効化（CLAUDE.md 準拠）

-- ロール（権限階層 3段）
create type user_role as enum ('super_admin', 'moderator', 'user');

-- カテゴリ（6大分類, SPEC.md 3.6）
create type listing_category as enum (
  'food', 'daily', 'clothing', 'baby', 'appliance', 'other'
);

create type listing_status as enum ('active', 'matched', 'completed', 'hidden');
create type conversation_status as enum ('open', 'completed');
create type response_channel as enum ('line', 'phone');
create type request_status as enum ('pending', 'ok', 'ng', 'alternative', 'received', 'expired');
create type stock_status as enum ('out_of_stock', 'restocked', 'low_stock');
create type rating_value as enum ('good', 'normal', 'bad'); -- ◎ ○ △
create type emergency_trigger as enum ('auto', 'manual');

-- 地区マスタ（パイロット島内の地区）
create table public.districts (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  display_order int not null default 0
);
alter table public.districts enable row level security;
create policy "districts_read_all" on public.districts for select using (true);

-- ユーザー（LINE 連携 + 自己申告の個人情報）
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  line_user_id text unique not null,
  nickname text not null,
  district text not null,
  picture_url text,
  role user_role not null default 'user',
  -- 個人情報：本人または super_admin のみ閲覧可
  real_name text,
  address text,
  phone text,
  -- 同世帯代理利用の自己申告
  proxy_for_household boolean default false,
  is_adult boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.users enable row level security;

-- 公開プロフィール（nickname, district, picture_url, role）は全ユーザー閲覧可
create policy "users_read_public" on public.users for select using (true);
-- 個人情報カラムは本人 or super_admin のみ（アプリ側で select 列を絞る前提）
-- ※ Postgres カラムレベル権限 + RLS を併用する場合は別途 GRANT 設計
create policy "users_update_self" on public.users for update using (auth.uid() = id);
create policy "users_insert_self" on public.users for insert with check (auth.uid() = id);

-- 出品（フリマ / ゆずります 0円）
create table public.listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  description text default '',
  price int not null check (price >= 0),
  category listing_category not null,
  photos text[] not null default '{}',
  handover text not null,
  status listing_status not null default 'active',
  is_emergency_offer boolean default false, -- 緊急モード中の0円出品優先表示
  created_at timestamptz not null default now(),
  search_text tsvector generated always as (
    to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(description,''))
  ) stored
);
create index listings_search_idx on public.listings using gin(search_text);
create index listings_status_idx on public.listings(status, created_at desc);
alter table public.listings enable row level security;

create policy "listings_read_visible"
  on public.listings for select
  using (status != 'hidden' or auth.uid() = user_id);
create policy "listings_insert_self"
  on public.listings for insert
  with check (auth.uid() = user_id);
create policy "listings_update_self"
  on public.listings for update
  using (auth.uid() = user_id);
create policy "listings_delete_self"
  on public.listings for delete
  using (auth.uid() = user_id);

-- 1対1チャット
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  buyer_id uuid not null references public.users(id) on delete cascade,
  seller_id uuid not null references public.users(id) on delete cascade,
  status conversation_status not null default 'open',
  created_at timestamptz not null default now(),
  unique (listing_id, buyer_id)
);
alter table public.conversations enable row level security;
create policy "conversations_read_participants"
  on public.conversations for select
  using (auth.uid() in (buyer_id, seller_id));
create policy "conversations_insert_buyer"
  on public.conversations for insert
  with check (auth.uid() = buyer_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.users(id) on delete cascade,
  text text,
  image_url text,
  created_at timestamptz not null default now(),
  check (text is not null or image_url is not null)
);
create index messages_conv_idx on public.messages(conversation_id, created_at desc);
alter table public.messages enable row level security;
create policy "messages_read_participants"
  on public.messages for select
  using (exists(
    select 1 from public.conversations c
    where c.id = conversation_id and auth.uid() in (c.buyer_id, c.seller_id)
  ));
create policy "messages_insert_participants"
  on public.messages for insert
  with check (
    auth.uid() = sender_id and
    exists(
      select 1 from public.conversations c
      where c.id = conversation_id and auth.uid() in (c.buyer_id, c.seller_id)
    )
  );

-- 取引完了（双方ボタン + 7日タイムアウト）
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null unique references public.conversations(id) on delete cascade,
  seller_completed boolean not null default false,
  buyer_completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.transactions enable row level security;
create policy "transactions_read_participants"
  on public.transactions for select
  using (exists(
    select 1 from public.conversations c
    where c.id = conversation_id and auth.uid() in (c.buyer_id, c.seller_id)
  ));

-- 評価（3段階：◎○△）
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  reviewer_id uuid not null references public.users(id) on delete cascade,
  target_id uuid not null references public.users(id) on delete cascade,
  rating rating_value not null,
  comment text,
  created_at timestamptz not null default now(),
  unique (transaction_id, reviewer_id)
);
alter table public.reviews enable row level security;
create policy "reviews_read_all" on public.reviews for select using (true);
create policy "reviews_insert_self"
  on public.reviews for insert with check (auth.uid() = reviewer_id);

-- 店舗マスタ
create table public.shops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  district text not null,
  phone text not null,
  line_user_id text,
  response_channel response_channel not null default 'line',
  items_description text not null default '',
  opening_hours text,
  address text,
  created_at timestamptz not null default now()
);
alter table public.shops enable row level security;
create policy "shops_read_all" on public.shops for select using (true);

-- 取り寄せリクエスト
create table public.shop_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  shop_id uuid not null references public.shops(id) on delete cascade,
  item text not null,
  quantity int not null default 1 check (quantity > 0),
  deadline timestamptz,
  note text,
  status request_status not null default 'pending',
  shop_reply text, -- 代替提案の本文
  created_at timestamptz not null default now()
);
alter table public.shop_requests enable row level security;
create policy "shop_requests_read_self"
  on public.shop_requests for select using (auth.uid() = user_id);
create policy "shop_requests_insert_self"
  on public.shop_requests for insert with check (auth.uid() = user_id);

-- 通報
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.users(id) on delete cascade,
  target_type text not null check (target_type in ('listing', 'message', 'user', 'stock_alert')),
  target_id uuid not null,
  reason text not null,
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz not null default now()
);
alter table public.reports enable row level security;
create policy "reports_insert_authenticated"
  on public.reports for insert with check (auth.uid() = reporter_id);

-- 緊急（台風）モード履歴
create table public.emergency_modes (
  id uuid primary key default gen_random_uuid(),
  active boolean not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  trigger_source emergency_trigger not null,
  warning_text text
);
alter table public.emergency_modes enable row level security;
create policy "emergency_modes_read_all" on public.emergency_modes for select using (true);

-- 「これがない」ストック警告掲示板
create table public.stock_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  district text not null,
  shop_name text,
  item text not null,
  status stock_status not null,
  comment text,
  created_at timestamptz not null default now()
);
create index stock_alerts_created_idx on public.stock_alerts(created_at desc);
alter table public.stock_alerts enable row level security;
create policy "stock_alerts_read_all" on public.stock_alerts for select using (true);
create policy "stock_alerts_insert_self"
  on public.stock_alerts for insert with check (auth.uid() = user_id);
create policy "stock_alerts_delete_self"
  on public.stock_alerts for delete using (auth.uid() = user_id);
