import { ApiError } from '../../common/utils/api-error.js'
import { ApiResponse } from '../../common/utils/api-response.js'
import { env } from '../../common/config/env.js'
import { registerSchema, loginSchema, resetPasswordSchema, forgotPasswordSchema } from './dto/auth.dto.js'

// Helper function to set the secure HttpOnly cookie
const setRefreshCookie = (res, token) => {
    res.cookie("refreshToken", token, {
        httpOnly: true,
        secure: env.NODE_ENV === "production", // HTTPS only in production
        sameSite: "strict", // Prevents CSRF attacks
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    })
}

const setAccessCookie = (res, token) => {
    res.cookie("accessToken", token, {
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 15 * 60 * 1000 // 15 min
    })
}

export class AuthController {
    static async register (req, res, next) {
        try {
            
        } catch (error) {
            next(error);
        }
    }

    static async login (req, res, next) {
        try {
            
        } catch (error) {
            next(error);
        }
    }

    static async logout (req, res) {

    }

    static async refresh (req, res, next) {
        try {
            
        } catch (error) {
            next(error);
        }
    }

    static async forgotPassword (req, res, next) {
        try {
            
        } catch (error) {
            next(error);
        }
    }

    static async resetPassword (req, res, next) {
        try {
            
        } catch (error) {
            next(error);
        }
    }
}

/*

One important thing you're missing

When using cookies for authentication, your frontend requests must include credentials.

For example:

fetch("/book", {
    method: "POST",
    credentials: "include"
});

or with Axios:

axios.post("/book", data, {
    withCredentials: true
});

Otherwise, the browser won't send the cookies on cross-origin requests.

*/
