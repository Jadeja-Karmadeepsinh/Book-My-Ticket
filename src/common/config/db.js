import 'dotenv/config'
import { env } from './env.js'
import pg from 'pg'

const { Pool } = pg;

export const pool = new Pool({
      connectionString: env.DATABASE_URL,
      max: 5,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 10000,
      keepAlive: true,
      ssl: {
            rejectUnauthorized: false,
      },
});

pool.on("error", (err) => {
      console.error("[DB] Unexpected pool error:", err);
});

// Sometimes DB connection dies
// Network drops
// Neon restarts
// Without this you may never know why.
// With this
// console.error(...)
// you immediately know.


export const connectDB = async () => {
      try {
            const client = await pool.connect();
            console.log(`[DB] Connected successfully (${env.NODE_ENV})`);
            client.release();
      } catch (err) {
            console.log("[DB] connection failed:", err.message);
            process.exit(1);
      }
}

const shutdown = async (signal) => {
      console.log(`${signal} received`);
      await pool.end();
      process.exit(0); //graceful exit
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

//What does rejectUnauthorized: false do?
// It tells Node.js:
// "Use SSL encryption, but don't verify the certificate."
// Maximum simultaneous DB connections.
// Imagine 100 users
// Pool size 5
// means 5 connections 95 wait instead of opening 100 PostgreSQL connections
// idleTimeoutMillis
// If a connection isn't used for 10 seconds close it instead of wasting resources.
// connectionTimeoutMillis
// How long Node waits for a connection. Otherwise hang forever
// keepAlive
// Keeps TCP alive. Useful on cloud providers.



//! For understanding purpose
/*
This is one of those things that almost every beginner copies without understanding. Let's build the intuition from scratch.

---

# Imagine your server is a restaurant 🍽️

You start your server:

```text
node server.js
```

Your Express app starts.

Your PostgreSQL connection pool starts.

```
Client
   |
Express Server
   |
PostgreSQL Pool
   |
Database
```

Everything is running happily.

---

Now imagine someone suddenly says

> "Restaurant is closing."

Can you just turn off the lights?

No.

You should first

* finish serving customers
* close the cash register
* turn off the gas
* lock the doors

Only then leave.

Servers are exactly the same.

---

# What happens if you press Ctrl + C?

Suppose you're running

```bash
npm start
```

Terminal:

```
Server running...
```

Then you press

```
Ctrl + C
```

You think

> "I stopped the server."

Actually, **you did not directly stop Node.**

Your operating system first sends a **signal** to your Node process.

That signal is

```
SIGINT
```

which literally means

```
Signal Interrupt
```

---

Think of it like

```
Windows/Linux
      |
      |  SIGINT
      ↓
Node Process
```

Node receives

```
SIGINT
```

and by default says

> "Okay, I'll exit."

---

# What is SIGTERM?

Another signal.

Instead of

```
Ctrl + C
```

imagine

```
Railway

Docker

Render

PM2

Kubernetes
```

They don't press Ctrl+C.

They tell your app

```
Please stop.
```

That signal is

```
SIGTERM
```

Termination Signal.

---

So there are two common ways your server ends.

### Ctrl+C

```
SIGINT
```

### Cloud provider

```
SIGTERM
```

---

# process.on()

Now let's understand

```javascript
process.on(...)
```

Node has a global object called

```javascript
process
```

It represents

> "The currently running Node.js program."

You can inspect it

```javascript
console.log(process.pid);
```

or

```javascript
console.log(process.env);
```

or

```javascript
process.exit();
```

---

`process.on()` means

> "Listen for an event."

Just like

```javascript
button.addEventListener("click", ...)
```

or

```javascript
app.get(...)
```

Node also has events.

Example

```javascript
process.on("exit", ...)
```

means

> when process exits...

Example

```javascript
process.on("SIGINT", ...)
```

means

> when Ctrl+C happens...

---

# So this line

```javascript
process.on("SIGINT", () => shutdown("SIGINT"));
```

means

```
If the operating system sends SIGINT,

run shutdown().
```

---

Likewise

```javascript
process.on("SIGTERM", () => shutdown("SIGTERM"));
```

means

```
If the OS says terminate,

run shutdown().
```

---

# Now let's understand shutdown()

Suppose

```
Ctrl+C
```

is pressed.

Node receives

```
SIGINT
```

Instead of instantly dying,

it executes

```javascript
shutdown("SIGINT");
```

---

Inside

```javascript
const shutdown = async(signal)=>{
```

`signal` becomes

```
SIGINT
```

---

Then

```javascript
console.log(`${signal} received`);
```

prints

```
SIGINT received
```

---

Next

```javascript
await pool.end();
```

This is the most important line.

---

Remember

```
Pool
```

contains database connections.

Maybe

```
Connection 1

Connection 2

Connection 3
```

are open.

If you simply exit

```
process.exit()
```

without

```javascript
pool.end()
```

Node dies immediately.

Database connections are abruptly cut.

Eventually PostgreSQL cleans them up, but it's not graceful.

---

`pool.end()` tells PostgreSQL

```
I'm shutting down.

Close every connection nicely.

Don't accept new queries.
```

Think of it like

```
Restaurant closes.

Tell every waiter

Finish serving.

Don't accept new customers.

Go home.
```

---

After every connection closes,

execution continues.

Then

```javascript
process.exit(0);
```

runs.

---

# What is process.exit(0)?

This literally tells Node

```
Stop the program.
```

The number

```
0
```

means

```
Everything went fine.
```

---

Other numbers mean failure.

For example

```javascript
process.exit(1);
```

means

```
Program ended because of an error.
```

---

# Entire flow

Imagine you press

```
Ctrl+C
```

Flow becomes

```
Ctrl+C
      │
      ▼
Operating System
      │
      ▼
SIGINT
      │
      ▼
process.on("SIGINT")
      │
      ▼
shutdown("SIGINT")
      │
      ▼
print message
      │
      ▼
pool.end()
      │
      ▼
Close database connections
      │
      ▼
process.exit(0)
      │
      ▼
Node process ends
```

---

## Why is this considered a good practice?

Without it:

```
Server killed ❌

Open DB connections

Queries interrupted

Resources cleaned up later by the database
```

With it:

```
Server receives signal

↓
Stops accepting work

↓
Closes DB pool cleanly

↓
Exits
```

This pattern becomes especially valuable when your application has more than just a database—for example, background jobs, message queues, WebSocket connections, or scheduled tasks. A graceful shutdown gives every resource a chance to clean up before the process exits.
*/