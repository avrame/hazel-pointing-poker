/* eslint-disable @typescript-eslint/no-var-requires */
// app/routes/sse.room.ts
import { LoaderFunctionArgs } from "@remix-run/node";
// import { eventStream } from "remix-utils/sse/server";

import { myEventEmitter, PlayerRecord, RoomRecord } from "~/data";

const { eventStream } = require("remix-utils/sse/server")

export function loader({ request }: LoaderFunctionArgs) {
  return eventStream(request.signal, function setup(send: (arg0: { event: string; data: string; }) => void) {
    function playerAddedToRoomHandler(
      updatedRoomId: string,
      newPlayer: PlayerRecord,
    ) {
      send({ event: "revealCards", data: "false" });
      send({
        event: "playerAddedToRoom",
        data: JSON.stringify({ updatedRoomId, newPlayer }),
      });
    }

    function playerChosePointsHandler(playerId: string, points: number) {
      send({ event: "revealCards", data: "false" });
      send({
        event: "playerChosePoints",
        data: JSON.stringify({ playerId, points }),
      });
    }

    function revealCardsHandler() {
      send({ event: "revealCards", data: "true" });
    }

    function roomResetHandler(updatedRoom: RoomRecord, updatedPlayers: PlayerRecord[], resetCount: number) {
      send({ event: "revealCards", data: "false" });
      send({
        event: "roomReset",
        data: JSON.stringify({ updatedRoom, updatedPlayers, resetCount }),
      });
    }

    myEventEmitter.on("playerAddedToRoom", playerAddedToRoomHandler);
    myEventEmitter.on("playerChosePoints", playerChosePointsHandler);
    myEventEmitter.on("revealCards", revealCardsHandler);
    myEventEmitter.on("roomReset", roomResetHandler);

    return () => {
      myEventEmitter.off("playerAddedToRoom", playerAddedToRoomHandler);
      myEventEmitter.off("playerChosePoints", playerChosePointsHandler);
      myEventEmitter.off("revealCards", revealCardsHandler);
      myEventEmitter.off("roomReset", roomResetHandler);
    };
  });
}
