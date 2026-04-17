/**
 * @module @seosh/publisher
 * @description CMS Publishing service.
 * 
 * Connectors architecture:
 *   PublisherService → CMSConnector (interface)
 *     ├── WordPressConnector (REST API) — implemented first
 *     ├── TildaConnector — planned
 *     ├── BitrixConnector — planned
 *     ├── OwnCMSConnector — static site generator, planned
 *     └── CustomAPIConnector — generic REST, planned
 */

import type { PublishRequest, PublishResult, ConnectorType } from '@seosh/shared/types';

/** CMS connector interface — all connectors must implement this */
export interface CMSConnector {
  readonly type: ConnectorType;
  readonly name: string;

  /** Test the connection to the CMS */
  testConnection(): Promise<boolean>;

  /** Publish a content item to the CMS */
  publish(request: PublishRequest & { title: string; htmlBody: string; slug: string }): Promise<PublishResult>;

  /** Update an already-published content item */
  update(externalId: string, updates: { title?: string; htmlBody?: string }): Promise<PublishResult>;

  /** Delete a published content item */
  delete(externalId: string): Promise<boolean>;
}

/** Publisher service managing multiple CMS connectors */
export class PublisherService {
  private connectors: Map<string, CMSConnector> = new Map();

  register(id: string, connector: CMSConnector): void {
    this.connectors.set(id, connector);
  }

  getConnector(id: string): CMSConnector {
    const connector = this.connectors.get(id);
    if (!connector) throw new Error(`CMS connector "${id}" not found`);
    return connector;
  }

  list(): Array<{ id: string; type: ConnectorType; name: string }> {
    return Array.from(this.connectors.entries()).map(([id, c]) => ({
      id,
      type: c.type,
      name: c.name,
    }));
  }
}

// WordPress connector will be the first implementation
export { PublisherService as default };
