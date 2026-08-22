"""Runtime similar-case retrieval.

Loads the artifacts built by `ingestion` and scores a submitted case against the
corpus. Pure local computation — no network calls, no LLM.
"""
