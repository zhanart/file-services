export interface ICommonJsModuleSystem {
  /**
   * Map of file path to a loaded module.
   */
  loadedModules: Map<string, IModule>;

  /**
   * Require a module using an absolute file path.
   */
  requireModule: (moduleId: string | false) => unknown;

  /**
   * Require a module from some context (directory path).
   */
  requireFrom: (contextPath: string, request: string) => unknown;

  /**
   * Resolve a module request from some context (directory path).
   *
   * @returns
   * `string` - absolute path to resolved file.
   * `false` - request should receive an empty object during runtime (mapped by `"browser"` field in `package.json`).
   * `undefined` - couldn't resolve request.
   */
  resolveFrom: (contextPath: string, request: string, requestOrigin?: string) => string | false | undefined;
}

export interface IModule {
  /**
   * Absolute path to module's source file.
   */
  id: string;

  /**
   * Absolute path to module's source file.
   */
  filename: string;

  /**
   * Exported values of module.
   */
  exports: unknown;
}
