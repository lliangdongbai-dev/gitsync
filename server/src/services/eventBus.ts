import { Response } from 'express';

/**
 * Simple Server-Sent Events (SSE) event bus.
 * Allows broadcasting task status changes to all connected clients.
 */

/** Connected SSE clients */
const clients = new Set<Response>();

/**
 * Register a new SSE client connection.
 */
export function addClient(res: Response): void {
  clients.add(res);
}

/**
 * Remove a disconnected SSE client.
 */
export function removeClient(res: Response): void {
  clients.delete(res);
}

/**
 * Broadcast an event to all connected SSE clients.
 */
export function broadcast(event: string, data: any): void {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of clients) {
    try {
      client.write(payload);
    } catch {
      clients.delete(client);
    }
  }
}

/**
 * Get the number of connected clients.
 */
export function getClientCount(): number {
  return clients.size;
}
