import { v4 as uuidv4 } from 'uuid'
import type * as THREE from 'three'
import type { Vec3, ComponentData, ComponentType, EntityData } from './types'

export class Component {
  type: ComponentType
  data: Record<string, unknown>

  constructor(type: ComponentType, data: Record<string, unknown> = {}) {
    this.type = type
    this.data = data
  }

  serialize(): ComponentData {
    return { type: this.type, ...this.data } as ComponentData
  }

  static deserialize(data: ComponentData): Component {
    const { type, ...rest } = data
    return new Component(type, rest)
  }
}

export class Entity {
  id: string
  name: string
  position: Vec3
  rotation: Vec3
  scale: Vec3
  components: Map<ComponentType, Component>
  children: string[]
  parentId: string | null
  visible: boolean
  locked: boolean
  object3D: THREE.Object3D | null

  constructor(name: string = 'Entity', id?: string) {
    this.id = id || uuidv4()
    this.name = name
    this.position = { x: 0, y: 0, z: 0 }
    this.rotation = { x: 0, y: 0, z: 0 }
    this.scale = { x: 1, y: 1, z: 1 }
    this.components = new Map()
    this.children = []
    this.parentId = null
    this.visible = true
    this.locked = false
    this.object3D = null
  }

  addComponent(component: Component): this {
    this.components.set(component.type, component)
    return this
  }

  removeComponent(type: ComponentType): this {
    this.components.delete(type)
    return this
  }

  getComponent(type: ComponentType): Component | undefined {
    return this.components.get(type)
  }

  hasComponent(type: ComponentType): boolean {
    return this.components.has(type)
  }

  serialize(): EntityData {
    const components: Record<string, ComponentData> = {}
    for (const [type, comp] of this.components) {
      components[type] = comp.serialize()
    }
    return {
      id: this.id,
      name: this.name,
      position: { ...this.position },
      rotation: { ...this.rotation },
      scale: { ...this.scale },
      components,
      children: [...this.children],
      parentId: this.parentId,
      visible: this.visible,
      locked: this.locked,
    }
  }

  static deserialize(data: EntityData): Entity {
    const entity = new Entity(data.name, data.id)
    entity.position = { ...data.position }
    entity.rotation = { ...data.rotation }
    entity.scale = { ...data.scale }
    entity.children = [...(data.children || [])]
    entity.parentId = data.parentId || null
    entity.visible = data.visible ?? true
    entity.locked = data.locked ?? false

    for (const [type, compData] of Object.entries(data.components || {})) {
      entity.addComponent(Component.deserialize(compData as ComponentData))
    }
    return entity
  }
}
