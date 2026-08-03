import { ApiError } from '../utils/api-error.js'
import { ZodError } from 'zod'

const isObject = (val) => {
   return typeof val === "object" && val !== null;
}

export const errorHandler = (err, req, res, next) => {
   let statusCode = 500;
   let message = "Internal Server Error";

   // 1. Zod Validation Error
   if(err instanceof ZodError){
      statusCode = 400;

      message = err.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join(", ");

      return res.status(statusCode).json({
         success: false,
         error: message
      });
   }

   // 2. Custom ApiError
   if(err instanceof ApiError){
      statusCode = err.statusCode;
      message = err.message;

      if(statusCode >= 500){
         console.error("[ApiError 5xx]:", err);
      }

      return res.status(statusCode).json({
         success: false,
         error: message
      })
   }

   // 3. PostgreSQL Unique Constraint
   if(isObject(err) && err.code === "23505"){
      return res.status(409).json({
         success: false,
         error: "A record with this information already exists."
      })
   }

   // 4. PostgreSQL Foreign Key Constraint
   if(isObject(err) && err.code === "23503"){
      return res.status(400).json({
         success: false,
         error: "Invalid reference. Related record does not exist."
      })
   }

   // 5. Unknown Error
   console.error("[Unhandled Error]:", err);

   return res.status(statusCode).json({
      success: false,
      error: message
   })
}
























/*

This middleware is one of the most important pieces of an Express backend. It is responsible for **catching every error that happens anywhere in your application and converting it into a proper HTTP response.**

Think of it like this.

```
Client
   |
   |  HTTP Request
   v
Express App
   |
   |---- Route
   |       |
   |       |---- Controller
   |               |
   |               |---- Service
   |                       |
   |                       |---- Database
   |
   |  (Something throws an error)
   |
   v
Global Error Handler
   |
   | Converts Error → HTTP Response
   |
Client receives JSON
```

Without a global error handler, every controller would have to do this:

```js
try {
   ...
}
catch(err){
   res.status(500).json(...)
}
```

every single time.

Instead, you simply throw errors.

```
throw ApiError.notFound("User not found")
```

and Express automatically sends them to this middleware.

---

# First understand why it has 4 parameters

```ts
export const errorHandler = (
  err,
  req,
  res,
  next
)
```

Notice something special.

Normal middleware

```js
(req,res,next)
```

Error middleware

```js
(err,req,res,next)
```

That first parameter

```
err
```

tells Express

> "This middleware is for handling errors."

Without it Express won't recognize it as an error handler.

---

# Whole middleware

```ts
export const errorHandler = (
  err,
  _req,
  res,
  _next
)
```

Notice

```
_req
_next
```

Why underscore?

Because we aren't using them.

Instead of

```js
req
```

people write

```js
_req
```

to tell ESLint

> Yes, I know this variable exists.
> I intentionally don't use it.

---

# Variables

```ts
let statusCode = 500;
let message = "Internal Server Error";
```

Suppose nothing matches.

Then the response becomes

```
500
Internal Server Error
```

which is the safest default.

---

# First helper function

```ts
const isObject = (val): val is Record<string, unknown> =>
  typeof val === "object" && val !== null;
```

This exists because later we do

```ts
err.code
```

But

```
err
```

is

```ts
unknown
```

TypeScript doesn't allow

```ts
err.code
```

because it doesn't know whether

```
err
```

is

* string
* number
* null
* boolean
* object

So first we verify

```
Is it an object?
```

Only then TypeScript lets us access

```
err.code
```

In JavaScript you wouldn't need this.

---

# Case 1

Zod Validation Error

```ts
if (err instanceof ZodError)
```

Suppose

Client sends

```json
{
   "email":"abc"
}
```

Schema

```ts
z.object({
   email:z.email(),
   password:z.string().min(8)
})
```

Password missing.

Zod throws

```
ZodError
```

This condition becomes true.

---

Then

```ts
statusCode = 400;
```

Because user made a bad request.

---

Then

```ts
message = err.issues
```

Remember

A ZodError contains

```
issues
```

Example

```js
[
 {
   path:["email"],
   message:"Invalid email"
 },
 {
   path:["password"],
   message:"Required"
 }
]
```

---

Now

```ts
.map(...)
```

turns every issue into text.

```
email: Invalid email
password: Required
```

---

Then

```ts
.join(", ")
```

becomes

```
email: Invalid email,
password: Required
```

---

Finally

```ts
res.status(400).json({
 success:false,
 error:message
});
```

Client receives

```json
{
  "success": false,
  "error":"email: Invalid email, password: Required"
}
```

Then

```
return;
```

Why?

Because response has already been sent.

Don't continue.

---

# Case 2

Custom ApiError

```ts
if(err instanceof ApiError)
```

Suppose

Controller

```ts
throw ApiError.notFound("Movie not found");
```

Your ApiError class creates

```
statusCode = 404

message = Movie not found
```

Now this condition becomes true.

---

It copies values

```ts
statusCode = err.statusCode;

message = err.message;
```

Then

```ts
res.status(statusCode).json(...)
```

becomes

```json
{
 "success":false,
 "error":"Movie not found"
}
```

---

# Why this?

```ts
if(statusCode >=500)
   console.error(...)
```

Only server errors

```
500
501
502
503
```

are logged.

Why?

Because

400

is user's mistake.

500

is developer's mistake.

Only developer mistakes should be logged loudly.

---

# Case 3

PostgreSQL Duplicate Key

```ts
if(
 isObject(err)
 &&
 err.code==="23505"
)
```

What is

```
23505
```

It's PostgreSQL's error code.

Example

Database

```
users

email UNIQUE
```

Already exists

```
abc@gmail.com
```

Now user registers again

```
abc@gmail.com
```

Postgres throws

```
23505
```

Instead of crashing

you convert it into

```json
409 Conflict

{
 success:false,
 error:"A record with this information already exists."
}
```

Much cleaner.

---

# Why 409?

HTTP meaning

```
Conflict
```

User requested something

but it conflicts with existing data.

Perfect use case.

---

# Case 4

Foreign Key

```ts
23503
```

Suppose

Booking table

```
movie_id
```

references

Movies table.

Client sends

```
movie_id = 9999
```

Movie doesn't exist.

Postgres throws

```
23503
```

Instead of ugly database error

you send

```json
{
 "success":false,
 "error":"Invalid reference"
}
```

---

# Last case

```ts
console.error(...)
```

Suppose

Developer accidentally wrote

```ts
user.name.toUpperCase()
```

but

```
user
```

is

```
null
```

Now

```
TypeError
```

is thrown.

Not

Zod

Not

ApiError

Not

Postgres

Nothing matches.

Execution reaches

```ts
console.error(err)
```

Server log

```
TypeError:
Cannot read properties of null
```

Then client receives

```json
{
   "success":false,
   "error":"Internal Server Error"
}
```

Notice

The client **doesn't** see the stack trace or implementation details, which is good for security.

---

# Why `instanceof`?

```ts
err instanceof ApiError
```

means

> "Was this error created using the `ApiError` class?"

Example

```ts
throw new ApiError(...)
```

↓

```
true
```

But

```ts
throw new Error(...)
```

↓

```
false
```

---

# Flow of a request

Imagine this route:

```ts
app.post("/register", async (req, res, next) => {
    try {
        const data = registerSchema.parse(req.body);

        const user = await registerUser(data);

        res.json(user);

    } catch(err) {
        next(err);
    }
});
```

Scenario 1:

Invalid body

```
parse()

↓

throws ZodError

↓

next(err)

↓

errorHandler()

↓

400
```

---

Scenario 2

Duplicate email

```
INSERT

↓

Postgres

↓

23505

↓

next(err)

↓

errorHandler

↓

409
```

---

Scenario 3

Your service

```ts
throw ApiError.notFound(...)
```

↓

errorHandler

↓

404

---

Scenario 4

Bug

```ts
undefined.name
```

↓

TypeError

↓

errorHandler

↓

500

---

# Where to register this middleware

Usually in `app.js`, after all routes:

```js
import { errorHandler } from "./common/middleware/errorHandler.js";

app.use("/auth", authRoutes);
app.use("/booking", bookingRoutes);

// LAST middleware
app.use(errorHandler);

export default app;
```

It must be the **last** middleware, because Express only sends errors to it after other middleware and routes have had a chance to handle the request.

---

# One improvement for your project

Since you're using JavaScript (not TypeScript), your error handler can be simplified:

* Remove the `isObject` helper.
* Use `err?.code === "23505"` and `err?.code === "23503"` directly.
* In your async route handlers, either wrap them with `try/catch` and call `next(err)`, or use an async wrapper utility so thrown errors automatically reach this middleware.

Once you understand this middleware, you'll notice that most backend projects follow the same pattern: **throw errors wherever they occur, and let one global place decide how to turn them into HTTP responses.** That keeps controllers and services much cleaner.


*/