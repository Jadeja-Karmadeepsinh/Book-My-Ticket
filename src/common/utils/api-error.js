import { HttpStatus } from '../constants/httpStatus.js'

class ApiError extends Error {
    constructor (statusCode, message) {
        super(message); //because when extending another class, the parent must be initialized first.
        this.name = this.constructor.name; //so the error prints as ApiError instead of just Error.
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }

    static badRequest (message = "Bad request") {
        return new ApiError(HttpStatus.BAD_REQUEST, message);
    }

    static unauthorized (message = "Unauthorized") {
        return new ApiError(HttpStatus.UNAUTHORIZED, message);
    }

    static forbidden (message = "Forbidden") {
        return new ApiError(HttpStatus.FORBIDDEN, message);
    }

    static notFound (message = "Not found") {
        return new ApiError(HttpStatus.NOT_FOUND, message);
    }

    static conflict (message = "Conflict") {
        return new ApiError(HttpStatus.CONFLICT, message);
    }

    static unprocessable (message = "Unprocessable entity") {
        return new ApiError(HttpStatus.UNPROCESSABLE_ENTITY, message);
    }

    // Added a 500 helper for database or server failures
    static internal (message = "Internal Server Error") {
        return new ApiError(HttpStatus.INTERNAL_SERVER_ERROR, message);
    }
}

//! For more explanation regarding Error.captureStackTrace(this, this.constructor);
/*

This is one of the most important classes you'll write in a backend. Let's understand it from **absolute basics**, assuming you don't know anything about the `Error` class.

---

# Step 1: Why does JavaScript even have an Error class?

Suppose you write

```js
const a = 10;
const b = 0;

if (b === 0) {
    throw "Cannot divide by zero";
}
```

This works.

But throwing a string is bad.

Why?

Because it contains only text.

```
"Cannot divide by zero"
```

No stack trace.
No error type.
No extra information.

---

JavaScript instead provides a built-in class

```js
Error
```

You usually use it like

```js
throw new Error("Cannot divide by zero");
```

Now the error object looks like

```
Error
│
├── message
├── stack
├── name
```

Example

```js
const err = new Error("Invalid password");

console.log(err);
```

prints something like

```
Error: Invalid password

    at login (auth.js:15)
    at server.js:40
```

Notice it tells

* error message
* file
* line number
* function call history

That history is called the **stack trace**.

---

# Step 2: What does

```js
class ApiError extends Error
```

mean?

Remember inheritance.

```
Animal
   ↑
Dog
```

Dog automatically gets everything Animal has.

Exactly the same here.

```
Error
   ↑
ApiError
```

So ApiError automatically gets

* message
* stack
* name

without writing them yourself.

---

# Step 3: Constructor

You wrote

```js
constructor(statusCode, message)
```

Whenever someone writes

```js
new ApiError(404, "User not found");
```

JavaScript automatically executes

```js
constructor(404, "User not found")
```

---

Imagine this line

```js
new ApiError(404, "User not found");
```

JavaScript secretly does

```
Create empty object

↓

Call constructor

↓

Return object
```

---

# Step 4:

```js
super(message);
```

This is probably the most confusing line.

Remember

```
ApiError
        ↑
      Error
```

The parent class

```
Error
```

also has a constructor.

Its constructor is roughly

```js
constructor(message){
    this.message = message;
}
```

When you call

```js
super(message);
```

you are saying

> "Run the constructor of the parent."

So

```js
super(message);
```

is almost like writing

```
Error constructor

↓

this.message = message
```

Now your object already has

```
message
```

---

Without

```js
super(message);
```

JavaScript will throw

```
ReferenceError

Must call super constructor before using this
```

because when extending another class, the parent must be initialized first.

---

# Step 5

```js
this.statusCode = statusCode;
```

Now we add our own property.

Suppose

```js
new ApiError(404, "User not found");
```

After this line

```
this.statusCode = 404
```

The object becomes

```
ApiError

message = "User not found"

statusCode = 404
```

---

# Step 6

```js
this.isOperational = true;
```

This isn't built into JavaScript.

It's simply your own property.

Think

```
User object

name

email

age
```

You created those properties.

Similarly

```
ApiError

message

statusCode

isOperational
```

---

Why?

Later your global error handler can do

```js
if(error.isOperational){
    // Send error to user
}
else{
    // Crash server
}
```

This is a common Node.js pattern to distinguish expected errors (like invalid input) from programmer bugs.

---

# Step 7

The hardest line

```js
Error.captureStackTrace(this, this.constructor);
```

Let's understand stack traces first.

---

Suppose

```js
function c(){
    throw new Error("Boom");
}

function b(){
    c();
}

function a(){
    b();
}

a();
```

The output

```
Error

at c()

at b()

at a()
```

This list

```
c()

↓

b()

↓

a()
```

is the stack trace.

---

Normally

```js
new Error()
```

automatically captures it.

But since we created our own error class

```
ApiError
```

Node gives us a way to customize it.

---

# What does captureStackTrace() do?

It records

> "Where did this error happen?"

Suppose

```js
throw new ApiError(404,"User");
```

inside

```js
loginController()
```

Stack trace becomes

```
ApiError: User

at loginController()

at authRoutes()

at server()
```

Very useful for debugging.

---

# Why

```js
this
```

?

Because

```
this
```

is the current object.

We want to attach the stack trace to THIS error object.

---

# Why

```js
this.constructor
```

?

Imagine we didn't pass it.

Stack becomes

```
ApiError

constructor()

Error.captureStackTrace()

login()

server()
```

Notice the constructor appears.

We don't care about constructor.

We care where the error actually happened.

Passing

```js
this.constructor
```

tells Node

> Skip everything until after this constructor.

Now stack becomes cleaner.

```
ApiError

login()

server()
```

---

# What is `this` here?

Inside the constructor,

```js
this
```

means

> "The object currently being created."

Suppose

```js
const err = new ApiError(404,"User");
```

During construction

```
this

↓

{}

↓

message

↓

statusCode

↓

isOperational

↓

stack
```

Finally

```
err
```

points to

```
ApiError

statusCode:404

message:"User"

isOperational:true

stack:"..."
```

---

# Entire constructor flow

Suppose you execute

```js
throw new ApiError(404, "User not found");
```

Internally this happens:

```
new ApiError()

↓

Create empty object

↓

Call Error constructor
(super(message))

↓

this.message = "User not found"

↓

this.statusCode = 404

↓

this.isOperational = true

↓

Capture stack trace

↓

Return object

↓

throw object
```

---

# Final object in memory

```
ApiError
│
├── message = "User not found"
├── statusCode = 404
├── isOperational = true
├── stack = "Error at authController..."
├── name = "Error" (or "ApiError" if you set it)
```

---

## A couple of improvements to your class

1. You have a few incorrect HTTP status codes:

   * `unauthorized` should be **401**, not 403.
   * `forbidden` should be **403**, not 412.
   * `notFound` should be **404**, not 413.
   * `invalidToken` would typically also use **401**, not 414.

2. There's a typo:

```js
static invalidToken(message = "Token invalid"){
    return new ApiError(414, messsage);
}
```

`messsage` (three `s` characters) should be `message`.

3. A common addition is:

```js
this.name = this.constructor.name;
```

so the error prints as `ApiError` instead of just `Error`.

Once you understand this class, you'll find that almost every Express backend uses some variation of this pattern for consistent error handling.


*/