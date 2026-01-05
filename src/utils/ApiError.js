class ApiError extends Errror {
    constructor(message = "Something went wrong" , statusCode, stack ,errors ) {
        super(message);
        this.statusCode = statusCode;
        this.errors = errors;
        this.message = message;
        this.data = null;
        this.success = false;

        if(stack){
            this.stack = stack;
        }else{
            Error.captureStackTrace(this,this.constructor);
        };
    };
};

export {ApiError};