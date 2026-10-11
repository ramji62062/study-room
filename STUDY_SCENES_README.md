# Immersive Scene Study Room Workspace

This update transforms CodeTogether's dedicated Study Room (`/study/[id]`) into an immersive **Scene-based workspace** matching the glass-morphism target design:
- Full-viewport atmospheric scenes with vertical window panes, soft rain simulation, ambient desk glow, and soundscapes.
- Floating Pomodoro widget (52px JetBrains Mono countdown, progress dots, amber controls, Pomodoro / Short break / Long break tabs).
- 72px left glass rail with collapsible 300px scenes drawer (3-column thumbnails, volume slider, share toggle).
- Center hero scene typography overlay with soft dark text shadow and visibility toggle.
- Bottom floating dock with `+ Notes`, `+ Whiteboard`, `+ Editor` and overlapping member avatar stack.
- Floating draggable and resizable glass windows (`react-rnd`) with boundary clamping, focus-to-front z-index, minimize, maximize, and state preservation.
- Server-synchronized shared Pomodoro, room-wide scene sharing with owner permission checks, presence, and chat catch-up.

---

## 1. Database Migration

The migration is located at `supabase/migrations/20261011_study_scenes.sql`:

```sql
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'rooms' AND column_name = 'scene_id'
  ) THEN
    ALTER TABLE rooms ADD COLUMN scene_id VARCHAR(50) DEFAULT 'night-library';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'rooms' AND column_name = 'scene_shared'
  ) THEN
    ALTER TABLE rooms ADD COLUMN scene_shared BOOLEAN DEFAULT false;
  END IF;
END $$;
```

---

## 2. Changed & New Files

| File | Purpose |
|------|---------|
| `src/config/studyScenes.ts` | Typed scene definitions (6 scenes: Night Library, Rainy Cafe, Forest, Seaside, Snow Cabin, Dark Focus) with gradients, sound descriptions, and licensing notes. |
| `supabase/migrations/20261011_study_scenes.sql` | Schema migration for room scene persistence. |
| `src/hooks/useStudyAudio.ts` | Ambient audio hook with procedural Web Audio pink-noise fallback, per-user volume saved in `localStorage`, mute, and strict no-autoplay enforcement. |
| `src/components/study/StudySceneRenderer.tsx` | Viewport renderer with 4 window pane mullions, rain streaks, desk horizon, ambient lamp glow, and `prefers-reduced-motion` compliance. |
| `src/components/study/StudySceneTopBar.tsx` | 12px inset glass top bar (Home, Sign in/Avatar, Day 1 streak pill, Room name chip, teal Invite, and Camera toggle). |
| `src/components/study/StudySceneRail.tsx` | 72px wide rounded-16px glass tool rail (Scenes, Timer, Notes, Board, Editor, Sounds, Chat). |
| `src/components/study/StudySceneDrawer.tsx` | 300px glass drawer (Search, 3-column thumbnails with teal active border, Now Playing card, volume slider, Share switch, Help & Layout actions). |
| `src/components/study/StudyFloatingPomodoro.tsx` | 330px top-right floating Pomodoro widget with progress dots, 52px monospace countdown, amber Start button, and session tabs. |
| `src/components/study/StudyHeroOverlay.tsx` | Large bold scene title and uppercase subtitle with drop shadow and hide toggle. |
| `src/components/study/StudyBottomDock.tsx` | Bottom center glass dock with `+ Notes`, `+ Whiteboard`, `+ Editor` and overlapping member avatar stack. |
| `src/components/study/StudyFloatingWindow.tsx` | Drag and resize window wrapper using `react-rnd` with viewport clamping and minimize/maximize support. |
| `src/app/study/[id]/page.tsx` | Main coordinator for the scene workspace, floating windows, drawer, dock, and persistence. |
| `server/study/studyRoomService.js` | Backend service updated with scene state synchronization (`study:scene-update`, `study:scene-set`) and persistence. |
| `src/hooks/useStudyRealtime.ts` | Realtime client updated to sync room scene changes and handle late-joining catchup. |

---

## 3. Environment Variables

Standard application environment variables are used (no new third-party credentials required):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (optional, for direct service-role persistence)
- `PORT` (default `3000`)

---

## 4. Scene Assets & Licenses Checklist

All 6 initial scenes operate procedurally with zero external asset copyright dependencies:
- **Visuals**: Layered CSS gradients with procedural window mullions, rain streaks, and ambient lighting.
- **Audio**: Web Audio API synthesized pink/brown noise filters provide realistic rain, cafe hum, and ocean sounds without needing external MP3 files.

### Optional Media Upgrades You Can Provide:
If you wish to replace procedural fallbacks with custom recorded/licensed media:
1. `public/scenes/posters/night-library.webp` (License required: CC0 or owned)
2. `public/scenes/posters/rainy-cafe.webp` (License required: CC0 or owned)
3. `public/scenes/posters/forest.webp` (License required: CC0 or owned)
4. `public/scenes/posters/seaside.webp` (License required: CC0 or owned)
5. `public/scenes/posters/snow-cabin.webp` (License required: CC0 or owned)
6. `public/sounds/rain-window.mp3` (License required: CC0 or owned)
7. `public/sounds/cafe-drizzle.mp3` (License required: CC0 or owned)
8. `public/sounds/ocean-waves.mp3` (License required: CC0 or owned)

---

## 5. Manual Test Checklist

1. **Scene Selection & Rendering**:
   - Open `/study/<room-id>`.
   - The Night Library scene background displays with vertical window mullions, ambient desk lamp glow, and hero title.
   - Click "Scenes" on the left rail: drawer opens with 3-column thumbnails. Click "Rainy Cafe" or "Dark Focus": background switches immediately.
2. **Audio & No-Autoplay Safety**:
   - Page load produces zero audio until the user clicks the play button or adjusts the volume slider.
   - Move volume slider: volume changes smoothly; refresh page: volume is preserved from `localStorage`.
3. **Scene Sharing**:
   - In the drawer, toggle "Share scene with room".
   - Open another incognito browser window in the same room: the shared scene applies automatically.
4. **Floating Windows**:
   - Click `+ Notes`, `+ Whiteboard`, or `+ Editor` in the bottom dock: floating windows appear.
   - Drag windows by their title bars: windows stay bounded inside the viewport.
   - Resize from edges/corners: content resizes smoothly.
   - Click minimize (`-`): window hides without losing unsaved text or drawings. Click dock button again: window reopens with all state intact.
   - Double-click header: toggles maximized and restored size.
5. **Pomodoro Timer**:
   - Click "Start": countdown begins in JetBrains Mono.
   - Switch tabs (`Short break`, `Long break`): duration updates to 5:00 or 15:00.
   - Refresh page: countdown resumes in sync with server timestamp.
6. **Video Panel (SFU)**:
   - Click the camera icon in top bar: Mediasoup SFU video stage opens.
   - Start Cam / Share Screen / Mic toggle work properly.
7. **Responsive Check**:
   - Resize browser window to mobile width (<900px): interface adapts cleanly with no horizontal scroll.
