export const HttpStatus = {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_SERVER_ERROR: 500,
    UNPROCESSABLE_ENTITY: 422,
}

//! Here is another approach with Object.freeze() which will kind of mimic the behaviour of Typescript's as const, as const in TS make object readonly and exact literal values

// export const HttpStatus = Object.freeze({
//     OK: 200,
//     CREATED: 201,
//     NO_CONTENT: 204,
//     BAD_REQUEST: 400,
//     UNAUTHORIZED: 401,
//     FORBIDDEN: 403,
//     NOT_FOUND: 404,
//     CONFLICT: 409,
//     INTERNAL_SERVER_ERROR: 500,
//     UNPROCESSABLE_ENTITY: 422,
// })