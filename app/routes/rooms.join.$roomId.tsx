/* eslint-disable jsx-a11y/label-has-associated-control */
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import {
  Form,
  isRouteErrorResponse,
  useActionData,
  useLoaderData,
  useRouteError,
} from "@remix-run/react";
import invariant from "tiny-invariant";

import Button from "~/components/Button/";
import Checkbox from "~/components/Checkbox";
import Hr from "~/components/Hr";
import Input from "~/components/Input/";
import { session } from "~/cookies/session-cookie";
import { addPlayerToRoom, getRoom, getRoomPlayers } from "~/data";

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  invariant(params.roomId, "roomId not found");
  const cookieHeader = request.headers.get("Cookie");
  const cookie = (await session.parse(cookieHeader)) || {};

  const room = getRoom(params.roomId);
  const players = getRoomPlayers(params.roomId);
  if (!room) {
    throw new Response("Not Found", { status: 404 });
  }
  return json({ room, players, currentPlayer: cookie.currentPlayer });
};

export const action = async ({ params, request }: ActionFunctionArgs) => {
  const { roomId } = params
  invariant(roomId, "roomId not found")
  const cookieHeader = request.headers.get("Cookie")
  const cookie = (await session.parse(cookieHeader)) || {}

  const formData = await request.formData();
  const playerName = formData.get("playerName") as string
  const spectator = formData.get("spectator") === "on"

  if (typeof playerName !== "string" || playerName.length === 0) {
    return json(
      {
        errors: { roomName: null, playerName: "Player name is required" },
      },
      { status: 400 },
    );
  }

  const { newPlayer, updatedRoom } = addPlayerToRoom(roomId, playerName, spectator)
  cookie.currentPlayer = newPlayer
  cookie.room = updatedRoom

  return redirect(`/rooms/${roomId}`, {
    headers: {
      "Set-Cookie": await session.serialize(cookie),
    },
  });
};

export default function RoomJoinPage() {
  const data = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()

  return (
    <div className="flex flex-col items-center gap-4">
      <h2 className="text-3xl font-bold">{data.room.name} Room</h2>
      <Hr />
      <div>
        <Form method="post">
          <div>
            <label>
              <span className="mr-1">Your Name:</span>
              <Input
                name="playerName"
                className="mr-1"
                defaultValue={data.currentPlayer?.name}
                aria-invalid={actionData?.errors?.playerName ? true : undefined}
                aria-errormessage={
                  actionData?.errors?.playerName ? "title-error" : undefined
                }
              />
            </label>
            <Button type="submit">Join Room</Button>
          </div>
          {actionData?.errors?.playerName ? (
            <div className="pt-1 text-red-700" id="title-error">
              {actionData.errors.playerName}
            </div>
          ) : null}
          <div className="mt-2">
            <label className="flex w-full items-center gap-2">
              <span>Join as a spectator</span>
              <Checkbox name="spectator" />
            </label>
          </div>
        </Form>
      </div>
    </div>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();

  if (error instanceof Error) {
    return <div>An unexpected error occurred: {error.message}</div>;
  }

  if (!isRouteErrorResponse(error)) {
    return <h1>Unknown Error</h1>;
  }

  if (error.status === 404) {
    return <div>Room not found</div>;
  }

  return <div>An unexpected error occurred: {error.statusText}</div>;
}
