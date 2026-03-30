# StudyBuddy 🐬

A mobile-first app for university students to find study partners, connect with classmates, and discuss course material — all in one place. Note that this is only the MVP 1, it will be further developed.

---

## Features

- **Class Management** — Search and enroll in your courses, or create new ones
- **Study Matching** — Push (express interest in) other students in your classes; match when it's mutual
- **Weekly Schedule** — Set your availability with a gesture-based schedule editor
- **Class Threads** — Post and discuss topics within each class, with comments and slaps (likes)
- **Student Profiles** — View classmates' profiles, preferences, and schedules

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React Native (Expo), TypeScript, expo-router |
| Backend | Node.js, Express |
| Database | PostgreSQL (Neon) |
| Auth | JWT (7-day tokens), expo-secure-store |
| Deployment | Railway (backend), EAS (frontend) |

---

## Project Structure

```
StudyBuddy/
├── frontend/
│   ├── app/
│   │   ├── (tabs)/
│   │   │   ├── home/
│   │   │   │   ├── index.tsx       # Class list
│   │   │   │   └── class.tsx       # Class detail + threads
│   │   │   ├── matches.tsx         # Incoming/matched/sent pushes
│   │   │   └── settings.tsx        # Settings + logout
│   │   ├── profile.tsx             # View/edit profile
│   │   ├── schedule.tsx            # Weekly schedule editor
│   │   ├── student/[id].tsx        # View another student's profile
│   │   ├── thread/[id].tsx         # Thread detail + comments
│   │   ├── thread/new.tsx          # Create a new thread
│   │   └── create_class.tsx        # Create a new class
│   ├── context/
│   │   └── auth.tsx                # AuthProvider + useAuth() hook
│   └── utils/
│       └── api.ts                  # All API calls
├── backend/
│   └── index.js                    # Express server + all endpoints
```

---

## Getting Started

### Prerequisites
- Node.js
- Expo Go (for mobile testing)
- A [Neon](https://neon.tech) PostgreSQL database

### Backend

```bash
cd backend
npm install
```

Create a `.env` file:
```
DATABASE_URL=your_neon_connection_string
JWT_SECRET=your_jwt_secret
PORT=8080
```

Run the server:
```bash
node index.js
```

### Frontend

```bash
cd frontend
npm install
npx expo start --tunnel
```

Update `BASE_URL` in `frontend/utils/api.ts` and `frontend/context/auth.tsx` to point to your backend.

---

## Database Schema

| Table | Description |
|---|---|
| `users` | id, name, username, email, password_hash, preferences, schedule, classes |
| `classes` | id, course_code, name, description, professor |
| `enrollments` | user_id, class_id |
| `pushes` | from_user_id, to_user_id |
| `threads` | id, class_id, user_id, title, body |
| `comments` | id, thread_id, user_id, body |
| `slaps` | user_id, thread_id (nullable), comment_id (nullable) |

---

## API Endpoints

```
POST /auth/register
POST /auth/login
GET  /users/me
PUT  /users/me
GET  /users/:id
GET  /classes
POST /classes
GET  /classes/:id
GET  /classes/:id/threads
POST /classes/:id/threads
GET  /enrollments/me
POST /enrollments
DELETE /enrollments/:classId
GET  /threads/:id
POST /threads/:id/comments
POST /threads/:id/slap
DELETE /threads/:id/slap
POST /comments/:id/slap
DELETE /comments/:id/slap
GET  /pushes/sent
GET  /pushes/received
GET  /pushes/matches
GET  /pushes/status/:userId
POST /pushes/:toUserId
DELETE /pushes/:toUserId
```

---

## Deployment

- **Backend** — Hosted on [Railway](https://railway.app). Set `DATABASE_URL`, `JWT_SECRET`, and `PORT` in Railway's Variables tab.
- **Frontend** — Deployed via [EAS Update](https://expo.dev). Run `eas update --branch main --message "your message"` to push updates to testers.

### Pushing updates
```bash
git add .
git commit -m "your changes"
git push origin main
eas update --branch main --message "describe changes"
```

---

## Color Palette

| Element | Color |
|---|---|
| Background | `#4466c9` |
| Header / Tabs | `#32a85e` |
| Cards | `#1c1c1e` |

---

## License

MIT