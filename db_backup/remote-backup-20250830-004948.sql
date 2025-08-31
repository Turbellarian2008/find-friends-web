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
INSERT INTO users VALUES(9,'zls','pbkdf2_sha256$100000$wu3Z2UyxyKDanDz2R7eQaA$15g4atiFzNrDaVerksyUq0MZPHCY439YfZ2FIDRXTaE','zls','',0,'','13509834270',1755779794058,1755779794058,0,'3017963');
INSERT INTO users VALUES(11,'qyj','pbkdf2_sha256$100000$-6h0rzLyvCLPZvRvBk4jyw$viXAHxopVLR51-YaP-eM-ze0UgqOVl8P2RBqUAV2wM4','qyj','',0,'','18621031321',1755858844326,1755858844326,0,'5819681');
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
INSERT INTO activities VALUES(9,'篮球','广东省','广州市','越秀区','df','1111-11-22','22:22','22:33','户外运动','11111111111',2,1,'22','zls',3017963,'[{"userId":"3017963","username":"zls","avatar":"","joinTime":1755780003168}]',1,1,1755780003168,1755780003168);
INSERT INTO activities VALUES(12,'篮球','广东省','茂名市','高州市','南城','2025-08-24','09:30','10:30','户外运动','13333333333',2,1,'Jjj','zls',3017963,'[{"userId":"3017963","username":"zls","avatar":"","joinTime":1755860850742}]',1,1,1755860850742,1755860850742);
INSERT INTO activities VALUES(14,'asdf','河北省','唐山市','古冶区','saf','2025-03-12','13:00','14:00','室内运动','18621031321',10,1,'123','qyj',5819681,'[{"userId":"5819681","username":"qyj","avatar":"","joinTime":1756476197556}]',1,1,1756476197556,1756476197556);
CREATE TABLE feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'new',
  created_at INTEGER DEFAULT (strftime('%s','now')*1000)
, user_uid TEXT);
INSERT INTO feedback VALUES(1,'luke','添加头像功能………江河湖海接电话电话电话','new',1755684484490,NULL);
INSERT INTO feedback VALUES(2,NULL,'添加账户删除功能，用户名违禁词检测','new',1755697894227,'1296887');
DELETE FROM sqlite_sequence;
INSERT INTO sqlite_sequence VALUES('users',11);
INSERT INTO sqlite_sequence VALUES('activities',14);
INSERT INTO sqlite_sequence VALUES('feedback',2);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_activities_creator ON activities(creator_name);
CREATE INDEX idx_activities_created ON activities(created_at DESC);
CREATE INDEX idx_feedback_user ON feedback(username);
CREATE UNIQUE INDEX idx_users_user_uid ON users(user_uid);
CREATE INDEX idx_feedback_user_uid ON feedback(user_uid);
