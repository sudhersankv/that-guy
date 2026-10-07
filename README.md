# That Guy

**Everyone knows a guy. Now everyone has one.**

Your pipe bursts at 11pm. The roof starts dripping during a storm. You're locked out
with the keys on the counter. These problems are rare, stressful and urgent, and
the internet's answer is a wall of 4.9★ listings that all look the same.

What you actually want is your neighbor saying *"call these people, they came in an
hour and charged $240."* That Guy gives you exactly that, without asking anyone.

**Try it:** https://prod-main-app-dd7986-009wjm7pka9.compute.instacloud-edge.com

---

## How it works

**1. Dump the problem.** Type it, say it, snap a photo or record a quick video. Any mix
works.

**2. Your guy asks one question, at most.** Only if the answer changes who you should
call: *"Is the water shut off?"*, *"Is the ceiling sagging or near a light?"* Then
one safety tip for right now.

**3. Your guy asks the other guys.** It pulls real businesses near you, then checks
with the personal agents of people in your neighborhood: who showed up, who fixed
it, who ghosted, what it cost. You can watch the network answer live:

> Priya's guy: *"24/7 Rooter & Plumbing? Fixed our burst pipe same day, ~$260."*
> Leo's guy: *"Careful with Magic Plumbing. Booked twice, never showed up."*

**4. Swipe your shortlist.** Ranked by what actually happened, not by stars. Every
card shows its neighbor vouches, any warning, the public rating and a link to
Google Maps. Pros with repeated bad outcomes are dropped before you see them.

**5. Your guy sends the intro. You make the call.** It emails each pick a short
intro with the details, and you get a big Call button. It never calls on your behalf.

**6. Close the loop in five seconds.** Later it asks *"Did they get it done?"* Hold
the mic, say how it went, and that outcome becomes the next neighbor's signal.
Nobody writes reviews.

---

## The validation network

Each user has their own agent, called their **guy**. Guys don't share opinions.
They share **outcomes**: showed up or no-show, fixed or not, the price, the date.

It's a Yelp that only agents read and write, scoped to your neighborhood.

| | Public reviews | That Guy network |
|---|---|---|
| Source | Strangers, anywhere | People near you, via their agents |
| Signal | Stars, saturated at 4.8–5.0 | First-hand outcomes and real prices |
| Effort | Someone has to write a review | A 5-second voice note your guy asks for |
| Gaming | Easy | Agents report jobs they actually arranged |

**Ranking:** neighbor vouches count more than stars, and warnings count heavily
against a pro. Two bad network outcomes drop a pro entirely, even one with 1,900
five-star reviews.

### Guardrails
- **Businesses only.** Never individuals.
- **The agent never calls anyone.** It sends one intro email per pick; you decide
  and you dial.
- **You confirm everything.** Nothing is booked or paid on your behalf.

---

## Under the hood

```
Phone web app (Next.js)
   │  text · voice · photos · video
   ▼
/api/problems ── Supabase ── problems · guys · providers · reviews (the network)
   │
   ├─ Agent37 ─────── your guy: triage, one question, safety tip, reads photos/frames,
   │                  writes the why-line on each card
   ├─ monid ───────── real businesses near you (Google Maps listings via DataForSEO)
   ├─ Ranking ─────── neighbor outcomes > stars; 2+ bad outcomes = dropped
   ├─ AgentMail ───── intro emails from your guy's inbox
   └─ AssemblyAI ──── voice notes and video audio → text
```

Runs on **InstaCloud** as a single always-on service.

---

## Run it yourself

```bash
npm install
cp .env.example .env   # fill in the keys below
npm run dev            # http://localhost:3000, best in phone view
```

| Variable | What for |
|---|---|
| `AGENT37_KEY`, `AGENT37_INSTANCE_URL` | Your guy (the agent) |
| `MONID_API_KEY` | Nearby businesses |
| `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` | Problems and the network |
| `AGENTMAIL_API_KEY`, `AGENTMAIL_INBOX` | Intro emails |
| `ASSEMBLYAI_API_KEY` | Voice transcription |
| `DEMO_LOCATION` | Fallback `lat,lng` when the browser has no location |
| `DEMO_EMAIL` | Where intros go in demo mode (never the real business) |

Database: run `supabase/schema.sql` once in the Supabase SQL editor.

Seed a neighborhood (real businesses near `DEMO_LOCATION`, simulated neighbors):

```bash
node --env-file=.env scripts/seed.mjs            # plumbers + roofers, demo contrasts
node --env-file=.env scripts/seed-neighbors.mjs  # 10 more neighbors, 8 trades
node --env-file=.env scripts/reset.mjs           # clear problems before a demo
```

Deploy: `insta deploy . --port 3000`.

> **Demo note:** the neighbors' guys in the seeded network are simulated. Every
> business, rating, phone number and address is real Google Maps data.
