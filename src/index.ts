import loader from "@monaco-editor/loader";
import { type editor, type languages } from "monaco-editor";

import {
  languageIcon,
  mapIcon,
  lineIcon,
  diffIcon,
  wrapIcon,
  codeIcon,
} from "./icons";

type IStandaloneCodeEditor = editor.IStandaloneCodeEditor;
type IStandaloneDiffEditor = editor.IStandaloneDiffEditor;
type IStandaloneEditorConstructionOptions = editor.IStandaloneEditorConstructionOptions;

type MonacoTheme = 'vs' | 'vs-dark' | 'hc-black';

interface MonacoEditorData {
  /**
   * Original code
   */
  code: string;
  /**
   * Modified code for diff editor
   * If null, it will be a normal editor
   */
  diff: string | null;
  /**
   * Current language
   */
  language: string;
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
   * Theme to use
   */
  theme: MonacoTheme;
  /**
   * Languages to use
   */
  languages?: string[] | null;
}

class MonacoCodeTool {
  private readonly data: MonacoEditorData;
  /**
   * Monaco editor instance
   * If null, it is a diff editor
   */
  private editorCode: IStandaloneCodeEditor | null = null;
  /**
   * Monaco diff editor instance
   * If null, it is a normal editor
   */
  private editorDiff: IStandaloneDiffEditor | null = null;
  private languages: string[] = [];
  private container: HTMLElement | null = null;
  private shouldFocus: boolean = false;

  private readonly defaultOptions: IStandaloneEditorConstructionOptions = {
    scrollbar: {
      alwaysConsumeMouseWheel: false,
    },
    automaticLayout: true,
    scrollBeyondLastLine: false,
    wrappingStrategy: 'advanced',
    overviewRulerLanes: 0
  };

  constructor(
    { data, config }: {
      data: MonacoEditorData;
      config: { languages: string[], theme: string };
    },
  ) {
    const isNew = Object.values(data).length === 0;
    let theme: MonacoTheme;
    switch (config.theme) {
      case "vs":
      case "light":
        theme = "vs";
        break;
      case "hc-black":
        theme = "hc-black";
        break;
      default:
        theme = "vs-dark";
        break;
    }

    this.data = isNew
      ? {
        code: "",
        diff: null,
        language: "",
        wordwrap: true,
        minimap: false,
        linenumbers: true,
        theme: theme,
        languages: config.languages || null,
      }
      : data;
    if (isNew) {
      this.shouldFocus = true;
    }
  }

  _registerHeightUpdate() {
    if (this.editorCode) {
      this.editorCode.onDidChangeModelContent(() => {
        if (this.editorCode) {
          this._updateHeight();
        }
      });
    } else if (this.editorDiff) {
      this.editorDiff.getOriginalEditor().onDidChangeModelContent(() => {
        if (this.editorDiff) {
          this._updateHeight();
        }
      });
      this.editorDiff.getModifiedEditor().onDidChangeModelContent(() => {
        if (this.editorDiff) {
          this._updateHeight();
        }
      });
    }
  }

  _updateHeight() {
    if (this.editorCode) {
      const contentHeight = this.editorCode.getContentHeight();
      const layoutInfo = this.editorCode.getLayoutInfo();
      const isWrapping = layoutInfo.isViewportWrapping;
      const horizontalScrollbarHeight = layoutInfo.horizontalScrollbarHeight;

      let totalHeight = contentHeight;

      if (!isWrapping) {
        totalHeight += horizontalScrollbarHeight;
      }
      if (this.container) {
        this.container.style.height = `${totalHeight}px`;
        this.editorCode.layout();
      }
    } else if (this.editorDiff) {
      const originalHeight = this.editorDiff.getOriginalEditor().getContentHeight();
      const modifiedHeight = this.editorDiff.getModifiedEditor().getContentHeight();
      const originalLayoutInfo = this.editorDiff.getOriginalEditor().getLayoutInfo();

      let totalHeight = originalHeight > modifiedHeight ? originalHeight : modifiedHeight;
      if (!originalLayoutInfo.isViewportWrapping) {
        totalHeight += originalLayoutInfo.horizontalScrollbarHeight;
      }

      if (this.container) {
        this.container.style.height = `${totalHeight}px`;
        this.editorDiff.layout();
      }
    }
  }

  _updateEditorDisplayOptions() {
    if (this.data.wordwrap) {
      this.editorCode?.updateOptions({ wordWrap: "on" });
      this.editorDiff?.updateOptions({ wordWrap: "on" });
    }
    if (!this.data.minimap) {
      this.editorCode?.updateOptions({ minimap: { enabled: false } });
      this.editorDiff?.updateOptions({ minimap: { enabled: false } });
    }
    if (!this.data.linenumbers) {
      this.editorCode?.updateOptions({ lineNumbers: "off" });
      this.editorDiff?.updateOptions({ lineNumbers: "off" });
    }
  }

  render() {
    const container = document.createElement("div");
    container.classList.add("editor-wrapper");
    container.style.marginTop = "10px";
    container.style.marginBottom = "10px";

    loader.init().then((monaco) => {
      if (!this.data.diff) {
        this.editorCode = monaco.editor.create(container, {
          ...this.defaultOptions,
          value: this.data.code || "// type your code...",
          language: this.data.language || "plaintext",
        });
      } else {
        this.editorDiff = monaco.editor.createDiffEditor(container, {
          ...this.defaultOptions,
          renderSideBySide: true,
          readOnly: false,
          originalEditable: true,
        });
        this.editorDiff.setModel({
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

      monaco.editor.setTheme(this.data.theme);

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
      
      this._updateEditorDisplayOptions();
      this._updateHeight();
      this._registerHeightUpdate();

      if (this.shouldFocus) {
        this.editorCode?.focus();
        this.editorDiff?.focus();
        this.shouldFocus = false;
      }
    });

    this.container = container;
    return container;
  }

  _setLanguage(language: string) {
    if (!this.editorCode && !this.editorDiff) return;
    loader.init().then((monaco) => {
      if (this.editorCode) {
        const model = this.editorCode.getModel();
        if (model) {
          monaco.editor.setModelLanguage(model, language);
        }
      } else if (this.editorDiff) {
        const originalModel = this.editorDiff.getOriginalEditor().getModel();
        const modifiedModel = this.editorDiff.getModifiedEditor().getModel();
        if (originalModel) {
          monaco.editor.setModelLanguage(originalModel, language);
        }
        if (modifiedModel) {
          monaco.editor.setModelLanguage(modifiedModel, language);
        }
      }
    });
  }

  renderSettings() {
    const settings = [];

    // add toggle wordwrap
    settings.push({
      icon: wrapIcon,
      label: "Word wrap",
      toggle: "wordwrap",
      isActive: this.data.wordwrap,
      onActivate: () => {
        this.data.wordwrap = !this.data.wordwrap;
        if (this.editorCode) {
          this.editorCode.updateOptions({ wordWrap: this.data.wordwrap ? "on" : "off" });
          this._updateHeight();
        } else if (this.editorDiff) {
          this.editorDiff.updateOptions({ wordWrap: this.data.wordwrap ? "on" : "off" });
          this._updateHeight();
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
        this.data.linenumbers = !this.data.linenumbers;
        if (this.editorCode) {
          this.editorCode.updateOptions({ lineNumbers: this.data.linenumbers ? "on" : "off" });
          this._updateHeight();
        } else if (this.editorDiff) {
          this.editorDiff.updateOptions({ lineNumbers: this.data.linenumbers ? "on" : "off" });
          this._updateHeight();
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
        this.data.minimap = !this.data.minimap;
        if (this.editorCode) {
          this.editorCode.updateOptions({ minimap: { enabled: this.data.minimap } });
          this._updateHeight();
        } else if (this.editorDiff) {
          this.editorDiff.updateOptions({ minimap: { enabled: this.data.minimap } });
          this._updateHeight();
        }
      },
    });

    settings.push({
      icon: diffIcon,
      label: "Diff",
      toggle: "diff",
      isActive: typeof this.data.diff === 'string' ? true : false,
      onActivate: () => {

        loader.init().then((monaco) => {
          if (!this.container) return;

          if (this.data.diff) {
            // switch to normal editor
            this.data.diff = null;
            this.editorDiff?.dispose();
            this.editorDiff = null;

            this.editorCode = monaco.editor.create(this.container, {
              ...this.defaultOptions,
              value: this.data.code,
              language: this.data.language || "plaintext",
            });

          } else {
            // switch to diff editor
            this.data.diff = this.data.code;
            this.editorCode?.dispose();
            this.editorCode = null;

            this.editorDiff = monaco.editor.createDiffEditor(this.container, {
              ...this.defaultOptions,
              renderSideBySide: true,
              readOnly: false,
              originalEditable: true,
            });

            this.editorDiff.setModel({
              original: monaco.editor.createModel(
                this.data.code,
                this.data.language || "plaintext",
              ),
              modified: monaco.editor.createModel(
                this.data.diff || "",
                this.data.language || "plaintext",
              ),
            });
          }

          this._updateEditorDisplayOptions();
          this._updateHeight();
          this._registerHeightUpdate();
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

  save(): MonacoEditorData {
    if (!this.editorCode && !this.editorDiff) return this.data;

    let code = "";
    let diff: string | null = null;

    if (this.editorCode) {
      code = this.editorCode.getValue();
    } else if (this.editorDiff) {
      const originalModel = this.editorDiff.getOriginalEditor().getModel();
      const modifiedModel = this.editorDiff.getModifiedEditor().getModel();
      code = originalModel?.getValue() || "";
      diff = modifiedModel?.getValue() || "";
    }

    return {
      code: code,
      diff: diff,
      language: this.data.language || "",
      wordwrap: this.data.wordwrap,
      minimap: this.data.minimap,
      linenumbers: this.data.linenumbers,
      theme: this.data.theme,
      languages: this.data.languages,
    };
  }

  static get toolbox() {
    return {
      title: "Code",
      icon: codeIcon,
    };
  }

  static get displayInToolbox() {
    return true;
  }
}

export default MonacoCodeTool;
