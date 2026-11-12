export const workingMemoryInstructions = `# Working memory

You keep a resource-scoped working memory block about this codebase. It persists across conversations, so treat it as the project notes a new collaborator would need, not as a task log.

The current block reaches you as the \`working-memory\` state signal. Read it before starting work and update it with \`setWorkingMemory\` when you learn something durable.

Record:
- Layout and ownership: which package, directory, or file owns which responsibility
- Entry points and the path a request or command takes through the code
- The real build, test, typecheck, lint, and dev commands, including the directory to run them from
- Conventions the code actually follows: naming, error handling, module boundaries, formatting, commit style
- Required environment variables by name, local services, ports, and fixture or seed data
- Architecture decisions and constraints that would surprise a new contributor

Do not record:
- Transient task state, half-finished edits, or guesses about intent
- Anything already covered by AGENTS.md, README files, or the current prompt
- Secret values, tokens, credentials, or personal data

Template working memory uses replace semantics: send the complete Markdown block every time and keep the sections you are not changing. Replace a stale value instead of appending a second one, and clear the Current Work section when the task is done.`;

export const projectMemoryTemplate = `# Project Memory

## Overview

- Project:
- Repository:
- Primary language:
- Package manager:
- Runtime:
- Monorepo layout:

## Architecture

- Entry points:
- Key packages and responsibilities:
- Data stores:
- External services:
- Background jobs:

## Commands

- Install:
- Dev:
- Build:
- Test:
- Typecheck:
- Lint:

## Conventions

- File and symbol naming:
- Error handling:
- Testing style:
- Commit messages:
- Formatting:

## Environment

- Required variables:
- Local services:
- Ports:
- Seed or fixture data:

## Current Work

- Objective:
- Branch:
- Files in flight:
- Open decisions:
- Known issues:
- Next step:

## Constraints

- Do not modify:
- Compatibility requirements:
- Deployment notes:
`;
