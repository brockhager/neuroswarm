// Minimal Express type declarations to satisfy TypeScript compilation for submissions package
declare module "express" {
    import { Request, Response, NextFunction } from "express-serve-static-core";
    const express: any;
    export default express;
    export function Router(): any;
    export type RequestHandler = (req: Request, res: Response, next: NextFunction) => any;
}
