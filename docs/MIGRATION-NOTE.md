# Database Migration Note

## Security Features Implementation

After implementing Phase 1.1.8 Security Features, you need to run a database migration to add the new fields to the User model.

### New Fields Added to User Model

1. `failedLoginAttempts` (Int, default: 0) - Counter for failed login attempts
2. `lockedUntil` (DateTime?, nullable) - Timestamp when account will be unlocked

### Migration Command

Run the following command to create and apply the migration:

```bash
npm run prisma:migrate
```

Or if you prefer to push the schema directly (development only):

```bash
npm run prisma:push
```

### After Migration

1. Regenerate Prisma Client:
   ```bash
   npm run prisma:generate
   ```

2. Verify the migration was successful by checking the database schema.

### Important Notes

- The migration is backward compatible (new fields have defaults)
- Existing users will have `failedLoginAttempts = 0` and `lockedUntil = null`
- No data loss will occur
