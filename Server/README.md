# Game Server

WebSocket game logic server built with Bun and Elysia framework for real-time gaming experiences.

## Features

- Real-time WebSocket communication
- Game logic processing
- Player authentication with signed requests
- Partner API management
- Transaction handling

## Development

```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Run production
bun run start
```

## API Authentication

All requests require HMAC-SHA256 signed headers:
- `x-api-key`: Partner API key
- `x-timestamp`: Request timestamp  
- `x-signature`: Generated signature

See the main README.md for complete documentation.
