// MongoDB Initialization Script for Jili Games
// This script runs automatically when the MongoDB container starts for the first time

// Switch to the logs database
db = db.getSiblingDB('jili_logs');

// Create collections with indexes for better performance
db.createCollection('game_logs');
db.createCollection('spin_logs');
db.createCollection('transaction_logs');
db.createCollection('error_logs');
db.createCollection('audit_logs');

// Create indexes for game_logs collection
db.game_logs.createIndex({ "player_id": 1 });
db.game_logs.createIndex({ "game_id": 1 });
db.game_logs.createIndex({ "partner_id": 1 });
db.game_logs.createIndex({ "created_at": -1 });
db.game_logs.createIndex({ "session_id": 1 });
db.game_logs.createIndex({ "player_id": 1, "game_id": 1, "created_at": -1 });

// Create indexes for spin_logs collection
db.spin_logs.createIndex({ "player_id": 1 });
db.spin_logs.createIndex({ "game_id": 1 });
db.spin_logs.createIndex({ "round_id": 1 });
db.spin_logs.createIndex({ "created_at": -1 });
db.spin_logs.createIndex({ "player_id": 1, "created_at": -1 });
db.spin_logs.createIndex({ "bet_amount": 1 });
db.spin_logs.createIndex({ "win_amount": 1 });

// Create indexes for transaction_logs collection
db.transaction_logs.createIndex({ "player_id": 1 });
db.transaction_logs.createIndex({ "partner_id": 1 });
db.transaction_logs.createIndex({ "transaction_type": 1 });
db.transaction_logs.createIndex({ "created_at": -1 });
db.transaction_logs.createIndex({ "reference_id": 1 }, { unique: true, sparse: true });
db.transaction_logs.createIndex({ "player_id": 1, "transaction_type": 1, "created_at": -1 });

// Create indexes for error_logs collection
db.error_logs.createIndex({ "error_type": 1 });
db.error_logs.createIndex({ "service": 1 });
db.error_logs.createIndex({ "created_at": -1 });
db.error_logs.createIndex({ "player_id": 1 });
db.error_logs.createIndex({ "resolved": 1, "created_at": -1 });

// Create indexes for audit_logs collection
db.audit_logs.createIndex({ "user_id": 1 });
db.audit_logs.createIndex({ "action": 1 });
db.audit_logs.createIndex({ "resource": 1 });
db.audit_logs.createIndex({ "created_at": -1 });
db.audit_logs.createIndex({ "user_id": 1, "action": 1, "created_at": -1 });

// Create a TTL index to automatically delete old logs (optional - 90 days retention)
// Uncomment if you want automatic cleanup
// db.game_logs.createIndex({ "created_at": 1 }, { expireAfterSeconds: 7776000 });
// db.spin_logs.createIndex({ "created_at": 1 }, { expireAfterSeconds: 7776000 });
// db.error_logs.createIndex({ "created_at": 1 }, { expireAfterSeconds: 7776000 });

print('MongoDB initialization completed successfully!');
print('Collections created: game_logs, spin_logs, transaction_logs, error_logs, audit_logs');
print('Indexes created for optimal query performance');