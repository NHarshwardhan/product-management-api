import express from 'express';
import productRoutes from './routes/products.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { createMcpRouter } from './mcp.js';

export function createApp() {
  const app = express();

  app.use(express.json());

  app.use('/products', productRoutes);

  // MCP endpoint — add this line
  app.use('/mcp', createMcpRouter());

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}