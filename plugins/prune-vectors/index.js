/**
 * Local Netlify build plugin. `onSuccess` runs only after the deploy has been published (Netlify build
 * plugin docs), so the namespace now serving visitors is this build's and is never a prune candidate.
 * A failed build never reaches onSuccess, so it never prunes. Pruning errors never fail the deploy.
 */
module.exports = {
  async onSuccess({ utils }) {
    try {
      await utils.run.command("npx tsx scripts/prune-vectors.ts");
    } catch (err) {
      console.warn("prune-vectors: pruning failed, the deploy is unaffected:", err.message);
    }
  },
};
