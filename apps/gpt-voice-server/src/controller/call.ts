import { FastifyReply, FastifyRequest } from "fastify";
import { callUsecase } from "../bootstrap";
import {
  CallAnswerRequestBody,
  CallCreateResponseBody,
  CallIceCandidateRequestBody,
  CallSessionPathParam,
} from "../../../../libs/gpt-voice-api/src";

export async function call(req: FastifyRequest<{}>, reply: FastifyReply) {
  try {
    const { id, sdp, models } = await callUsecase.call();
    const response: CallCreateResponseBody = { sessionId: id, sdp, models };
    await reply.code(201).send(response);
  } catch (error: any) {
    await reply.code(500).send({ error: error.message });
  }
}

export async function callAnswer(
  req: FastifyRequest<{
    Body: CallAnswerRequestBody;
    Params: CallSessionPathParam;
  }>,
  reply: FastifyReply
) {
  try {
    const { sdp } = req.body;
    const { sessionId } = req.params;

    await callUsecase.answer({ answer: sdp, sessionId });
    await reply.code(200).send({});
  } catch (error: any) {
    await reply.code(500).send({ error: error.message });
  }
}

export async function callIceCandidate(
  req: FastifyRequest<{
    Body: CallIceCandidateRequestBody;
    Params: CallSessionPathParam;
  }>,
  reply: FastifyReply
) {
  const { candidate } = req.body;
  const { sessionId } = req.params;

  await callUsecase.addIceCandidate({ ice: candidate, sessionId });
  await reply.code(200).send({});
}
