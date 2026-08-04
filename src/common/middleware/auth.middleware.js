import { pool } from '../config/db.js';
import { ApiError } from '../utils/api-error.js'
import { verifyAccessToken } from "../utils/jwt.utils.js"

export const requireAuth = (req, res, next) => {
    try {
        // Read token from cookie instead of Authorization header
        const token = req.cookies?.accessToken;

        if(!token){
            throw ApiError.unauthorized("Authentication required");
        }

        // Verify JWT
        const decoded = verifyAccessToken(token);

        // Check latest user from database
        const result = await pool.query(`SELECT id, name, email, role FROM users WHERE id = $1`, [decoded.id]);

        if(result.rowCount === 0){
            throw ApiError.unauthorized("User not found");
        }

        req.user = result.rows[0];

        next();
    } catch (error) {
        next(error);
    }
}



/*


For your hackathon (Express + PostgreSQL + JWT), **I'd choose a combination of both**. They solve different problems.

## Middleware 1

```js
const decoded = verifyAccessToken(token);
req.user = decoded;
next();
```

### What it does

* Reads JWT from Authorization header
* Verifies JWT
* Stores decoded payload in `req.user`
* Goes to next middleware

It **does not touch the database.**

---

### Flow

```
Request
   │
   ▼
Authorization Header
   │
   ▼
Extract Token
   │
   ▼
Verify JWT
   │
   ▼
req.user = decoded token
   │
   ▼
Controller
```

If your token contains

```json
{
  "id": 5,
  "email": "abc@gmail.com",
  "role": "user"
}
```

then after middleware

```js
req.user = {
    id: 5,
    email: "abc@gmail.com",
    role: "user"
}
```

Simple.

---

### Advantages

Very fast.

Only JWT verification happens.

No database query.

One request = zero DB calls.

Perfect when the JWT already contains everything you need.

---

### Disadvantages

Suppose the token says

```json
{
    "id":5,
    "role":"admin"
}
```

Now imagine

* user gets deleted
* or blocked
* or role changed

JWT is still valid until expiry.

Middleware still allows access.

Because it never checks database.

---

## Middleware 2

```js
const decoded = verifyAccessToken(token);

const user = await User.findById(decoded.id);

req.user = user;
```

Notice one extra step.

---

Flow becomes

```
Request
    │
    ▼
Read Header
    │
    ▼
Verify JWT
    │
    ▼
Database
    │
Find User
    │
    ▼
Attach latest user
    │
    ▼
Controller
```

---

### Advantages

Always latest data.

Suppose

```
Yesterday:
Role = Admin
```

Today

```
Role changed to User
```

JWT still contains

```
Admin
```

Database contains

```
User
```

Middleware fetches DB

Controller receives

```
User
```

Correct.

---

Same if

User deleted.

Database returns

```
null
```

Access denied.

Great.

---

### Disadvantages

Every request

```
JWT Verify

+

Database Query
```

More expensive.

If

```
1000 requests/sec
```

then

```
1000 extra DB queries/sec
```

---

# Which is more secure?

Second.

Because it verifies user still exists.

---

# Which is faster?

First.

No DB query.

---

# Which is used in production?

Actually...

**Both.**

A common production pattern is:

```
Login
      │
Generate JWT
      │
JWT contains

id
role
tokenVersion
```

Authentication middleware

```
Verify JWT

↓

Sometimes fetch DB

↓

Continue
```

Many companies only hit the database when they actually need fresh information.

---

# There is another issue in middleware 2

This

```js
throw ApiError.unauthorized(...)
```

inside an async middleware is not ideal.

Better

```js
try {
   ...
}
catch(err){
    next(err);
}
```

Otherwise Express may not catch it consistently depending on version.

---

# Another improvement

Instead of

```js
req.user = user;
```

Don't attach the entire DB row.

Attach only what you need.

Example

```js
req.user = {
    id: user.id,
    email: user.email,
    role: user.role
}
```

Exactly like middleware 2 already does.

That's good.

---

# Another improvement

This

```js
req.headers.authorization.split(" ")[1]
```

works,

but slightly cleaner is

```js
const authHeader = req.headers.authorization;

if (!authHeader?.startsWith("Bearer ")) {
    throw ApiError.unauthorized();
}

const token = authHeader.substring(7);
```

or

```js
const token = authHeader.replace("Bearer ", "");
```

No array creation.

---

# Another improvement

Instead of

```js
const user = await User.findById(decoded.id);
```

In PostgreSQL you'll probably write

```js
const result = await pool.query(
    "SELECT id, name, email, role FROM users WHERE id = $1",
    [decoded.id]
);

const user = result.rows[0];
```

---

# What would I use for your project?

Since you're using PostgreSQL, I'd write something like:

```js
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader?.startsWith("Bearer ")) {
            throw ApiError.unauthorized("Authentication required");
        }

        const token = authHeader.split(" ")[1];

        const decoded = verifyAccessToken(token);

        const result = await pool.query(
            `SELECT id, name, email, role
             FROM users
             WHERE id = $1`,
            [decoded.id]
        );

        if (result.rowCount === 0) {
            throw ApiError.unauthorized("User not found");
        }

        req.user = result.rows[0];

        next();
    } catch (err) {
        next(err);
    }
};
```

This combines the strengths of both approaches:

* ✅ verifies the JWT
* ✅ ensures the user still exists
* ✅ attaches fresh user data
* ✅ works with PostgreSQL
* ✅ forwards errors to the global error handler

---

## Recommendation for your hackathon

I'd implement **both `authenticate` and `authorize`**:

* `authenticate` → verifies the JWT, checks the user exists in PostgreSQL, and attaches a minimal user object to `req.user`.
* `authorize(...roles)` → checks `req.user.role` when an endpoint is restricted (for example, an admin-only route).

Even if your current hackathon only needs authentication, adding `authorize` makes your project closer to a real production backend and demonstrates a better understanding of backend architecture.



*/