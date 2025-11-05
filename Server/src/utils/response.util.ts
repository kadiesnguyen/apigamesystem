export const successResponse = <T = any>(data: T) => {
    return {
        success: true,
        data,
    };
};

export const errorResponse = (message: string, statusCode: number = 500) => {
    return new Response(
        JSON.stringify({
            success: false,
            error: message,
        }),
        {
            status: statusCode,
            headers: {
                'Content-Type': 'application/json',
            },
        }
    );
};