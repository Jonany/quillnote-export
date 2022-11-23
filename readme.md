Can be used to extract markdown files from the JSON produced by Quillnote. Does not support attachments or tags.

I used https://codebeautify.org/json-to-typescript-pojo-generator to generate the convert.ts file. It would probably be pretty straightfoward to generate a new class with support for attachments or tags and add the needed TS to main.ts to move the attachments to the export folder.

Run using
```bash
deno run --allow-read --allow-write main.ts
```