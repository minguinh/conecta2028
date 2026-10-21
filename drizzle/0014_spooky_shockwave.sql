CREATE INDEX "demands_community_idx" ON "demands" USING btree ("community_id");--> statement-breakpoint
CREATE INDEX "user_role_active_idx" ON "user" USING btree ("role","active");--> statement-breakpoint
CREATE INDEX "visits_community_idx" ON "visits" USING btree ("community_id");