import { Injectable } from '@nestjs/common';
import { Type } from '@sinclair/typebox';
import { ApModule, ApTool, getCurrentIdentity } from 'nestjs-apcore';

interface Todo {
  id: number;
  title: string;
  done: boolean;
  createdAt: string;
}

const TODO_SHAPE = Type.Object({
  id: Type.Number(),
  title: Type.String(),
  done: Type.Boolean(),
  createdAt: Type.String(),
});

/**
 * A stateful NestJS service exposed as MCP tools via @ApTool decorators.
 *
 * Demonstrates dual-protocol access: the same service is injected into
 * TodoController for REST and registered as MCP tools via @ApModule/@ApTool.
 *
 * ACL demo (see acl.yaml + apcore.yaml):
 *   anonymous  → todo.list, todo.get only (read-only)
 *   bearer JWT → todo.*    (full access)
 *
 * Every tool returns a `caller` field so the identity chain is visible:
 *   JWT token → JWTAuthenticator → identity.id → getCurrentIdentity()
 */
@ApModule({ namespace: 'todo', description: 'Todo list management' })
@Injectable()
export class TodoService {
  private todos: Todo[] = [
    { id: 1, title: 'Try the nestjs-apcore demo', done: false, createdAt: new Date().toISOString() },
    { id: 2, title: 'Read the nestjs-apcore README', done: false, createdAt: new Date().toISOString() },
  ];
  private nextId = 3;

  // ── Read tools (anonymous + bearer) ────────────────────────────────────────

  @ApTool({
    description: 'List all todos, optionally filtered by completion status',
    inputSchema: Type.Object({
      done: Type.Optional(Type.Boolean({ description: 'true=completed, false=pending, omit=all' })),
    }),
    outputSchema: Type.Object({
      todos: Type.Array(TODO_SHAPE),
      count: Type.Number(),
      caller: Type.String({ description: 'Caller identity — "anonymous" or the JWT subject' }),
    }),
    annotations: { readonly: true, idempotent: true },
    tags: ['todo', 'query'],
  })
  list(inputs: Record<string, unknown>): Record<string, unknown> {
    let result = this.todos;
    if (inputs.done !== undefined) {
      result = result.filter((t) => t.done === inputs.done);
    }
    return { todos: result, count: result.length, caller: caller() };
  }

  @ApTool({
    description: 'Get a single todo by ID',
    inputSchema: Type.Object({ id: Type.Number({ description: 'Todo ID' }) }),
    outputSchema: Type.Object({
      todo: Type.Optional(TODO_SHAPE),
      error: Type.Optional(Type.String()),
      caller: Type.String(),
    }),
    annotations: { readonly: true, idempotent: true },
    tags: ['todo', 'query'],
  })
  get(inputs: Record<string, unknown>): Record<string, unknown> {
    const todo = this.todos.find((t) => t.id === inputs.id);
    if (!todo) return { error: 'Todo not found', caller: caller() };
    return { todo, caller: caller() };
  }

  // ── Write tools (bearer only — anonymous blocked by ACL) ───────────────────

  @ApTool({
    description: 'Add a new todo item',
    inputSchema: Type.Object({
      title: Type.String({ description: 'What needs to be done' }),
    }),
    outputSchema: Type.Object({
      todo: TODO_SHAPE,
      caller: Type.String({ description: 'Who created this todo' }),
    }),
    annotations: { readonly: false, destructive: false },
    tags: ['todo', 'mutate'],
  })
  add(inputs: Record<string, unknown>): Record<string, unknown> {
    const todo: Todo = {
      id: this.nextId++,
      title: inputs.title as string,
      done: false,
      createdAt: new Date().toISOString(),
    };
    this.todos.push(todo);
    return { todo, caller: caller() };
  }

  @ApTool({
    description: 'Mark a todo as done or undone',
    inputSchema: Type.Object({
      id: Type.Number({ description: 'Todo ID' }),
      done: Type.Boolean({ description: 'New completion status' }),
    }),
    outputSchema: Type.Object({
      todo: Type.Optional(TODO_SHAPE),
      error: Type.Optional(Type.String()),
      caller: Type.String(),
    }),
    annotations: { readonly: false, idempotent: true },
    tags: ['todo', 'mutate'],
  })
  update(inputs: Record<string, unknown>): Record<string, unknown> {
    const todo = this.todos.find((t) => t.id === inputs.id);
    if (!todo) return { error: 'Todo not found', caller: caller() };
    todo.done = inputs.done as boolean;
    return { todo, caller: caller() };
  }

  @ApTool({
    description: 'Delete a todo by ID — restricted to authenticated callers (bearer)',
    inputSchema: Type.Object({ id: Type.Number({ description: 'Todo ID to delete' }) }),
    outputSchema: Type.Object({
      deleted: Type.Boolean(),
      id: Type.Number(),
      caller: Type.String({ description: 'Who performed the deletion' }),
    }),
    annotations: { readonly: false, destructive: true, idempotent: true },
    tags: ['todo', 'mutate', 'destructive'],
  })
  delete(inputs: Record<string, unknown>): Record<string, unknown> {
    const idx = this.todos.findIndex((t) => t.id === inputs.id);
    if (idx === -1) return { deleted: false, id: inputs.id as number, caller: caller() };
    this.todos.splice(idx, 1);
    return { deleted: true, id: inputs.id as number, caller: caller() };
  }

  /** Used by TodoController for REST endpoints — not an MCP tool. */
  getAll(): Todo[] {
    return this.todos;
  }
}

/** Returns the current MCP caller's identity id, or "anonymous" if unauthenticated. */
function caller(): string {
  return getCurrentIdentity()?.id ?? 'anonymous';
}
