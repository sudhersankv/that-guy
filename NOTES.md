# That Guy: frontend notes

Each user has their own **guy**. You dump a problem and your guy finds the right local pro. It uses a private network where every user's guy shares what actually happened with providers: an internal Yelp that only the agents use, scoped by locality. It is not a social network for humans.

Mobile-first (390×844), centered in a 430 px column on desktop. UI only for now.

## Run

```bash
npm install
npm run dev     # http://localhost:3000  (use DevTools' phone view)
npm run build
```

## The flow (the only thing in the app)

| # | Screen | Where |
|---|---|---|
| 1 | **Dump**: mascot + "What's the problem?" + composer (text, 📷 multi-photo, 🎤 hold-to-record voice, 🎥 hold-to-record video circle; any mix). Then "Got it. Go do your thing, I'll ping you." and **My problems** with status chips. | `/` |
| 2 | **Follow-up** (only if needed, max one): the question, quick-reply chips, and the same composer | `/p/[id]` |
| 3 | **Pick your guy**: summary line + swipe deck ranked best → worst (right = pick, left = skip, ✕ / ✓ buttons) → "You picked N" → **Send intros** | `/p/[id]` |
| 4 | **Intros sent**: per pro, a big 📞 Call button plus the intro email your guy sent (collapsed). The agent never calls; you do. | `/p/[id]` |
| 5 | **Done?**: "Did X get it done?" [Yes] [No] [Didn't use them] → hold-to-record voice → transcript → "Thanks. Your guy shared this with the neighborhood network." → Done | `/p/[id]` |

**Status chips:** Working → Quick question → Pick your guy → Contacted → Done? → Done.

## Not hardcoded: everything flows through `lib/api.ts`

Components only render what the API returns. Titles, "working" lines, the question and its chips, the ranked cards and their network signals, the summary line, intro emails, the check-in target and transcripts all come from the API.

```
components ──► lib/api.ts ──► lib/mockBackend.ts ──► lib/mock.ts
                (contract)     (fake "your guy")      (fake data)
```

- **`lib/types.ts`** is the contract: `Problem`, `Candidate`, `NetworkSignal`, `Intro`, `Question`, `Feedback`, …
- **`lib/api.ts`** has `submitProblem({text, photos, audio, videoFrames})`, `getProblem(id)`, `answerQuestion(id, answer)`, `pickProviders(id, ids)` (sends the intros), `markDone(id, providerId, outcome)` and `submitFeedback(id, providerId, audioBlob)`. It also has **`listProblems()`**, which I added for the My problems list.
- **To plug in the backend:** replace each function body in `lib/api.ts` with a `fetch`, then delete `lib/mock.ts` and `lib/mockBackend.ts`. No component changes.
- **Live updates are polling** (`lib/usePoll.ts`): the list every 2 s, the open problem every 1 s. That works against a plain REST backend; swap in SSE or websockets later if you like.
- **Planned public-listings source:** `https://mcp.monid.ai/v1` (from your note). The frontend doesn't call it; it belongs in the backend behind `getProblem` / ranking.

## Mock behavior (defaults I picked)

- **One real user ("Me")** plus 8 simulated neighbors' guys (Leo, Priya, Dana, Sam, Ana, Raj, Wen, Marco), with 20 past reviews (provider, outcome, quote, price, date, rating).
- **Scenario A: burst/frozen pipe.**
  - 5 plumbers shown: Mike's (3 vouches), SF Pipe Pros (1 vouch), QuickFlow (⚠ no-show), and 2 Google-only.
  - Header: "checked 12, dropped 3".
  - Asks **"Is the water shut off?"** [Yes] [No] [Can't find the valve].
- **Scenario B: roof leak.** 4 roofers shown, and no follow-up question, to show that the question is optional. Header: "checked 9, dropped 2".
- **Routing:** typed text is routed by keywords (roof/ceiling/shingle → roof; pipe/water/sink/leak → pipe). A voice- or video-only drop alternates pipe and roof, because the mock has no transcription.
- **Ranking:** neighbor vouches (+), warnings (−), public rating and distance. Pros with **2+ bad network reviews are dropped**. The quote on a card is the vouch **most relevant to the problem**, so the pipe card shows Leo's frozen-pipe job.
- **Timings** (`MOCK_CONFIG`): 3 s "working" → question or cards; 2 s after an answer; **"Done?" check-in 20 s after the intros** go out. You can also open the check-in right away with "Already done? Tell me how it went".
- **Voice feedback:** the mock returns a canned transcript, stored as text on the problem.
- **Storage:** problems are kept in `localStorage` (`thatguy:mock:v3`), and stages are derived from timestamps, so reloads keep working. Clear site data to start fresh.
- **Not stored:** photos, audio and video are sent to the mock call but never saved.
- **Pings:** "I'll ping you" is an in-app toast on the home screen when a problem starts needing you (question, pick, done?). Real push notifications come with the backend.

## Theme

Same mascot, colors and fonts, a little quirkier:
- faint doodle wallpaper (stars, squiggles, dots)
- comic speech bubbles for your guy
- a marker-scribble underline
- wiggling sticker chips
- a rubber-stamped trade on each card, and MY GUY / NAH swipe stamps

Light by default, with a dark toggle.

## Removed

The network console, demo mode, veto countdown, booking, the user switcher, recurring jobs, bars/barbers/restaurants, chat history, the old engine/trust/scenario code, the tab bar, and the Jobs and My Guys pages.
