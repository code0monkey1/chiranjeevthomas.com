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
from langchain.agents.middleware import wrap_model_call, ModelRequest, ModelResponse
from typing import Callable

PAYMENT_TOOLS = [mark_invoice_pending, mark_invoice_paid, record_partial_payment]

# Tools available at each escalation level (progressive unlocking)
LEVEL_0_TOOLS = [
    update_invoice_details,
    check_invoice_status,
    draft_invoice_delivery_email,
]

LEVEL_1_TOOLS = [
    check_invoice_status,
    draft_invoice_delivery_email,
    draft_polite_reminder,
    escalate_dispute,
    update_invoice_details,
] + PAYMENT_TOOLS

LEVEL_2_TOOLS = LEVEL_1_TOOLS + [
    draft_formal_demand_letter,
    calculate_late_fees,
]

LEVEL_3_TOOLS = LEVEL_2_TOOLS + [
    lookup_small_claims_procedures,
    generate_court_filing_guide,
    draft_final_notice,
]


@wrap_model_call
def dynamic_tool_middleware(
    request: ModelRequest,
    handler: Callable[[ModelRequest], ModelResponse]
) -> ModelResponse:
    """Dynamically provide tools based on the current escalation level in state."""
    escalation_level = request.state.get("escalation_level", 0)

    if escalation_level <= 0:
        tools = LEVEL_0_TOOLS
    elif escalation_level == 1:
        tools = LEVEL_1_TOOLS
    elif escalation_level == 2:
        tools = LEVEL_2_TOOLS
    else:
        tools = LEVEL_3_TOOLS

    request = request.override(tools=tools)
    return handler(request)
```

*From [`src/middleware/dynamic_tools.py`](https://github.com/code0monkey1/invoice-dispute-agent/blob/main/src/middleware/dynamic_tools.py) in the InvoiceChaser repo, with the tool imports left out.*

A second middleware, `@dynamic_prompt`, swaps the tone the same way, so the words and the abilities always move together.

## Escalation is state, not a vibe

The level only changes through the `escalate_dispute` tool, which returns a `Command(update=…)` to the agent’s typed state. The next model call sees the new level and gets the new tools. And because every draft tool pauses for human approval, nothing reaches a client on the model’s say-so.

## Takeaways

- Enforce permissions in code; use the prompt for tone and judgement.
- Keep the tool list small at every step — fewer choices, fewer wrong calls.
- Put anything irreversible behind a human approval step.
