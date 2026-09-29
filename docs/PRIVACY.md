# Synapse Privacy Policy

_Last updated: 29 September 2026_

Synapse is made by Kitchen Labs. It's a free website for practising League of Legends drafts. This
page says, in plain English, what happens to your information.

## The short version

- There are no accounts, no ads and no tracking.
- Your drafts stay in your browser.
- If you ask for a coach's report, the finished draft (champions only) is sent to our server, and
  it may be passed to an AI service to write the report. Nothing about you is sent with it.

## What we handle, and why

**Your drafts (stay in your browser).** Each draft you play (your side, the format, the sample
opponent you chose, and the bans and picks) and any report you asked for are saved in your
browser's local storage, so a draft is still there when you reload the page. They never leave your
browser unless you ask for a report. Synapse keeps your 20 most recent drafts; clearing your
browser's site data deletes them.

**The coach's report (only if you tap Write the coach's report).** Your browser sends the finished
draft (side, format, the sample team's name, and the champions banned and picked) over an encrypted
connection to Kitchen Labs' server (hosted by Vercel). The server works out the numbers (win chance,
grade, lane matchups) and, when the AI writer is available, sends those numbers and the champion
names to OpenAI's AI service to write the report's sentences. OpenAI processes them under its API
terms, which say API data isn't used to train its models and may be kept for up to 30 days for abuse
monitoring. No name, email, account or device identifier is ever part of a draft. To answer the same
draft instantly next time, the server may keep the written report in memory for a short while; it's
tied to the champions picked, not to you.

**Your IP address, for a few minutes.** To keep the free AI reports fair, the server counts report
requests per IP address in memory (at most four AI-written reports every ten minutes). The count is
not saved anywhere and disappears within ten minutes. Like any website, our host Vercel may record
standard request logs (such as IP address and pages requested) to run and protect the service.

## What we don't do

No advertising, no analytics tools, no cookies for tracking, no selling or sharing of data. We don't
ask for your name, email, location or contacts.

## Sample data, not real players

The teams and players in Synapse are made up, and champion statistics are estimates. Synapse doesn't
collect or show information about real people.

## Children

Synapse is not directed at children under 13 and collects no personal information from them.

## Changes and contact

If this policy changes, we'll update the date above. Questions:
**arvind.vivekk@gmail.com**.
