<script lang="ts" setup>
const { rawText, isPreviewActive } = storeToRefs(useStore());

watchEffect(() => {
    if (process.client && rawText.value !== "")
        localStorage.setItem("rawText", JSON.stringify(rawText.value));
});

onMounted(() => {
    // get rawText from localStorage
    const text = localStorage.getItem('rawText');
    if (text && text !== "") rawText.value = JSON.parse(text);
    else rawText.value = `# Welcome to Markdown
Markdown is a lightweight markup language that you can use to add formatting elements to plaintext text documents.
## How to use this?
1. Write markdown in the markdown editor window
2. See the rendered markdown in the preview window
### Features
- Create headings, paragraphs, links, blockquotes, inline-code, code blocks, and lists
- Name and save the document to access again later
- Choose between Light or Dark mode depending on your preference
> This is an example of a blockquote. If you would like to learn more about markdown syntax, you can visit this [markdown cheatsheet](https://www.markdownguide.org/cheat-sheet/).
#### Headings
To create a heading, add the hash sign (#) before the heading. The number of number signs you use should correspond to the heading level. You'll see in this guide that we've used all six heading levels (not necessarily in the correct way you should use headings!) to illustrate how they should look.
##### Lists
You can see examples of ordered and unordered lists above.
###### Code Blocks
This markdown editor allows for inline-code snippets, like this: \`<p>I'm inline</p>\`. It also allows for larger code blocks like this

\`\`\`
<main>
  <h1>This is a larger code block</h1>
</main>
\`\`\``;
});
</script>

<template>
    <div class="editor d-flex flex-column">
        <div class="header position-sticky d-flex align-items-center weight-500">
            <span>MARKDOWN</span>
            <button @click="isPreviewActive = !isPreviewActive">
                <IconsPreview :is-preview-active="isPreviewActive" />
            </button>
        </div>
        <textarea class="editor__area" v-model="rawText"></textarea>
    </div>
</template>

<style lang="scss" scoped>
.editor {
    overflow: auto;

    .header {
        top: 0;
        justify-content: space-between;

        padding: 1.2rem 1.6rem;
        background-color: var(--deeper-bg-color);
        color: var(--sub-text-color);

        span {
            @include font(1.4rem, 1.6rem);
        }

        button {
            display: none;
            color: var(--sub-text-color);
            width: 1.6rem;
            height: 1.2rem;

            @media (max-width: 768px) {
                display: block;
            }

            svg {
                height: 100;
            }
        }
    }

    &__area {
        flex: 1;
        padding: 0.9rem 1.6rem;
        background-color: var(--bg-color);
        color: var(--header-text-color);
        overflow: auto;
        // reset textarea style
        border: none;
        outline: none;
        resize: none;
        // font
        @include font(1.4rem, 1.6rem);
    }
}
</style>
