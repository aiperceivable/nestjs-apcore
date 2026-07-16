# nestjs-apcore ACL demo

Shows how a NestJS application enforces apcore **Access Control Lists (ACL)** on
apcore module calls made from REST controllers — the same `orders.delete`
(admins only) / `orders.list` (public read) contract used across the apcore
framework integrations.

## What it shows

| Call | Roles | Result |
| --- | --- | --- |
| `DELETE /orders/1` | *(none — anonymous)* | **403** |
| `DELETE /orders/1` | `user` | **403** |
| `DELETE /orders/1` | `admin` | **200** `{"deleted": 1}` |
| `GET /orders` | *(any)* | **200** (read is public) |

## How it works

1. [`app.module.ts`](./app.module.ts) loads [`acl.yaml`](./acl.yaml) via
   `ACL.load(path)` and passes it to `ApcoreModule.forRoot({ acl })`, so the
   Executor enforces it on every module call.
2. [`orders.service.ts`](./orders.service.ts) exposes `orders.delete` /
   `orders.list` as apcore modules via `@ApModule` + `@ApTool`.
3. [`orders.controller.ts`](./orders.controller.ts) builds an apcore `Context`
   from the request via `NestContextFactory` (which turns the `X-Roles` header
   into an `Identity(roles=...)`) and calls the module through
   `ApcoreExecutorService.call(moduleId, inputs, ctx)`.
4. The Executor checks the ACL before running the module. A denied call raises
   `ACLDeniedError`, which the controller maps to HTTP 403.

`acl.yaml` (first-match-wins, `default_effect: deny`):

- **admins** (`roles: [admin]`) may call any module;
- **anyone** (including anonymous) may call `orders.list`;
- everything else falls through to `deny`.

## Run it

```bash
npx tsx examples/acl_demo/main.ts

curl -X DELETE localhost:3000/orders/1                       # 403 (anonymous)
curl -X DELETE localhost:3000/orders/1 -H 'X-Roles: user'    # 403 (not admin)
curl -X DELETE localhost:3000/orders/1 -H 'X-Roles: admin'   # 200
curl localhost:3000/orders                                   # 200 (read is public)
```

> **NOTE:** The `X-Roles` header is a demo shortcut standing in for real
> authentication. In production, resolve the user (and roles) from a JWT/session
> guard and expose them to `NestContextFactory` instead.
