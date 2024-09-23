import EventEmitter from "node:events"

export const myEventEmitter = new EventEmitter()

interface RoomMutation {
  id?: string
  name?: string
  players?: string[]
  revealed?: boolean
}

interface PlayerMutation {
  id?: string
  name?: string
  role?: 'creator' | 'player' | 'spectator'
  points?: number | "?"
}

export interface RoomRecord extends RoomMutation {
  id: string
}

export interface PlayerRecord extends PlayerMutation {
  id: string
}

const data = {
  rooms: {} as Record<string, RoomRecord>,
  players: {} as Record<string, PlayerRecord>,

  createRoom(values: RoomMutation): RoomRecord {
    const id = values.id || Math.random().toString(36).substring(2, 9)
    const newRoom = { id, revealed: false, ...values }
    data.rooms[id] = newRoom
    return newRoom
  },

  getRoom(id: string): RoomRecord | null {
    return data.rooms[id] || null
  },

  updateRoom(id: string, values: RoomMutation): RoomRecord {
    const room = data.rooms[id]
    data.rooms[id] = { ...room, ...values }
    return data.rooms[id]
  },

  deleteRoom(id: string) {
    delete data.rooms[id]
  },

  createPlayer(values: PlayerMutation): PlayerRecord {
    const id = values.id || Math.random().toString(36).substring(2, 9)
    const newPlayer = { id, ...values }
    data.players[id] = newPlayer
    return newPlayer
  },

  updatePlayer(playerId: string, values: PlayerMutation): PlayerRecord {
    const player = data.players[playerId]
    data.players[playerId] = {...player, ...values}
    return data.players[playerId]
  },

  getPlayer(id: string): PlayerRecord {
    return data.players[id] || null
  }
}

export function createRoom(name: string, creatorName: string) {
  const newPlayer = data.createPlayer({ name: creatorName, role: 'creator' })
  return data.createRoom({ name, players: [newPlayer.id] })
}

export function getRoom(id: string) {
  return data.getRoom(id)
}

export function getPlayer(id: string) {
  return data.getPlayer(id)
}

export function addPlayerToRoom(roomId: string, playerName: string) {
  const room = data.getRoom(roomId)
  const newPlayer = data.createPlayer({ name: playerName, role: 'player' })
  const updatedRoom = data.updateRoom(roomId, { players: [...(room?.players ?? []), newPlayer.id] })
  myEventEmitter.emit('playerAddedToRoom', updatedRoom.id, newPlayer)
  return {updatedRoom, newPlayer}
}

export function setPlayerPoints(playerId: string, points: number | "?") {
  if (data.players[playerId]) {
    data.players[playerId].points = points
    myEventEmitter.emit('playerChosePoints', playerId, points)
  }
}

export function getRoomPlayers(roomId: string) {
  const room = getRoom(roomId)
    return room?.players?.map(playerId => {
      return data.getPlayer(playerId)
    }) ?? null
}

export function revealCards(roomId: string) {
  data.updateRoom(roomId, { revealed: true })
  myEventEmitter.emit('revealCards')
}

let resetCount = 0
export function resetRoom(roomId: string) {
  const updatedRoom = data.updateRoom(roomId, { revealed: false })
  data.rooms[roomId].players?.forEach(playerId => {
    data.updatePlayer(playerId, { points: undefined })
  })
  const updatedPlayers = getRoomPlayers(roomId)
  resetCount += 1
  myEventEmitter.emit('roomReset', updatedRoom, updatedPlayers, resetCount)
}

export function deleteRoom(id: string) {
  data.deleteRoom(id)
}