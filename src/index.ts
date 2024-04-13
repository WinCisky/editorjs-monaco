import loader from "@monaco-editor/loader";
import { type editor, type languages } from "monaco-editor";

type IStandaloneCodeEditor = editor.IStandaloneCodeEditor;
type IDiffEditor = editor.IDiffEditor;
type ITextModel = editor.ITextModel;
type IDiffEditorModel = editor.IDiffEditorModel;

interface MonacoEditorData {
  /**
   * Original code
   */
  code: string;
  /**
   * Current language
   */
  language?: string;
  /**
   * Wrap lines or overflow
   */
  wordwrap: boolean;
  /**
   * Show minimap or not
   */
  minimap: boolean;
  /**
   * Show line numbers or not
   */
  linenumbers: boolean;
  /**
   * Languages to use
   */
  languages?: string[] | null;
  /**
   * Modified code for diff editor
   */
  diff?: string;
}

class MonacoCodeTool {
  private readonly data: MonacoEditorData;
  private monacoEditor: IStandaloneCodeEditor | IDiffEditor | null = null;
  private languages: string[] = [];
  private container: HTMLElement | null = null;
  private shouldFocus: boolean = false;

  constructor(
    { data, config }: {
      data: MonacoEditorData;
      config: { languages: string[] };
    },
  ) {
    const isNew = Object.values(data).length === 0;
    this.data = isNew
      ? {
        code: "",
        language: "",
        wordwrap: true,
        minimap: false,
        linenumbers: true,
        languages: config.languages || null,
        diff: undefined,
      }
      : data;
    if (isNew) {
      this.shouldFocus = true;
    }
  }

  _registerHeightUpdate() {
    if (typeof (this.monacoEditor as IStandaloneCodeEditor).onDidChangeModelContent === 'function') {
      (this.monacoEditor as IStandaloneCodeEditor).onDidChangeModelContent(() => {
        if (this.monacoEditor) {
          this._updateHeight(this.monacoEditor);
        }
      });
    } else {
      (this.monacoEditor as IDiffEditor).getOriginalEditor().onDidChangeModelContent(() => {
        if (this.monacoEditor) {
          this._updateHeight(this.monacoEditor);
        }
      });
      (this.monacoEditor as IDiffEditor).getModifiedEditor().onDidChangeModelContent(() => {
        if (this.monacoEditor) {
          this._updateHeight(this.monacoEditor);
        }
      });
    }
  }

  _updateHeight(editor: IStandaloneCodeEditor | IDiffEditor) {
    if (
      typeof (editor as IStandaloneCodeEditor).getPosition !== 'function' ||
      typeof (editor as IStandaloneCodeEditor).getContentHeight !== 'function'
    ) {
      // get content height and layout info for both editors
      const originalHeight = (editor as IDiffEditor).getOriginalEditor().getContentHeight();
      const modifiedHeight = (editor as IDiffEditor).getModifiedEditor().getContentHeight();
      const originalLayoutInfo = (editor as IDiffEditor).getOriginalEditor().getLayoutInfo();

      // calculate total height
      let totalHeight = originalHeight > modifiedHeight ? originalHeight : modifiedHeight;
      if (!originalLayoutInfo.isViewportWrapping) {
        totalHeight += originalLayoutInfo.horizontalScrollbarHeight;
      }

      if (this.container) {
        this.container.style.height = `${totalHeight}px`;
        editor.layout();
      }
      return;
    }
    const contentHeight = (editor as IStandaloneCodeEditor).getContentHeight();
    const layoutInfo = (editor as IStandaloneCodeEditor).getLayoutInfo();
    const isWrapping = layoutInfo.isViewportWrapping;
    const horizontalScrollbarHeight = layoutInfo.horizontalScrollbarHeight;

    let totalHeight = contentHeight;

    if (!isWrapping) {
      totalHeight += horizontalScrollbarHeight;
    }
    if (this.container) {
      this.container.style.height = `${totalHeight}px`;
      editor.layout();
    }
  }

  render() {
    const container = document.createElement("div");
    container.classList.add("editor-wrapper");
    container.style.marginTop = "10px";
    container.style.marginBottom = "10px";

    loader.init().then((monaco) => {
      if (typeof this.data.diff !== 'string') {
        this.monacoEditor = monaco.editor.create(container, {
          value: this.data.code || "// type your code...",
          language: this.data.language || "plaintext",
          scrollbar: {
            alwaysConsumeMouseWheel: false,
          },
        });
      } else {
        this.monacoEditor = monaco.editor.createDiffEditor(container, {
          renderSideBySide: true,
          readOnly: false,
          originalEditable: true,
        });
        this.monacoEditor.setModel({
          original: monaco.editor.createModel(
            this.data.code || "// type your code...",
            this.data.language || "plaintext",
          ),
          modified: monaco.editor.createModel(
            this.data.diff || "",
            this.data.language || "plaintext",
          ),
        });
      }
      monaco.editor.setTheme("vs-dark");
      this.languages = monaco.languages.getLanguages().map((
        lang: languages.ILanguageExtensionPoint,
      ) => lang.id);
      monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
        diagnosticCodesToIgnore: [
          2792, // suppress error for missing import
          6192, // suppress unised import warning
          6133, // suppress unused variable warning
        ],
      });
      if (this.data.wordwrap) {
        this.monacoEditor.updateOptions({ wordWrap: "on" });
      }
      if (!this.data.minimap) {
        this.monacoEditor.updateOptions({ minimap: { enabled: false } });
      }
      if (!this.data.linenumbers) {
        this.monacoEditor.updateOptions({ lineNumbers: "off" });
      }
      this.monacoEditor.updateOptions({ scrollBeyondLastLine: false });

      this._updateHeight(this.monacoEditor);
      this._registerHeightUpdate();
      console.log("register height update");

      if (this.shouldFocus) {
        this.monacoEditor.focus();
        this.shouldFocus = false;
      }
    });

    this.container = container;
    return container;
  }

  _setLanguage(language: string) {
    if (!this.monacoEditor) {
      return;
    }
    this.data.language = language;
    // reload editor with new language
    loader.init().then((monaco) => {
      const model = this.monacoEditor?.getModel();
      if (model) {
        if (typeof (model as ITextModel).id === "string") {
          monaco.editor.setModelLanguage((model as ITextModel), language);
        } else {
          // TODO: check if this is correct
          const originalModel = (model as IDiffEditorModel).original;
          const modifiedModel = (model as IDiffEditorModel).modified;
          monaco.editor.setModelLanguage(originalModel, language);
          monaco.editor.setModelLanguage(modifiedModel, language);
        }
      }
    });
  }

  renderSettings() {
    const languageIcon =
      '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="m10.5 21 5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 0 1 6-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 0 1-3.827-5.802" /></svg>';

    const mapIcon =
      '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" /></svg>';

    const wrapIcon =
      '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" /></svg>';

    const lineIcon =
      '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 12a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Zm0 0c0 1.657 1.007 3 2.25 3S21 13.657 21 12a9 9 0 1 0-2.636 6.364M16.5 12V8.25" /></svg>';

    const diffIcon =
      '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" /></svg>';

    const settings = [];

    // add toggle wordwrap
    settings.push({
      icon: wrapIcon,
      label: "Word wrap",
      toggle: "wordwrap",
      isActive: this.data.wordwrap,
      onActivate: () => {
        if (this.monacoEditor) {
          this.data.wordwrap = !this.data.wordwrap;
          this.monacoEditor.updateOptions({
            wordWrap: this.data.wordwrap ? "on" : "off",
          });
          this._updateHeight(this.monacoEditor);
        }
      },
    });

    // add toggle linenumbers
    settings.push({
      icon: lineIcon,
      label: "Line numbers",
      toggle: "linenumbers",
      isActive: this.data.linenumbers,
      onActivate: () => {
        if (this.monacoEditor) {
          console.log("toggle line numbers", !this.data.linenumbers);
          this.data.linenumbers = !this.data.linenumbers;
          this.monacoEditor.updateOptions({
            lineNumbers: this.data.linenumbers ? "on" : "off",
          });
        }
      },
    });

    // add toggle minimap
    settings.push({
      icon: mapIcon,
      label: "Minimap",
      toggle: "minimap",
      isActive: this.data.minimap,
      onActivate: () => {
        if (this.monacoEditor) {
          this.data.minimap = !this.data.minimap;
          this.monacoEditor.updateOptions({
            minimap: { enabled: this.data.minimap },
          });
        }
      },
    });

    settings.push({
      icon: diffIcon,
      label: "Diff",
      toggle: "diff",
      isActive: typeof this.data.diff === 'string' ? true : false,
      onActivate: () => {
        // destroy editor
        if (this.monacoEditor) {
          this.monacoEditor.dispose();
          this.monacoEditor = null;
        }
        
        // create diff editor
        loader.init().then((monaco) => {

          if (typeof this.data.diff !== 'string') {
            this.data.diff = "";

            this.monacoEditor = monaco.editor.createDiffEditor(this.container!, {
              renderSideBySide: true,
              readOnly: false,
              originalEditable: true,
            });

            monaco.editor.setTheme("vs-dark");
            this.monacoEditor.setModel({
              original: monaco.editor.createModel(
                this.data.code,
                this.data.language || "plaintext",
              ),
              modified: monaco.editor.createModel(
                this.data.diff || "",
                this.data.language || "plaintext",
              ),
            });

            this._updateHeight(this.monacoEditor);
          } else {
            delete this.data.diff;

            this.monacoEditor = monaco.editor.create(this.container!, {
              value: this.data.code,
              language: this.data.language || "plaintext",
              scrollbar: {
                alwaysConsumeMouseWheel: false,
              },
            });
          }

          this._registerHeightUpdate();
          this._updateHeight(this.monacoEditor);
        });
      },
    });

    // map languges to array of object
    const langs = this.languages
      .filter((lang) => this.data.languages?.includes(lang) ?? true)
      .map((lang: string) => {
        return {
          icon: languageIcon,
          label: lang,
          toggle: "language",
          isActive: this.data.language === lang,
          onActivate: () => {
            this._setLanguage(lang);
          },
        };
      });

    settings.push(...langs);
    return settings;
  }

  save() {
    if (!this.monacoEditor) {
      return this.data;
    }
    let code = "";
    let diff: undefined | string = undefined;
    if (typeof (this.monacoEditor as IStandaloneCodeEditor).getValue === 'function') {
      code = (this.monacoEditor as IStandaloneCodeEditor).getValue();
    } else {
      // TODO: check if this is correct
      const originalModel = (this.monacoEditor as IDiffEditor).getOriginalEditor().getModel();
      const modifiedModel = (this.monacoEditor as IDiffEditor).getModifiedEditor().getModel();
      code = originalModel?.getValue() || "";
      diff = modifiedModel?.getValue() || "";
    }
    return {
      code: code,
      language: this.data.language || "",
      height: 3,
      wordwrap: this.data.wordwrap,
      minimap: this.data.minimap,
      linenumbers: this.data.linenumbers,
      languages: this.data.languages,
      diff: diff,
    };
  }

  static get toolbox() {
    return {
      title: "Code",
      icon:
        '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M14.25 9.75 16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z" /></svg>',
    };
  }

  static get displayInToolbox() {
    return true;
  }
}

export default MonacoCodeTool;
