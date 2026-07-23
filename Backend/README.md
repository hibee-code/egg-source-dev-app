# Backend — Quick Commands

Run the development server:

```
npm run dev
```

Start the server in production:

```
npm start
```

Create the initial Super Admin (idempotent):

```
npm run create-admin
```

This command connects to the configured database and ensures a `SUPER_ADMIN` user exists. Use the `INITIAL_ADMIN_EMAIL` and `INITIAL_ADMIN_PASSWORD` environment variables to control credentials.
