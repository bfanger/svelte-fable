<script lang="ts">
  import extractFromSource from "$lib/extractFromSource";
  import generateStorybook from "$lib/generateStorybook";
  import type { PageData } from "./$types";

  export let data: PageData;

  // const meta = extractFromSource(data.contents, { filename: "Hello.svelte" });
  const code = generateStorybook(data.contents);
</script>

<!-- 
{#each meta.warnings ?? [] as warning}
  <p>⚠️ Warning: {warning}</p>
{/each} -->

<pre>{code}</pre>
<!-- <pre>{JSON.stringify(code, null, 2)}</pre> -->

<!-- 
<h2>Original</h2>
<pre>
  {data.contents}
</pre>
-->
