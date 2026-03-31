-- PIN hashing now uses a global salt (SIGNING_SECRET) instead of per-user salt,
-- enabling lookup-by-PIN for PIN-only login. All existing PIN hashes are
-- invalidated and must be reset by an administrator.
UPDATE "users" SET "pin" = NULL;

ALTER TABLE "users" ADD CONSTRAINT "users_pin_unique" UNIQUE("pin");
