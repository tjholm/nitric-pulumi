import { api } from "@nitric/sdk";

const helloApi = api('test');

helloApi.get("/hello/:name", async (ctx) => {
    const { name } = ctx.req.params;

    ctx.res.body = `Hello ${name}`;

    return ctx;
});