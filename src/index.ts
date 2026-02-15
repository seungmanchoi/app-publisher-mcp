#!/usr/bin/env node

import { AppPublisherServer } from './server.js';

const server = new AppPublisherServer();
server.run().catch((error) => {
  console.error('Failed to start App Publisher MCP server:', error);
  process.exit(1);
});
