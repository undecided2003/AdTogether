# AdTogether — 10-Second AI Prompt Commercial

**Logline:** Two indie developers each have empty ad space and zero budget. One line of code later, they discover they're advertising *each other* — and they have never been happier.

**Runtime:** 10.0s · **Format:** 16:9 master (9:16 cutdown in §6) · **Tone:** Deadpan → delighted → smug.

**Why this concept fits the product:** AdTogether's actual pitch is *"Show an ad, get an ad shown."* That is inherently, structurally ridiculous — and it's the joke. No need to invent a gag; just film the business model.

---

## 1. Cast & Look

| Role | Description | Notes |
|---|---|---|
| **DANA** | Late 20s, hoodie, glasses. Runs a tiny app with a big empty banner slot. | Speaks lines 1–3. Deadpan, tired, then smug. |
| **MARCUS** | 30s, headset around neck. Runs a different tiny app. | Speaks line 4 only. One line, maximum outrage. |
| **CAT** | Dana's cat, sitting on the desk. Completely unimpressed. | Zero lines. Points at the freeze frame. Never explain why. |

**Art direction (matches the real product UI):**
- Neutral base: white `#ffffff` / near-black `#0a0a0a`, clean sans (Geist-like), lots of negative space.
- Accent: **amber** (`amber-500` → `amber-600`), used as the *only* warm light in frame — the glow of the ad slot coming alive.
- Shot 1 is desaturated and slightly blue; shots 3–6 warm up as the amber banner lights up. The color grade *is* the character arc.

---

## 2. Timed Shot List

| # | In–Out | Visual | Audio / VO | On-screen text |
|---|---|---|---|---|
| 1 | 0:00.0–0:02.2 | Tight on a laptop screen. A grey, empty ad slot sits there, taunting. A fly lands on it. Dana stares. Cat stares at the fly. | Fly buzz. A single sad "womp." No dialogue. | *(none)* |
| 2 | 0:02.2–0:03.6 | Dana pastes ONE line of code. Key clack. She leans back like she just defused a bomb. | **DANA:** "Empty ad space. No budget." | one-line snippet flashes, unreadably fast |
| 3 | 0:03.6–0:05.2 | The grey rectangle snaps to life — an amber banner ad for a *cat photo app*. Confetti of pixels. Fly leaves. | **DANA:** "One line of code." | amber banner fills the slot |
| 4 | 0:05.2–0:06.6 | Hard cut: split screen. MARCUS, across town, sees a banner on his phone. It's Dana's app. | **DANA (O.S.):** "Somebody else's app." | *(none)* |
| 5 | 0:06.6–0:08.0 | Both turn and **point at each other** through the split screen. Mutual recognition. Awestruck. | **MARCUS:** "Wait — that's MY app." | *(none)* |
| 6 | 0:08.0–0:10.0 | Freeze frame on the pointing. The cat points too. Frame splits, logo slams in. | **ANNOUNCER:** "Show an ad. Get an ad shown." | **AdTogether** + `ad-together.org` + platform row |

**Cut rhythm:** shots 1–3 are patient (2.2s, 1.4s, 1.6s); shots 4–6 accelerate (1.4s, 1.4s, 2.0s) and stop dead on the freeze. Comedy lives in the freeze.

---

## 3. Voiceover Script (record this, isolated)

> **DANA** *(flat, tired — 0:02.2)*
> "Empty ad space. No budget."
>
> **DANA** *(small, satisfied — 0:03.6)*
> "One line of code."
>
> **DANA** *(off-screen, suspicious — 0:05.2)*
> "Somebody else's app."
>
> **MARCUS** *(genuine shock — 0:06.6)*
> "Wait — that's MY app."
>
> **ANNOUNCER** *(clean, warm, final — 0:08.0)*
> "Show an ad. Get an ad shown."

**Word budget check:** 5 + 4 + 3 + 4 + 7 = **23 spoken words in 10 seconds (2.3 words/sec)** — comfortable, unhurried, leaves room for the freeze and the logo sting. Do not add copy. If you must cut, drop line 3; the visuals already say it.

**Delivery note:** the announcer tag must land on the *freeze frame*, not before it. The silence at 0:09.9 is part of the punchline.

---

## 4. Paste-Ready AI Video Prompts

> Written tool-agnostic. Veo 3.x / Sora-class models will also synthesize the dialogue; on a silent generator (Runway, Kling, image-to-video), generate picture only and record §3 in post. Generate **one clip per row** if your model caps at 4–8s, then stitch.

### 4.1 Master prompt (single generation, if your model does 10s)

```
A 10-second live-action comedy commercial, shot like a dry, deadpan tech ad. Cinematic, shallow depth of field,
35mm, naturalistic lighting with a clean neutral palette of white and near-black, one warm amber accent light.
Modern minimalist interior, no clutter, no visible brand logos.

Shot 1 (0-2s): tight shot of a laptop screen showing a plain grey empty rectangle where an advertisement should be.
A single housefly lands on the screen. A young woman in a hoodie and glasses (DANA) stares at it, defeated.
Her cat sits on the desk, staring at the fly. Desaturated, slightly cool grade. No dialogue.

Shot 2 (2-3.5s): she pastes a single line of code. One decisive keyboard click. She leans back,
relieved, like she has just defused a bomb. Deadpan delivery, no celebration.

Shot 3 (3.5-5s): the grey rectangle snaps alive into a bright, warm amber banner ad showing a phone with a
cat-photo app. The whole frame warms up. The fly leaves. The cat is unimpressed.

Shot 4 (5-6.5s): hard cut to a split screen. On the right, a man in his 30s with a headset around his neck
(MARCUS) in a different apartment, staring at his phone, which shows a banner ad for Dana's app.

Shot 5 (6.5-8s): both of them slowly turn and point at each other through the split screen in mutual,
awestruck recognition. Wider framing, both visible, split screen clean down the middle.

Shot 6 (8-10s): sudden freeze frame on the two of them pointing at each other; the cat is now also pointing.
The frame is static, high contrast. Hold.

Camera: locked-off tripod with subtle push-ins; no handheld shake. Transitions: hard cuts only.
Audio: quiet room tone, one fly buzz, a soft comedic "womp" on shot 1, a crisp keyboard click on shot 2,
a warm shimmer on shot 3, a dramatic orchestral sting on shot 6, then silence.
Subtle comedic sound design, deadpan tone, no laugh track, no voiceover.
Realistic human faces, natural skin texture, anatomically correct hands.
```

### 4.2 Clip-sized prompts (models with short clip limits)

**Clip A — 0:00–0:03.5 (the empty slot)**
```
Live-action deadpan commercial, cinematic 35mm, shallow depth of field, neutral white/near-black palette.
Tight shot of a laptop screen displaying a plain grey empty rectangle where an ad should be.
A housefly lands on it. A young woman in a hoodie and glasses stares at it, defeated and flat-faced.
A cat on the desk stares at the fly. Desaturated cool grade. Slow subtle push-in. One soft "womp" sound.
No dialogue. Realistic faces, natural skin texture, correct hands.
```

**Clip B — 0:03.5–0:06.5 (the payoff)**
```
Same woman, same laptop, same room, same lighting as the previous shot.
She pastes one line of code with a single crisp keyboard click, then leans back calmly.
The grey rectangle on screen transforms into a bright warm amber banner ad showing a phone with a cat photo app.
The entire frame warms from cool to amber. The fly flies away. The cat remains unimpressed.
Locked-off camera, hard cut to a split screen at the end: right side shows a man in his 30s with a headset
around his neck in a different apartment, staring at his phone. No dialogue.
```

**Clip C — 0:06.5–0:10.0 (the point + freeze)**
```
Clean vertical split-screen shot, two people in different apartments, both in frame, matching neutral white and
near-black interiors with warm amber accent light. Both slowly turn and point at each other through the split,
in awestruck mutual recognition. Wider framing. Then the image suddenly FREEZES mid-point.
In the frozen frame, a cat on the left side is also pointing. High contrast, static, held.
Dramatic orchestral sting, then silence. No dialogue. Realistic proportions, correct hands and fingers.
```

### 4.3 Negative prompt

```
text, letters, words, watermarks, logos, brand names, subtitles, gibberish UI, exaggerated cartoon faces,
plastic skin, extra fingers, deformed hands, motion blur, lens flare, shaky handheld camera, laugh track,
superhero costumes, mascots resembling existing characters, violence, weapons, alcohol, cigarettes
```

### 4.4 Continuity checklist

1. **Never let the model render UI text.** Generate screens as blank/abstract panels; composite the real banner and logo in post. AI models mangle small text and it will look cheap.
2. Reuse the **same seed** or a **character reference image** per actor across clips A/B/C, or Dana will quietly become a different person in Clip B.
3. Keep the **cat in the same desk position** in every Dana shot, or the freeze-frame gag won't read.
4. The **split screen is best composited in post** from two clean plates — it guarantees the pointing lines up and lets you drop in the final frame overlay.
5. Generate **16:9** for the master; reframe (don't re-generate) for 9:16 unless your tool supports native vertical.

---

## 5. End Card & Post-Production

- **0:08.0:** freeze. Add a subtle white 2px frame-in around the frozen image.
- **0:08.4:** logo lockup fades up in the bottom third — **AdTogether**, clean sans, near-black on white (invert for dark cutdowns), amber wordmark underline.
- **0:08.6:** supers, small, one line each, 2-frame stagger:
  - `SHOW AN AD. GET AN AD SHOWN.`
  - `Web · iOS · Android · Flutter · React Native`
  - `ad-together.org`
- **0:08.0–0:09.9:** announcer tag rides the sting.
- **0:09.9–0:10.0:** hard cut to black. No fade. Fades are for companies with bigger budgets.

**Audio mix:** room tone −30dB bed; fly −18dB; womp −14dB; sting peaks at −6dB then cuts to true silence for the logo. The silence sells the joke — don't fill it with music.

---

## 6. Vertical Cutdown (9:16, 10s)

Same beats, reframed. The split screen becomes a **horizontal stack** (Dana on top, Marcus on bottom), and the pointing becomes diagonal, toward each other. Everything else — timings, VO, sting, freeze — stays identical. Do not re-record audio; use the same mix.

---

## 7. Alternate Concepts (pick one if the client hates cats)

### Alt A — "The 30-Character Limit"
*Uses the real product constraint: auto-write caps titles at 30 characters and descriptions at 90.*

| In–Out | Visual | Audio |
|---|---|---|
| 0:00–0:02.5 | Dev delivers a sweeping epic pitch, arms wide: "It's a productivity app that revolutionizes… synergistic… human… workflows." | **DEV:** *(that exact list, breathless)* |
| 0:02.5–0:04 | Clicks **Auto-write with AI**. A tasteful sparkle. | *(sparkle)* |
| 0:04–0:06 | The AI returns, in giant type: **"Buy this app. It's great."** (25 characters.) | *(single triumphant chime)* |
| 0:06–0:08 | Dev stares. A long blink. Then, quietly, sincerely: "…that's better." | **DEV:** "…that's better." |
| 0:08–0:10 | Logo + tag. | **ANNOUNCER:** "Show an ad. Get an ad shown." |

### Alt B — "Yes You Can, Claude"
*Uses the real MCP server — campaign management from inside an AI assistant.*

| In–Out | Visual | Audio |
|---|---|---|
| 0:00–0:02 | 3am. Dev in a hoodie, two monitors, telling an AI assistant: "Launch my campaign." | **DEV:** "Launch my campaign." |
| 0:02–0:04 | Assistant replies on screen: **"Done. Live on 4,102 apps."** Dev doesn't move. | *(chime)* |
| 0:04–0:06 | Mom opens the door holding a mug: "Honey? Are you working?" | **MOM:** "Honey? Are you working?" |
| 0:06–0:08 | Dev lowers the laptop lid exactly one inch. Straight face. | **DEV:** "No." |
| 0:08–0:10 | Logo + tag over the closed laptop. | **ANNOUNCER:** "Show an ad. Get an ad shown." |

---

## 8. Compliance (yes, this script would pass its own screener)

Screened against [`AD_CONTENT_POLICY.md`](../../AD_CONTENT_POLICY.md) — no sexual content, no violence or gore (a fly leaves voluntarily), no drugs or alcohol (Mom's mug is coffee), no hate speech or harassment, no weapons. It is a comedy about a cat.

Expected `/api/screen` response for the submitted campaign: `{"passed": true, "reason": ""}`

---

## 9. Ship It As A Real Campaign

The commercial doubles as a live ad for the platform — dogfood it. Because ad creative on the network is capped at a **30-character title** and a **90-character description**, here are ready-to-submit options:

| Field | Copy | Count |
|---|---|---|
| Title | `Show an Ad, Get an Ad Shown` | 27 / 30 |
| Title (alt) | `One Line. Two Apps. Ads.` | 24 / 30 |
| Description | `Fill your empty ad slots with one line of code — then get your app shown everywhere.` | 84 / 90 |

Trigger auto-write by pointing it at `https://www.ad-together.org` and it will generate a competing option in one call.

> **When the banner version is rendered:** it must request `adType: 'banner'` explicitly — never the default fetch. A 10-second spot is not an interstitial, and a banner that accidentally serves interstitial inventory is an advertiser overcharge. See [`docs/SDK_SECURITY_INVARIANTS.md`](../../docs/SDK_SECURITY_INVARIANTS.md) §1.

---

## 10. One-Line Summary For The Editor

> Two devs with empty ad space paste one line of code, wind up advertising each other, point at each other like idiots, freeze frame, cat points, logo, "Show an ad. Get an ad shown." Done in ten seconds flat.

