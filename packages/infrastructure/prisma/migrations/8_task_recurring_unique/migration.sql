-- CreateIndex
-- Prevents the same recurring definition from being materialized more than once
-- into a single daily list. NULL recurring_task_id rows are unconstrained
-- (Postgres treats NULLs as distinct), so ad-hoc tasks are unaffected.
CREATE UNIQUE INDEX "tasks_list_id_recurring_task_id_key" ON "tasks"("list_id", "recurring_task_id");
