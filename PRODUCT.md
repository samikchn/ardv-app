# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Static HTML/CSS/JS ES modules, no build step (same approach as the owner's son's "Notre Jardin" PWA). Hosted on GitHub Pages; Supabase for auth, data and an edge function that calls Google Gemini. Decided with Sami during brainstorming (31/10/2026).

## Users

Rafiza, owner-manager of Café Au Rendez-Vous, a Breton crêperie and artisan ice-cream shop behind the Basilique de Saint-Denis. She uses it on her iPhone, often between services or at the counter, sometimes on a PC. She describes herself as not technical and asks for explanations "like for a ten-year-old girl". She writes mostly in English mixed with French. Her son Sami installs and maintains the app.

## Product Purpose

A pocket toolbox for the restaurant's online presence: answer customer reviews, prepare social posts, understand Google Ads results, write notices and emails. It already knows the restaurant (address, hours, team, tone, keywords) so she never re-explains. Success: she opens it, sees what's new, gets ready-to-copy text in one or two taps.

## Positioning

Built from six months of her own conversations: her review-reply rules, her own past replies as tone examples, her Google Ads choices (manual CPC only, exact match, no Smart campaigns). Nothing generic.

## Operating Context

Reviews arrive on Google (763 reviews, 4.9/5) and TripAdvisor, in many languages. She replies by copying text into Google. Posts go to Google Business Profile, Instagram, Facebook, published manually. The restaurant is in a pedestrian dead-end street, so digital discovery is everything.

## Capabilities and Constraints

- Read-only towards Google; the app prepares, she acts (Copy / Open in Google).
- FR/EN toggle for the interface.
- Gemini free tier: send only what's needed; rate limits must produce a calm message.
- Only two accounts may sign in (Rafiza, Sami).
- Stage 1 = profile + reviews (paste mode). Posts, Ads, Write come later.

## Brand Commitments

- Name: "Café Au Rendez-Vous" / "Au Rendez-Vous", "Crêperie & Glacier Artisanaux, Saint-Denis".
- Her chosen shop-window signage: indigo blue background with bright golden text (May 2026). Binding palette cue.
- Voice: warm, spontaneous, family-friendly, never "AI-sounding". Motto: client satisfaction first, business second.

## Evidence on Hand

Real past review replies exist in her Claude export (private, not in the repo). No photos in the repo yet; do not invent customer quotes or ratings beyond the real 4.9/5 · 763.

## Product Principles

1. One obvious action per screen; big, labelled buttons.
2. Never act on her behalf on Google or social networks.
3. Her words and rules first; the AI is invisible.
4. Calm under failure: never lose what she typed.

## Accessibility & Inclusion

Large text (17px+ body), 44px+ touch targets, high contrast, plain language, works in dark mode.
