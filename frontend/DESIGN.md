# DESIGN.md: Yaadon ki Baithak

Format follows VoltAgent's awesome-design-md (9 sections). Give this file to any AI coding tool before it touches the UI.

## 1. Visual theme and atmosphere

"Shaam ki Kahani", an evening story. The home page is Karachi at night: a painted skyline with Mazar-e-Quaid glowing in the middle, Empress Market's clock tower, old Saddar rooftops with water tanks and wedding lights, pixel stars and paper lanterns above. The whole app stays at night: deep indigo rooms lit by soft pools of lantern light, with frosted glass panels.

Three ingredients, always together:
- **Glass**: frosted night-glass panels floating over light. One stronger glass for the nav (`glass-nav`).
- **Pixel magic**: tiny pixel stars, the pixel lantern loader, pixel Hudhud, cursor sparkles, pixel numerals. Small doses only.
- **Painted warmth**: painted storybook scenes (skyline, story themes, folk tales) in one shared style, and Hudhud, the real bird cut-out, brought to life with motion.

It should feel like a family evening, not a SaaS dashboard.

## 2. Color palette and roles

| Token | Hex | Role |
| --- | --- | --- |
| raat | #12133a | Deepest night, page base on dark screens |
| dusk | #2b2d5c | Sky, book cover |
| jamuni | #4a3366 | Sky gradient middle |
| lantern | #f2a93b | Primary action, focus ring, glow |
| lantern-soft | #ffd58a | Urdu text and highlights on dark |
| terracotta | #c8553d | Warm accent, elder initials |
| ajrak | #9e2b25 | Ajrak border and stripe only |
| leaf | #5c8a5a | Done states, completed steps |
| chai | #fbf3e4 | Rare light accents only (the app is dark) |
| chai-deep | #f3e3c6 | Unused, kept for print exports |
| ink | #3b2a20 | Text on saffron (buttons, selected chips) |
| ink-soft | #6b5546 | Unused in the dark theme |
| moon | #fff4dc | Text on dark |
| birdy | #f0654f | Mascot only |

Never use pure black or grey. Shadows are tinted ink brown.

## 3. Typography

- **Fraunces Variable** (display): headlines, book titles, Hudhud's speech. Use the SOFT axis at 100 for rounded Pixar letterforms.
- **Nunito Variable** (body and UI): everything else. Bold 700 to 800 for buttons.
- **Noto Nastaliq Urdu Variable**: all Urdu. Always `dir="rtl" lang="ur"` and line-height 2 or more, because Nastaliq is tall.
- **Pixelify Sans Variable**: pixel accents only (years, chapter counts, step numbers). Never for sentences.

All fonts are self-hosted with @fontsource-variable. Sentence case everywhere. No all-caps labels.

## 4. Components

- **btn-lantern + pixel-corners**: the one primary action per screen. Saffron, stepped pixel corners.
- **glass-night**: panels, cards, speech bubbles. **glass-nav**: the floating nav. (`glass-day` is legacy; don't use it.)
- **Hudhud (ہدہد)**: the bird cut-out (`components/mascots/birdy.webp`; the component is still called `Birdy` in code). Named after the hoopoe of the old stories: the bird who flies to Saba, listens, and returns to Hazrat Sulaiman with true news, and who guides the birds with stories in *Mantiq-ut-Tair*. A listener who carries the story home. Masculine in Urdu (ہدہد سن رہا ہے). Moods idle (breathing), flying (bob), happy (hop), listening (head tilt), gentle (slow sway, after a painful memory).
- **Hudhud's eyes** (`components/mascots/BirdyEyes.tsx`): a vector eye drawn exactly over the painted one. Blinks every few seconds while on screen; lids half-lowered when gentle; a classic double take (squint, springy wide pop with a sparkle, body jolt, settle, about 1 s) when he first appears, lands, starts listening or gets happy. Off for reduced motion.
- **Hudhud's notebook**: the small, collapsible panel on the record screen showing why he chose each question (`components/app/ThinkingPanel.tsx`). Helper-facing, sits below the elder's controls, never over the question.
- **BirdySays**: Hudhud plus a speech bubble. The app's guide voice inside the app.
- **Diya**: the recording light. Flame grows with mic level.
- **PixelLantern**: loading state everywhere. No spinners.
- **ChapterCard / ChapterView**: painted scene, pixel badge, English + Urdu titles, teller, excerpt, the elder's real voice with a filling waveform.
- **Painted art**: `components/illustrations/scenes/*` (themes, How it works) and `tales/*` (folk tales). New art must match: soft painted storybook, indigo/plum/saffron, lantern light, no text in the image.
- **Chips**: rounded full, ink when selected. "Soon" tag for features not built yet.

## 5. Layout

- Max widths: 72rem marketing, 72rem dashboard, 48rem forms.
- Home: hero (text left, chapter card right) / how it works (3 steps, real sequence) / story shelf (horizontal snap scroll) / promise / footer.
- App: dark indigo backdrop with blurred lantern pools and an ajrak stripe at the top. Header (`AppHeader`) = wordmark left, sound and account right.
- Elder screens (/record): center aligned, one question at a time, giant touch targets.

## 6. Depth and elevation

Light comes from lanterns. Depth = blur + glow, not drop shadows.
- Level 0: backdrop with blurred light pools.
- Level 1: glass panels (backdrop-blur, 1px light border).
- Level 2: book cover with ajrak frame and a long soft ink shadow.
- Glow: lantern-colored blur behind the Diya and primary actions.

## 7. Do's and don'ts

Do:
- Write in plain, warm English with Urdu accents in the right places.
- Keep one bold element per screen.
- Respect `prefers-reduced-motion` (Hudhud stays still, stars stop).
- Label demo content as demo content.

Don't:
- Add arrows to button text, middle-dot meta strings, or ALL-CAPS eyebrows.
- Make identical card grids or gradient washes for decoration.
- Show an AI-sounding voice as if it were the elder. The elder's real voice only.
- Invent facts in stories, even in mock data.

## 8. Responsive

- Test at 390, 768, 1440.
- Hero stacks on mobile: text first, card after.
- Elder buttons stay at least 64px tall on every size, Urdu text at least 18px.
- Shelf keeps scroll-snap on touch, buttons on desktop.

## 9. Agent prompt guide

When generating UI for this project:
"Use the Shaam ki Kahani tokens from DESIGN.md. Everything is dark: glass-night panels over the indigo AppBackdrop or NightSky. Use the painted scenes, never flat clip-art. One btn-lantern per screen. Urdu in Noto Nastaliq with rtl and line-height 2. Pixel font only for numbers. Use Hudhud (BirdySays) to explain each step instead of helper text. Loading = PixelLantern. No all-caps, no arrows in buttons, no identical card grids."
