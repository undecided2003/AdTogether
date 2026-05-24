import type { JSONRPCMessage, MessageExtraInfo } from '@modelcontextprotocol/sdk/types.js';
import { JSONRPCMessageSchema } from '@modelcontextprotocol/sdk/types.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';

type StreamWriter = (chunk: string) => void;

/**
 * Legacy MCP HTTP+SSE transport for clients (e.g. Antigravity) that expect
 * GET /sse + POST /message rather than Streamable HTTP.
 */
export class LegacyWebSseTransport implements Transport {
  readonly sessionId: string;
  private started = false;
  private closed = false;
  private writer: StreamWriter | null = null;

  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage, extra?: MessageExtraInfo) => void;

  constructor(
    private readonly messageEndpointPath: string,
    sessionId?: string
  ) {
    this.sessionId = sessionId ?? crypto.randomUUID();
  }

  attachWriter(write: StreamWriter): void {
    this.writer = write;
  }

  async start(): Promise<void> {
    if (this.started) {
      throw new Error('LegacyWebSseTransport already started');
    }
    if (!this.writer) {
      throw new Error('LegacyWebSseTransport writer not attached');
    }
    this.started = true;
    const endpoint = `${this.messageEndpointPath}${this.messageEndpointPath.includes('?') ? '&' : '?'}sessionId=${encodeURIComponent(this.sessionId)}`;
    this.writer(`event: endpoint\ndata: ${endpoint}\n\n`);
  }

  async handleMessage(message: unknown, extra?: MessageExtraInfo): Promise<void> {
    let parsedMessage: JSONRPCMessage;
    try {
      parsedMessage = JSONRPCMessageSchema.parse(message);
    } catch (error) {
      this.onerror?.(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
    this.onmessage?.(parsedMessage, extra);
  }

  async send(message: JSONRPCMessage): Promise<void> {
    if (!this.writer || this.closed) {
      throw new Error('LegacyWebSseTransport not connected');
    }
    this.writer(`event: message\ndata: ${JSON.stringify(message)}\n\n`);
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    this.writer = null;
    this.onclose?.();
  }
}
