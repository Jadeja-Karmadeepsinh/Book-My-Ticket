import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import { AuthController } from './auth.controller.js'

const router = Router();

// Rate limiter for login and password reset routes to prevent brute force attacks
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 requests per windowMs
    message: {
        success: false,
        error: "Too many attempts from this IP, please try again after 15 minutes"
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false,
    validate: {
        xForwardedForHeader: false,
        trustProxy: false
    }
})

// Public routes
router.post('/register', AuthController.register);
router.post('/refresh', AuthController.refresh);
router.post('/logout', AuthController.logout);

// Rate-limited sensitive endpoints
router.post('/login', authLimiter, AuthController.login);
router.post('/forgot-password', authLimiter, AuthController.forgotPassword);
router.post('/reset-password', authLimiter, AuthController.resetPassword);

export const authRoutes = router;


/*

Perfect. Rate limiting is one of those things that every backend developer eventually needs, but it's often introduced without explaining **why it exists**. Let's build it from absolute basics.

---

# Step 1: First understand the problem

Imagine your login API.

```
POST /login
```

A normal user will do

```
Attempt 1
```

or maybe

```
Attempt 1
Attempt 2
Attempt 3
```

if they forgot their password.

That's completely fine.

---

Now imagine a hacker.

He writes a script.

```text
password1
password2
password3
password4
password5
...
password100000
```

The script sends

```
100 requests/sec
```

to your login endpoint.

Your server keeps checking

```
username exists?

↓

password correct?

↓

No

↓

Again

↓

Again

↓

Again
```

Eventually either

* server becomes slow
* database becomes overloaded
* hacker guesses the password

This is called

**Brute Force Attack**

---

Another example.

Someone writes

```js
while(true){
    fetch("/login")
}
```

Now your server receives

```
10000 requests
```

in one minute.

Without protection,

your backend happily processes every request.

---

# So what is Rate Limiting?

It simply means

> "Slow down."

Instead of allowing

```
∞ requests
```

you say

```
Maximum 10 requests

per

15 minutes
```

After that

```
NO.
```

Server rejects requests automatically.

---

Think of a cinema.

Only 10 people allowed inside every minute.

Person number 11

```
Sorry.
Wait outside.
```

Exactly what a rate limiter does.

---

# Where does rate limiter sit?

Request flow

```
Client

↓

Express

↓

Rate Limiter

↓

Authentication

↓

Controller

↓

Database
```

Notice

Rate limiter runs **before everything.**

If the request exceeds the limit,

the request never reaches

* controller
* database
* JWT verification

Huge performance benefit.

---

# The package

Usually

```js
import rateLimit from "express-rate-limit";
```

This package creates Express middleware.

Just like

```js
app.use(express.json())
```

or

```js
app.use(cors())
```

Rate limiter is simply another middleware.

---

Now let's explain every line.

---

# rateLimit()

```js
const authLimiter = rateLimit({...})
```

`rateLimit()` is a function.

It returns middleware.

Something like

```js
(req,res,next)=>{
   ...
}
```

So

```js
app.post("/login", authLimiter, loginController)
```

becomes

```
Request

↓

authLimiter

↓

loginController
```

---

# windowMs

```js
windowMs: 15 * 60 * 1000
```

Milliseconds.

Let's calculate.

```
1000 ms

=

1 second
```

```
60 seconds

=

1 minute
```

```
15 minutes

=

15 × 60 × 1000

=

900000 ms
```

So

```
Window

=

15 minutes
```

---

Imagine

Current time

```
12:00
```

Window ends

```
12:15
```

Everything between

```
12:00

↓

12:15
```

counts.

At

```
12:15
```

counter resets.

---

# max

```js
max: 10
```

Meaning

```
Only 10 requests allowed

inside one window.
```

Example

```
12:00

Request 1

✅

Request 2

✅

...

Request 10

✅

Request 11

❌ Too many requests
```

Until

```
12:15
```

---

Then counter resets

```
12:15

Request 1

✅
```

Again.

---

# message

```js
message:{
 success:false,
 error:"Too many attempts..."
}
```

Normally Express sends

```
429 Too Many Requests
```

This property changes the response body.

Without

```js
message
```

Client may receive

```
Too many requests, please try again later.
```

With yours

```json
{
   "success": false,
   "error":"Too many attempts from this IP..."
}
```

Much cleaner.

---

# What status code?

Rate limiter automatically sends

```
429
```

which means

```
Too Many Requests
```

No need to set it yourself.

---

# standardHeaders

```js
standardHeaders:true
```

This is actually very useful.

Express adds headers like

```
RateLimit-Limit

RateLimit-Remaining

RateLimit-Reset
```

Example

```
RateLimit-Limit: 10

RateLimit-Remaining: 7

RateLimit-Reset: 840
```

Client now knows

```
I have

7 requests remaining.
```

This follows the newer HTTP standard.

---

# legacyHeaders

```js
legacyHeaders:false
```

Old versions used

```
X-RateLimit-Limit

X-RateLimit-Remaining

X-RateLimit-Reset
```

These start with

```
X-
```

Modern HTTP standards replaced them.

So

```
legacyHeaders:false
```

means

```
Don't send old headers.
```

Good practice.

---

# validate

```js
validate:{
   xForwardedForHeader:false,
   trustProxy:false
}
```

This is the most confusing part.

Need to understand proxies first.

---

Normally

```
User

↓

Express Server
```

Easy.

Express sees

```
IP

=

192.168...
```

---

But in production

there is usually

```
User

↓

Cloudflare

↓

NGINX

↓

Railway

↓

Express
```

or

```
User

↓

Vercel

↓

Express
```

Now Express doesn't see the user's IP.

It sees

```
Vercel IP

or

NGINX IP
```

So proxies send another header

```
X-Forwarded-For
```

which says

```
Real Client IP

=

103.xxx.xxx.xxx
```

---

Express has

```
trust proxy
```

setting.

If enabled

Express believes

```
X-Forwarded-For
```

Otherwise

it ignores it.

---

So why

```js
validate
```

?

express-rate-limit checks

```
Did you configure proxy correctly?
```

If not,

it prints warnings.

These options simply disable those warnings.

---

In local development

```
No proxy.
```

So

```js
trustProxy:false

xForwardedForHeader:false
```

is perfectly fine.

---

When deploying

for example

Railway

Render

Fly.io

you usually do

```js
app.set("trust proxy",1)
```

Then remove these validation overrides.

---

# How does rate limiter know who is making requests?

By default

it uses

```
req.ip
```

So

```
IP

↓

Counter
```

Example

```
192.168.1.20

↓

8 requests
```

Another user

```
10.1.1.4

↓

1 request
```

Each IP gets its own counter.

---

# Where are these counters stored?

By default

Memory.

```
Server RAM
```

Like

```
IP

↓

Request Count

↓

Expiry Time
```

Example

```
192.168.1.5

↓

6

↓

Expires in 10 minutes
```

---

# Is memory good?

For small apps

Yes.

For production

No.

Suppose

```
Server restarts.
```

Memory gone.

All counters reset.

Also

Suppose you have

```
Server A

Server B
```

User sends

```
Request

↓

Server A

↓

Counter = 5
```

Next request

↓

```
Server B

↓

Counter = 0
```

Oops.

Rate limiter bypassed.

---

Production apps usually use

```
Redis
```

instead of memory.

Now all servers share

one counter.

---

# Where should you use rate limiting?

Not everywhere.

Mostly on endpoints that can be abused:

* `POST /login`
* `POST /register`
* `POST /forgot-password`
* `POST /reset-password`
* `POST /verify-otp`
* `POST /send-otp`

These are common brute-force targets.

---

You can apply it per route:

```js
app.post("/login", authLimiter, loginController);
```

or to a group of routes:

```js
router.use(authLimiter);
```

---

# Summary

Think of the rate limiter as a security guard at the entrance to your API:

1. A request arrives.
2. The guard identifies the visitor (usually by IP address).
3. The guard checks how many times that visitor has entered during the current time window.
4. If they're under the limit, the request continues to your authentication and controller.
5. If they've exceeded the limit, the guard immediately returns **HTTP 429 Too Many Requests** and the request never reaches your business logic or database.

For your Book My Ticket hackathon, adding a rate limiter to authentication routes is a good production practice because it protects login and registration endpoints from brute-force attacks while costing very little to implement.


Great question. Authentication is one of those topics where people often know how to write the code but don't know *why* each route exists. Let's go through them as if we're designing a real application like Gmail, Instagram, or Netflix.

---

# 1. Register Route

```js
POST /register
```

## Purpose

Creates a brand new user account.

Imagine someone has never used your application before.

They fill this form:

```
Name
Email
Password
```

Your frontend sends

```
POST /register
```

Body

```json
{
  "name": "John",
  "email": "john@gmail.com",
  "password": "12345678"
}
```

---

### Backend

Your backend will

```
Receive data
↓

Validate using Zod

↓

Check email already exists?

↓

Hash password

↓

Insert user into DB

↓

Return success
```

Database

Before

```
Users
-----
(empty)
```

After

```
1
John
john@gmail.com
$2b$10$ksdjflksdjflksdjfl
```

Notice

Password is NOT stored.

Hash is stored.

---

# 2. Login Route

```
POST /login
```

Purpose

User already has an account.

Now they want to enter.

Example

```json
{
    "email":"john@gmail.com",
    "password":"12345678"
}
```

Backend

```
Receive email/password

↓

Find user

↓

Compare password using bcrypt.compare()

↓

Correct?

↓

Generate JWT

↓

Return JWT
```

Returns

```json
{
    "accessToken":"eyJhbGci...",
    "refreshToken":"eyJhbGci..."
}
```

Now frontend stores these.

Usually

```
Access Token

memory
or
cookie

Refresh Token

httpOnly cookie
```

---

# Why not login every request?

Imagine

```
Open Instagram

↓

Every click

↓

Enter email/password

↓

Click profile

↓

Enter password

↓

Click reels

↓

Enter password
```

Terrible.

JWT solves this.

Login once.

Use token everywhere.

---

# 3. Protected Routes

Suppose

```
GET /profile
```

Needs authentication.

Frontend sends

```
Authorization

Bearer eyJhbGc...
```

Middleware

```
Read header

↓

Extract token

↓

Verify

↓

Attach req.user

↓

next()
```

Controller

```
req.user.id
```

Done.

---

# 4. Refresh Route

```
POST /refresh
```

This one confuses everyone.

---

Imagine

Access Token expires in

```
15 minutes
```

User is watching movie.

After 15 mins

```
Access Token expired.
```

Without refresh token

They must login again.

Very annoying.

Instead

Frontend automatically calls

```
POST /refresh
```

using Refresh Token.

Backend

```
Verify Refresh Token

↓

Still valid?

↓

Generate NEW Access Token

↓

Return it
```

User never notices.

---

Example

Access Token

```
15 mins
```

Refresh Token

```
30 days
```

Timeline

```
Login

↓

Access token

15 mins

↓

Expired

↓

Refresh

↓

New Access Token

↓

Another 15 mins
```

This continues for

30 days.

---

# Why separate tokens?

Because

Access Token

```
short life

safer
```

Refresh Token

```
long life

kept securely
```

If hacker steals Access Token

He gets

```
15 mins
```

instead of

```
30 days
```

---

# 5. Logout Route

```
POST /logout
```

JWT is stateless.

Meaning

Server doesn't remember tokens.

So logout is slightly different.

---

If using

HttpOnly Cookies

Logout simply

```
Clear cookies
```

Example

```
Set-Cookie

accessToken=""

Expires=Past
```

Done.

---

If storing refresh tokens in DB

```
Delete refresh token

↓

Cannot refresh anymore
```

Perfect logout.

---

# 6. Forgot Password

```
POST /forgot-password
```

User forgot password.

They enter

```
email
```

Frontend

```json
{
    "email":"john@gmail.com"
}
```

Backend

```
Find user

↓

Generate random token

↓

Save token

↓

Send email

↓

Done
```

Database

```
reset_password_token

ajshd8734jksdh
```

---

Email

```
Reset Password

Click

website.com/reset?token=ajshd8734jksdh
```

---

# 7. Reset Password

```
POST /reset-password
```

Frontend sends

```json
{
    "token":"ajshd8734",
    "password":"newPassword"
}
```

Backend

```
Find token

↓

Exists?

↓

Not expired?

↓

Hash password

↓

Update password

↓

Delete token

↓

Success
```

---

# Why two routes?

Because

Forgot Password

only generates token.

Reset Password

actually changes password.

Completely different jobs.

---

# Complete Authentication Flow

```
Register
    │
    ▼
Account Created
    │
    ▼
Login
    │
    ▼
Access Token
Refresh Token
    │
    ▼
Protected APIs
    │
    ▼
Access Token Expired
    │
    ▼
Refresh
    │
    ▼
New Access Token
    │
    ▼
Continue Working
    │
    ▼
Logout
```

---

# Which routes are public?

Anyone can call them.

```
POST /register

POST /login

POST /forgot-password

POST /reset-password

POST /refresh
```

---

# Which routes need authentication?

```
GET /profile

PUT /profile

POST /book-seat

GET /my-bookings

POST /logout

DELETE /account
```

These use

```
authenticate middleware
```

---

# For your Book My Ticket Hackathon

You only **need** the routes required by the assignment:

### Public

```
POST /register
POST /login
```

### Protected

```
POST /book-seat
GET /my-bookings
POST /logout   (optional but good to have)
```

You **do not need** these unless you want to build a production-level authentication system:

* `POST /refresh`
* `POST /forgot-password`
* `POST /reset-password`

Those are excellent additions for a real application, but they're beyond the core requirements of the hackathon. Focus on getting registration, login, JWT authentication, and protected seat booking working correctly first.

*/