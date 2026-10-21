---
title: Your agent shouldn’t know about tools it can’t use yet
description: State-based tool gating in LangChain — how InvoiceChaser keeps a debt-collection agent polite until escalation is earned, by changing what the model can see rather than what it’s asked to do.
date: 2026-10-20
tags: [ai-engineering, agents, langgraph]
project: invoicechaser
draft: false
---

InvoiceChaser helps freelancers recover unpaid invoices. A first reminder should be warm; a court-filing guide should only appear after polite and formal requests have failed. The obvious approach is to give the model every tool and write “don’t send a final notice unless the dispute is at Level 3” in the system prompt.

That’s a rule the model can break. If a tool is in the list, a confident enough model will eventually call it.

## Gate the tools in middleware

Instead, a middleware runs before every model call, reads the current escalation level from the agent’s state, and passes the model only the tools that level allows. At Level 1 the final-notice tool isn’t forbidden — it simply doesn’t exist.

```python
# [Replace with the real @wrap_model_call snippet from the repo]
```

A second middleware, `@dynamic_prompt`, swaps the tone the same way, so the words and the abilities always move together.

## Escalation is state, not a vibe

The level only changes through the `escalate_dispute` tool, which returns a `Command(update=…)` to the agent’s typed state. The next model call sees the new level and gets the new tools. And because every draft tool pauses for human approval, nothing reaches a client on the model’s say-so.

## Takeaways

- Enforce permissions in code; use the prompt for tone and judgement.
- Keep the tool list small at every step — fewer choices, fewer wrong calls.
- Put anything irreversible behind a human approval step.
