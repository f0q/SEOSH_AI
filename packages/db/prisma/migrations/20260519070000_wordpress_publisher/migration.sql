-- PublisherConnector: add Project relation, baseUrl, isDefault, lastError.
-- ContentItem: track which connector published it and the remote post id.

-- AlterTable: publisher_connectors
ALTER TABLE "publisher_connectors" ADD COLUMN "baseUrl" TEXT NOT NULL DEFAULT '';
ALTER TABLE "publisher_connectors" ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "publisher_connectors" ADD COLUMN "lastError" TEXT;

CREATE INDEX IF NOT EXISTS "publisher_connectors_projectId_idx" ON "publisher_connectors"("projectId");

ALTER TABLE "publisher_connectors"
  ADD CONSTRAINT "publisher_connectors_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: content_items
ALTER TABLE "content_items" ADD COLUMN "publisherConnectorId" TEXT;
ALTER TABLE "content_items" ADD COLUMN "externalPostId" TEXT;

ALTER TABLE "content_items"
  ADD CONSTRAINT "content_items_publisherConnectorId_fkey"
  FOREIGN KEY ("publisherConnectorId") REFERENCES "publisher_connectors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
