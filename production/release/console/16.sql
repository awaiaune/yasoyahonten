CREATE INDEX IF NOT EXISTS mg_notification_due ON mg_job_notifications(state,next_due);
