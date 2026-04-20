# GameForge Marketplace — Frontend

Player-facing storefront and game launcher for the GameForge platform.

**Stack:** Vue 3 · Pinia · Vue Router · Vite · TailwindCSS

---

## Setup

```bash
cd marketplace
npm install
npm run dev
```

Runs on **http://localhost:3002**

> Requires the Marketplace API running on **http://localhost:3004**

---

## Routes

| Route | Description |
|---|---|
| `/` | Homepage — featured games and hero banner |
| `/catalog` | Full game catalog with search and filters |
| `/game/:slug` | Game detail page (description, price, screenshots) |
| `/play/:slug` | In-browser game player |
| `/auth` | Login and registration page |
| `/dashboard` | Developer dashboard (publish games, view stats) |
| `/profile` | User profile and purchased games |

---

## Environment

The API base URL defaults to `http://localhost:3004`. To point at a different backend, set `VITE_API_URL` in a `.env.local` file:

```
VITE_API_URL=https://api.yourdomain.com
```
