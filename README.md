<!-- SHADOW_SECTION_LOGO_START -->

<div><img alt="Logo" src="https://raw.githubusercontent.com/wessberg/rollup-plugin-ts/master/documentation/asset/rollup-plugin-ts-logo.png" height="150"   /></div>

<!-- SHADOW_SECTION_LOGO_END -->

<!-- SHADOW_SECTION_DESCRIPTION_SHORT_START -->

> A Typescript Rollup plugin that bundles declarations

<!-- SHADOW_SECTION_DESCRIPTION_SHORT_END -->

<!-- SHADOW_SECTION_BADGES_START -->

<a href="https://npmcharts.com/compare/%40wessberg%2Frollup-plugin-ts?minimal=true"><img alt="Downloads per month" src="https://img.shields.io/npm/dm/%40wessberg%2Frollup-plugin-ts.svg"    /></a>
<a href="https://www.npmjs.com/package/%40wessberg%2Frollup-plugin-ts"><img alt="NPM version" src="https://badge.fury.io/js/%40wessberg%2Frollup-plugin-ts.svg"    /></a>
<a href="https://david-dm.org/wessberg/rollup-plugin-ts"><img alt="Dependencies" src="https://img.shields.io/david/wessberg%2Frollup-plugin-ts.svg"    /></a>
<a href="https://github.com/wessberg/rollup-plugin-ts/graphs/contributors"><img alt="Contributors" src="https://img.shields.io/github/contributors/wessberg%2Frollup-plugin-ts.svg"    /></a>
<a href="https://github.com/prettier/prettier"><img alt="code style: prettier" src="https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square"    /></a>
<a href="https://opensource.org/licenses/MIT"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-yellow.svg"    /></a>
<a href="https://www.patreon.com/bePatron?u=11315442"><img alt="Support on Patreon" src="https://img.shields.io/badge/patreon-donate-green.svg"    /></a>

<!-- SHADOW_SECTION_BADGES_END -->

<!-- SHADOW_SECTION_DESCRIPTION_LONG_START -->

## Description

<!-- SHADOW_SECTION_DESCRIPTION_LONG_END -->

This is a Rollup plugin that enables integration between Typescript and Rollup.
It is first and foremost a Typescript plugin that enables full interoperability with Rollup. With it comes
very powerful bundling and tree-shaking of generated Typescript declaration files that works seamlessly with code splitting.

<!-- SHADOW_SECTION_FEATURES_START -->

### Features

<!-- SHADOW_SECTION_FEATURES_END -->

In comparison with the [official plugin](https://github.com/rollup/rollup-plugin-typescript), this one has several significant improvements:

- Compiler diagnostics are correctly emitted and brought into the Rollup build lifecycle
- [Emit-less types](https://github.com/rollup/rollup-plugin-typescript/issues/28) are correctly handled
- Generation and bundling of Definition files (`.d.ts`) are supported and fully supports code splitting

<!-- SHADOW_SECTION_FEATURE_IMAGE_START -->

<!-- SHADOW_SECTION_FEATURE_IMAGE_END -->

<!-- SHADOW_SECTION_TOC_START -->

## Table of Contents

- [Description](#description)
  - [Features](#features)
- [Table of Contents](#table-of-contents)
- [Install](#install)
  - [npm](#npm)
  - [Yarn](#yarn)
  - [pnpm](#pnpm)
- [Usage](#usage)
  - [Using it with just Typescript](#using-it-with-just-typescript)
    - [Typescript and tslib helpers](#typescript-and-tslib-helpers)
  - [Using `CustomTransformers`](#using-customtransformers)
- [Declaration files](#declaration-files)
- [Examples](#examples)
  - [Pure Typescript example](#pure-typescript-example)
  - [Pure Typescript with CustomTransformers](#pure-typescript-with-customtransformers)
- [Hooks](#hooks)
  - [The `outputPath` hook](#the-outputpath-hook)
  - [The `diagnostics` hook](#the-diagnostics-hook)
- [Full list of plugin options](#full-list-of-plugin-options)
  - [`tsconfig`](#tsconfig)
  - [`cwd`](#cwd)
  - [`resolveTypescriptLibFrom`](#resolvetypescriptlibfrom)
  - [`transformers`](#transformers)
  - [`include`](#include)
  - [`exclude`](#exclude)
  - [`transpileOnly`](#transpileonly)
  - [`fileSystem`](#filesystem)
  - [`hook`](#hook)
- [Ignored/overridden options](#ignoredoverridden-options)
  - [Ignored/overridden Typescript options](#ignoredoverridden-typescript-options)
- [Contributing](#contributing)
- [Maintainers](#maintainers)
- [Backers](#backers)
  - [Patreon](#patreon)
- [FAQ](#faq)
  - [Does this plugin work with Code Splitting?](#does-this-plugin-work-with-code-splitting)
  - [Why is tslib included by default?](#why-is-tslib-included-by-default)
- [License](#license)

<!-- SHADOW_SECTION_TOC_END -->

<!-- SHADOW_SECTION_INSTALL_START -->

## Install

### npm

```
$ npm install @wessberg/rollup-plugin-ts
```

### Yarn

```
$ yarn add @wessberg/rollup-plugin-ts
```

### pnpm

```
$ pnpm add @wessberg/rollup-plugin-ts
```

<!-- SHADOW_SECTION_INSTALL_END -->

<!-- SHADOW_SECTION_USAGE_START -->

## Usage

<!-- SHADOW_SECTION_USAGE_END -->

Using the plugin is as simple as it can be. Here's an example within a Rollup config:

```javascript
import ts from "@wessberg/rollup-plugin-ts";
export default {
	// ...
	plugins: [
		ts({
			/* Plugin options */
		})
	]
};
```

Without any options, the plugin will _"just work"_:

- The `tsconfig.json` file closest to the current working directory will be resolved, if any. Otherwise, the default Typescript options will be used.
- The declared `target` within the resolved `tsconfig.json` file will be used, if any such file exists, and if not, the default Typescript target will be used.

### Using it with just Typescript

This plugin works very well with just Typescript.
The `tsconfig.json` file closest to your project will be resolved and used in combination with Rollup.
If your config has a different name, or if you use different configs dynamically depending on the environment, you can provide the location for the `tsconfig` in the plugin options:

```javascript
ts({
	tsconfig: PRODUCTION ? "tsconfig.prod.json" : "tsconfig.json"
});
```

You an also pass in [CompilerOptions](https://www.typescriptlang.org/docs/handbook/compiler-options.html) directly, rather than provide the path to a `tsconfig`:

```javascript
ts({
	tsconfig: {
		target: ScriptTarget.ES2018,
		allowSyntheticDefaultImports: true,
		allowJs: true
	}
});
```

You can also pass in a function that receives whatever `CompilerOptions` that could be resolved relative to the current working directory, but then allow you to override the options:

```javascript
ts({
	tsconfig: resolvedConfig => ({...resolvedConfig, allowJs: false})
});
```

The above example is based on the assumption that a file can be resolved with the name `tsconfig.json`, and if not, the Typescript's default `CompilerOptions` will be used.
But if you want to provide the name of the `tsconfig` to override, you can also pass in an object following the following form:

```javascript
ts({
	tsconfig: {
		fileName: "my-awesome-tsconfig.json",
		hook: resolvedConfig => ({...resolvedConfig, allowJs: false})
	}
});
```

#### Typescript and tslib helpers

This plugin makes sure that the helper functions that may be emitted within the output generated by Typescript will not be duplicated across files and chunks. Instead, they will automatically be divided into chunks and imported across Rollup chunks.
You don't have to do anything!

### Using `CustomTransformers`

This plugin enables you to pass in [`CustomTransformers`](https://github.com/Microsoft/TypeScript/pull/13940) which allows you to transform the Typescript AST during code transpilation.
This enables you to very efficiently transform Typescript before code generation and additionally enables you to use this plugin with tools that leverage this, such as some modern web frameworks and libraries do.

## Declaration files

Typescript declaration files are normally distributed in a folder structure that resembles the structure of the source folder.
With `tsc`, you would get something like this:

<img alt="TSC emitted code" src="https://raw.githubusercontent.com/wessberg/rollup-plugin-ts/master/documentation/asset/tsc-output-example.png" height="250"   />

Rollup is a bundler, and with it, we can produce clean, small files that are easy to distribute.
With `rollup-plugin-ts`, declaration files will be bundled, tree-shaken and emitted alongside the chunks emitted by Rollup:

<img alt="Plugin emitted code" src="https://raw.githubusercontent.com/wessberg/rollup-plugin-ts/master/documentation/asset/plugin-output-example.png" height="250"   />

And, it even works in complex code splitting scenarios:

<img alt="Plugin emitted code with code splitting" src="https://raw.githubusercontent.com/wessberg/rollup-plugin-ts/master/documentation/asset/plugin-output-example-code-splitting.png" height="250"   />

## Examples

### Pure Typescript example

```javascript
ts({
	// If your tsconfig is already called 'tsconfig.json', this option can be left out
	tsconfig: "tsconfig.json"
});
```

### Pure Typescript with CustomTransformers

```javascript
ts({
	transformers: {
		before: [myTransformer1, myTransformer2],
		after: [myTransformer3, myTransformer4],
		afterDeclarations: [myTransformer5, myTransformer6]
	}
});
```

## Hooks

`rollup-plugin-ts` provides a few hooks that allow you to hook into and augment the internal behavior of the plugin.

These can be provided in the plugin options for the `hook` property:

```typescript
ts({
	hook: {
		// Add hooks here
	}
});
```

The next few subsections describe the different hooks that can be provided

### The `outputPath` hook

Type: `(path: string, kind: "declaration" | "declarationMap") => string | undefined`

The `outputPath` hook can be used to rewrite the location on the filesystem that assets produced by `rollup-plugin-ts` are written to.
It is invoked immediately before assets such as _declarations_ or _declaration maps_ are emitted.

The hook is invoked with the output path as well as the kind of asset the path represents as arguments.
If you return a `string` from the hook, the alternative location will be used instead. If you return undefined, the current path will be used.

```typescript
ts({
	hook: {
		outputPath: (path, kind) => rewritePathSomehow(path, kind)
	}
});
```

For example, the `path` may be `/some/path/index.d.ts`, and `kind` be `declaration`, and you might want to rewrite this to `/some/path/my-typings.d.ts`.

### The `diagnostics` hook

Type: `(diagnostics: readonly Diagnostic[]) => readonly Diagnostic[]|undefined`

The `diagnostics` hook can be used to read, alter, and extend the diagnostics generated by TypeScript immediately before they are emitted as errors via Rollup.
Normally, Rollup will crash on the first discovered error, but there may be several diagnostics, all of which may be of interest to you. This hook gives you access to all of them.

You can also use this hook if you want to silence specific kinds of Diagnostics or even add your own.

## Full list of plugin options

The plugin options are documented in more detail across this README, but the full list of options is:

#### `tsconfig`

Type: `string | Partial<CompilerOptions> | Partial<Record<keyof CompilerOptions, string | number | boolean>> | ParsedCommandLine | TsConfigResolver | TsConfigResolverWithFileName`

Provide the Typescript [CompilerOptions](https://www.typescriptlang.org/docs/handbook/compiler-options.html) to use, or a path to a `tsconfig` with this property.
See [this section](#using-it-with-just-typescript) for details on the many ways this property can be configured.

#### `cwd`

Type: `string`

Use this property to overwrite whatever is considered the root directory. The default value is `process.cwd()`.

#### `resolveTypescriptLibFrom`

Type: `string`

Use this property to overwrite from where to search for the `node_modules/typescript/lib` directory. The default value is `cwd`.

#### `transformers`

Type: `(CustomTransformers | CustomTransformersFunction)[] | CustomTransformers | CustomTransformersFunction`

Use this property to provide Typescript [`CustomTransformers`](https://github.com/Microsoft/TypeScript/pull/13940).
See [this section](#using-customtransformers) for more details on how to configure this property.

#### `include`

Type: `string[]|string`

This option takes a minimatch pattern or an array of minimatch patterns and only transforms files with filenames that the pattern matches.

#### `exclude`

Type: `string[]|string`

This option takes a minimatch pattern or an array of minimatch patterns and only transforms files with filenames that the pattern doesn't match.

#### `transpileOnly`

Type: `boolean`

If this option is `true`, diagnostics won't be generated. This will improve performance since Typescript but ignores all syntactical and semantic errors or warnings that may arise.

#### `fileSystem`

Optionally the [FileSystem](https://github.com/wessberg/rollup-plugin-ts/blob/master/src/util/file-system/file-system.ts) to use. This is useful for example when you want to provide a virtual FileSystem to read from or write to.

#### `hook`

Use this property to get hooks into the internals of `rollup-plugin-ts`.
See [this section](#hooks) for more details.

## Ignored/overridden options

Typescript is a powerful tools in its own right. Combined with Rollup, it becomes even more powerful.
To provide a seamless experience, Rollup always take precedence when conflicts arise. As a natural consequence of this, some options provided to Typescript will be ignored or overridden.

### Ignored/overridden Typescript options

The following [CompilerOptions](https://www.typescriptlang.org/docs/handbook/compiler-options.html) from a `tsconfig` will be ignored:

| Property              | Reason                                                                                                                                                                                                                                                                                                                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `outDir`              | Rollup, not Typescript, will decide where to emit chunks.                                                                                                                                                                                                                                                                                                                                  |
| `outFile`             | This option produces flat output and only works with the module formats AMD and SystemJS. Rollup will be the decider of how to split code.                                                                                                                                                                                                                                                 |
| `sourceMap`           | Typescript will always be instructed to produce SourceMaps. Rollup then decides whether or not to include them (and if they should be inlined).                                                                                                                                                                                                                                            |
| `inlineSourceMap`     | Typescript will always be instructed to produce SourceMaps. Rollup then decides whether or not to include them (and if they should be inlined).                                                                                                                                                                                                                                            |
| `inlineSources`       | Since `inlineSourceMap` is ignored, this option won't take effect.                                                                                                                                                                                                                                                                                                                         |
| `importHelpers`       | Helpers will always be imported. This makes it possible for Rollup to code-split properly and share Typescript helpers across chunks.                                                                                                                                                                                                                                                      |
| `moduleResolution`    | Node-module resolution will always be used. This is required for `importHelpers` to work and in general, to make Typescript able to resolve external libraries. Note that you still need to add the [nodeResolve](https://github.com/rollup/rollup-plugin-node-resolve) plugin in order to include external libraries within your bundle unless `allowJs` is `true` within your `tsconfig` |
| `noEmit`              | Typescript should always be able to emit assets, but those will be delegated to Rollup.                                                                                                                                                                                                                                                                                                    |
| `noEmitOnError`       | See above.                                                                                                                                                                                                                                                                                                                                                                                 |
| `emitDeclarationOnly` | See above.                                                                                                                                                                                                                                                                                                                                                                                 |
| `noEmitHelpers`       | Typescript should always be able to emit helpers, since the `importHelpers` option is forced                                                                                                                                                                                                                                                                                               |
| `noResolve`           | Typescript should always be able to resolve things. Otherwise, compilation might break.                                                                                                                                                                                                                                                                                                    |
| `watch`               | Rollup, not Typescript, will watch files if run in watch mode. Efficient caching will still be used for optimum performance.                                                                                                                                                                                                                                                               |
| `preserveWatchOutput` | See above                                                                                                                                                                                                                                                                                                                                                                                  |

The following additional options will also be ignored:

| Property  | Reason                                                                                                                                                                                                                                 |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `include` | Rollup itself will decide which files to include in the transformation process based on your code. This plugin itself takes a `include` property which you should use instead if you want to explicitly allow specific files or globs. |
| `exclude` | See above.                                                                                                                                                                                                                             |

<!-- SHADOW_SECTION_CONTRIBUTING_START -->

## Contributing

Do you want to contribute? Awesome! Please follow [these recommendations](./CONTRIBUTING.md).

<!-- SHADOW_SECTION_CONTRIBUTING_END -->

<!-- SHADOW_SECTION_MAINTAINERS_START -->

## Maintainers

| <img alt="Frederik Wessberg" src="https://avatars2.githubusercontent.com/u/20454213?s=460&v=4" height="70"   />                                                                                                                  |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Frederik Wessberg](mailto:frederikwessberg@hotmail.com)<br><strong>Twitter</strong>: [@FredWessberg](https://twitter.com/FredWessberg)<br><strong>Github</strong>: [@wessberg](https://github.com/wessberg)<br>_Lead Developer_ |

<!-- SHADOW_SECTION_MAINTAINERS_END -->

<!-- SHADOW_SECTION_BACKERS_START -->

## Backers

### Patreon

[Become a backer](https://www.patreon.com/bePatron?u=11315442) and get your name, avatar, and Twitter handle listed here.

<a href="https://www.patreon.com/bePatron?u=11315442"><img alt="Backers on Patreon" src="https://patreon-badge.herokuapp.com/11315442.png"  width="500"  /></a>

<!-- SHADOW_SECTION_BACKERS_END -->

<!-- SHADOW_SECTION_FAQ_START -->

## FAQ

<!-- SHADOW_SECTION_FAQ_END -->

#### Does this plugin work with Code Splitting?

Absolutely, even with Declaration files. Things will work seamlessly.

#### Why is tslib included by default?

Typescript comes with a set of helper functions.
For example, the following code:

```typescript
typeof foo;
```

May be transpiled into something like this with TypeScript:

```typescript
function _typeof(obj) {
	// ...
}

typeof foo === "undefined" ? "undefined" : _typeof(foo);
```

With `rollup-plugin-ts`, most transpilation is run per file, rather than per-chunk. This is because for each file, the output provided to Rollup must be compatible with [Acorn](https://github.com/acornjs/acorn), which Rollup is based on, and you may be transforming new syntax that Acorn doesn't yet support.
In effect, this means that if you pass 3 files containing `typeof` through Rollup, you get 3 duplications of the helper inside the output bundle. For example

```typescript
function _typeof(obj) {
	/* ... */
}
typeof foo === "undefined" ? "undefined" : _typeof(foo);
function _typeof$1(obj) {
	/* ... */
}
typeof bar === "undefined" ? "undefined" : _typeof$1(bar);
function _typeof$2(obj) {
	/* ... */
}
typeof baz === "undefined" ? "undefined" : _typeof$2(baz);
```

That's unfortunate. `tslib` enables you to move reference these helpers via import statements such that they can be shared across files and code split correctly.
With the example from above, the same input would be transformed into something like:

```typescript
import _typeof from "tslib";

typeof foo === "undefined" ? "undefined" : _typeof(foo);
```

As long as `tslib` is resolvable inside of your `node_modules` directory and you haven't explicitly marked it as external,
here's how the output bundle may look:

```typescript
function _typeof(obj) {
	/* ... */
}
typeof foo === "undefined" ? "undefined" : _typeof(foo);
typeof bar === "undefined" ? "undefined" : _typeof(bar);
typeof baz === "undefined" ? "undefined" : _typeof(baz);
```

<!-- SHADOW_SECTION_LICENSE_START -->

## License

MIT © [Frederik Wessberg](mailto:frederikwessberg@hotmail.com) ([@FredWessberg](https://twitter.com/FredWessberg)) ([Website](https://github.com/wessberg))

<!-- SHADOW_SECTION_LICENSE_END -->
