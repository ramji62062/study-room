# CodeTogether


### ✅ New Features Added
| Feature | Description |
|---------|-------------|
| 🎨 **Whiteboard** | Excalidraw-style canvas — pen, line, shapes, text, eraser, undo/redo, download PNG |
| 🤖 **AI Code Assistant** | Claude-powered in-room AI — debug, explain, optimize, type-check your code |
| 📝 **Teacher Notes** | Create, pin, publish, and download Markdown notes. Students see published notes |
| ⏱️ **Session Timer** | Countdown timer with presets (15–120 min), warning alerts, start/pause/end lifecycle |
| 🧩 **Code Editor Layout** | Activity bar with all 7 panels: Explorer, Debug, Chat, Whiteboard, AI, Notes, Timer |

---

## How to Run

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment variables
Edit `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_SITE_URL=https://your-production-domain.com
SMTP_USER=your_gmail_address
SMTP_PASS=your_gmail_app_password
NEXT_PUBLIC_ANTHROPIC_API_KEY=your_anthropic_api_key  # For AI Assistant
```

> **AI Assistant**: Get your API key at https://console.anthropic.com

### 3. Start the dev server
```bash
npm run dev
```

Open http://localhost:3000

---

## Architecture

```
src/
├── app/
│   ├── page.tsx              # Landing page
│   ├── dashboard/page.tsx    # Dashboard (create/manage rooms)
│   ├── room/[id]/page.tsx    # Main room (VS Code layout)
│   ├── login/page.tsx        # Auth
│   ├── signup/page.tsx
│   └── api/
│       ├── create-room/      # Create Supabase room
│       └── run-code/         # Execute code server-side
└── components/
    ├── Editor.tsx             # Monaco multi-file editor
    ├── ActivityBar.tsx        # ← VS Code activity bar (7 panels)
    ├── LeftSidebar.tsx        # ← Sidebar + fullscreen panel host
    ├── Whiteboard.tsx         # ← NEW: Canvas drawing tool
    ├── AIAssistant.tsx        # ← NEW: Claude AI panel
    ├── TeacherNotes.tsx       # ← NEW: Notes with publish/download
    ├── SessionTimer.tsx       # ← NEW: Session lifecycle timer
    ├── ParticipantsCallPanel.tsx # Native WebRTC meeting panel
    ├── TerminalPanel.tsx      # xterm.js terminal
    ├── Chat.tsx               # Real-time chat
    └── DebugPanel.tsx         # Breakpoints panel
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+S` | Save file |
| `Ctrl+N` | New file |
| `Ctrl+W` | Close tab |
| `Ctrl+B` | Toggle sidebar |
| `Ctrl+\`` | Toggle terminal |
| `Esc` | Close sidebar/terminal |

---

## Stack
- **Next.js 14** — App Router, Server Components
- **Supabase** — Auth, Postgres, Realtime presence
- **Monaco Editor** — VS Code editor component
- **Socket.IO + WebRTC** — Project-owned video/audio/screen sharing
- **xterm.js** — Terminal emulator
- **Socket.io** — Real-time terminal streaming
- **Groq API** — AI code assistant
- **Tailwind CSS** — Utility styling
- **Mediasoup SFU v3** — 250-seat real-time video/audio selective forwarding unit
- **react-resizable-panels** — Keyboard-accessible flexible panel layout

---

## 📚 Study Rooms Workspace (`/study/[id]`)

### Architectural Overview
Study Rooms provide a distraction-free, modular learning environment where the code editor does not open by default:
- **Default State**: Centered "Your desk is clear" empty state with 6 panel cards (`Editor`, `Whiteboard`, `Notes`, `Timer`, `Video`, `Chat`), focus interval quick-starts (`25 / 5`, `50 / 10`, `Custom`), and persistent sidebar.
- **Working State**: Resizable multi-panel layout using `react-resizable-panels` (`Group`, `Panel`, `Separator`). Double-clicking any divider resets the split; keyboard navigation supported via arrow keys.
- **Private Layout**: Each user's panel arrangement and split orientation is private and persisted in `localStorage`.
- **In-Browser Execution**: Code runs directly in the client sandbox with zero terminal/server dependency.
- **Reliable Realtime Layer**: Server-synced focus countdown timer, UUID-deduplicated chat with offline queue, presence with heartbeats and stale timeout, and strict 5-seat & 45-minute limit enforcement on free cohorts.

### Database Migration
Run the SQL migration in your Supabase SQL editor:
```sql
-- File: supabase/migrations/20261011_study_rooms.sql
```

### Manual Acceptance Test Checklist
1. **Classroom backward compatibility**: Verify `/room/[id]` loads the standard VS Code layout as before.
2. **Default empty state**: Join `/study/[id]`. Verify "Your desk is clear" container is shown with all 6 cards and inactive panel toggles.
3. **Working state side-by-side**: Click `+ Editor` and `+ Notes`. Verify they appear side-by-side matching the reference mockup.
4. **Divider resizing**: Drag divider between panels. Verify minSize constraints and double-click to reset split.
5. **Layout persistence**: Reload the page. Verify active panels and orientation persist.
6. **State preservation**: Toggle panels closed and open. Verify editor code and notes content are preserved without remounting loss.
7. **In-browser code run**: Click `Run in browser` on `two_sum.py`. Verify output `[0, 1]` is printed.
8. **Shared focus timer**: Start timer from top bar or empty state. Verify remaining time synchronizes across multiple connected browser tabs.
9. **Chat reliability**: Send a message. Go offline in dev tools, type a message, go online. Verify message sends once without duplicate.
10. **Seat capacity enforcement**: Attempt to join 6th participant to a study room. Verify rejection with 5-seat capacity limit message.

