-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Part" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "categoryId" TEXT,
    "manufacturer" TEXT,
    "mpn" TEXT,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "parameters" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "archivedAt" DATETIME,
    CONSTRAINT "Part_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Part" ("id", "name", "category", "categoryId", "manufacturer", "mpn", "tags", "notes", "parameters", "createdAt", "updatedAt", "archivedAt")
SELECT "id", "name", "category", NULL, "manufacturer", "mpn", "tags", "notes", "parameters", "createdAt", "updatedAt", "archivedAt" FROM "Part";
DROP TABLE "Part";
ALTER TABLE "new_Part" RENAME TO "Part";
PRAGMA foreign_keys=ON;

-- Back-fill Part.categoryId from matching Category.name (best-effort; unmatched rows remain null)
UPDATE "Part"
SET "categoryId" = (
    SELECT "id" FROM "Category" WHERE "Category"."name" = "Part"."category"
)
WHERE "category" IS NOT NULL;

-- CreateIndex
CREATE INDEX "Part_category_idx" ON "Part"("category");

-- CreateIndex
CREATE INDEX "Part_mpn_idx" ON "Part"("mpn");

-- CreateIndex
CREATE INDEX "Part_categoryId_idx" ON "Part"("categoryId");
