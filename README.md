# Doctor Admin Frontend

Frontend implementation for admin authentication and profile management.

## Stack

- React + TypeScript + Vite
- Feature-first folder structure
- Shared typed API client with auto refresh token flow

## Environment

Create `.env` from `.env.example` and set:

```bash
VITE_API_BASE_URL=http://localhost:3000
```

## Scripts

```bash
npm run dev
npm run build
npm run lint
```

## Implemented API Flow

1. `POST /auth/login` stores `accessToken` + `refreshToken`.
2. Protected calls send `Authorization: Bearer <accessToken>`.
3. If protected call returns `401`, frontend automatically calls `POST /auth/refresh`.
4. On successful refresh, both tokens are rotated and overwritten.
5. Original request is retried once.
6. If refresh fails, tokens are cleared and UI returns to login.
7. `POST /auth/change-password` clears session and forces re-login.

## Project Structure

```text
src/
  app/
    App.tsx
  pages/
    auth/
      AuthPage.tsx
    admin/
      AdminDashboardPage.tsx
  features/
    auth/
      api/
      components/
      types/
    admin/
      api/
      components/
      types/
  shared/
    components/
    constants/
    services/
    types/
    utils/
```
# doctor_app_front
