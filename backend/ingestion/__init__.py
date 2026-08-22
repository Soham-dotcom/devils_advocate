"""Offline corpus ingestion.

Turns the raw judgment PDFs under `dataset/` into the three build artifacts the
retrieval layer loads at runtime: a SQLite metadata DB, the document/issue vector
matrices, and the row-index map. Nothing in this package runs during a request.
"""
