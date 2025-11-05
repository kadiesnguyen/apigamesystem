import { Elysia } from 'elysia';

export const loggerMiddleware = new Elysia().onBeforeHandle(({ path, request }) => {
    const start = Date.now();
    console.log(`📥 [REQUEST] ${request.method} ${path}`);

    return () => {
        const duration = Date.now() - start;
        console.log(`📤 [RESPONSE] ${request.method} ${path} - ${duration}ms`);
    };
});
