import { query } from './_generated/server';

export const options = query({
   args: {},
   handler: async (ctx) => {
      const labels = await ctx.db.query('labels').collect();

      return labels
         .map((label) => ({
            id: label._id,
            name: label.name,
            color: label.color,
         }))
         .toSorted((left, right) => left.name.localeCompare(right.name));
   },
});
