-- DropForeignKey
ALTER TABLE "folders" DROP CONSTRAINT "folders_parentId_fkey";

-- DropForeignKey
ALTER TABLE "folders" DROP CONSTRAINT "folders_createdById_fkey";

-- DropForeignKey
ALTER TABLE "files" DROP CONSTRAINT "files_folderId_fkey";

-- DropForeignKey
ALTER TABLE "files" DROP CONSTRAINT "files_uploadedById_fkey";

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "id" TYPE UUID USING ("id"::uuid);

-- AlterTable
ALTER TABLE "folders" ALTER COLUMN "id" TYPE UUID USING ("id"::uuid),
ALTER COLUMN "parentId" TYPE UUID USING ("parentId"::uuid),
ALTER COLUMN "createdById" TYPE UUID USING ("createdById"::uuid);

-- AlterTable
ALTER TABLE "files" ALTER COLUMN "id" TYPE UUID USING ("id"::uuid),
ALTER COLUMN "folderId" TYPE UUID USING ("folderId"::uuid),
ALTER COLUMN "uploadedById" TYPE UUID USING ("uploadedById"::uuid);

-- AddForeignKey
ALTER TABLE "folders" ADD CONSTRAINT "folders_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "folders" ADD CONSTRAINT "folders_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
