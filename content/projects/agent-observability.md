---
title: Agent observability & evals for InvoiceChaser
headline: Tracing and evaluating an agent before every prompt change
summary: Per-step tracing of every agent run, plus a golden-set eval that checks tone and tool choice at each escalation level before a prompt change ships.
description: Adding per-step tracing and a golden-set evaluation suite to the InvoiceChaser agent so prompt and model changes can be checked before they ship.
status: In progress
date: 2026-10-01
order: 4
types: [ai-engineering]
tags: [observability, agents]
stack: [Tracing, Evals, Python]
links:
  demoNote: coming soon
  github: https://github.com/code0monkey1/invoice-dispute-agent
---

An agent that drafts letters to real clients needs more than a demo that looks right. This work adds two things to InvoiceChaser.

## The plan

- **Per-step tracing** — every prompt, tool call, tool result and human decision recorded for each run, so a bad draft can be debugged from the trace instead of guessed at.
- **A golden-set eval** — a fixed set of disputes at each escalation level, with checks on tone, which tools were called, and that no draft skipped approval. It runs on every prompt or model change.

[Update this page with the tracing tool, the eval results and a screenshot once it ships.]
