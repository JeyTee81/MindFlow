import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import type { Mission } from '../types/mission.types.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const STORE_PATH = path.join(__dirname, '../data/missions.json')

export class MissionStore {
  private missions: Map<string, Mission> = new Map()

  constructor() {
    this.loadFromDisk()
  }

  async loadFromDisk() {
    try {
      await fs.mkdir(path.dirname(STORE_PATH), { recursive: true })
      const data = await fs.readFile(STORE_PATH, 'utf-8')
      const missions = JSON.parse(data)
      this.missions = new Map(Object.entries(missions))
    } catch (error) {
      this.missions = new Map()
    }
  }

  async saveToDisk() {
    try {
      const data = Object.fromEntries(this.missions)
      await fs.writeFile(STORE_PATH, JSON.stringify(data, null, 2))
    } catch (error) {
      console.error('Error saving to disk:', error)
    }
  }

  save(mission: Mission) {
    this.missions.set(mission.id, mission)
    this.saveToDisk()
  }

  get(missionId: string): Mission | undefined {
    return this.missions.get(missionId)
  }

  getAll(): Mission[] {
    return Array.from(this.missions.values())
  }
}
