import mongoose from "mongoose";
import { validateRequest } from "./validate-request.js";

export function validateObjectIdParams(...parameterNames) {
  return validateRequest({
    params(params) {
      return parameterNames
        .filter((name) => !mongoose.isObjectIdOrHexString(params[name]))
        .map((name) => ({ field: name, message: "Must be a valid ObjectId." }));
    },
  });
}