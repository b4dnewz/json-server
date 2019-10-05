import {Router} from "express";
import * as rewrite from "express-urlrewrite";

export interface RewriterRules {
  [key: string]: string;
}

export interface RewriterOptions {
  exposeRules: boolean;
}

/**
 * Creates a rewrite router using given rules object
 */
export default (rules: RewriterRules, opts: RewriterOptions = {
  exposeRules: true,
}): Router => {

  const router = Router();

  // Optionally expose rules
  if (opts.exposeRules) {
    router.get("/__rules", (_, res) => {
      res.json(rules);
    });
  }

  /**
   * Map rules and setup url rewriter
   */
  Object.keys(rules).forEach((key) => {
    router.use(rewrite(key, rules[key]));
  });

  return router;

};
