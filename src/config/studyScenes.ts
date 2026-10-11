export interface StudyScene {
  id: string;
  name: string;
  subtitle: string;
  soundDescription: string;
  kind: "css" | "image" | "video";
  sources: {
    webp?: string;
    avif?: string;
    mp4?: string;
    webm?: string;
  };
  poster: string;
  audioLoopUrl?: string;
  license: string;
  gradient: string;
  thumbnailGradient: string;
  windowOverlay?: boolean;
}

export const STUDY_SCENES: StudyScene[] = [
  {
    id: "night-library",
    name: "Night Library",
    subtitle: "STUDY ROOM WITH RAIN SOUNDS",
    soundDescription: "Rain on the window",
    kind: "css",
    sources: {},
    poster: "/scenes/posters/night-library.webp",
    audioLoopUrl: "/sounds/rain-window.mp3",
    license: "Original procedural CSS styling with ambient rain simulation. Audio placeholder requires licensed rain track.",
    gradient: "radial-gradient(ellipse at 50% 120%, #3a2216 0%, #171c26 40%, #0d1117 75%, #080a0e 100%)",
    thumbnailGradient: "linear-gradient(135deg, #4f3b2f 0%, #222d3d 50%, #121820 100%)",
    windowOverlay: true,
  },
  {
    id: "rainy-cafe",
    name: "Rainy Cafe",
    subtitle: "COZY COFFEE SHOP AMBIENCE",
    soundDescription: "Soft cafe chatter & drizzle",
    kind: "css",
    sources: {},
    poster: "/scenes/posters/rainy-cafe.webp",
    audioLoopUrl: "/sounds/cafe-drizzle.mp3",
    license: "Original procedural CSS styling. Audio placeholder requires licensed cafe ambience track.",
    gradient: "radial-gradient(ellipse at 50% 110%, #4a2818 0%, #201a1d 45%, #0f1016 80%, #090a0d 100%)",
    thumbnailGradient: "linear-gradient(135deg, #5c3a28 0%, #2d262b 50%, #14161f 100%)",
    windowOverlay: true,
  },
  {
    id: "forest",
    name: "Forest",
    subtitle: "DEEP NATURE & GENTLE BREEZE",
    soundDescription: "Rustling pine leaves & birds",
    kind: "css",
    sources: {},
    poster: "/scenes/posters/forest.webp",
    audioLoopUrl: "/sounds/forest-wind.mp3",
    license: "Original procedural CSS styling. Audio placeholder requires licensed forest recording.",
    gradient: "radial-gradient(ellipse at 50% 120%, #1b3d2f 0%, #122421 40%, #0b1516 75%, #070e0f 100%)",
    thumbnailGradient: "linear-gradient(135deg, #2a5542 0%, #1a332f 50%, #0e1d1d 100%)",
    windowOverlay: false,
  },
  {
    id: "seaside",
    name: "Seaside",
    subtitle: "COASTAL BREEZE & OCEAN HORIZON",
    soundDescription: "Gentle ocean waves on sand",
    kind: "css",
    sources: {},
    poster: "/scenes/posters/seaside.webp",
    audioLoopUrl: "/sounds/ocean-waves.mp3",
    license: "Original procedural CSS styling. Audio placeholder requires licensed ocean wave loop.",
    gradient: "radial-gradient(ellipse at 50% 115%, #1d3e56 0%, #122538 40%, #0c1825 75%, #070e17 100%)",
    thumbnailGradient: "linear-gradient(135deg, #2d587b 0%, #1a364f 50%, #0f2030 100%)",
    windowOverlay: false,
  },
  {
    id: "snow-cabin",
    name: "Snow Cabin",
    subtitle: "WINTER HEARTH & SOFT DRIFT",
    soundDescription: "Crackling fireplace embers",
    kind: "css",
    sources: {},
    poster: "/scenes/posters/snow-cabin.webp",
    audioLoopUrl: "/sounds/fireplace.mp3",
    license: "Original procedural CSS styling. Audio placeholder requires licensed fireplace track.",
    gradient: "radial-gradient(ellipse at 50% 120%, #38241b 0%, #1a232f 45%, #0e1520 80%, #080c14 100%)",
    thumbnailGradient: "linear-gradient(135deg, #4f3427 0%, #253344 50%, #131d2b 100%)",
    windowOverlay: true,
  },
  {
    id: "dark-focus",
    name: "Dark Focus",
    subtitle: "MINIMALIST DISTRACTION-FREE",
    soundDescription: "Gentle brown noise",
    kind: "css",
    sources: {},
    poster: "/scenes/posters/dark-focus.webp",
    audioLoopUrl: "/sounds/brown-noise.mp3",
    license: "Minimalist dark ground styling. No external copyright assets required.",
    gradient: "radial-gradient(ellipse at 50% 100%, #141922 0%, #0e1116 50%, #080a0d 100%)",
    thumbnailGradient: "linear-gradient(135deg, #1d2430 0%, #12161f 50%, #0a0d12 100%)",
    windowOverlay: false,
  },
];

export const DEFAULT_SCENE_ID = "night-library";

export function getSceneById(id: string): StudyScene {
  const found = STUDY_SCENES.find((s) => s.id === id);
  return found || STUDY_SCENES[0];
}
