# AssTrollOGs 💜

A fun little app that gets to know you — and turns what it learns into daily insights, quick games, and a one-of-a-kind virtual pet.

You start with a short quiz about how you connect with people: your love language, your attachment style, how you handle disagreements, how you express yourself. From there, the app gives you something new every day.

Use it **solo** to learn about yourself, or in **partner mode** to explore how you and your partner fit together.

## ✨ What you can do

- **Get a fresh insight every day** — a "Day at a Glance" written for *your* personality, plus practical do's and don'ts.
- **Play quick daily games** — trivia about yourselves, would-you-rather, a daily question, rapid-fire quick takes, and a weekly check-in ritual.
- **Raise a virtual pet** 🐾 — your pet's species, colors, patterns, and aura are all generated from your personality. It grows every day you show up, evolves through five life stages, and keeps ascending forever after that. There's even a rare "shiny" chance.
- **Partner mode** — guess each other's answers and see how well you really know each other, compare daily questions, and grow a shared *couple pet* that responds to how connected you two actually are.
- **Add friends** — log your read on a friend's personality, get friendship insights and icebreakers, and grow a little companion pet for each friendship.
- **Make it yours** — six themes (Dark, Light, Cool, Fun, Robot, Anime), streaks, and milestones to unlock.

## 🔑 Your data & your save code

No account. No sign-up. No password.

Everything is saved right on your device. When you finish setup, you get a permanent save code that looks like `VIBE-XXXX-XXXX` — **write it down!** That code is how you restore your profile on a new phone, or keep two devices in sync. It never changes.

## 🚀 Try it

[Open in StackBlitz ⚡️](https://stackblitz.com/~/github.com/emci-hub/AssTrollOGs)

## 🛠 Run it yourself

```bash
npm install
npm run dev      # local dev server
npm run build    # production build
```

The app works fully offline out of the box — cloud sync is optional. To enable it, create a free [Supabase](https://supabase.com) project, run `supabase/bootstrap.sql` once in its SQL Editor, and put your project URL and publishable key in `.env` (`VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY`).

## 👩‍💻 For developers

Built with vanilla JavaScript (ES modules), Vite, and Supabase, and installable as a PWA. The full architecture, data-flow map, and module reference live in [`CLAUDE.md`](CLAUDE.md).

---

That's the whole thing — user-friendly language up top, save-code explanation in plain English, and the technical stuff kept to a few lines at the bottom. If you like it, say the word and I'll drop it into `README.md` (and push only if you ask).
