# DBMS Project — Project-Specific Instructions

This file overrides or extends the root `CLAUDE.md` for the custom Database Management System project only.

---

## Project Goal
Architect and build a fully custom Database Management System from the ground up — covering the storage engine, query parser, execution engine, transaction manager, and client interface.

## Scope & Constraints
- This is a ground-up implementation; do not wrap existing database engines (SQLite, PostgreSQL internals, etc.).
- Prioritize correctness and architectural clarity before optimization.
- Design decisions must be documented with the *why*, not just the *what*.

## Tech Stack Decisions
- Record all major tech/language/architecture decisions here as they are made and approved.
- No stack decisions are final until explicitly approved by Sir.

## Architecture Checkpoints
Follow the root `execution_workflow` strictly:
1. Explore & Architect before any code.
2. Propose stack/design with pros/cons at national and international scale.
3. Wait for approval at each checkpoint before proceeding.
4. Execute in logical, reviewable chunks.

## Module Breakdown (to be expanded)
- [ ] Storage Engine (pages, buffer pool, disk I/O)
- [ ] Data Serialization & File Format
- [ ] Query Parser & Lexer
- [ ] Query Planner & Optimizer
- [ ] Execution Engine
- [ ] Transaction Manager (ACID, locking, MVCC)
- [ ] Indexing (B-Tree, Hash)
- [ ] Client Interface / Query Language (SQL subset or custom DSL)
- [ ] Networking layer (optional: server/client model)

## Code Standards
- All modules must be independently testable.
- No monolithic files — enforce strict separation of concerns per module.
- Use interfaces/abstractions at module boundaries to allow swapping implementations.

## Current Status
- Project initialized. Architecture phase not yet started.

---

*Global rules in the root `CLAUDE.md` remain in effect unless explicitly overridden here.*
