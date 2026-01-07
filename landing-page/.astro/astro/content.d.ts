declare module "astro:content" {
    interface RenderResult {
        Content: import("astro/runtime/server/index.js").AstroComponentFactory;
        headings: import("astro").MarkdownHeading[];
        remarkPluginFrontmatter: Record<string, any>;
    }

    interface Render {
        ".md": Promise<RenderResult>;
    }

    export interface RenderedContent {
        html: string;
        metadata?: {
            imagePaths: Array<string>;
            [key: string]: unknown;
        };
    }
}

declare module "astro:content" {
    type Flatten<T> = T extends { [K: string]: infer U } ? U : never;

    export type CollectionKey = keyof AnyEntryMap;
    export type CollectionEntry<C extends CollectionKey> = Flatten<
        AnyEntryMap[C]
    >;

    export type ContentCollectionKey = keyof ContentEntryMap;
    export type DataCollectionKey = keyof DataEntryMap;

    type AllValuesOf<T> = T extends any ? T[keyof T] : never;
    type ValidContentEntrySlug<C extends keyof ContentEntryMap> = AllValuesOf<
        ContentEntryMap[C]
    >["slug"];

    /** @deprecated Use `getEntry` instead. */
    export function getEntryBySlug<
        C extends keyof ContentEntryMap,
        E extends ValidContentEntrySlug<C> | (string & {}),
    >(
        collection: C,
        // Note that this has to accept a regular string too, for SSR
        entrySlug: E,
    ): E extends ValidContentEntrySlug<C>
        ? Promise<CollectionEntry<C>>
        : Promise<CollectionEntry<C> | undefined>;

    /** @deprecated Use `getEntry` instead. */
    export function getDataEntryById<
        C extends keyof DataEntryMap,
        E extends keyof DataEntryMap[C],
    >(collection: C, entryId: E): Promise<CollectionEntry<C>>;

    export function getCollection<
        C extends keyof AnyEntryMap,
        E extends CollectionEntry<C>,
    >(
        collection: C,
        filter?: (entry: CollectionEntry<C>) => entry is E,
    ): Promise<E[]>;
    export function getCollection<C extends keyof AnyEntryMap>(
        collection: C,
        filter?: (entry: CollectionEntry<C>) => unknown,
    ): Promise<CollectionEntry<C>[]>;

    export function getEntry<
        C extends keyof ContentEntryMap,
        E extends ValidContentEntrySlug<C> | (string & {}),
    >(entry: {
        collection: C;
        slug: E;
    }): E extends ValidContentEntrySlug<C>
        ? Promise<CollectionEntry<C>>
        : Promise<CollectionEntry<C> | undefined>;
    export function getEntry<
        C extends keyof DataEntryMap,
        E extends keyof DataEntryMap[C] | (string & {}),
    >(entry: {
        collection: C;
        id: E;
    }): E extends keyof DataEntryMap[C]
        ? Promise<DataEntryMap[C][E]>
        : Promise<CollectionEntry<C> | undefined>;
    export function getEntry<
        C extends keyof ContentEntryMap,
        E extends ValidContentEntrySlug<C> | (string & {}),
    >(
        collection: C,
        slug: E,
    ): E extends ValidContentEntrySlug<C>
        ? Promise<CollectionEntry<C>>
        : Promise<CollectionEntry<C> | undefined>;
    export function getEntry<
        C extends keyof DataEntryMap,
        E extends keyof DataEntryMap[C] | (string & {}),
    >(
        collection: C,
        id: E,
    ): E extends keyof DataEntryMap[C]
        ? Promise<DataEntryMap[C][E]>
        : Promise<CollectionEntry<C> | undefined>;

    /** Resolve an array of entry references from the same collection */
    export function getEntries<C extends keyof ContentEntryMap>(
        entries: {
            collection: C;
            slug: ValidContentEntrySlug<C>;
        }[],
    ): Promise<CollectionEntry<C>[]>;
    export function getEntries<C extends keyof DataEntryMap>(
        entries: {
            collection: C;
            id: keyof DataEntryMap[C];
        }[],
    ): Promise<CollectionEntry<C>[]>;

    export function render<C extends keyof AnyEntryMap>(
        entry: AnyEntryMap[C][string],
    ): Promise<RenderResult>;

    export function reference<C extends keyof AnyEntryMap>(
        collection: C,
    ): import("astro/zod").ZodEffects<
        import("astro/zod").ZodString,
        C extends keyof ContentEntryMap
            ? {
                collection: C;
                slug: ValidContentEntrySlug<C>;
            }
            : {
                collection: C;
                id: keyof DataEntryMap[C];
            }
    >;
    // Allow generic `string` to avoid excessive type errors in the config
    // if `dev` is not running to update as you edit.
    // Invalid collection names will be caught at build time.
    export function reference<C extends string>(
        collection: C,
    ): import("astro/zod").ZodEffects<import("astro/zod").ZodString, never>;

    type ReturnTypeOrOriginal<T> = T extends (...args: any[]) => infer R ? R : T;
    type InferEntrySchema<C extends keyof AnyEntryMap> =
        import("astro/zod").infer<
            ReturnTypeOrOriginal<Required<ContentConfig["collections"][C]>["schema"]>
        >;

    type ContentEntryMap = {
        blog: {
            "breaking-habit-loop.md": {
                id: "breaking-habit-loop.md";
                slug: "breaking-habit-loop";
                body: string;
                collection: "blog";
                data: any;
            } & { render(): Render[".md"] };
            "digital-minimalism.md": {
                id: "digital-minimalism.md";
                slug: "digital-minimalism";
                body: string;
                collection: "blog";
                data: any;
            } & { render(): Render[".md"] };
            "dopamine-detox-guide.md": {
                id: "dopamine-detox-guide.md";
                slug: "dopamine-detox-guide";
                body: string;
                collection: "blog";
                data: any;
            } & { render(): Render[".md"] };
            "environment-design.md": {
                id: "environment-design.md";
                slug: "environment-design";
                body: string;
                collection: "blog";
                data: any;
            } & { render(): Render[".md"] };
            "fighting-doomscrolling.md": {
                id: "fighting-doomscrolling.md";
                slug: "fighting-doomscrolling";
                body: string;
                collection: "blog";
                data: any;
            } & { render(): Render[".md"] };
            "fomo-to-jomo.md": {
                id: "fomo-to-jomo.md";
                slug: "fomo-to-jomo";
                body: string;
                collection: "blog";
                data: any;
            } & { render(): Render[".md"] };
            "reclaiming-focus.md": {
                id: "reclaiming-focus.md";
                slug: "reclaiming-focus";
                body: string;
                collection: "blog";
                data: any;
            } & { render(): Render[".md"] };
            "science-of-boredom.md": {
                id: "science-of-boredom.md";
                slug: "science-of-boredom";
                body: string;
                collection: "blog";
                data: any;
            } & { render(): Render[".md"] };
            "science-of-small-wins.md": {
                id: "science-of-small-wins.md";
                slug: "science-of-small-wins";
                body: string;
                collection: "blog";
                data: any;
            } & { render(): Render[".md"] };
            "sleep-and-screens.md": {
                id: "sleep-and-screens.md";
                slug: "sleep-and-screens";
                body: string;
                collection: "blog";
                data: any;
            } & { render(): Render[".md"] };
            "social-comparison-trap.md": {
                id: "social-comparison-trap.md";
                slug: "social-comparison-trap";
                body: string;
                collection: "blog";
                data: any;
            } & { render(): Render[".md"] };
        };
    };

    type DataEntryMap = {};

    type AnyEntryMap = ContentEntryMap & DataEntryMap;

    export type ContentConfig = typeof import("../../src/content/config.js");
}
