const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// データベース初期化
const dbPath = path.join(__dirname, 'rpg.db');
const db = new Database(dbPath);

// ミドルウェア設定
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// テーブル作成
db.exec(`
  CREATE TABLE IF NOT EXISTS characters (
    username TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS inventory (
    username TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS rooms (
    room_id TEXT PRIMARY KEY,
    players TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );
`);

console.log('✅ データベース準備完了');

// ========== API エンドポイント ==========

// ヘルスチェック
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'RPGサーバーが動いています！',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/ping', (req, res) => {
  res.json({ 
    message: 'サーバーは正常です', 
    timestamp: Date.now() 
  });
});

// キャラクター保存
app.post('/api/character/save', (req, res) => {
  const { username, data } = req.body;
  
  if (!username || !data) {
    return res.status(400).json({ error: 'ユーザー名とデータが必要です' });
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO characters (username, data, updated_at) 
      VALUES (?, ?, ?)
      ON CONFLICT(username) DO UPDATE SET 
        data = excluded.data,
        updated_at = excluded.updated_at
    `);
    
    stmt.run(username, data, Date.now());
    
    console.log(`💾 保存: ${username}`);
    res.json({ success: true, message: '保存しました' });
  } catch (error) {
    console.error('保存エラー:', error);
    res.status(500).json({ error: '保存失敗', details: error.message });
  }
});

// キャラクター読み込み
app.get('/api/character/load/:username', (req, res) => {
  const { username } = req.params;
  
  try {
    const stmt = db.prepare('SELECT data FROM characters WHERE username = ?');
    const row = stmt.get(username);
    
    if (row) {
      console.log(`📖 読み込み: ${username}`);
      res.json({ data: row.data });
    } else {
      res.status(404).json({ error: 'データなし' });
    }
  } catch (error) {
    console.error('読み込みエラー:', error);
    res.status(500).json({ error: '読み込み失敗' });
  }
});

// インベントリ保存
app.post('/api/inventory/save', (req, res) => {
  const { username, data } = req.body;
  
  if (!username || !data) {
    return res.status(400).json({ error: 'ユーザー名とデータが必要です' });
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO inventory (username, data, updated_at) 
      VALUES (?, ?, ?)
      ON CONFLICT(username) DO UPDATE SET 
        data = excluded.data,
        updated_at = excluded.updated_at
    `);
    
    stmt.run(username, data, Date.now());
    
    console.log(`🎒 インベントリ保存: ${username}`);
    res.json({ success: true });
  } catch (error) {
    console.error('保存エラー:', error);
    res.status(500).json({ error: '保存失敗' });
  }
});

// インベントリ読み込み
app.get('/api/inventory/load/:username', (req, res) => {
  const { username } = req.params;
  
  try {
    const stmt = db.prepare('SELECT data FROM inventory WHERE username = ?');
    const row = stmt.get(username);
    
    if (row) {
      console.log(`🎒 インベントリ読み込み: ${username}`);
      res.json({ data: row.data });
    } else {
      res.status(404).json({ error: 'データなし' });
    }
  } catch (error) {
    console.error('読み込みエラー:', error);
    res.status(500).json({ error: '読み込み失敗' });
  }
});

// ルームプレイヤー保存
app.post('/api/room/players', (req, res) => {
  const { roomId, players } = req.body;
  
  if (!roomId || !players) {
    return res.status(400).json({ error: 'ルームIDとプレイヤーが必要です' });
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO rooms (room_id, players, updated_at) 
      VALUES (?, ?, ?)
      ON CONFLICT(room_id) DO UPDATE SET 
        players = excluded.players,
        updated_at = excluded.updated_at
    `);
    
    stmt.run(roomId, players, Date.now());
    res.json({ success: true });
  } catch (error) {
    console.error('ルーム保存エラー:', error);
    res.status(500).json({ error: '保存失敗' });
  }
});

// ルームプレイヤー読み込み
app.get('/api/room/players/:roomId', (req, res) => {
  const { roomId } = req.params;
  
  try {
    const stmt = db.prepare('SELECT players FROM rooms WHERE room_id = ?');
    const row = stmt.get(roomId);
    
    if (row) {
      res.json({ players: row.players });
    } else {
      res.json({ players: '[]' });
    }
  } catch (error) {
    console.error('ルーム読み込みエラー:', error);
    res.status(500).json({ error: '読み込み失敗' });
  }
});

// サーバー起動
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 サーバー起動: ポート ${PORT}`);
  console.log(`📊 データベース: ${dbPath}`);
});

// 終了処理
process.on('SIGINT', () => {
  db.close();
  console.log('\n👋 サーバー終了');
  process.exit(0);
});

process.on('SIGTERM', () => {
  db.close();
  console.log('\n👋 サーバー終了');
  process.exit(0);
});
