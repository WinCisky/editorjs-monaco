# Editor.js - Monaco

EditorJs wrapper for Monaco code block.

## Demo
![Code Block demo](output.gif)

## Installation
```bash
npm i @ssimo/editorjs-monaco
```

## Usage
```javascript
import EditorJS from '@editorjs/editorjs';
import MonacoCodeTool from '@ssimo/editorjs-monaco';

var editor = EditorJS({
  // ...
  tools: {
    // ...
    codeBlock: MonacoCodeTool,
  },
});
```

## Configuration
```typescript
var editor = EditorJS({
  // ...
  tools: {
    // ...
    codeBlock: {
      // @ts-ignore
      class: MonacoCodeTool,
      config: {
        // languages subset
        // default is all languages
        languages: [
          'plaintext',
          'javascript',
          'typescript',
          // ...
        ],
        // vs | vs-dark | hc-black
        // default is vs-dark
        theme: 'vs-dark',
        // default is true
        copybtn: false,
      },
    },
  },
});
```

## Output data
```json
{
    "type": "codeBlock",
    "data": {
        "code": "// type your code...",
        "diff": null,
        "language": "",
        "wordwrap": true,
        "minimap": false,
        "linenumbers": true,
        "stretched": false,
        "languages": null
    }
}
```
