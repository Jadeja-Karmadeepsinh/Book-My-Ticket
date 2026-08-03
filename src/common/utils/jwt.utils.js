import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { ApiError } from '../utils/api-error.js'

const ACCESS_SECRET = env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = env.JWT_REFRESH_SECRET;

export const generateAccessToken = (payload) => {
    const options = {
        expiresIn: env.JWT_ACCESS_EXPIRES_IN || "15m"
    }
    return jwt.sign({ ...payload, type: "access" }, ACCESS_SECRET, options);
}

export const verifyAccessToken = (token) => {
    try {
        const decoded = jwt.verify(token, ACCESS_SECRET);
        if(decoded.type !== "access"){
            throw new Error("Wrong token type");
        }
        return decoded;
    } catch (error) {
        // Distinguish expired vs tampered for logging, but always throw the same error to the client
        if(error instanceof jwt.TokenExpiredError){
            console.warn("[JWT] Access token expired");
        }
        throw ApiError.unauthorized("Invalid or expired access token");
    }
}

export const generateRefreshToken = (payload) => {
    const options = {
        expiresIn: env.JWT_REFRESH_EXPIRES_IN || "7d" 
    }
    return jwt.sign({ ...payload, type: "refresh" }, REFRESH_SECRET, options);
}

export const verifyRefreshToken = (token) => {
    try {
        const decoded = jwt.verify(token, REFRESH_SECRET);
        if(decoded.type !== "refresh"){
            throw new Error("Wrong token type");
        }
        return decoded;
    } catch (error) {
        if(error instanceof jwt.TokenExpiredError){
            console.warn("[JWT] Refresh token expired");
        }
        throw ApiError.unauthorized("Invalid or expired refresh token");
    }
}

export const generateResetToken = () => {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    const resetTokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
    return { rawToken, hashedToken, resetTokenExpiresAt };
}



/*

These are two of the most important functions in JWT authentication. Instead of memorizing them, let's understand **exactly what goes in and what comes out**.

---

# First, what is JWT?

JWT stands for

```text
JSON Web Token
```

It is basically a **signed string** that proves:

> "The server created this token, and nobody has modified it."

Think of it like a movie ticket.

The ticket contains:

* Seat Number
* Movie Name
* Show Time

But it also has a special stamp from the cinema.

Anyone can read the ticket.

But nobody can create a fake ticket because they don't have the cinema's stamp.

The **secret key** is that stamp.

---

# Function 1

```js
const generateAccessToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
        expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m"
    })
}
```

Let's break it down.

---

## What is `payload`?

Payload is simply the data you want to store inside the token.

Example:

```js
const payload = {
    id: 5,
    email: "abc@gmail.com"
}
```

Notice:

**Never store passwords inside JWT.**

Good payload:

```js
{
    id: 5,
    role: "admin"
}
```

Bad payload:

```js
{
    password: "123456"
}
```

because anyone can decode a JWT.

---

## What is `jwt.sign()`?

Think of it like this:

```text
Data
   ↓
JWT.sign()
   ↓
Secret Key
   ↓
Generate Signed Token
```

Syntax:

```js
jwt.sign(payload, secret, options)
```

Here,

```js
payload
```

↓

```js
{
   id:5,
   email:"abc@gmail.com"
}
```

Secret

```js
process.env.JWT_ACCESS_SECRET
```

might be

```text
abcxyz123
```

Options

```js
{
   expiresIn:"15m"
}
```

---

## What does it return?

It returns **one string**.

Example:

```text
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.
eyJpZCI6NSwiZW1haWwiOiJhYmNAZ21haWwuY29tIiwiaWF0IjoxNzQ5ODQwMDAwLCJleHAiOjE3NDk4NDA5MDB9.
qO9Lw2P4...
```

This entire thing is just a string.

Its type is

```js
typeof token
```

↓

```text
string
```

So

```js
const token = generateAccessToken(payload);
```

Now

```js
console.log(token);
```

prints something like

```text
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

# What is inside this token?

A JWT has three parts.

```text
Header
.
Payload
.
Signature
```

Like

```text
AAAAA.BBBBB.CCCCC
```

---

Header

```json
{
 "alg":"HS256",
 "typ":"JWT"
}
```

---

Payload

```json
{
 "id":5,
 "email":"abc@gmail.com",
 "iat":174900000,
 "exp":174900900
}
```

Notice

JWT automatically added

```text
iat
```

Issued At

and

```text
exp
```

Expiration Time.

---

Signature

This is created using

```text
JWT_ACCESS_SECRET
```

Nobody can generate this without your secret.

---

# Why return this token?

Suppose user logs in.

```text
User

↓

Email

↓

Password

↓

Server verifies

↓

Server creates JWT

↓

Returns JWT
```

Example response

```json
{
   "accessToken":"eyJhbGc..."
}
```

The frontend stores it.

---

# Function 2

```js
const verifyAccessToken = (token) => {
    return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
}
```

Now suppose later

the frontend sends

```http
Authorization:
Bearer eyJhbGc...
```

Your middleware extracts

```js
const token = "eyJhbGc..."
```

Then

```js
verifyAccessToken(token)
```

calls

```js
jwt.verify()
```

---

What does verify do?

It checks

1. Is the token modified?

2. Is the signature valid?

3. Has it expired?

4. Was it signed using my secret?

If **all are true**

it returns the payload.

---

Example

Token

```text
eyJhbGc...
```

becomes

```js
{
   id:5,
   email:"abc@gmail.com",
   iat:174900000,
   exp:174900900
}
```

Notice

It returns the payload object.

Not the token.

Not true/false.

It returns the decoded payload.

---

Example

```js
const payload = verifyAccessToken(token);

console.log(payload);
```

Output

```js
{
    id:5,
    email:"abc@gmail.com",
    iat:174900000,
    exp:174900900
}
```

---

# What if token is invalid?

Suppose someone changes

```text
abc@gmail.com
```

to

```text
admin@gmail.com
```

Signature no longer matches.

Then

```js
jwt.verify()
```

throws an error.

Like

```text
JsonWebTokenError
```

or

```text
TokenExpiredError
```

That's why we usually wrap it in

```js
try{
    const payload = verifyAccessToken(token);
}
catch(err){
    // Invalid token
}
```

---

# Flow in your project

## Login

```text
User logs in

↓

Email + Password verified

↓

generateAccessToken()

↓

Returns JWT string

↓

Frontend stores token
```

---

## Protected Route

```text
Frontend sends JWT

↓

verifyAccessToken()

↓

Returns payload

↓

req.user = payload

↓

Next middleware

↓

Controller
```

---

# Summary

| Function                       | Input          | Output                                                         |
| ------------------------------ | -------------- | -------------------------------------------------------------- |
| `generateAccessToken(payload)` | Payload object | JWT string                                                     |
| `verifyAccessToken(token)`     | JWT string     | Decoded payload object (or throws an error if invalid/expired) |

So in practice:

```js
const token = generateAccessToken({
    id: 10,
    email: "user@example.com",
});

// token -> "eyJhbGc..."
```

Later:

```js
const user = verifyAccessToken(token);

// user ->
// {
//   id: 10,
//   email: "user@example.com",
//   iat: ...,
//   exp: ...
// }
```

The important idea is that **the token itself is just an encoded, signed string**, while **`verify()` gives you back the original payload (plus JWT metadata like `iat` and `exp`) only if the token is valid.**


Why check
if (decoded.type !== "access")

This is a very good security practice.

Imagine your application has

Access Token

Refresh Token

Both are JWTs.

Example

Access Token

{
   "id":5,
   "type":"access"
}

Refresh Token

{
   "id":5,
   "type":"refresh"
}

Suppose someone sends

a refresh token

to access

GET /profile

Without checking

decoded.type

your server might accidentally accept it.

So we explicitly check

if(decoded.type !== "access")

If it isn't an access token

↓

Reject it.


*/