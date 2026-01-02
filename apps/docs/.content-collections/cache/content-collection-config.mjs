// content-collections.ts
import { defineCollection, defineConfig, suppressDeprecatedWarnings } from "@content-collections/core";
import {
  frontmatterSchema,
  metaSchema,
  transformMDX
} from "@fumadocs/content-collections/configuration";
suppressDeprecatedWarnings("implicitContentProperty");
var docs = defineCollection({
  name: "docs",
  directory: "content/docs",
  include: "**/*.mdx",
  schema: frontmatterSchema,
  transform: transformMDX
});
var metas = defineCollection({
  name: "meta",
  directory: "content/docs",
  include: "**/meta.json",
  parser: "json",
  schema: metaSchema
});
var content_collections_default = defineConfig({
  collections: [docs, metas]
});
export {
  content_collections_default as default
};
