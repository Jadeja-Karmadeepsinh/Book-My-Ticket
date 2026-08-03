import { HttpStatus } from '../constants/httpStatus.js'

export class ApiResponse {
    static ok (res, message, data = null) {
        return res.status(HttpStatus.OK).json({
            success: true,
            message,
            data
        })
    }

    static created (res, message, data = null) {
        return res.status(HttpStatus.CREATED).json({
            success: true,
            message,
            data
        })
    }

    static noContent (res) {
        return res.status(HttpStatus.NO_CONTENT).send();
    }
}