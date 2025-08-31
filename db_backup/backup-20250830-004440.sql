PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  nickname TEXT,
  avatar TEXT,
  gender INTEGER DEFAULT 0,
  bio TEXT,
  iphone_num TEXT,
  create_time INTEGER DEFAULT (strftime('%s','now')*1000),
  update_time INTEGER,
  last_login_time INTEGER
, user_uid TEXT);
INSERT INTO "users" VALUES(1,'Turbellarian','123456','Turbellarian','',0,'','18621031321',1755689270270,1755831917559,1755830250092,'2591395');
INSERT INTO "users" VALUES(2,'test','123456','test','',0,'','18621031321',1755833563827,1755834272036,1755833563862,'5191439');
INSERT INTO "users" VALUES(3,'password','pbkdf2_sha256$100000$XT9bsTZ__vQA5gKfk0ub1g$Eg3kkYOG9niYKEXRGIbt1wZqMp2eCx6ns97-ywek0QM','password','',0,'','18621031321',1755835680808,1755835714983,1755835721407,'1388668');
INSERT INTO "users" VALUES(4,'qyj','pbkdf2_sha256$100000$FyQ3OyONFxFMfIS52DG9mQ$ffGmhifCX9HivnQ6h4-trBzQNGdYxqki-Hr33CqOaCM','qyj','',0,'','18621031321',1755852586367,1755852586367,1755858072728,'9984696');
CREATE TABLE activities (
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
  creator_id INTEGER,
  participants TEXT,
  status INTEGER,
  expire INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (strftime('%s','now')*1000),
  updated_at INTEGER
);
INSERT INTO "activities" VALUES(1,'测试','广东省','广州市','荔湾区','asdf','2025-12-23','12:00','13:00','室内运动','18621031321',4,1,'123','Turbellarian',2591395,'[{"userId":"2591395","username":"Turbellarian","avatar":"","joinTime":1755689302710}]',1,0,1755689302710,1755689302710);
INSERT INTO "activities" VALUES(2,'123','天津','天津市','和平区','asdf','2025-12-03','12:00','13:00','室内运动','18621031321',4,1,'asdf','qyj',9984696,'[{"userId":"9984696","username":"qyj","avatar":"","joinTime":1755852615835}]',1,0,1755852615835,1755852615835);
CREATE TABLE feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'new',
  created_at INTEGER DEFAULT (strftime('%s','now')*1000)
);
DELETE FROM sqlite_sequence;
INSERT INTO "sqlite_sequence" VALUES('users',4);
INSERT INTO "sqlite_sequence" VALUES('activities',2);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_activities_creator ON activities(creator_name);
CREATE INDEX idx_activities_created ON activities(created_at DESC);
CREATE INDEX idx_feedback_user ON feedback(username);
CREATE UNIQUE INDEX idx_users_user_uid ON users(user_uid);