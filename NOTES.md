# That Guy: word of mouth, automated

Every household has a That Guy agent. When something breaks, it asks the neighbors' agents who their humans actually trusted (and who to avoid), scores the pros, emails the best ones and books. The human never has to intervene.

UI only, with no backend. Everything runs through `lib/api.ts` → `lib/engine.ts` (a scripted mock).

## Run

```bash
npm install
npm run dev            # http://localhost:3000
npm run build
```

| Route | What |
|---|---|
| `/demo` | **Use this for the recording.** Phone frame on the left, Network Console on the right. Press **D**. |
| `/` | Phone app: the drop screen (use DevTools' 390×844 device toolbar) |
| `/case/[id]` | Phone app: the read-only "On it" screen |
| `/network` | Network Console on its own, desktop-first. Open it next to a `/` tab; they sync live. |

**Keys** (on `/demo` and `/network`):

| Key | Action |
|---|---|
| **D** | Run demo |
| **N** | Next day |
| **U** | Switch Me/Dana |
| **R** | Reset |
| **1 / 2 / 3** | Burst pipe / Roof leak / Legal notice |

## The demo story (deterministic, ~1:40)

Press **D**. The run resets, then plays this hands-free. Timings are measured from the moment you press D; the case timeline starts after a 3.2 s simulated drop.

| t | Phone | Console |
|---|---|---|
| 0–3s | Simulated video drop ("Mhm… go on…") | |
| 3s | "On it." | case opened |
| 5s | 🟨 **Shut the valve under the sink.** | safety tip |
| 7s | Asking 6 neighbors' guys… | broadcast; pulses fan out to 6 nodes |
| 9–17s | | Leo ✅ Mike · Priya ❌ QuickFlow · public listings (monid) +3 · Dana ✅ Mike · Sam/Ana no history · Raj offline. The trust table fills in live. |
| 18s | 3 got back to me | |
| 19s | | scored; QuickFlow struck through |
| 21s | Emailing the 2 best | ✉ Mike's Plumbing, Bay Drain Co. |
| 24–27s | Mike replied: 4pm, ~$250–300 | email replies |
| 30s | **Sorted. Mike's Plumbing is coming at 4pm, ~$280.** · Trusted by Leo's and Dana's guys · 10 s veto ring | ★ picked |
| 40s | Booked ✅ + Call Mike | booking email |
| 44s | 🔔 "How'd Mike do?" | |
| 47–50s | Simulated voice drop → "Got it. Shared with your neighbors 🤝 — you just helped 14 people." | `→ shared vouch: Mike's Plumbing ★5, $260`; pulses to every node; Mike's score goes from 74 to 94 |
| 57s | Switches to **Dana** | Dana's network |
| 59–99s | Dana drops a burst pipe and gets the same flow | Alex's guy now answers with Me's vouch → **Mike first, "Trusted by 3 neighbors: Leo's, Alex's and Wen's guys"** → Booked |

I verified this with headless Chrome: two back-to-back pipe runs hit every beat within ~0.4 s of each other, the roof and legal runs passed too, and there were no console errors.

**Other scenarios:**
- **Roof leak:** Summit Roofing, trusted by Ana's and Raj's guys. Patchwork Roofs gets a warning and is struck. Leo is offline.
- **Legal notice:** no neighbor has any history. The log says "No neighbor history yet. You'll be the first." It falls back to public listings only (Bay Legal Aid, 4.8★ on 212 reviews), books, and Me's vouch becomes the first network signal. Dana's run then shows "Trusted by Alex's guys".

You can also drive the demo by hand: hold the phone's record button (or press Space or Enter on it) to drop, press **N** after Booked, then hold the follow-up button to vouch.

## Defaults I picked

- **Zero taps after the drop.**
  - The case screen has no buttons except "See how" (a link to the console) and, once sorted, the **Stop** text button.
  - Booked adds a Call button.
  - The follow-up is only a hold-to-record voice button.
- **Veto countdown:** 10 s in demo mode (`/demo`), 2:00 elsewhere. Stop cancels the booking and That Guy shrugs.
- **Drop screen:**
  - The video circle is the default.
  - The camera icon toggles voice-only.
  - The photo icon attaches images (the count goes into the case); the photos themselves are never shown.
  - The camera flip button was removed to keep it minimal.
- **Speech-to-text:** the mock has none, so a drop uses the scenario selected in the demo bar (Burst pipe by default).
- **Households:** Me = Alex and Dana. Each has its own 6-agent network, placed on 0.25–1 mi rings:
  - Alex: Leo, Priya, Dana, Sam, Ana, Raj.
  - Dana: Leo, Priya, Alex, Sam, Wen, Raj.
- **Trust score (0–100)**, in `lib/trust.ts`:
  - 20 base
  - +20 per vouch, −45 per warning
  - +8 if the latest vouch is within 9 months
  - +6 if a voucher is within 0.6 mi
  - +(rating − 4)×30, plus up to +5 for review volume, only if publicly listed
  - A pro with more warnings than vouches is struck and never emailed.
  - The top 2 are emailed, and the best one that replies is booked.
- **Mike's Plumbing isn't on public listings.** He's a word-of-mouth-only find, which is the point.
- **"Helped 14 people"** is a constant (6 neighbor households ≈ 14 people).
- **Sync:**
  - One in-memory store, shared by both surfaces on `/demo`, and mirrored across tabs with a `BroadcastChannel` (so `/` + `/network` work as a split screen).
  - Only the tab that started a run owns its timers.
  - **Nothing is persisted**, so a reload is a clean slate and every run is reproducible.
  - A `/case/[id]` link from before a reload shows "I lost track of that one."
- **The mascot's moods follow the case:**
  - dialing while agents talk
  - shrug when there's no history or you said stop
  - proud when sorted or booked
  - listening while you record
- **Removed:** the swipe deck, shortlist picking, chat/composer, bars/barbers/restaurants, recurring jobs, the Jobs and My Guys tabs, and the tab bar.
- **Kept:** the mascot, sticker style, fonts, the video `RecordBubble` (now with voice-only start, a scripted `simulate` mode and an extra-controls slot), and the `lib/api.ts` + mock pattern.
- TypeScript stays pinned to 5.x, and the Next dev indicator stays hidden.

## API (`lib/api.ts`)

- **Spec'd functions:** `drop`, `getCase`, `getNetworkLog`, `getTrustTable`, `submitVouch`, `switchUser`.
- **Demo controls:** `stopBooking`, `nextDay`, `setScenario`, `setDemoMode`, `runDemo`, `resetDemo`.
- **Live hook:** `useSnapshot()`.
- To go live, keep these signatures, swap the bodies for real calls, and turn `useSnapshot` into a subscription to the agent network's event stream.

## Types (`lib/types.ts`)

- `Agent`, `Pro`, `Signal`, `TrustScore`, `Case`, as specified.
- Plus the UI support types `Step`, `LogLine`, `Pulse`, `Reveal`, `TrustRow`, `Note`.
