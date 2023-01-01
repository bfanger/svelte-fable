import { compile } from "svelte/compiler";
import type { CompileOptions } from "svelte/types/compiler";
import extractFromAst from "./extractFromAst";

export default function generateStorybook(
  source: string,
  options?: CompileOptions
) {
  const output = compile(source, { ...options, css: "injected" });
  const meta = extractFromAst(output.ast, options);
  let { code } = output.js;
  code = code.replace(/export default /, "const StoryComponent = ");
  code = `import { bind as svelteBind } from "svelte/internal";
${code}`;
  code += `

export function mount(target, sync) {
	const props = {};
	const component = new StoryComponent({ target, props });
`;
  for (const property of meta.props) {
    const name = JSON.stringify(property);
    code += `
	svelteBind(component, ${name}, (value) => {
		props[${name}] = value;
	})`;
  }

  code += `

	const unsubscribe = sync(props).subscribe((newProps) => {
		component.$set(newProps);
	};

	return () => {
		component.$destroy();
		unsubscribe();
	}
}`;

  return code;
}
