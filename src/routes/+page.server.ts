import fs from "fs";
import sveltePreprocess from "svelte-preprocess";
import { preprocess } from "svelte/compiler";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
  const source = fs.readFileSync(
    "./src/lib/components/Hello/Hello.story.svelte",
    "utf8"
  );
  return {
    contents: (
      await preprocess(source, sveltePreprocess(), {
        filename: "Hello.story.svelte",
      })
    ).code,
  };
};
