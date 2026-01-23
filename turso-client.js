// Turso Database Client for API Key Management
class TursoClient {
  constructor(url, authToken) {
    this.url = url;
    this.authToken = authToken;
  }

  async execute(sql, params = []) {
    const response = await fetch(`${this.url}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sql: sql,
        params: params
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Turso query failed: ${error}`);
    }

    return await response.json();
  }

  async query(sql, params = []) {
    const result = await this.execute(sql, params);
    return result.rows || [];
  }

  async run(sql, params = []) {
    await this.execute(sql, params);
  }
}

// Initialize Turso client
const TURSO_URL = 'libsql://koda-lrealms.aws-us-east-2.turso.io';
const TURSO_AUTH_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NjkxNzcyMjMsImlkIjoiY2ZjYjQ3ZTItZDczYy00YmZiLTk0OGYtMzhkMjEwOTk2OTMzIiwicmlkIjoiODc5YjZjNTgtNDI1Yy00YzJlLTgwM2MtYTQyMDhlNGEyMzMyIn0.ykNYwSICLdmjZdbSiVRzi6bdqNW0yY25AQHDLq445ur8EuttcGHCjg11BTFEvznTGVC6-HOEXqD75-XUPAdACA';

const turso = new TursoClient(TURSO_URL, TURSO_AUTH_TOKEN);

// Initialize database schema
async function initTursoSchema() {
  try {
    // Create api_keys table
    await turso.run(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        key_value TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_selected INTEGER DEFAULT 0
      )
    `);
    
    console.log('✓ Turso schema initialized');
    return true;
  } catch (error) {
    console.error('Failed to initialize Turso schema:', error);
    return false;
  }
}

// API Key Operations using Turso
async function getApiKeysFromTurso() {
  try {
    const rows = await turso.query('SELECT * FROM api_keys ORDER BY created_at DESC');
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      key: row.key_value,
      createdAt: row.created_at,
      isSelected: row.is_selected === 1
    }));
  } catch (error) {
    console.error('Failed to fetch API keys from Turso:', error);
    return [];
  }
}

async function addApiKeyToTurso(name, key) {
  try {
    // Check if this is the first key, make it selected
    const existingKeys = await getApiKeysFromTurso();
    const isSelected = existingKeys.length === 0 ? 1 : 0;
    
    await turso.run(
      'INSERT INTO api_keys (name, key_value, is_selected) VALUES (?, ?, ?)',
      [name, key, isSelected]
    );
    
    console.log('✓ API key added to Turso');
    return true;
  } catch (error) {
    console.error('Failed to add API key to Turso:', error);
    return false;
  }
}

async function deleteApiKeyFromTurso(id) {
  try {
    await turso.run('DELETE FROM api_keys WHERE id = ?', [id]);
    console.log('✓ API key deleted from Turso');
    return true;
  } catch (error) {
    console.error('Failed to delete API key from Turso:', error);
    return false;
  }
}

async function selectApiKeyInTurso(id) {
  try {
    // Unselect all keys
    await turso.run('UPDATE api_keys SET is_selected = 0');
    
    // Select the specified key
    await turso.run('UPDATE api_keys SET is_selected = 1 WHERE id = ?', [id]);
    
    console.log('✓ API key selected in Turso');
    return true;
  } catch (error) {
    console.error('Failed to select API key in Turso:', error);
    return false;
  }
}

async function getSelectedApiKeyFromTurso() {
  try {
    const rows = await turso.query('SELECT * FROM api_keys WHERE is_selected = 1 LIMIT 1');
    if (rows.length > 0) {
      return rows[0].key_value;
    }
    return null;
  } catch (error) {
    console.error('Failed to get selected API key from Turso:', error);
    return null;
  }
}
