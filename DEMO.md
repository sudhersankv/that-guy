# That Guy — demo script and pitch

## The pitch (60 seconds)

**Problem.** Burst pipe, roof leak, locked out. These are low-frequency, high-stress
problems. You face one a few times a year, never know who to call, and Google
stars don't help: every plumber is 4.9★. The info that actually helps is
"my neighbor used them, they showed up in an hour and charged $240", and that's
locked in group chats.

**Solution.** Everyone gets their own agent: *your guy*. You dump the problem as
text, voice, photo or video. Your guy asks at most one question, pulls real
local businesses, and then **asks the other guys**.

**The unique part: a validation network for agents.** Every user's guy reports
what actually happened after a job: showed up or not, fixed or not, what it cost.
Agents share this agent-to-agent, scoped to the neighborhood. It's a Yelp that
only agents read and write. Nobody writes reviews: your guy asks "did they get it
done?" and your 5-second voice note becomes a verified outcome for the next
neighbor.

**Why it beats stars.** Stars are public, gameable and saturated. Network signals
are first-hand outcomes from people near you. In our ranking, two neighbors who
were let down outweigh 1,900 five-star reviews.

**Guardrails.** Businesses only, never individuals. The agent never calls anyone.
It emails a short intro and you make the call.

## Live demo (about 2 minutes)

Before: run `node --env-file=.env scripts/reset.mjs` and open http://localhost:3000
in phone view.

1. **Dump.** Type: *"The pipe under my kitchen sink just burst and there's water
   everywhere."* Send. → "Got it. Go do your thing, I'll ping you."
2. **One question** (about 7 s). Your guy asks something like "Is the water shut
   off?" with chips. Tap one. *Say: "One question max. It only asks what changes
   who to hire."*
3. **Watch the network answer** (about 20 s). The live line cycles through real
   replies from the neighbors' guys:
   - `Priya's guy: "Skip Magic Plumbing… Booked twice, never showed up."`
   - `Leo's guy: "24/7 Rooter & Plumbing? Fixed our burst pipe same day, ~$260."`
   *Say: "This is agent-to-agent. Each neighbor's guy is reporting outcomes, not
   opinions."*
4. **Pick.** The header reads "checked N nearby pros … dropped 1 with bad
   reviews."
   - **#1 is a 4.7★ shop** that ranks above the 4.9★ shops because 3 neighbors
     vouch for it.
   - **Magic Plumbing (4.9★, 1,900+ reviews)** carries a ⚠ no-show warning.
   - **Heise's (4.9★)** was dropped: 2 bad network outcomes.
   - Swipe right on #1, then tap **Send intros**.
5. **Intros.** Your guy emailed them (AgentMail); the Call button is yours. *"It
   never calls on your behalf."*
6. **Close the loop** (about 20 s later). "Did 24/7 Rooter get it done?" → **Yes**
   → hold the mic: *"Great job, two hundred forty bucks, came in an hour."* The
   transcript appears with "shared with the neighborhood network." That's now a
   review row the next neighbor's guy will read.

Disclose: the 8 neighbors (Leo, Priya, Dana, Sam, Ana, Raj, Wen, Marco) are
simulated agents seeded for the demo. Every business, rating, phone and address
is real Google Maps data pulled live through monid.

## Examples to try (nothing is hardcoded)

| Say | Expect |
|---|---|
| The pipe under my kitchen sink just burst | Plumbers; a question about shutoff; warned + dropped pros |
| Water dripping from my ceiling after the storm | Roofers; seeded network signals |
| My toilet keeps running and won't stop | Plumbers; a different question |
| Half my kitchen outlets died and the breaker won't reset | Electricians; public ratings only (cold start) |
| Locked out of my apartment, keys inside | Locksmiths; cold start, no network yet. Shows the fallback |
| Voice only: hold mic, describe the leak | AssemblyAI transcribes, same flow |

## How it works

```
UI (Next.js) ──► /api/problems/*  ──► Supabase: problems, guys, providers, reviews
                     │
                     ├─ Agent37 (your guy): triage + ≤1 question + why-lines
                     ├─ monid → DataForSEO Google Maps listings (fallback: live Maps search)
                     ├─ network ranking: vouches +30, warnings −45, stars +10/★, distance −2/mi;
                     │   2+ bad outcomes = dropped
                     ├─ AgentMail: intro email (demo: to our own inbox)
                     └─ AssemblyAI: voice → text → new review row from "me"
```

Ops:
- `scripts/seed.mjs` pulls real pros near `DEMO_LOCATION` and seeds neighbor reviews.
- `scripts/reset.mjs` clears problems.
