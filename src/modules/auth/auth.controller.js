export class AuthController {
    static async register (req, res) {

    }

    static async login (req, res) {

    }

    static async logout (req, res) {

    }

    static async refresh (req, res) {

    }

    static async forgotPassword (req, res) {

    }

    static async resetPassword (req, res) {

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
