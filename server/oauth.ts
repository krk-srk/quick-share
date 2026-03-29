export function registerOAuthRoutes(app: any) {
  app.get('/api/oauth/callback', (req: any, res: any) => res.json({ success: true }));
}
