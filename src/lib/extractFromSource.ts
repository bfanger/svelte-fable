import { compile } from "svelte/compiler";
import type { CompileOptions } from "svelte/types/compiler";
import extractFromAst from "./extractFromAst";

export default function extractFromSource(
  source: string,
  options: CompileOptions
) {
  const output = compile(source, options);
  return extractFromAst(output.ast, options);
}
