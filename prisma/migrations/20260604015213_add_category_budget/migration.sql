-- CreateEnum
CREATE TYPE "BudgetFrequency" AS ENUM ('MONTHLY', 'BIMONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateTable
CREATE TABLE "category_budgets" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "amountPerCycle" DECIMAL(15,2) NOT NULL,
    "frequency" "BudgetFrequency" NOT NULL DEFAULT 'MONTHLY',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "category_budgets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "category_budgets_year_idx" ON "category_budgets"("year");

-- CreateIndex
CREATE UNIQUE INDEX "category_budgets_categoryId_year_key" ON "category_budgets"("categoryId", "year");

-- AddForeignKey
ALTER TABLE "category_budgets" ADD CONSTRAINT "category_budgets_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "expense_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
