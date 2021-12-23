// default response
export class Response {
  static send(responseData = {}) {
    return {
      type: "success",
      data: responseData,
    };
  }
}
