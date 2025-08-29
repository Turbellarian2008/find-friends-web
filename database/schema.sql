-- D1 schema for Cloudflare Pages Functions

-- Users
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  nickname TEXT,
  avatar TEXT,
  gender INTEGER DEFAULT 0,
  bio TEXT,
  iphone_num TEXT,
  user_uid TEXT,
  create_time INTEGER DEFAULT (strftime('%s','now')*1000),
  update_time INTEGER,
  last_login_time INTEGER
);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_user_uid ON users(user_uid);

-- Activities
CREATE TABLE IF NOT EXISTS activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  province TEXT,
  city TEXT,
  area TEXT,
  location TEXT,
  date TEXT,
  start_time TEXT,
  end_time TEXT,
  type TEXT,
  contact TEXT,
  total_people INTEGER,
  joined_people INTEGER,
  description TEXT,
  creator_name TEXT,
  creator_id TEXT,
  participants TEXT,
  status INTEGER,
  expire INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (strftime('%s','now')*1000),
  updated_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_activities_creator ON activities(creator_name);
CREATE INDEX IF NOT EXISTS idx_activities_created ON activities(created_at DESC);

-- Feedback
CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT,
  user_uid TEXT,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'new',
  created_at INTEGER DEFAULT (strftime('%s','now')*1000)
);
CREATE INDEX IF NOT EXISTS idx_feedback_user ON feedback(username);
CREATE INDEX IF NOT EXISTS idx_feedback_user_uid ON feedback(user_uid);
