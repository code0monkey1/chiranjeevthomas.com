---
title: Document Q&A assistant (agentic RAG)
headline: A document Q&A assistant that searches only when it needs to
summary: Upload PDFs and chat with them. The model decides when to search, results are reranked, and every answer shows its sources.
description: An agentic RAG assistant built with LangChain, Pinecone integrated embeddings, a bge reranker and Llama 3.3 70B on Groq — the model calls retrieval as a tool and cites its sources.
status: Open source
date: 2026-07-01
order: 3
types: [ai-engineering]
tags: [rag, agents]
stack: [LangChain, Pinecone, bge reranker, Groq · Llama 3.3 70B, Node · Express]
links:
  demoNote: coming soon
  github: https://github.com/code0monkey1/RAG
media:
  video: /media/agentic-rag-demo.mp4
  poster: /media/agentic-rag-poster.jpg
  alt: "Document Q&A assistant demo: a question about AI engineering skills is answered from 28 indexed documents with a View Retrieved Context toggle, and an off-topic weather question is declined instead of guessed"
---

General-purpose chatbots answer from training data, not from your documents, and they make things up when they don’t know. Naive RAG fixes that but searches on every message — even “thanks” — and stuffs loosely related chunks into the prompt. I wanted retrieval only when needed, and only the passages that really match.

## Two pipelines: ingest, then answer

<!-- widget:rag-pipeline -->

## What makes it more than a notebook demo

| Concern | Choice | Why |
|---|---|---|
| Precision | Retrieve 6, rerank with bge-reranker-v2-m3, keep 3 | Cheap recall first, then a cross-encoder picks what the LLM sees |
| When to retrieve | Retrieval is a tool the LLM calls | Small talk and follow-ups skip a needless search |
| Chunking | Recursive splitter, 500 chars / 100 overlap | Small enough to be precise; overlap keeps sentences intact |
| Simpler ops | Pinecone integrated embeddings, serverless index | No separate embedding service to run or keep in sync |
| Latency | Groq inference | ~200 ms search + rerank, 1–3 s answer (measured locally) |
| Transparency | Response returns `toolsUsed` and `context` | The UI shows exactly which passages backed the answer |

## What I’d build next

- Streaming responses
- Hybrid search (keyword + vectors)
- Query logs, tracing and a golden-set eval
- Authentication, then a public deployment
