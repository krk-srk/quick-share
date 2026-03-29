import { initTRPC } from '@trpc/server';

export const t = initTRPC.context<any>().create();
export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  return next({
    ctx: {
      user: { id: 1, openId: 'demo-user', role: 'admin', name: 'Demo User' },
    },
  });
});
