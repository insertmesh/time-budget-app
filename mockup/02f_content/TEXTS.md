# Time Budget SAM-10 – all app texts (v1, draft)

Tone: friendly, short, a bit cheeky, plain English. Never preachy, never productivity-shaming. Time is data, not a verdict.
Status: `draft` = written for the content mockup (`content.html`), `v9.2` = text already in the tap-flow mockup (kept as is), `new` = not in any mockup yet.
Later build steps: copy from here, keep the keys (`[tap.next]` etc.) as constants in the code.

## 0. Philosophy (source of all other texts)
- `[phil.1]` Time is always running, whether you plan for it or not.
- `[phil.2]` It's just data and we make it visible. We can make it more fun to play with too, but in the end, what you do with it is your choice.
- `[phil.3]` Didn't fix your plans for the hobby day? Your bad. Learn to fix days for yourself :)

## 1. Onboarding (first start, 6 pages + end page)
Buttons on every page: `Skip tour` · `Back` · `Next` (last page: `Done`).
1. **Hi. This is a time budget.**
   It shows where your time goes, so you can spend it on purpose. / It is not a productivity app. Nobody is grading you.
2. **Time is always running.**
   Whether you plan for it or not. / So the clock starts when you open the app and never stops. You only switch to the next thing.
3. **Tapping is the whole job.** (demo with 4 tiles)
   Tap the tile for what you are doing now. Next time, tap another one. Try it: → after a tap: `Now: <tile>` / `0:00 · switched. The old one ended right here.` (before: `Nothing running yet.` / `Tap a tile.`)
   Details (like "emails") are optional. "next" suggests the next planned thing, "pick" shows all tiles. A suggestion waits as a grey tile with a slow bar until you tap it.
4. **Plan ahead, if you like.**
   Plan tomorrow in the evening, in the morning, or after your first tap. You choose in Settings, and you can always skip it. / Fixed times (like picking up the kids) stay put. Everything else flexes around them.
5. **Evening checkout.** (demo: one open time)
   At night the app asks about the bits that are unclear. Time that matches your plan is already approved. / Don't remember? That is a fine answer: → `It was Chores` · `TBH? No idea` · `Sorry, forgot to tap`
6. **Bedtime has its own tile.**
   At bedtime the Sleep tile shows up. Tap it, close the app, sleep keeps counting. / Staying up is allowed. It just shows as orange "past bedtime" time, and the morning asks how you slept.
7. **That's it.** (end page)
   Tap something. The clock is already running. / Your data stays in this browser. Rules are always one tap away. → `Read the rules` · `Start tapping`

## 2. Rules page ("The rules (there are only a few)")
Opens with `[phil.1]` and `[phil.2]` as quotes; ends with `[phil.3]`.
Under the quotes (`rules.purpose`, wording from the web chat, Samuel's answer 2026-11-13): **What's it for?** Looking back at where your hours went, and suggestions for changes. Suggestions you can ignore.
**Only the 4 core rules** (Samuel's choice 2026-11-13; shortened from the web's `[rule.1-4]`, see `PHILOSOPHY_SHARED.md` §3b):
1. **Your time needs purpose.** Rest counts. Fun counts. Procrastination doesn't, and neither does overtime nobody chose. Happened anyway? Name it. "Stuck" is a fine name.
2. **Your time is limited.** Don't know where it goes? Then you're not in charge of it.
3. **Time is relative.** You can't always decide what to do with it. But with no plan, there's nothing to adjust.
4. **Spend it more consciously.** The goal isn't doing more. It's doing less of what you don't value.

### 2b. Hints (the former 8 practical rules, now small texts at the place they matter; not on the rules page)
- `hint.noStop` (tap screen / onboarding p.2) No stop button. The clock never stops, you only switch. Not tapping just leaves a gap.
- `hint.gaps` (checkout, gap row) Gaps are data, not failures. Sort it later or say "TBH? No idea".
- `hint.flex` (Plans) Plans flex. Fixed times don't. The app adjusts everything flexible; a fixed time stays put, and so does the order around it.
- `hint.fixDay` (Plans, day header) Want to protect a day? Fix its times. Didn't fix your plans for the hobby day? Your bad. Learn to fix days for yourself :)
- `hint.unbalanced` (Plans, week view) An unbalanced week is allowed. Catch up next week and still hit the monthly goal. You decide.
- `hint.stayUp` (Sleep tile) Staying up is allowed. It just shows: orange "past bedtime" time and one question in the morning.
- `hint.stuck` (Stuck "?" tile) Stuck is a real category. Meltdown, shutdown, can't start take real time, so they get real names.
- `hint.local` (Settings, Data) Everything stays in this browser (v1). Backup and restore live here.

## 3. Tap screen
| Key | Text | Status |
|---|---|---|
| `tap.next` | next | v9.2 |
| `tap.pick` | pick | v9.2 |
| `tap.first` | First on your day | v8 |
| `tap.none` | Tap what you are doing | v9.2 |
| `tap.changePlans` | change plans | v9.2 |
| `tap.locked` | Plan locked in, change it on the Plans page. | v9.2 |
| `tap.undo` | Oops, wrong tile? Undo | new (Feature idea "Undo a wrong tap", not mocked) |
| `tap.plansLater` | Plans page comes later. | new (04b placeholder) |

### 3a. Proposal bar (grey tile, slow bar)
- `bar.propose` Tap to start **<tile>**, or it stays a gap. · draft
- `bar.firstTile` Tap to start your day with **<tile>**. · draft

### 3b. Stuck "?" tile, bar ran out
- `stuck.title` Timer not running – what's up? · v9.2
- `stuck.forgot` Sorry, forgot to tap <tile> (green, auto-approved) · v9.2
- `stuck.types` Relationship issues · Meltdown · Shutdown · Can't start · Low energy · v9.2
- `stuck.later` Leave it for later (next / checkout) · v9.2
- `stuck.startOfDay` Your day was planned to start at <07:00>. What's up? · v9.1

## 4. Bedtime and morning
- `sleep.title` Time to sleep! · v9.2
- `sleep.over` + <0:25> past bedtime (orange clock) · v9.2
- `sleep.notYet` Not yet – stay up · v9.2
- `sleep.why` Why? → worth it · can't sleep · doomscrolling · gotta keep working · none of ya business · v9.2
- `sleep.adjust` Adjust tomorrow's plan · v9.2 · `sleep.auto` Auto-adjust tomorrow · v9.2
- `sleep.bye` **Nighty night!** You can close the app. Sleep keeps counting. · v9.2 (second line: draft)
- `morning.q` How did you sleep? → I slept (forgot to tap) · Couldn't sleep · Doomscrolling · Meltdown · Shutdown · None of ya business · v9.2
- `morning.plan` Change the plan? → Auto-adjust · Go to Plans · Keep the plan · v9.2 (doing nothing = auto-adjust)
- `morning.hint` Doing nothing = auto-adjust. · draft

## 5. Evening checkout
### 5a. Answers
`Sorry, forgot to tap` · `TBH? No idea` · the type of Stuck · the activity name. (v9.1)
### 5b. Comments after an answer (on/off in Settings; sound option planned)
| Answer | Comment |
|---|---|
| matches the plan | Sweet! +1 |
| fixed / improved (unwanted reduced, wanted grown) | Nice one. +1 |
| went wrong | Damn. −1 |
| TBH? No idea | Noted! +0 |
| Stuck with a reason | Honest answer. +1 |
| Sorry, forgot | Fair enough. +0 |
Only "Sweet! +1", "Damn. −1" and "Noted!" are v9.1; the rest is draft.
### 5c. Messages
- `check.open` Needs you · `check.approved` approved · v8
- `check.stamp` Day closed · v8
- `check.empty` Nothing left to sort. Nice. · draft
- `check.score` <82>% of today kept to the plan (or improved it). · draft

## 6. Plans (only what 02f adds; the rest is in plans_v7)
- `plans.fixHint` Want this day to stay as planned? Fix its times. · draft (rule 4)
- `plans.autofix` Auto-fix also changes days you planned by hand. Only fixed times never change. · draft
- `plans.unbalanced` This week is out of balance. That's allowed. Fix it here, or catch up next week. · draft

## 7. Settings text (one-line helpers)
- Data: `Export data` · `Import data` · Everything is saved in this browser only. Export a file to keep a backup. · draft
- Rules: `Rules` (opens the rules page) · `Show the tour again` · draft
- Checkout comments: `Show a comment after each answer` · draft

## 8. Empty and error states
- `empty.firstOpen` Nothing yet. Tap a tile, the clock is already running. · draft
- `empty.noData` No data yet. Come back after a few days of tapping. · draft
- `err.import` That file doesn't look like a Time Budget backup. Nothing was changed. · draft
- `err.storage` Can't save in this browser (private window?). Export a backup now. · draft
