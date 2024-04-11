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
```javascript
var editor = EditorJS({
  // ...
  tools: {
    // ...
    codeBlock: {
      // @ts-ignore
      class: MonacoCodeTool,
      config: {
        // default configuration
        languages: [
          'plaintext',
          'javascript',
          'typescript',
          // ...
        ],
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
        "code": "import EditorJS from '@editorjs/editorjs';",
        "language": "javascript",
        "wordwrap": true,
        "minimap": false
    }
}
```
