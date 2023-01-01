import type { compile } from "svelte/compiler";

type ExtractOpions = { filename?: string };
type Ast = ReturnType<typeof compile>["ast"];
export default function extractFromAst(ast: Ast, options?: ExtractOpions) {
  const location = options?.filename ? ` in "${options.filename}"` : "";
  const props: string[] = [];
  const warnings: string[] = [];
  const program = ast.instance?.content;
  if (program) {
    for (const node of program.body) {
      if (
        node.type === "ExportNamedDeclaration" &&
        node.declaration.kind === "let"
      ) {
        for (const declaration of node.declaration.declarations) {
          if (declaration.type === "VariableDeclarator") {
            const prop = declaration.id.name;
            props.push(prop);
            if (!declaration.init) {
              warnings.push(
                `Property "${prop}"${location} doesn't have a default value`
              );
            }
          }
        }
      }
    }
  }
  return { props, warnings };
}
