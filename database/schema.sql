-- D1 schema for Cloudflare Pages Functions

-- Users
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  nickname TEXT,
  avatar TEXT,
  gender INTEGER DEFAULT 0,
  bio TEXT,
  create_time INTEGER DEFAULT (strftime('%s','now')*1000),
  update_time INTEGER,
  last_login_time INTEGER
);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Activities
CREATE TABLE IF NOT EXISTS activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  area TEXT,
  location TEXT,
  date TEXT,
  time_slot TEXT,
  end_time TEXT,
  type TEXT,
  contact TEXT,
  total_people INTEGER,
  joined_people INTEGER,
  description TEXT,
  creator_name TEXT,
  creator_id INTEGER,
  participants TEXT, -- JSON string array
  status INTEGER, -- 1=ongoing,2=finished
  created_at INTEGER DEFAULT (strftime('%s','now')*1000),
  updated_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_activities_creator ON activities(creator_name);
CREATE INDEX IF NOT EXISTS idx_activities_created ON activities(created_at DESC);

-- Feedback
CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'new',
  created_at INTEGER DEFAULT (strftime('%s','now')*1000)
);
CREATE INDEX IF NOT EXISTS idx_feedback_user ON feedback(username);
