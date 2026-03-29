export function createContext({ req, res }: any) {
  return { req, res, user: { id: 1, openId: 'demo-user', role: 'admin' } };
}
