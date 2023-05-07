import { Static, Type } from "@sinclair/typebox";
import {
  ParameterObject,
  PathItemObject,
  ResponseObject,
} from "openapi3-ts/oas31";

interface Path {
  path: string;
  item: PathItemObject;
}

const callCreateResponseBody = Type.Object({
  sdp: Type.Object({}),
  models: Type.Array(Type.String()),
  sessionId: Type.String(),
});
export type CallCreateResponseBody = Static<typeof callCreateResponseBody>;
export const callCreatePath: Path = {
  path: "/call",
  item: {
    post: {
      description: "create call session",
      responses: {
        "201": {
          description: "success",
          content: { "application/json": { schema: callCreateResponseBody } },
        } as ResponseObject,
      },
    },
  },
};

const callSessionPathParam = {
  sessionId: {
    in: "path",
    name: "sessionId",
    required: true,
    schema: Type.String(),
  } as ParameterObject,
} as const;
export type CallSessionPathParam = {
  [key in keyof typeof callSessionPathParam]: string;
};

const callIceCandidateRequestBody = Type.Object({ candidate: Type.Object({}) });
export type CallIceCandidateRequestBody = Static<
  typeof callIceCandidateRequestBody
>;
export const callIceCandidatePath: Path = {
  path: `/call/{${callSessionPathParam.sessionId.name}}/ice_candidate`,
  item: {
    put: {
      description: "send client ice candidate",
      parameters: Object.values(callSessionPathParam),
      requestBody: {
        content: {
          "application/json": { schema: callIceCandidateRequestBody },
        },
      },
      responses: {
        "200": {
          description: "success",
        } as ResponseObject,
      },
    },
  },
};

const callAnswerRequestBody = Type.Object({ sdp: Type.Object({}) });
export type CallAnswerRequestBody = Static<typeof callAnswerRequestBody>;
export const callAnswerPath: Path = {
  path: `/call/{${callSessionPathParam.sessionId.name}}/answer`,
  item: {
    put: {
      description: "send client answer",
      parameters: Object.values(callSessionPathParam),
      requestBody: {
        content: {
          "application/json": { schema: callAnswerRequestBody },
        },
      },
      responses: {
        "200": {
          description: "success",
        } as ResponseObject,
      },
    },
  },
};
