---
title: Conversational product search with an LLM
headline: Letting shoppers search the catalogue in plain language
summary: Shoppers describe what they want in plain language; an LLM turns it into an Elasticsearch query. Non-technical users can now run searches that used to need filters and exact keywords.
description: How I shipped LLM-powered conversational search at Grabbit, translating natural language into validated Elasticsearch queries for a 14,000+ user delivery platform.
status: At Grabbit
date: 2026-03-01
featured: true
order: 1
types: [ai-engineering, full-stack]
tags: [llm, search]
stack: [LLM, Elasticsearch, Spring Boot, React Native, AWS]
links:
  demoNote: in Grabbit app
  githubNote: private
---

Keyword search failed whenever a shopper didn’t know a product’s exact name. I built a conversational search layer where an LLM translates the request into a structured Elasticsearch query, so non-technical users can run searches that used to need filters.

## From a sentence to a query

The examples below are illustrative — field names are simplified, not Grabbit’s real schema.

<!-- widget:search-examples -->

## One search request

<!-- widget:search-pipeline -->

## The hard parts of running an LLM in a live product

| Risk | How I handled it |
|---|---|
| The model writes an invalid or unsafe query | [Describe your validation — e.g. structured output against an allow-list of fields and operators] |
| The model is slow or down | [e.g. timeout, then fall back to plain keyword search] |
| It needs to know the catalogue | [e.g. categories and field schema supplied in the prompt] |
| Cost per search | [e.g. model choice, caching common queries] |
| Knowing it actually helped | [e.g. search-to-cart or zero-result rate, before vs after] |

## Outcome

Non-technical users can run complex product searches, which made the catalogue noticeably easier to discover. [Add one measured number here — it is the single most persuasive line on this page.]
