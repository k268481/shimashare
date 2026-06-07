import "server-only";
import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import bcrypt from "bcryptjs";

const globalForDb = globalThis as unknown as { __shimashareDb?: Database.Database };

function openDatabase(): Database.Database {
  const dbPath = process.env.DATABASE_PATH ?? "./data/shimashare.db";
  const absolute = path.isAbsolute(dbPath) ? dbPath : path.join(process.cwd(), dbPath);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  const db = new Database(absolute);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  initSchema(db);
  seedIfEmpty(db);
  return db;
}

export function getDb(): Database.Database {
  if (!globalForDb.__shimashareDb) {
    globalForDb.__shimashareDb = openDatabase();
  }
  return globalForDb.__shimashareDb;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      nickname TEXT NOT NULL,
      -- 地域：都道府県・市区町村・島（任意）
      prefecture TEXT NOT NULL DEFAULT '',
      city TEXT NOT NULL DEFAULT '',
      island TEXT,
      picture_url TEXT,
      role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('super_admin','moderator','user')),
      real_name TEXT,
      address TEXT,
      phone TEXT,
      proxy_for_household INTEGER NOT NULL DEFAULT 0,
      is_adult INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS listings (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      price INTEGER NOT NULL DEFAULT 0,
      category TEXT NOT NULL CHECK (category IN ('food','daily','clothing','baby','appliance','other')),
      photos TEXT NOT NULL DEFAULT '[]',
      handover TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','matched','completed','hidden')),
      is_emergency_offer INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status, created_at DESC);

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
      buyer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      seller_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','completed')),
      buyer_last_read_at TEXT,
      seller_last_read_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (listing_id, buyer_id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      text TEXT,
      image_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id, created_at);

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL UNIQUE REFERENCES conversations(id) ON DELETE CASCADE,
      seller_completed INTEGER NOT NULL DEFAULT 0,
      buyer_completed INTEGER NOT NULL DEFAULT 0,
      completed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
      reviewer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      target_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      rating TEXT NOT NULL CHECK (rating IN ('good','normal','bad')),
      comment TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (transaction_id, reviewer_id)
    );

    CREATE TABLE IF NOT EXISTS shops (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      location TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL,
      line_user_id TEXT,
      response_channel TEXT NOT NULL DEFAULT 'line' CHECK (response_channel IN ('line','phone')),
      items_description TEXT NOT NULL DEFAULT '',
      opening_hours TEXT,
      address TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS shop_requests (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
      item TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      deadline TEXT,
      note TEXT,
      status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending','ok','ng','alternative','received','expired')),
      shop_reply TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS stock_alerts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      location TEXT NOT NULL DEFAULT '',
      shop_name TEXT,
      item TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('out_of_stock','restocked','low_stock')),
      comment TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_stock_alerts_created ON stock_alerts(created_at DESC);

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      reporter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      target_type TEXT NOT NULL CHECK (target_type IN ('listing','message','user','stock_alert')),
      target_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewing','resolved','dismissed')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS emergency_modes (
      id TEXT PRIMARY KEY,
      active INTEGER NOT NULL,
      started_at TEXT,
      ended_at TEXT,
      trigger_source TEXT NOT NULL CHECK (trigger_source IN ('auto','manual')),
      warning_text TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

function seedIfEmpty(db: Database.Database) {
  const count = db.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number };
  if (count.n > 0) return;

  const tx = db.transaction(() => {
    const passwordHash = bcrypt.hashSync("password123", 10);
    const insUser = db.prepare(`
      INSERT INTO users (id, email, password_hash, nickname, prefecture, city, island, role, is_adult, created_at)
      VALUES (@id, @email, @hash, @nickname, @prefecture, @city, @island, @role, 1, @createdAt)
    `);
    const demoUsers = [
      { email: "shimachan@example.com", nickname: "しまちゃん", prefecture: "沖縄県", city: "石垣市", island: "石垣島", role: "user" },
      { email: "yamamoto@example.com",  nickname: "ヤマモト",   prefecture: "沖縄県", city: "竹富町", island: "西表島", role: "user" },
      { email: "achan@example.com",     nickname: "あーちゃん", prefecture: "沖縄県", city: "与那国町", island: "与那国島", role: "moderator" },
      { email: "admin@example.com",     nickname: "島の管理人", prefecture: "沖縄県", city: "石垣市", island: "石垣島", role: "super_admin" },
    ];
    const userIds: Record<string, string> = {};
    demoUsers.forEach((u) => {
      const id = crypto.randomUUID();
      userIds[u.email] = id;
      insUser.run({ id, email: u.email, hash: passwordHash, nickname: u.nickname,
        prefecture: u.prefecture, city: u.city, island: u.island, role: u.role,
        createdAt: new Date().toISOString() });
    });

    const insListing = db.prepare(`
      INSERT INTO listings (id, user_id, title, description, price, category, photos, handover, status, created_at)
      VALUES (@id, @userId, @title, @description, @price, @category, @photos, @handover, 'active', @createdAt)
    `);
    const seedListings = [
      { userId: userIds["shimachan@example.com"], title: "島バナナ お裾分けします",
        description: "庭で採れすぎたので無料でゆずります。完熟しているのでお早めに。",
        price: 0, category: "food",
        photos: ["https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=800"],
        handover: "石垣市内で手渡し、水曜18時頃" },
      { userId: userIds["yamamoto@example.com"], title: "電動草刈り機（マキタ）",
        description: "2年使用、動作良好。バッテリー2個付き。買い替えのため。",
        price: 8500, category: "appliance",
        photos: ["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800"],
        handover: "西表島 直接受け渡しまたは引き取り" },
      { userId: userIds["achan@example.com"], title: "子ども用長靴（17cm）",
        description: "サイズアウトしました。雨の日にどうぞ。",
        price: 0, category: "baby",
        photos: ["https://images.unsplash.com/photo-1551489186-cf8726f514f8?w=800"],
        handover: "与那国島 集会所前" },
      { userId: userIds["shimachan@example.com"], title: "未開封 トイレットペーパー 12ロール",
        description: "買いすぎたのでお譲りします。",
        price: 500, category: "daily",
        photos: ["https://images.unsplash.com/photo-1583947581924-860bda6a26df?w=800"],
        handover: "石垣市内で配達可能" },
      { userId: userIds["yamamoto@example.com"], title: "大人用 防水ジャケットLサイズ",
        description: "ほぼ未使用です。台風シーズンにぜひ。",
        price: 2000, category: "clothing",
        photos: ["https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?w=800"],
        handover: "西表島 平日夕方" },
    ];
    const now = Date.now();
    seedListings.forEach((l, i) =>
      insListing.run({ id: crypto.randomUUID(), ...l,
        photos: JSON.stringify(l.photos),
        createdAt: new Date(now - i * 3600_000).toISOString() })
    );

    const insShop = db.prepare(`
      INSERT INTO shops (id, name, location, phone, line_user_id, response_channel, items_description, opening_hours, address)
      VALUES (@id, @name, @location, @phone, @lineUserId, @channel, @items, @hours, @address)
    `);
    [
      { name: "離島スーパー石垣店", location: "沖縄県石垣市", phone: "0980-00-0001",
        lineUserId: "line-shop-1", channel: "line",
        items: "食料品全般、米、調味料、酒類（販売免許あり）、紙オムツ、ペットフード",
        hours: "8:00-20:00（日曜定休）", address: "石垣市大川123" },
      { name: "西表金物店", location: "沖縄県竹富町（西表島）", phone: "0980-00-0002",
        lineUserId: null, channel: "phone",
        items: "工具、漁具、台風養生用品（ブルーシート、ロープ）、園芸用品",
        hours: "9:00-18:00", address: "竹富町西表45" },
      { name: "与那国ドラッグ", location: "沖縄県与那国町（与那国島）", phone: "0980-00-0003",
        lineUserId: "line-shop-3", channel: "line",
        items: "日用品、トイレットペーパー、洗剤、子ども用品、化粧品",
        hours: "10:00-21:00", address: "与那国町祖納" },
    ].forEach((s) => insShop.run({ id: crypto.randomUUID(), ...s }));

    const insAlert = db.prepare(`
      INSERT INTO stock_alerts (id, user_id, location, shop_name, item, status, comment, created_at)
      VALUES (@id, @userId, @location, @shopName, @item, @status, @comment, @createdAt)
    `);
    [
      { userId: userIds["shimachan@example.com"], location: "沖縄県石垣市（石垣島）",
        shopName: "離島スーパー石垣店", item: "ペットボトル水（2L）",
        status: "out_of_stock", comment: "棚が空でした。次の入荷は不明とのこと。", ageMin: 30 },
      { userId: userIds["achan@example.com"], location: "沖縄県与那国町（与那国島）",
        shopName: "与那国ドラッグ", item: "カセットボンベ",
        status: "low_stock", comment: "残り少なめ、お一人様2本までと張り紙。", ageMin: 120 },
      { userId: userIds["yamamoto@example.com"], location: "沖縄県竹富町（西表島）",
        shopName: "西表金物店", item: "ブルーシート（大）",
        status: "restocked", comment: "ちょうど追加入荷したそうです！", ageMin: 240 },
    ].forEach((a) => insAlert.run({
      id: crypto.randomUUID(), userId: a.userId, location: a.location,
      shopName: a.shopName, item: a.item, status: a.status, comment: a.comment,
      createdAt: new Date(now - a.ageMin * 60_000).toISOString() }));

    db.prepare(`INSERT INTO emergency_modes (id, active, trigger_source, created_at) VALUES (?, 0, 'manual', ?)`)
      .run(crypto.randomUUID(), new Date().toISOString());
  });
  tx();
}
