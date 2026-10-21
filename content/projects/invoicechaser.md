---
title: InvoiceChaser — payment-recovery agent
headline: An agent that escalates unpaid invoices — and never acts without you
summary: Chases overdue invoices for freelancers through three escalation levels. Tools are gated per level, and nothing is sent without human approval.
description: How I built InvoiceChaser, a LangGraph and LangChain agent that escalates unpaid invoices through three levels with dynamic tool gating, human-in-the-loop approval and an MCP invoice server.
status: Live
date: 2026-09-01
featured: true
order: 2
types: [ai-engineering, full-stack]
tags: [agents, human-in-the-loop, mcp, langgraph]
stack: [LangChain, LangGraph, Groq · Llama 3.3 70B, FastAPI, React 19, MCP, Tavily, Vercel]
links:
  demo: https://invoice-chaser-chi.vercel.app
  github: https://github.com/code0monkey1/invoice-dispute-agent
media:
  video: /media/invoicechaser-demo.mp4
  poster: /media/invoicechaser-poster.jpg
  alt: "InvoiceChaser walkthrough: client pushback is detected, a late fee is calculated and a firmer escalation draft waits for the freelancer to approve"
---

Freelancers lose money to invoices nobody chases. InvoiceChaser moves a dispute from a friendly reminder to a formal demand to small-claims preparation, changing its tone and its tools at each level, and pauses for approval before anything goes out.

## Dynamic tool gating

A `@wrap_model_call` middleware filters the tool list before every model call, and `@dynamic_prompt` swaps the tone. At Level 1 the model doesn’t even know a final-notice tool exists — it isn’t forbidden, it simply isn’t there. Pick a level to see what the model can use:

<!-- widget:tool-gating -->

## Every draft stops for approval

`HumanInTheLoopMiddleware` interrupts the run on any draft tool. State is checkpointed per invoice (thread `invoice-{id}`), so the run resumes exactly where it paused through `POST /api/invoices/{id}/resume`. Try it:

<!-- widget:approval -->

## Architecture: one request, end to end

<!-- widget:invoice-architecture -->

## Why it’s safe to let this agent near a client

| Concern | Choice | Why |
|---|---|---|
| Irreversible actions | HITL interrupt on every draft tool | No letter reaches a client without explicit approval |
| Least privilege | Tools filtered per level in middleware | The model can’t jump to legal threats by itself |
| Consistent state | Typed state schema; tools return `Command(update=…)` | Level and fees change atomically, not by prompt |
| Durability | Checkpointer per invoice thread | A paused run survives restarts and resumes cleanly |
| Integrations | Invoice data behind an MCP server | Swap the mock for QuickBooks or Xero without touching the agent |
| Per-user config | Runtime context (business, terms, late-fee rate) | Same agent, each freelancer’s own rules |

## What I’d build next

- Tracing and a golden-set eval for tone and tool choice at each level
- Real email delivery (SendGrid or Resend) and PDF export of letters
- Live QuickBooks / FreshBooks / Xero behind the MCP server
