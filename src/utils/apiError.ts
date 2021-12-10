export class ApiError extends Error {
  
  code: number
  
  /**
   * Constructor
   * @param code
   * @param message
   */
  constructor(code: number, message: string) {
      super(message);
      this.code = code;
      this.message = message;
  }

  /**
   * Page not found
   * @param object
   * @return {ApiError}
   */
  static notFound(object = "Object") {
      return new ApiError(404, `${object} is not found`);
  }

  /**
   * Forbidden error
   * @return {ApiError}
   */
  static forbidden() {
      return new ApiError(403, `Forbidden access`);
  }

  /**
   * Get error as json
   * @return {{code, type: string, message: string}}
   */
  getJson() {
      return {
          type: "error",
          code: this.code,
          message: this.message
      }
  }
}
