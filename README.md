# StudyBuddy 🐬

A mobile-first app for university students to find compatible study partners, connect with classmates, and discuss course material — all in one place.

---

## Features

- **Class Management** — Search and enroll in your courses, or create new ones
- **Compatibility Matching** — Algorithm-based scoring using schedule overlap, study preferences, and shared classes
- **Study Matching** — Push (express interest in) other students; match when it's mutual
- **Recommendations** — Discover top-ranked study partners from your classes sorted by compatibility
- **Direct Messaging** — Chat privately with matched students
- **Push Notifications** — Get notified for new messages, match requests, and mutual matches
- **Weekly Schedule** — Set your availability with a gesture-based schedule editor
- **Class Threads** — Post and discuss topics within each class, with comments and slaps (likes)
- **Student Profiles** — View classmates' combined schedule availability, preferences, and compatibility score
- **Dark Mode** — Full dark mode support across the app
- **User Safety** — Block users, report inappropriate behavior, and delete your account at any time
- **Search** — Find any user by name or username with fuzzy matching

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React Native (Expo), TypeScript, expo-router |
| Backend | Node.js, Express |
| Database | PostgreSQL (Neon) |
| Auth | JWT (7-day tokens), expo-secure-store |
| Email | Resend |
| Deployment | Railway (backend), EAS (frontend) |

---

## Project Structure

    StudyBuddy/
    ├── frontend/
    │   ├── app/
    │   │   ├── (tabs)/
    │   │   │   ├── home/
    │   │   │   │   ├── index.tsx           # Class list with dolphin speech bubble
    │   │   │   │   └── class.tsx           # Class detail + threads + members sorted by compatibility
    │   │   │   ├── matches.tsx             # Incoming/matched/sent pushes + user search
    │   │   │   └── settings.tsx            # Settings + logout + privacy policy
    │   │   ├── dm/[id].tsx                 # Direct messaging screen
    │   │   ├── recommendations.tsx         # Top recommended study partners
    │   │   ├── privacy.tsx                 # Privacy policy
    │   │   ├── profile.tsx                 # View/edit profile + delete account
    │   │   ├── schedule.tsx                # Weekly schedule editor
    │   │   ├── student/[id].tsx            # View another student's profile + block/report
    │   │   ├── thread/[id].tsx             # Thread detail + comments
    │   │   ├── thread/new.tsx              # Create a new thread
    │   │   └── create_class.tsx            # Create a new class
    │   ├── context/
    │   │   ├── auth.tsx                    # AuthProvider + useAuth() hook
    │   │   └── theme.tsx                   # ThemeProvider + useTheme() hook
    │   └── utils/
    │       └── api.ts                      # All API calls
    ├── backend/
    │   └── index.js                        # Express server + all endpoints

---

## Getting Started

### Prerequisites
- Node.js
- Expo Go (for mobile testing)
- A Neon PostgreSQL database
- A Resend account for email notifications

### Backend

    cd backend
    npm install

Create a .env file:

    DATABASE_URL=your_neon_connection_string
    JWT_SECRET=your_jwt_secret
    PORT=3000
    RESEND_API_KEY=your_resend_api_key

Run the server:

    node index.js

### Frontend

    cd frontend
    npm install
    npx expo start

Update BASE_URL in frontend/utils/api.ts and frontend/context/auth.tsx to point to your backend.

---

## Database Schema

| Table | Description |
|---|---|
| `users` | id, name, username, email, password_hash, preferences, schedule, classes, sleep_preference, assignment_style, campus_frequency, meeting_preference, living_situation, push_token |
| `classes` | id, course_code, name |
| `enrollments` | user_id, class_id |
| `pushes` | from_user_id, to_user_id |
| `compatibility` | user_a_id, user_b_id, score, computed_at |
| `messages` | id, from_user_id, to_user_id, body, created_at |
| `blocks` | blocker_id, blocked_id |
| `reports` | id, reporter_id, reported_id, reason, created_at |
| `threads` | id, class_id, user_id, title, body |
| `comments` | id, thread_id, user_id, body |
| `slaps` | user_id, thread_id (nullable), comment_id (nullable) |

---

## API Endpoints

    POST   /auth/register
    POST   /auth/login
    GET    /users/me
    PUT    /users/me
    DELETE /users/me
    GET    /users/:id
    GET    /users/search?q=query
    PUT    /users/push-token
    GET    /classes
    POST   /classes
    GET    /classes/:id
    GET    /classes/:id/threads
    POST   /classes/:id/threads
    GET    /enrollments/me
    POST   /enrollments
    DELETE /enrollments/:classId
    GET    /threads/:id
    POST   /threads/:id/comments
    POST   /threads/:id/slap
    DELETE /threads/:id/slap
    POST   /comments/:id/slap
    DELETE /comments/:id/slap
    GET    /pushes/sent
    GET    /pushes/received
    GET    /pushes/matches
    GET    /pushes/status/:userId
    POST   /pushes/:toUserId
    DELETE /pushes/:toUserId
    POST   /compatibility/compute
    GET    /compatibility
    GET    /recommendations
    GET    /messages/recent
    GET    /messages/:userId
    POST   /messages/:userId
    GET    /blocks
    POST   /blocks/:userId
    DELETE /blocks/:userId
    POST   /reports/:userId

---

## Compatibility Algorithm

Scores are computed between every pair of users and stored in the compatibility table. The score is directional — A→B may differ from B→A.

| Factor | Weight |
|---|---|
| Schedule overlap (% of your free time the other user is also free) | 60% |
| Shared classes (1 class = 10%, 2+ classes = 15%) | 10–15% |
| 5 study preferences (sleep schedule, assignment style, campus frequency, meeting preference, living situation) | 5–6% each |

Scores are recomputed automatically on login and profile updates.

---

## Deployment

Backend is hosted on Railway. Set DATABASE_URL, JWT_SECRET, PORT, and RESEND_API_KEY in Railway's Variables tab.

Frontend is deployed via EAS Update.

### Pushing updates

    git add .
    git commit -m "your changes"
    git push origin main
    eas update --branch main --message "describe changes"

---

## Color Palette

| Element | Color |
|---|---|
| Background | `#4466c9` |
| Header / Tabs | `#32a85e` |
| Cards | `#1c1c1e` |
| Dark mode background | `#121212` |

---

## Support

For questions or issues, contact us at studybuddy.support.team@gmail.com

---

## License

MIT