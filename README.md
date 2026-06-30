# DBMS

A custom Database Management System, built from the ground up.

## Status

Architecture phase — stack not yet finalized.

## Scope

Ground-up implementation covering the storage engine, data serialization and file
format, query parser/lexer, query planner and optimizer, execution engine,
transaction manager (ACID, locking, MVCC), indexing (B-Tree, Hash), and a client
interface. No wrapping of existing engines.

## Repository Layout

- `CLAUDE.md` — project-specific instructions and architecture checkpoints.
- (modules added as the architecture is approved)

## Workflow

Development follows a "Plan Before Code" checkpoint system: explore and architect,
propose stack/design with trade-offs, approve, then execute in reviewable chunks.
