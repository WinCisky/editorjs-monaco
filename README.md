# Editor.js - Monaco

This is an EditorJs wrapper for Monaco.

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