/* eslint-disable @typescript-eslint/no-var-requires */
// app/routes/sse.room.ts
import { LoaderFunctionArgs } from "@remix-run/node"

import { session } from "~/cookies/session-cookie"
import { myEventEmitter, PlayerRecord, RoomRecord } from "~/data"

const { eventStream } = require("remix-utils/sse/server")

export async function loader({ request }: LoaderFunctionArgs) {
  const cookieHeader = request.headers.get("Cookie")
  const cookie = (await session.parse(cookieHeader)) || {}
  return eventStream(request.signal, function setup(send: (arg0: { event: string; data: string }) => void) {
    function playerAddedToRoomHandler(
      updatedRoomId: string,
      newPlayer: PlayerRecord,
    ) {
      if (cookie.room.id === updatedRoomId) {
        send({ event: "revealCards", data: "false" })
        send({
          event: "playerAddedToRoom",
          data: JSON.stringify({ updatedRoomId, newPlayer }),
        })
      }
    }

    function playerChosePointsHandler(roomId: string, playerId: string, points: number, pointsCount: number) {
      if (cookie.room.id === roomId) {
        send({ event: "revealCards", data: "false" })
        send({
          event: "playerChosePoints",
          data: JSON.stringify({ playerId, points, pointsCount }),
        })
      }
    }

    function revealCardsHandler(roomId: string) {
      if (cookie.room.id === roomId) {
        send({ event: "revealCards", data: "true" })
      }
    }

    function roomResetHandler(updatedRoom: RoomRecord, updatedPlayers: PlayerRecord[], resetCount: number) {
      if (cookie.room.id === updatedRoom.id) {
        send({ event: "revealCards", data: "false" })
        send({
          event: "roomReset",
          data: JSON.stringify({ updatedRoom, updatedPlayers, resetCount }),
        })
      }
    }

    function playerLeftHandler(playerId: string, roomId: string) {
      send({ event: "playerLeft", data: JSON.stringify({ playerId, roomId }) })
    }

    myEventEmitter.on("playerAddedToRoom", playerAddedToRoomHandler)
    myEventEmitter.on("playerChosePoints", playerChosePointsHandler)
    myEventEmitter.on("revealCards", revealCardsHandler)
    myEventEmitter.on("roomReset", roomResetHandler)
    myEventEmitter.on("playerLeft", playerLeftHandler)

    return () => {
      myEventEmitter.off("playerAddedToRoom", playerAddedToRoomHandler)
      myEventEmitter.off("playerChosePoints", playerChosePointsHandler)
      myEventEmitter.off("revealCards", revealCardsHandler)
      myEventEmitter.off("roomReset", roomResetHandler)
      myEventEmitter.off("playerLeft", playerLeftHandler)
    }
  })
}
