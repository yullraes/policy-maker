---
name: policy-maker-init
description: Interactively gathers all necessary information for the Policy Maker project (service summary, users, revenue model, etc.) through targeted Q&A before launching the Domain Strategist agent.
---

# Policy Maker: Initialization Skill

This skill guides the user through a structured Q&A to gather the essential data points needed for the multi-agent policy discovery workflow.

## Workflow

1. **Service One-Liner**: Ask the user for a single-sentence summary of the service.
2. **User Types**: Identify who the primary customers and internal users are.
3. **Revenue Model**: Understand how the business makes money and what the core incentives are.
4. **Lifecycle Overview**: Map the stages from creation to fulfillment/cancellation.
5. **Integrations**: List key external dependencies (PG, Logistics, Auth, etc.).
6. **Core KPIs**: Identify what the business values most (and thus where the biggest risks lie).
7. **Operational Actors**: Identify who manages the service (CS, Admin, Partners).

## Interaction Guidelines

- **One at a time**: Ask questions one or two at a time to avoid overwhelming the user.
- **Provide examples**: If the user is unsure, provide examples from similar domains (e.g., "For a delivery app, revenue comes from delivery fees and commission").
- **Summarize**: After gathering enough info, summarize it in a format compatible with the `domain-strategist` input.

## Completion Criteria

Once the user provides sufficient detail for the following variables, the initialization is complete:
- `SERVICE_ONE_LINER`
- `USER_TYPES`
- `REVENUE_MODEL`
- `LIFECYCLE_OVERVIEW`
- `INTEGRATIONS`
- `TOP_KPIS`
- `ORG_ROLES` / `OPS_ACTORS`
